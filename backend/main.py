from fastapi import FastAPI, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from pydantic import BaseModel
import pandas as pd
import io
import re
from datetime import datetime
from database import SessionLocal, User, Product, PriceHistory, Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- MAPA GENÉRICO (FALLBACK) ---
MAPA_INTELIGENTE = {
    'brand': ['marca', 'brand', 'fabricante'],
    'model': ['modelo', 'model', 'pattern', 'desenho'],
    'width': ['medida', 'dimension', 'largura'],
    'rim': ['aro', 'rim', 'diametro', 'raio'],
    'price': ['preco_sell_out', 'preco sell out', 'sell out', 'sellout', 'preço venda', 'venda', 'valor'],
    'cost': ['preco sell in', 'sell in', 'sellin', 'custo'],
    'origin': ['origem', 'origin', 'nacional', 'importado'],
    'competitor': ['empresa', 'competitor', 'concorrente', 'loja', 'revenda'], 
    'location': ['localidade', 'local', 'cidade/uf', 'region', 'city', 'cidade'],
    'date': ['data', 'date', 'data coleta', 'coleta'],
    'mkp': ['mkp', 'markup', 'margem']
}

ESTADO_PARA_REGIAO = {
    'MT': 'CO', 'MS': 'CO', 'GO': 'CO', 'DF': 'CO',
    'AM': 'NO', 'PA': 'NO', 'RO': 'NO', 'RR': 'NO', 'AC': 'NO', 'TO': 'NO', 'AP': 'NO',
    'SP': 'SE', 'RJ': 'SE', 'MG': 'SE', 'ES': 'SE',
    'PR': 'S', 'RS': 'S', 'SC': 'S',
    'BA': 'NE', 'PE': 'NE', 'CE': 'NE' 
}

def limpar_aro(valor):
    if pd.isna(valor) or str(valor).strip() == '': return "0"
    s = str(valor).upper().replace('R', '').replace('ARO', '').strip().replace(',', '.')
    try:
        val_float = float(s)
        if val_float.is_integer(): return str(int(val_float))
        return str(val_float)
    except:
        nums = re.findall(r"[-+]?\d*\.\d+|\d+", s)
        return str(int(float(nums[0]))) if nums and float(nums[0]).is_integer() else (str(nums[0]) if nums else "0")

def limpar_empresa(nome):
    if pd.isna(nome): return "Desconhecido"
    nome = str(nome).strip().title()
    return re.sub(r'\s+(Ltda|S\.A\.?|S/A|Me|Eireli)\.?$', '', nome, flags=re.IGNORECASE).strip()

def parse_data(valor_data):
    if pd.isna(valor_data) or str(valor_data).strip() == '': return datetime.now()
    texto = str(valor_data).strip()
    for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y']:
        try: return datetime.strptime(texto, fmt)
        except: continue
    try: return pd.to_datetime(valor_data).to_pydatetime()
    except: return datetime.now()

def tratar_preco(valor):
    try: return float(str(valor).replace('R$', '').replace(' ', '').replace(',', '.'))
    except: return 0.0

