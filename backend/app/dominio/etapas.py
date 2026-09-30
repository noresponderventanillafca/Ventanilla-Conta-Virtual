"""Definición de las etapas por tipo de trámite.

Este módulo es la única fuente de verdad del recorrido. Si cambia el proceso,
se cambia aquí y el resto del sistema —API, pantallas, semáforo de retrasos—
se ajusta solo. No hay tres flujos: hay un recorrido que se arma a partir de
`momento_pago`.
"""

from dataclasses import dataclass
from datetime import date, timedelta

from ..models import MomentoPago, Rol

ALUMNO = Rol.ALUMNO
SECRETARIA = Rol.SECRETARIA
ADMINISTRADOR = Rol.ADMINISTRADOR


@dataclass(frozen=True)
class Etapa:
    clave: str
    nombre: str
    actor: Rol | None      # quién debe actuar; None = etapa terminal
    dias_max: int | None   # plazo en días hábiles; None = sin plazo


_SIN_COSTO = [
    Etapa("solicitud", "Solicitud registrada", ALUMNO, None),
    Etapa("elaboracion", "Recibo y documento", SECRETARIA, 3),
    Etapa("entregado", "Documento entregado", None, None),
]

_AL_SOLICITAR = [
    Etapa("solicitud_pago", "Solicitud y comprobante enviados", ALUMNO, None),
    Etapa("validacion", "Verificación del pago", ADMINISTRADOR, 2),
    Etapa("elaboracion", "Recibo y documento", SECRETARIA, 3),
    Etapa("entregado", "Documento entregado", None, None),
]

_TRAS_LINEA = [
    Etapa("solicitud", "Solicitud registrada", ALUMNO, None),
    Etapa("linea_captura", "Línea de captura emitida", SECRETARIA, 2),
    Etapa("comprobante", "Comprobante de pago", ALUMNO, 5),
    Etapa("validacion", "Verificación del pago", ADMINISTRADOR, 2),
    Etapa("elaboracion", "Recibo y documento", SECRETARIA, 3),
    Etapa("entregado", "Documento entregado", None, None),
]

_MAPA = {
    MomentoPago.SIN_COSTO: _SIN_COSTO,
    MomentoPago.AL_SOLICITAR: _AL_SOLICITAR,
    MomentoPago.TRAS_LINEA_DE_CAPTURA: _TRAS_LINEA,
}


def etapas_de(momento_pago: MomentoPago) -> list[Etapa]:
    return _MAPA[momento_pago]


def etapas_de_tramite(tramite) -> list[Etapa]:
    """Se lee del trámite, NO del tipo de documento vigente. Si la coordinadora
    cambia el catálogo, los trámites en curso no deben cambiar de recorrido:
    uno que iba en la etapa 2 de 3 pasaría a ser la 2 de 4, que es otra cosa."""
    return etapas_de(tramite.momento_pago)


def etapa_actual(tramite) -> Etapa:
    return etapas_de_tramite(tramite)[tramite.etapa_idx]


def esta_concluido(tramite) -> bool:
    return tramite.etapa_idx >= len(etapas_de_tramite(tramite)) - 1


def indice_de(tramite, clave: str) -> int | None:
    for i, e in enumerate(etapas_de_tramite(tramite)):
        if e.clave == clave:
            return i
    return None


def dias_habiles_desde(desde, hasta=None) -> int:
    """Días hábiles transcurridos. No contempla días festivos oficiales:
    si la facultad quiere ese detalle, hace falta una tabla de asuetos."""
    hasta = hasta or date.today()
    inicio = desde.date() if hasattr(desde, "date") else desde
    dias, cursor = 0, inicio
    while cursor < hasta:
        cursor += timedelta(days=1)
        if cursor.weekday() < 5:
            dias += 1
    return dias


def esta_retrasado(tramite) -> bool:
    if esta_concluido(tramite):
        return False
    etapa = etapa_actual(tramite)
    if etapa.dias_max is None:
        return False
    return dias_habiles_desde(tramite.desde) > etapa.dias_max


def puede_actuar(usuario, tramite) -> bool:
    """La coordinadora observa todo pero no ejecuta etapas: su rol es de
    supervisión, y esa visibilidad es estructural, no un favor de los demás."""
    if esta_concluido(tramite):
        return False
    etapa = etapa_actual(tramite)
    if etapa.actor is None:
        return False
    if etapa.actor == ALUMNO:
        return usuario.rol == ALUMNO and tramite.alumno_id == usuario.id
    return usuario.rol == etapa.actor
