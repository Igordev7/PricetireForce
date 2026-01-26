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

# --- MAPA ESPECÍFICO PARA SUA PLANILHA ---
def identificar_colunas(df):
    cols = list(df.columns)
    mapa = {}
    
    # Mapeamento direto baseado nos nomes exatos da sua planilha
    mapeamento_exato = {
        'ARTIGO': 'artigo',
        'Medida': 'width',
        'MARCA': 'marca_interna',
        'MODELO': 'model_interno',
        'PREÇO SELL IN': 'sell_in',
        'Marca': 'marca_concorrente',
        'Modelo': 'modelo_concorrente',
        'ORIGEM': 'origin',
        'Aro': 'rim',
        'Preco_Sell_Out': 'price',
        'Empresa': 'competitor',
        'Data': 'date',
        'MKP': 'mkp'
    }
    
    # Procura por correspondências exatas
    for col in cols:
        col_clean = str(col).strip()
        if col_clean in mapeamento_exato:
            mapa[mapeamento_exato[col_clean]] = col
    
    # Fallback para nomes similares
    fallback_map = {
        'brand': ['marca', 'brand', 'fabricante'],
        'model': ['modelo', 'model', 'pattern'],
        'width': ['medida', 'dimension', 'largura'],
        'rim': ['aro', 'rim', 'diametro'],
        'price': ['preco_sell_out', 'preco sell out', 'sell out', 'venda'],
        'cost': ['preco sell in', 'sell in', 'custo'],
        'origin': ['origem', 'origin'],
        'competitor': ['empresa', 'competitor', 'concorrente', 'loja'],
        'mkp': ['mkp', 'markup', 'margem']
    }
    
    # Completa o mapa com fallback
    for key, possiveis in fallback_map.items():
        if key not in mapa:
            for col in cols:
                if any(p in str(col).lower() for p in possiveis):
                    mapa[key] = col
                    break
    
    return mapa if mapa else None

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
    for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%Y-%m-%d %H:%M:%S']:
        try: return datetime.strptime(texto, fmt)
        except: continue
    try: return pd.to_datetime(valor_data).to_pydatetime()
    except: return datetime.now()