def identificar_colunas(df):
    cols = list(df.columns)
    
    # --- MAPEAMENTO FORÇADO (CORREÇÃO DEFINITIVA) ---
    # Se encontrar essas colunas específicas da sua planilha, usa elas direto.
    if 'Preco_Sell_Out' in cols and 'Empresa' in cols:
        return {
            'price': 'Preco_Sell_Out',
            'competitor': 'Empresa',
            'brand': 'Marca' if 'Marca' in cols else 'MARCA', # Prefere 'Marca' (concorrente)
            'model': 'Modelo' if 'Modelo' in cols else 'MODELO',
            'width': 'Medida' if 'Medida' in cols else 'MEDIDA',
            'rim': 'Aro' if 'Aro' in cols else 'ARO',
            'cost': 'PREÇO SELL IN',
            'origin': 'ORIGEM' if 'ORIGEM' in cols else 'Origem',
            'mkp': 'MKP',
            'date': 'Data' if 'Data' in cols else 'DATA',
            'location': 'Localidade' # Se tiver
        }
    
    # --- LÓGICA AUTOMÁTICA (FALLBACK) ---
    colunas_encontradas = {}
    cols_lower = [str(c).lower().strip() for c in cols]
    
    idx_preco = -1
    melhor_pontuacao = -1
    for i, col in enumerate(cols_lower):
        pontuacao = 0
        if 'sell in' in col or 'custo' in col: continue
        if 'sell out' in col or 'sellout' in col: pontuacao += 100
        elif 'preco' in col and 'in' not in col: pontuacao += 50
        
        if pontuacao > melhor_pontuacao:
            melhor_pontuacao = pontuacao
            colunas_encontradas['price'] = cols[i]
            idx_preco = i

    if idx_preco == -1: return None

    for chave in ['brand', 'model', 'width', 'rim', 'competitor', 'location', 'date', 'cost', 'origin', 'mkp']:
        possiveis = MAPA_INTELIGENTE.get(chave, [])
        melhor_distancia = 9999
        col_escolhida = None
        
        for i, col in enumerate(cols_lower):
            if any(p in col for p in possiveis):
                if chave == 'cost' and i == idx_preco: continue
                
                distancia = abs(i - idx_preco)
                if col in possiveis: distancia -= 500 # Bonus match exato

                if distancia < melhor_distancia:
                    melhor_distancia = distancia
                    col_escolhida = cols[i]
        
        if col_escolhida: colunas_encontradas[chave] = col_escolhida

    return colunas_encontradas

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.strip()).first()
    if not user or user.password.strip() != data.password.strip():
        return {"status": "erro", "message": "Credenciais inválidas"}
    return {"status": "sucesso", "user": user.email, "company": user.company}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    filename = file.filename.lower()
    
    # Detecção de Cidade
    cidade_arq, regiao_arq = "Manaus", "NO"
    if "cuiaba" in filename or "cuiabá" in filename: cidade_arq, regiao_arq = "Cuiabá - MT", "CO"
    elif "sp" in filename: cidade_arq, regiao_arq = "São Paulo - SP", "SE"

    try:
        if file.filename.endswith('.csv'): df = pd.read_csv(io.BytesIO(contents), sep=None, engine='python')
        else: df = pd.read_excel(io.BytesIO(contents))
    except: return {"status": "erro", "message": "Arquivo ilegível."}

    mapa = identificar_colunas(df)
    if not mapa or 'price' not in mapa:
        return {"status": "erro", "message": "Colunas principais não encontradas."}

    c = lambda k: mapa.get(k)
    count = 0
    for _, row in df.iterrows():
        try:
            marca = str(row[c('brand')]).upper().strip() if c('brand') else "GENÉRICA"
            modelo = str(row[c('model')]).upper().strip() if c('model') else "PADRÃO"
            medida = str(row[c('width')]).strip() if c('width') else "N/A"
            aro = limpar_aro(row[c('rim')] if c('rim') else "0")
            competitor = limpar_empresa(row[c('competitor')] if c('competitor') else "Concorrente")
            data_col = parse_data(row[c('date')]) if c('date') else datetime.now()
            
            origem = "-"
            if c('origin'):
                raw_o = str(row[c('origin')]).strip().upper()
                if "NAC" in raw_o: origem = "NACIONAL"
                elif "IMP" in raw_o: origem = "IMPORTADO"
            
            p_venda = tratar_preco(row[c('price')])
            p_custo = tratar_preco(row[c('cost')]) if c('cost') else 0.0
            
            v_mkp = 0.0
            if c('mkp'):
                try: v_mkp = float(str(row[c('mkp')]).replace(',', '.'))
                except: v_mkp = 0.0

            city, region = cidade_arq, regiao_arq
            if c('location') and c('location') in df.columns:
                raw_l = str(row[c('location')]).strip()
                if len(raw_l) > 2:
                    city = raw_l
                    if '-' in raw_l: region = ESTADO_PARA_REGIAO.get(raw_l.split('-')[1].strip().upper(), region)

            unique_code = f"{marca}-{modelo}-{medida}".replace(" ", "").replace("/", "")
            produto = db.query(Product).filter(Product.unique_code == unique_code).first()
            if not produto:
                produto = Product(name=f"{marca} {modelo} {medida}", brand=marca, width=medida, profile="", rim=aro, unique_code=unique_code)
                db.add(produto)
                db.commit()
                db.refresh(produto)

            novo = PriceHistory(
                product_id=produto.id, competitor=competitor, price=p_venda, sell_in=p_custo,
                origin=origem, mkp=v_mkp, region=region, city=city, date_collected=data_col, source="UPLOAD"
            )
            db.add(novo)
            count += 1
        except: continue
    
    db.commit()
    return {"status": "sucesso", "mensagem": f"{count} registros importados. Local: {city}"}

