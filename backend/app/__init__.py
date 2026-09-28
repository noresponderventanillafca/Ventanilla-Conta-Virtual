from flask import Flask, jsonify, request

from .config import Config
from .extensions import db, migrate, login_manager, cors


def crear_app(config=Config):
    app = Flask(__name__)
    app.config.from_object(config)

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
    LIBRES = {"/api/auth/password", "/api/auth/logout", "/api/auth/yo", "/api/auth/login"}

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

    @app.errorhandler(413)
    def archivo_grande(_):
        return jsonify({"error": "El archivo excede el tamaño permitido"}), 413

    return app
