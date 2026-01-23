from fastapi import FastAPI, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_  # <--- IMPORTANTE: Importamos o or_ para a busca
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

# --- MAPA INTELIGENTE (ADICIONEI 'DATE') ---
MAPA_INTELIGENTE = {
    'brand': ['marca', 'brand', 'fabricante', 'montadora'],
    'model': ['modelo', 'model', 'pattern', 'desenho', 'perfil'],
    'width': ['medida', 'dimension', 'largura', 'width'],
    'rim': ['aro', 'rim', 'diametro', 'raio'],
    'price': ['preco', 'preço', 'price', 'sell out', 'sellout', 'valor', 'r$', 'custo'],
    'competitor': ['empresa', 'competitor', 'concorrente', 'loja', 'distribuidor', 'revenda'],
    'location': ['localidade', 'local', 'cidade/uf', 'region', 'regiao', 'city', 'cidade'],
    'date': ['data', 'date', 'data coleta', 'coleta', 'dt'] # <--- Novo: Data
}

ESTADO_PARA_REGIAO = {
    'AM': 'NO', 'RR': 'NO', 'AP': 'NO', 'PA': 'NO', 'TO': 'NO', 'RO': 'NO', 'AC': 'NO',
    'MA': 'NE', 'PI': 'NE', 'CE': 'NE', 'RN': 'NE', 'PB': 'NE', 'PE': 'NE', 'AL': 'NE', 'SE': 'NE', 'BA': 'NE',
    'MT': 'CO', 'MS': 'CO', 'GO': 'CO', 'DF': 'CO',
    'SP': 'SE', 'RJ': 'SE', 'ES': 'SE', 'MG': 'SE',
    'PR': 'S', 'RS': 'S', 'SC': 'S'
}

# --- FUNÇÕES DE LIMPEZA ---
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
    padrao = r'\s+(Ltda|S\.A\.?|S/A|Me|Eireli)\.?$'
    return re.sub(padrao, '', nome, flags=re.IGNORECASE).strip()

def encontrar_coluna(df, chave_padrao):
    possiveis_nomes = MAPA_INTELIGENTE.get(chave_padrao, [])
    for nome_procurado in possiveis_nomes:
        for col_real in df.columns:
            if nome_procurado in str(col_real).lower(): return col_real
    return None

def parse_data(valor_data):
    """ Tenta converter a data da planilha para o formato do banco """
    if pd.isna(valor_data) or str(valor_data).strip() == '':
        return datetime.now()
    
    texto = str(valor_data).strip()
    # Tenta formatos comuns no Brasil
    formatos = ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%d/%m/%y']
    
    for fmt in formatos:
        try:
            return datetime.strptime(texto, fmt)
        except:
            continue
    # Se for timestamp do Pandas/Excel
    try:
        return pd.to_datetime(valor_data).to_pydatetime()
    except:
        return datetime.now()

# --- ROTAS ---
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
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents), sep=None, engine='python')
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except: return {"status": "erro", "message": "Arquivo ilegível."}

    # Identifica colunas
    col_marca, col_modelo = encontrar_coluna(df, 'brand'), encontrar_coluna(df, 'model')
    col_medida, col_aro = encontrar_coluna(df, 'width'), encontrar_coluna(df, 'rim')
    col_preco, col_concorrente = encontrar_coluna(df, 'price'), encontrar_coluna(df, 'competitor')
    col_local, col_data = encontrar_coluna(df, 'location'), encontrar_coluna(df, 'date') # <--- Pega coluna data

    if not col_preco or not col_medida: return {"status": "erro", "message": "Colunas essenciais não encontradas."}

    count = 0
    for _, row in df.iterrows():
        try:
            marca = str(row[col_marca]).upper().strip() if col_marca else "GENÉRICA"
            modelo = str(row[col_modelo]).upper().strip() if col_modelo else "PADRÃO"
            medida = str(row[col_medida]).strip() if col_medida else "N/A"
            aro = limpar_aro(row[col_aro] if col_aro else "0")
            competitor = limpar_empresa(row[col_concorrente] if col_concorrente else "Concorrente")

            # DATA: Se tiver coluna, usa. Senão, usa HOJE.
            data_coleta = parse_data(row[col_data]) if col_data else datetime.now()

            preco = 0.0
            try:
                val = str(row[col_preco]).replace('R$', '').replace(' ', '').replace(',', '.')
                preco = float(val)
            except: pass

            city, region = "Manaus", "NO"
            if col_local:
                raw_local = str(row[col_local]).strip()
                if '-' in raw_local:
                    city, uf = raw_local.split('-')[:2]
                    region = ESTADO_PARA_REGIAO.get(uf.strip().upper(), 'NO')
                else: city = raw_local

            unique_code = f"{marca}-{modelo}-{medida}".replace(" ", "").replace("/", "")
            produto = db.query(Product).filter(Product.unique_code == unique_code).first()
            if not produto:
                produto = Product(name=f"{marca} {modelo} {medida}", brand=marca, width=medida, profile="", rim=aro, unique_code=unique_code)
                db.add(produto)
                db.commit()
                db.refresh(produto)

            novo = PriceHistory(
                product_id=produto.id, 
                competitor=competitor, 
                price=preco, 
                region=region, 
                city=city, 
                date_collected=data_coleta, # <--- Usa a data certa
                source="UPLOAD"
            )
            db.add(novo)
            count += 1
        except: continue
    
    db.commit()
    return {"status": "sucesso", "mensagem": f"{count} registros salvos."}

