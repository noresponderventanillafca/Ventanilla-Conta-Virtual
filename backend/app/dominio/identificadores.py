"""Cómo se escriben las matrículas y los usuarios del personal.

Vive aquí y no en cada endpoint porque es una sola regla con dos mitades que
tienen que encajar: alumnos y personal comparten la columna «identificador» de
la tabla de usuarios, así que lo que una acepta la otra tiene que rechazarlo.

La matrícula de la UV es la letra S seguida de ocho dígitos (S00000000). Esa
forma es lo que separa los dos espacios de nombres: mientras el personal no
pueda usarla, una colisión es imposible —incluso con un alumno que todavía no
está en el padrón, que es el caso que una comprobación contra la base de datos
no alcanza a ver—.
"""
import re

# S + 8 dígitos. Si alguna vez aparece una matrícula con otro formato (un
# alumno de intercambio, un plan antiguo), es esta línea la que hay que tocar,
# y conviene revisar a la vez que no choque con algún usuario del personal.
MATRICULA = re.compile(r"^S\d{8}$")

# Personal: letras y dígitos. Se permiten números porque los hay en uso, pero
# la forma de matrícula queda excluida arriba.
IDENTIFICADOR_PERSONAL = re.compile(r"^[A-Z0-9Ñ]{2,20}$")

EJEMPLO_MATRICULA = "S23012345"


def es_matricula(texto: str) -> bool:
    return bool(MATRICULA.match((texto or "").strip().upper()))


def motivo_matricula_invalida(texto: str) -> str | None:
    """Devuelve el motivo del rechazo, o None si la matrícula es válida."""
    limpio = (texto or "").strip().upper()
    if not limpio:
        return "La matrícula es obligatoria."
    if not MATRICULA.match(limpio):
        return (f"«{limpio}» no tiene forma de matrícula. Debe ser la letra S "
                f"seguida de ocho dígitos, como {EJEMPLO_MATRICULA}.")
    return None


def motivo_identificador_invalido(texto: str) -> str | None:
    """Devuelve el motivo del rechazo, o None si el usuario es válido."""
    limpio = (texto or "").strip().upper()
    if not IDENTIFICADOR_PERSONAL.match(limpio):
        return ("El usuario debe tener entre 2 y 20 caracteres: letras o "
                "números, sin espacios, acentos ni signos.")
    if MATRICULA.match(limpio):
        return (f"«{limpio}» tiene forma de matrícula (S y ocho dígitos), que "
                "está reservada para los alumnos. Si coincidiera con la de "
                "alguien, esa persona no podría activar su cuenta.")
    return None