def tratar_preco(valor):
    try: 
        valor_str = str(valor).replace('R$', '').replace(' ', '').replace(',', '.')
        # Remove fórmulas do Excel
        if valor_str.startswith('='):
            return 0.0
        return float(valor_str)
    except: 
        return 0.0

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
    if "cuiaba" in filename or "cuiabá" in filename: 
        cidade_arq, regiao_arq = "Cuiabá - MT", "CO"
    elif "sp" in filename: 
        cidade_arq, regiao_arq = "São Paulo - SP", "SE"

    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents), sep=None, engine='python')
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        return {"status": "erro", "message": f"Arquivo ilegível: {str(e)}"}

    mapa = identificar_colunas(df)
    if not mapa:
        return {"status": "erro", "message": "Colunas não identificadas."}
    
    print(f"Mapa identificado: {mapa}")

    c = lambda k: mapa.get(k)
    count = 0
    
    for _, row in df.iterrows():
        try:
            # Extrai dados da MARCA INTERNA (Barum/Continental)
            marca_interna = str(row[c('marca_interna')]).strip().upper() if c('marca_interna') else "DESCONHECIDA"
            modelo_interno = str(row[c('model_interno')]).strip() if c('model_interno') else "PADRÃO"
            
            # Extrai dados do CONCORRENTE
            marca_concorrente = str(row[c('marca_concorrente')]).strip().upper() if c('marca_concorrente') else "DESCONHECIDA"
            modelo_concorrente = str(row[c('modelo_concorrente')]).strip() if c('modelo_concorrente') else "PADRÃO"
            
            medida = str(row[c('width')]).strip() if c('width') else "N/A"
            aro = limpar_aro(row[c('rim')] if c('rim') else "0")
            competitor = limpar_empresa(row[c('competitor')] if c('competitor') else "Concorrente")
            data_col = parse_data(row[c('date')]) if c('date') else datetime.now()
            
            # Origem
            origem = "-"
            if c('origin'):
                raw_o = str(row[c('origin')]).strip().upper()
                if "NAC" in raw_o: 
                    origem = "NACIONAL"
                elif "IMP" in raw_o: 
                    origem = "IMPORTADO"
            
            # Preços
            p_venda = tratar_preco(row[c('price')])
            p_custo = tratar_preco(row[c('sell_in')]) if c('sell_in') else 0.0
            
            # MKP - calcula se não existir
            v_mkp = 0.0
            if c('mkp') and pd.notna(row[c('mkp')]):
                mkp_val = str(row[c('mkp')])
                if mkp_val.startswith('='):
                    # Calcula MKP baseado nos preços
                    if p_custo > 0:
                        v_mkp = (p_venda / p_custo) - 1
                else:
                    try:
                        v_mkp = float(mkp_val.replace(',', '.'))
                    except:
                        v_mkp = 0.0
            elif p_custo > 0:
                v_mkp = (p_venda / p_custo) - 1
            
            # Localidade
            city, region = cidade_arq, regiao_arq
            
            # Código único baseado na marca interna + modelo interno + medida
            unique_code = f"{marca_interna}-{modelo_interno}-{medida}".replace(" ", "").replace("/", "").replace("\\", "")
            
            # Verifica/Cria produto
            produto = db.query(Product).filter(Product.unique_code == unique_code).first()
            if not produto:
                produto = Product(
                    name=f"{marca_interna} {modelo_interno} {medida}",
                    marca_interna=marca_interna,
                    model_interno=modelo_interno,
                    marca_concorrente=marca_concorrente,
                    width=medida,
                    profile="",
                    rim=aro,
                    unique_code=unique_code
                )
                db.add(produto)
                db.commit()
                db.refresh(produto)
            
            # Cria registro de preço histórico
            novo = PriceHistory(
                product_id=produto.id,
                competitor=competitor,
                competitor_brand=marca_concorrente,
                competitor_model=modelo_concorrente,
                price=p_venda,
                sell_in=p_custo,
                origin=origem,
                mkp=v_mkp,
                region=region,
                city=city,
                date_collected=data_col,
                source="UPLOAD"
            )
            db.add(novo)
            count += 1
            
        except Exception as e:
            print(f"Erro processando linha: {e}")
            continue
    
    db.commit()
    return {"status": "sucesso", "mensagem": f"{count} registros importados. Local: {city}"}

# No main.py, na função aplicar_filtros, adicione:

def aplicar_filtros(query, region, brand, rim, competitor, competitor_brand, origin, search):  # ADICIONE competitor_brand
    if region and "Toda" not in region: 
        query = query.filter(PriceHistory.region == region)
    if origin and "Toda" not in origin: 
        query = query.filter(PriceHistory.origin == origin)

    if brand and "Toda" not in brand:
        lista = [x for x in brand.split(',') if x and "Toda" not in x]
        if lista: 
            query = query.filter(Product.marca_interna.in_(lista))

    if rim and "Todo" not in rim:
        lista = [x for x in rim.split(',') if x and "Todo" not in x]
        if lista: 
            query = query.filter(Product.rim.in_(lista))

    if competitor and "Todo" not in competitor:
        lista = [x for x in competitor.split(',') if x and "Todo" not in x]
        if lista: 
            query = query.filter(PriceHistory.competitor.in_(lista))
    
    # NOVO: Filtro por marca concorrente
    if competitor_brand and "Toda" not in competitor_brand:
        lista = [x for x in competitor_brand.split(',') if x and "Toda" not in x]
        if lista: 
            query = query.filter(PriceHistory.competitor_brand.in_(lista))
    
    if search:
        termo = f"%{search}%"
        query = query.filter(or_(
            Product.name.ilike(termo), 
            Product.marca_interna.ilike(termo),
            Product.marca_concorrente.ilike(termo),
            Product.width.ilike(termo),  # ADICIONADO: busca por medida
            Product.rim.ilike(termo),
            PriceHistory.competitor.ilike(termo), 
            PriceHistory.city.ilike(termo),
            PriceHistory.competitor_brand.ilike(termo)
        ))
    return query

