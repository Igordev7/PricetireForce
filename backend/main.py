from fastapi import FastAPI, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import pandas as pd
import io
from datetime import datetime
from database import SessionLocal, User, Product, PriceHistory

app = FastAPI()

# Configuração de CORS
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

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or user.password != data.password:
        return {"status": "erro", "message": "Dados incorretos"}
    return {"status": "sucesso", "user": user.email, "company": user.company}

# --- NOVA ROTA: UPLOAD DE ARQUIVO ---
@app.post("/upload")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    print(f"Recebendo arquivo: {file.filename}")
    
    # 1. Ler o arquivo (seja CSV ou Excel)
    contents = await file.read()
    if file.filename.endswith('.csv'):
        df = pd.read_csv(io.BytesIO(contents))
    else:
        df = pd.read_excel(io.BytesIO(contents))
    
    # 2. Processar linha por linha
    # Assumindo que o CSV tem colunas: Medida, Marca, Modelo, Aro, Preço Sell Out (R$), Empresa
    count_novos = 0
    
    for index, row in df.iterrows():
        # Limpeza básica
        marca = str(row.get('Marca', '')).upper().strip()
        modelo = str(row.get('Modelo', '')).upper().strip()
        medida = str(row.get('Medida', '')).strip()
        aro = str(row.get('Aro', '')).strip()
        preco = float(str(row.get('Preço Sell Out (R$)', 0)).replace(',', '.'))
        empresa = str(row.get('Empresa', 'Desconhecida'))

        # Criar código único para não duplicar produto
        unique_code = f"{marca}-{modelo}-{medida}".replace(" ", "").replace("/", "")

        # A. Verifica se o produto já existe
        produto = db.query(Product).filter(Product.unique_code == unique_code).first()
        
        if not produto:
            # Se não existe, cria
            produto = Product(
                name=f"Pneu {marca} {modelo} {medida}",
                brand=marca,
                width=medida.split('/')[0] if '/' in medida else medida,
                profile=medida.split('/')[1].split(' ')[0] if '/' in medida else '',
                rim=aro,
                unique_code=unique_code
            )
            db.add(produto)
            db.commit()
            db.refresh(produto)
            count_novos += 1

        # B. Salva o Preço no Histórico
        novo_preco = PriceHistory(
            product_id=produto.id,
            competitor=empresa,
            price=preco,
            date_collected=datetime.now(),
            source="IMPORTACAO_CSV"
        )
        db.add(novo_preco)
    
    db.commit()
    
    return {"status": "sucesso", "mensagem": f"Processado! {count_novos} novos produtos cadastrados."}

# --- ROTA PARA O DASHBOARD (Listar os dados) ---
@app.get("/dashboard-data")
def get_dashboard_data(db: Session = Depends(get_db)):
    # Query que busca os preços mais recentes
    results = db.query(PriceHistory, Product).join(Product).all()
    
    data = []
    for price, prod in results:
        data.append({
            "id": price.id,
            "produto": prod.name,
            "medida": f"{prod.width}/{prod.profile} R{prod.rim}",
            "marca": prod.brand,
            "concorrente": price.competitor,
            "preco": price.price,
            "data": price.date_collected
        })
    return data