import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "desarrollo-inseguro")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # InnoDB y utf8mb4 en toda tabla creada por las migraciones.
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 3600}

    RUTA_ARCHIVOS = os.getenv("RUTA_ARCHIVOS", "./archivos")
    MAX_CONTENT_LENGTH = int(os.getenv("TAMANIO_MAX_MB", 5)) * 1024 * 1024
    EXTENSIONES_PERMITIDAS = {".pdf", ".jpg", ".jpeg", ".png"}

    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    # Base de los enlaces que van en los correos. En producción es el dominio
    # real; si queda mal, los correos llevan enlaces rotos.
    URL_PUBLICA = os.getenv("URL_PUBLICA", "http://localhost:5173")

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("FLASK_ENV") == "production"

    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PUERTO = int(os.getenv("SMTP_PUERTO", 587))
    SMTP_TIMEOUT = int(os.getenv("SMTP_TIMEOUT", 20))
    SMTP_USUARIO = os.getenv("SMTP_USUARIO")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    CORREO_REMITENTE = os.getenv("CORREO_REMITENTE")
