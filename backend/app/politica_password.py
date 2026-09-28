"""Reglas de contraseña, en un solo lugar.

Deliberadamente pocas: exigir mayúsculas, números y símbolos produce
contraseñas más cortas y más olvidadas, no más seguras. La longitud es lo que
manda, y el bloqueo por intentos fallidos cubre el resto.
"""

MINIMO = 10

_OBVIAS = {
    "cambiar-esta-clave", "contrasena", "contraseña", "password",
    "12345678910", "ventanilla", "universidad",
}


def validar(password: str, usuario=None, anterior_hash=None) -> str | None:
    """Devuelve el motivo del rechazo, o None si la contraseña es aceptable."""
    if not password or len(password) < MINIMO:
        return f"La contraseña debe tener al menos {MINIMO} caracteres."

    plana = password.strip().lower()
    if plana in _OBVIAS:
        return "Esa contraseña es demasiado común. Elige otra."

    if usuario:
        if plana == usuario.identificador.lower():
            return "La contraseña no puede ser tu matrícula o usuario."
        if usuario.password_hash and usuario.verificar_password(password):
            return "La contraseña nueva debe ser distinta de la actual."

    return None
