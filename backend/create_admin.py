from sqlalchemy.orm import Session
from database import SessionLocal, engine, User, Base

# Garante que as tabelas existem
Base.metadata.create_all(bind=engine)

def create_super_user():
    db = SessionLocal()
    
    # Verifica se já existe
    user = db.query(User).filter(User.email == "admin@tireforce.com").first()
    if user:
        print("Usuário Admin já existe!")
        return

    # Cria o novo usuário
    new_user = User(
        email="admin@tireforce.com",
        password="123",  # Senha simples para teste (em produção usaríamos hash)
        company="Admin Master"
    )
    
    db.add(new_user)
    db.commit()
    print("✅ Usuário criado: admin@tireforce.com / Senha: 123")
    db.close()

if __name__ == "__main__":
    create_super_user()