def aplicar_filtros(query, region, brand, rim, competitor, origin, search):
    if region and "Toda" not in region: query = query.filter(PriceHistory.region == region)
    if origin and "Toda" not in origin: query = query.filter(PriceHistory.origin == origin)

    if brand and "Toda" not in brand:
        lista = [x for x in brand.split(',') if x and "Toda" not in x]
        if lista: query = query.filter(Product.brand.in_(lista))

    if rim and "Todo" not in rim:
        lista = [x for x in rim.split(',') if x and "Todo" not in x]
        if lista: query = query.filter(Product.rim.in_(lista))

    if competitor and "Todo" not in competitor:
        lista = [x for x in competitor.split(',') if x and "Todo" not in x]
        if lista: query = query.filter(PriceHistory.competitor.in_(lista))
    
    if search:
        termo = f"%{search}%"
        query = query.filter(or_(
            Product.name.ilike(termo), Product.brand.ilike(termo), Product.rim.ilike(termo),
            PriceHistory.competitor.ilike(termo), PriceHistory.city.ilike(termo)
        ))
    return query

@app.get("/dashboard-data")
def get_dashboard_data(region: str=None, brand: str=None, rim: str=None, competitor: str=None, origin: str=None, search: str=None, db: Session=Depends(get_db)):
    query = db.query(PriceHistory, Product).join(Product)
    query = aplicar_filtros(query, region, brand, rim, competitor, origin, search)
    results = query.order_by(desc(PriceHistory.date_collected)).all()
    return [{"id": p.id, "produto": pr.name, "medida": pr.width, "marca": pr.brand, "aro": pr.rim, "origin": p.origin, "concorrente": p.competitor, "city": p.city, "preco": p.price, "sell_in": p.sell_in, "mkp": p.mkp, "data": p.date_collected} for p, pr in results]

@app.get("/analytics")
def get_analytics(region: str=None, brand: str=None, rim: str=None, competitor: str=None, origin: str=None, search: str=None, db: Session=Depends(get_db)):
    query = db.query(PriceHistory).join(Product)
    query = aplicar_filtros(query, region, brand, rim, competitor, origin, search)

    total = query.count()
    all_competitors = db.query(PriceHistory.competitor).distinct().all()
    competitors_list = sorted([c[0] for c in all_competitors if c[0]])
    all_brands = db.query(Product.brand).distinct().all()
    brands_list = sorted([b[0] for b in all_brands if b[0]])

    if total == 0:
        return {"total": 0, "media": 0, "minimo": 0, "top_aro": "-", "top_concorrente": "-", "competitors_list": competitors_list, "brands_list": brands_list}

    media = query.with_entities(func.avg(PriceHistory.price)).scalar()
    minimo = query.with_entities(func.min(PriceHistory.price)).scalar()
    top_aro_q = db.query(Product.rim, func.count(PriceHistory.id)).join(Product).filter(PriceHistory.id.in_([p.id for p in query.all()])).group_by(Product.rim).order_by(desc(func.count(PriceHistory.id))).first()
    aro_mais_vendido = top_aro_q[0] if top_aro_q else "-"
    mais_barato = query.order_by(PriceHistory.price.asc()).first()
    concorrente_top = mais_barato.competitor if mais_barato else "-"

    return {"total": total, "media": round(media, 2), "minimo": round(minimo, 2), "top_aro": aro_mais_vendido, "top_concorrente": concorrente_top, "competitors_list": competitors_list, "brands_list": brands_list}