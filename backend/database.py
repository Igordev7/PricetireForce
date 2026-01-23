from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os 

# --- CORREÇÃO DO CAMINHO DO BANCO ---
# Isso pega a pasta onde este arquivo (database.py) está, não importa onde o terminal esteja
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(BASE_DIR, "tireforce.db")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"
# ------------------------------------

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# --- MODELOS (TABELAS) ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    company = Column(String)

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    brand = Column(String)
    width = Column(String)
    profile = Column(String)
    rim = Column(String)
    unique_code = Column(String, unique=True, index=True)

class PriceHistory(Base):
    __tablename__ = "price_history"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    competitor = Column(String)
    price = Column(Float)
    date_collected = Column(DateTime, default=datetime.utcnow)
    source = Column(String)
    region = Column(String, default="BR") # Ex: Norte, Sul
    city = Column(String, default="")