# Atualize as rotas /dashboard-data e /analytics para incluir o novo parâmetro:

@app.get("/dashboard-data")
def get_dashboard_data(
    region: str = None, 
    brand: str = None, 
    rim: str = None, 
    competitor: str = None, 
    competitor_brand: str = None,  # NOVO PARÂMETRO
    origin: str = None, 
    search: str = None, 
    db: Session = Depends(get_db)
):
    query = db.query(PriceHistory, Product).join(Product)
    query = aplicar_filtros(query, region, brand, rim, competitor, competitor_brand, origin, search)  # ATUALIZADO
    results = query.order_by(desc(PriceHistory.date_collected)).all()
    
    return [
        {
            "id": p.id,
            "produto": pr.name,
            "medida": pr.width,
            "marca_interna": pr.marca_interna,
            "modelo_interno": pr.model_interno,
            "marca_concorrente": p.competitor_brand,
            "modelo_concorrente": p.competitor_model,
            "aro": pr.rim,
            "origin": p.origin,
            "concorrente": p.competitor,
            "city": p.city,
            "preco": p.price,
            "sell_in": p.sell_in,
            "mkp": p.mkp,
            "data": p.date_collected
        } 
        for p, pr in results
    ]

@app.get("/analytics")
def get_analytics(
    region: str = None, 
    brand: str = None, 
    rim: str = None, 
    competitor: str = None, 
    competitor_brand: str = None,  # NOVO PARÂMETRO
    origin: str = None, 
    search: str = None, 
    db: Session = Depends(get_db)
):
    query = db.query(PriceHistory).join(Product)
    query = aplicar_filtros(query, region, brand, rim, competitor, competitor_brand, origin, search)  # ATUALIZADO

    total = query.count()
    all_competitors = db.query(PriceHistory.competitor).distinct().all()
    competitors_list = sorted([c[0] for c in all_competitors if c[0]])
    
    all_brands = db.query(Product.marca_interna).distinct().all()
    brands_list = sorted([b[0] for b in all_brands if b[0]])
    
    # NOVO: Lista de marcas concorrentes
    all_concorrente_brands = db.query(PriceHistory.competitor_brand).distinct().all()
    concorrente_brands_list = sorted([cb[0] for cb in all_concorrente_brands if cb[0]])
    
    # NOVO: Lista de medidas
    all_measures = db.query(Product.width).distinct().all()
    measures_list = sorted([m[0] for m in all_measures if m[0]])

    if total == 0:
        return {
            "total": 0, 
            "media": 0, 
            "minimo": 0, 
            "top_aro": "-", 
            "top_concorrente": "-", 
            "competitors_list": competitors_list, 
            "brands_list": brands_list,
            "concorrente_brands_list": concorrente_brands_list,  # NOVO
            "measures_list": measures_list  # NOVO
        }

    media = query.with_entities(func.avg(PriceHistory.price)).scalar()
    minimo = query.with_entities(func.min(PriceHistory.price)).scalar()
    
    top_aro_q = db.query(Product.rim, func.count(PriceHistory.id))\
        .join(Product)\
        .filter(PriceHistory.id.in_([p.id for p in query.all()]))\
        .group_by(Product.rim)\
        .order_by(desc(func.count(PriceHistory.id)))\
        .first()
    aro_mais_vendido = top_aro_q[0] if top_aro_q else "-"
    
    mais_barato = query.order_by(PriceHistory.price.asc()).first()
    concorrente_top = mais_barato.competitor if mais_barato else "-"

    return {
        "total": total, 
        "media": round(media, 2), 
        "minimo": round(minimo, 2), 
        "top_aro": aro_mais_vendido, 
        "top_concorrente": concorrente_top, 
        "competitors_list": competitors_list, 
        "brands_list": brands_list,
        "concorrente_brands_list": concorrente_brands_list,  # NOVO
        "measures_list": measures_list  # NOVO
    }