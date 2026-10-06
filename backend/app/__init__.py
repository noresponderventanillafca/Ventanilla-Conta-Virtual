import os

from flask import Flask, jsonify, request

from .config import Config, CLAVE_DE_DESARROLLO
from .extensions import db, migrate, login_manager, cors


def _revisar_produccion(app):
    """Falla al arrancar en vez de funcionar mal en silencio.

    Una SECRET_KEY sin configurar no produce ningún error visible: el sistema
    arranca, la gente entra, y la cookie de sesión queda firmada con una clave
    que está escrita en el repositorio. Mejor no arrancar.
    """
    if app.config.get("FLASK_ENV") != "production" and os.getenv("FLASK_ENV") != "production":
        return

    problemas = []
    if app.config.get("SECRET_KEY") in (None, "", CLAVE_DE_DESARROLLO):
        problemas.append(
            "SECRET_KEY no está configurada. Sin ella las sesiones se firman con "
            "una clave pública y cualquiera podría entrar como coordinación."
        )
    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        problemas.append("DATABASE_URL no está configurada.")

    if problemas:
        raise RuntimeError(
            "No se puede arrancar en producción:\n  - " + "\n  - ".join(problemas)
        )

    # Esto no impide arrancar, pero rompe los correos y conviene verlo en el log.
    if not app.config.get("URL_PUBLICA"):
        app.logger.warning(
            "URL_PUBLICA no está configurada: los enlaces de los correos saldrán rotos."
        )


def crear_app(config=Config):
    app = Flask(__name__)
    app.config.from_object(config)
    _revisar_produccion(app)

    if app.config.get("DETRAS_DE_PROXY"):
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    cors.init_app(
        app,
        supports_credentials=True,
        origins=[app.config["FRONTEND_ORIGIN"]],
    )

    # El SPA recibe JSON, no redirecciones al login.
    login_manager.unauthorized_handler(
        lambda: (jsonify({"error": "No has iniciado sesión"}), 401)
    )

    from .models import Usuario

    @login_manager.user_loader
    def cargar_usuario(user_id):
        return db.session.get(Usuario, int(user_id))

    from .api.auth import bp as bp_auth
    from .api.catalogo import bp as bp_catalogo
    from .api.tramites import bp as bp_tramites
    from .api.padron import bp as bp_padron
    from .api.ajustes import bp as bp_ajustes
    from .api.usuarios import bp as bp_usuarios

    app.register_blueprint(bp_auth, url_prefix="/api/auth")
    app.register_blueprint(bp_catalogo, url_prefix="/api/catalogo")
    app.register_blueprint(bp_tramites, url_prefix="/api/tramites")
    app.register_blueprint(bp_padron, url_prefix="/api/padron")
    app.register_blueprint(bp_ajustes, url_prefix="/api/ajustes")
    app.register_blueprint(bp_usuarios, url_prefix="/api/usuarios")

    # Con contraseña temporal, el servidor bloquea todo salvo cambiarla.
    # Dejarlo solo en la interfaz no serviría: la API es accesible directamente.
    LIBRES = {"/api/auth/password", "/api/auth/logout", "/api/auth/yo",
              "/api/auth/login", "/api/salud"}

    @app.before_request
    def exigir_cambio_de_password():
        from flask_login import current_user
        if not request.path.startswith("/api/"):
            return None
        if request.path in LIBRES or request.method == "OPTIONS":
            return None
        if current_user.is_authenticated and current_user.debe_cambiar_password:
            return jsonify({
                "error": "Debes cambiar tu contraseña temporal antes de continuar.",
                "codigo": "password_temporal",
            }), 403
        return None

    @app.get("/api/salud")
    def salud():
        """Sin sesión a propósito: sirve para que un monitor externo mantenga
        despierto el servicio y para ver de un vistazo si la base y el almacén
        de archivos responden."""
        from sqlalchemy import text
        from .almacenamiento import comprobar

        try:
            db.session.execute(text("SELECT 1"))
            base = "ok"
        except Exception as e:
            base = f"falla: {type(e).__name__}"

        archivos = comprobar() or "ok"
        bien = base == "ok" and archivos == "ok"
        return jsonify({
            "base_de_datos": base,
            "archivos": archivos,
            "almacenamiento": app.config.get("ALMACENAMIENTO"),
            "correo": "configurado" if app.config.get("SMTP_HOST") else "solo a la consola",
            "enlaces_de_correo": app.config.get("URL_PUBLICA") or
                                 "SIN CONFIGURAR — los correos saldrán con enlaces rotos",
        }), (200 if bien else 503)

    @app.errorhandler(413)
    def archivo_grande(_):
        return jsonify({"error": "El archivo excede el tamaño permitido"}), 413

    return app
