from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(BASE_DIR, "tireforce.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

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
    marca_interna = Column(String)  # Barum/Continental (MARCA)
    model_interno = Column(String)  # 5HM/ContiCrossContact (MODELO)
    marca_concorrente = Column(String)  # Firestone/Goodyear (Marca)
    width = Column(String)
    profile = Column(String)
    rim = Column(String)
    unique_code = Column(String, unique=True, index=True)

class PriceHistory(Base):
    __tablename__ = "price_history"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    competitor = Column(String)
    competitor_brand = Column(String)  # Marca Concorrente
    competitor_model = Column(String)  # Modelo Concorrente
    price = Column(Float)
    mkp = Column(Float, default=0.0)
    origin = Column(String, default="-")
    sell_in = Column(Float, default=0.0)
    date_collected = Column(DateTime, default=datetime.utcnow)
    source = Column(String)
    region = Column(String, default="BR")
    city = Column(String, default="")

# Cria as tabelas
Base.metadata.create_all(bind=engine)