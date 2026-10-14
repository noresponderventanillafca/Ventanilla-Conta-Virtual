import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


# Valor de respaldo SOLO para desarrollo. En producción se exige uno real:
# con esta clave cualquiera que vea el repositorio podría firmarse una cookie
# de sesión y entrar como coordinación.
CLAVE_DE_DESARROLLO = "desarrollo-inseguro"


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", CLAVE_DE_DESARROLLO)
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # InnoDB y utf8mb4 en toda tabla creada por las migraciones.
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 3600}

    # "local" en desarrollo, "s3" en producción. El disco de los servidores
    # gratuitos es efímero: lo subido desaparece en cada reinicio.
    ALMACENAMIENTO = os.getenv("ALMACENAMIENTO", "local")
    RUTA_ARCHIVOS = os.getenv("RUTA_ARCHIVOS", "./archivos")

    S3_ENDPOINT = os.getenv("S3_ENDPOINT")
    S3_CLAVE = os.getenv("S3_CLAVE")
    S3_SECRETO = os.getenv("S3_SECRETO")
    S3_BUCKET = os.getenv("S3_BUCKET")
    S3_REGION = os.getenv("S3_REGION", "auto")
    MAX_CONTENT_LENGTH = int(os.getenv("TAMANIO_MAX_MB", 5)) * 1024 * 1024
    EXTENSIONES_PERMITIDAS = {".pdf", ".jpg", ".jpeg", ".png"}

    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    # Base de los enlaces que van en los correos. En producción es el dominio
    # real; si queda mal, los correos llevan enlaces rotos.
    URL_PUBLICA = os.getenv("URL_PUBLICA", "http://localhost:5173")

    SESSION_COOKIE_HTTPONLY = True
    # Lax es correcto PORQUE el frontend llama al backend a través del proxy de
    # Netlify, así que para el navegador es el mismo sitio. Si algún día se
    # llama al backend directamente desde otro dominio, esto deja de funcionar
    # y la respuesta no es poner "None": es volver a poner un proxy delante.
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("FLASK_ENV") == "production"

    # Caducidad de la sesión. Antes no había ninguna: la cookie solo moría al
    # cerrar el navegador, así que una pestaña olvidada en una laptop seguía
    # siendo una sesión válida al día siguiente, y cualquiera que llegara a esa
    # computadora entraba sin contraseña.
    #
    # Dos límites, porque protegen de cosas distintas:
    #
    #   INACTIVIDAD — ventana rodante, se renueva con cada petición. Cubre la
    #   computadora que alguien deja abierta y se va.
    #
    #   TOPE ABSOLUTO — desde el momento de entrar, pase lo que pase. Cubre la
    #   sesión que se mantiene viva sola y obliga a volver a escribir la
    #   contraseña al menos una vez al día.
    #
    # La ventana del servidor es más holgada que la del navegador a propósito:
    # así quien cierra sesión es la interfaz, con un aviso y la oportunidad de
    # seguir, en vez de un 401 seco a media captura.
    PERMANENT_SESSION_LIFETIME = timedelta(
        minutes=int(os.getenv("SESION_INACTIVIDAD_MINUTOS", 30))
    )
    SESSION_REFRESH_EACH_REQUEST = True
    SESION_MAXIMA_HORAS = int(os.getenv("SESION_MAXIMA_HORAS", 12))

    # Render y otros proxys terminan el TLS antes de la aplicación. Sin esto,
    # Flask cree que la conexión es HTTP y no manda la cookie marcada Secure.
    DETRAS_DE_PROXY = os.getenv("FLASK_ENV") == "production"

    # "smtp", "google", "brevo", "mailjet" o "resend". Los servidores gratuitos bloquean
    # los puertos de correo saliente; las API funcionan por HTTPS, que nunca se
    # bloquea. Hay varias porque conseguir que activen la cuenta es lo difícil.
    # strip() además de lower(): un espacio al final, que el panel de Render no
    # muestra, haría que «google » no coincidiera y el envío se fuera por SMTP
    # sin avisar.
    CORREO_PROVEEDOR = os.getenv("CORREO_PROVEEDOR", "smtp").strip().lower()
    CORREO_API_CLAVE = os.getenv("CORREO_API_CLAVE")
    # Solo para CORREO_PROVEEDOR=google: la URL del script, termina en /exec.
    CORREO_API_URL = os.getenv("CORREO_API_URL")

    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PUERTO = int(os.getenv("SMTP_PUERTO", 587))
    SMTP_TIMEOUT = int(os.getenv("SMTP_TIMEOUT", 20))
    # Ver notificaciones.py: en servidores que se duermen, el envío en segundo
    # plano pierde correos sin dejar rastro.
    CORREO_ASINCRONO = os.getenv("CORREO_ASINCRONO", "").lower() == "true"
    SMTP_USUARIO = os.getenv("SMTP_USUARIO")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    CORREO_REMITENTE = os.getenv("CORREO_REMITENTE")
