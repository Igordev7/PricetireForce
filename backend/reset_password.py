from database import SessionLocal, User
import sys

def reset_password():
    db = SessionLocal()
    
    # Vamos listar quem existe para você ver o email exato
    print("--- USUÁRIOS ENCONTRADOS ---")
    users = db.query(User).all()
    for u in users:
        print(f"ID: {u.id} | Email: '{u.email}' (Copie este email exato)")
    print("----------------------------")

    target_email = input("\nDigite o email EXATO que você quer resetar: ").strip()
    
    user = db.query(User).filter(User.email == target_email).first()
    
    if not user:
        print("❌ Usuário não encontrado! Verifique se digitou igualzinho a lista acima.")
        return

    new_pass = input(f"Digite a nova senha para {user.company}: ").strip()
    
    user.password = new_pass
    db.commit()
    print(f"✅ SUCESSO! Senha de {user.email} alterada para '{new_pass}'")
    db.close()

if __name__ == "__main__":
    reset_password()