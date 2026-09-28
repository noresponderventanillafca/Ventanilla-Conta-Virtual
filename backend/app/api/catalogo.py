from flask import Blueprint, jsonify
from flask_login import login_required, current_user

from ..models import TipoDocumento, CuentaInstitucional

bp = Blueprint("catalogo", __name__)


@bp.get("/documentos")
@login_required
def documentos():
    """Devuelve el concepto de depósito ya armado para este alumno.

    Es lo que permite mostrarlo desde que elige el documento, antes de pagar.
    Los alumnos depositan de memoria: si el concepto dependiera de un folio que
    el sistema genera al solicitar, llegaría tarde."""
    consulta = TipoDocumento.query.filter_by(activo=True)
    if current_user.programa_id:
        consulta = consulta.filter_by(programa_id=current_user.programa_id)

    matricula = current_user.identificador if current_user.es_alumno else None
    return jsonify([t.a_dict(matricula) for t in consulta.order_by(TipoDocumento.nombre).all()])


@bp.get("/cuenta")
@login_required
def cuenta_institucional():
    """Los datos bancarios son configuración, no código: la Coordinación los
    edita desde Ajustes sin que nadie toque el sistema."""
    cuenta = CuentaInstitucional.query.filter_by(
        programa_id=current_user.programa_id
    ).first()
    if not cuenta:
        return jsonify({"banco": "", "titular": "", "cuenta": "", "clabe": "",
                        "sin_configurar": True})
    return jsonify(cuenta.a_dict())