# --- FUNÇÃO CENTRAL DE FILTROS ---
def aplicar_filtros(query, region, brand, rim, competitor, search):
    if region and region != "Todas": query = query.filter(PriceHistory.region == region)
    if brand and brand != "Todas": query = query.filter(Product.brand == brand)
    if rim and rim != "Todos": query = query.filter(Product.rim == rim)
    if competitor and competitor != "Todos": query = query.filter(PriceHistory.competitor == competitor)
    
    # --- LÓGICA DA BUSCA GLOBAL (O input de texto) ---
    if search:
        termo = f"%{search}%"
        query = query.filter(or_(
            Product.name.ilike(termo),            # Busca no Produto
            Product.brand.ilike(termo),           # Busca na Marca
            Product.rim.ilike(termo),             # Busca no Aro (Ex: digita "14")
            PriceHistory.competitor.ilike(termo), # Busca na Empresa (Ex: "PMZ")
            PriceHistory.city.ilike(termo)        # Busca na Cidade
        ))
    return query

@app.get("/dashboard-data")
def get_dashboard_data(region: str=None, brand: str=None, rim: str=None, competitor: str=None, search: str=None, db: Session=Depends(get_db)):
    query = db.query(PriceHistory, Product).join(Product)
    query = aplicar_filtros(query, region, brand, rim, competitor, search)
    results = query.order_by(desc(PriceHistory.date_collected)).all()
    return [{"id": p.id, "produto": pr.name, "medida": pr.width, "marca": pr.brand, "aro": pr.rim, "concorrente": p.competitor, "city": p.city, "preco": p.price, "data": p.date_collected} for p, pr in results]

@app.get("/analytics")
def get_analytics(region: str=None, brand: str=None, rim: str=None, competitor: str=None, search: str=None, db: Session=Depends(get_db)):
    query = db.query(PriceHistory).join(Product)
    query = aplicar_filtros(query, region, brand, rim, competitor, search)

    total = query.count()
    all_competitors = db.query(PriceHistory.competitor).distinct().all()
    competitors_list = sorted([c[0] for c in all_competitors if c[0]])

    if total == 0:
        return {"total": 0, "media": 0, "minimo": 0, "top_aro": "-", "top_concorrente": "-", "competitors_list": competitors_list}

    media = query.with_entities(func.avg(PriceHistory.price)).scalar()
    minimo = query.with_entities(func.min(PriceHistory.price)).scalar()
    
    top_aro_q = db.query(Product.rim, func.count(PriceHistory.id)).join(Product)\
        .filter(PriceHistory.id.in_([p.id for p in query.all()]))\
        .group_by(Product.rim).order_by(desc(func.count(PriceHistory.id))).first()
    aro_mais_vendido = top_aro_q[0] if top_aro_q else "-"

    mais_barato = query.order_by(PriceHistory.price.asc()).first()
    concorrente_top = mais_barato.competitor if mais_barato else "-"

    return {"total": total, "media": round(media, 2), "minimo": round(minimo, 2), "top_aro": aro_mais_vendido, "top_concorrente": concorrente_top, "competitors_list": competitors_list}