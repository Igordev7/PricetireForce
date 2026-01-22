from database import SessionLocal, User

def create_new_user():
    print("Cadastro de novo CLiente")
    email = input("Digite o Email do cliente")
    password= input("Digite a senha:")
    company= input("Nome da Empresa:")

    db = SessionLocal()

    existing_user = db.query(User).filter(User.email == email).firts()
    if existing_user:
        print(f"O emaiil {email} ja está caastrado!")
        return
    
    new_user = User(email = email,
                    password = password,
                    company = company)
    
    try:
        db.add(new_user)
        db.commit()
        print(f"Sucesso! Cliente '{company}' cadastrado")
    except Exception as e:
        print(f"erro ao salvar: {e}")
    finally:
        db.close()
if __name__ == "__main__":
    create_new_user()