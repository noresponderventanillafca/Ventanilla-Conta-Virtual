"""Carga del padrón de alumnos.

Con 200 alumnos hoy y 800 en unos años, dar de alta a mano no es viable. El
padrón es lo que cierra el sistema: quien no está aquí no puede activar cuenta,
así que no hay registro abierto ni alumnos de otras facultades.
"""

import csv
import io

from flask import Blueprint, jsonify, request
from flask_login import current_user

from ..extensions import db
from ..models import PadronAlumno, Rol
from ..seguridad import rol_requerido

bp = Blueprint("padron", __name__)

COLUMNAS = ["matricula", "curp_prefijo", "nombre", "correo_institucional"]


@bp.get("")
@rol_requerido(Rol.SECRETARIA, Rol.COORDINADORA)
def listar():
    consulta = PadronAlumno.query
    if current_user.programa_id:
        consulta = consulta.filter_by(programa_id=current_user.programa_id)
    registros = consulta.order_by(PadronAlumno.matricula).all()
    return jsonify({
        "total": len(registros),
        "activados": sum(1 for r in registros if r.activado),
        "alumnos": [
            {"matricula": r.matricula, "nombre": r.nombre,
             "correo": r.correo_institucional, "activado": r.activado}
            for r in registros
        ],
    })


@bp.post("/cargar")
@rol_requerido(Rol.SECRETARIA)
def cargar():
    """Acepta un CSV con: matricula, curp_prefijo, nombre, correo_institucional.

    Procesa fila por fila y devuelve el detalle de lo que falló, en lugar de
    rechazar el archivo completo por un error: con cientos de renglones,
    'el archivo tiene un error' no sirve de nada.
    """
    archivo = request.files.get("archivo")
    if not archivo:
        return jsonify({"error": "Adjunta el archivo CSV."}), 400

    try:
        texto = archivo.read().decode("utf-8-sig")
    except UnicodeDecodeError:
        return jsonify({
            "error": "El archivo no está en UTF-8. Si lo exportaste de Excel, "
                     "guárdalo como «CSV UTF-8» para que los acentos no se corrompan."
        }), 400

    lector = csv.DictReader(io.StringIO(texto))
    faltantes = [c for c in COLUMNAS if c not in (lector.fieldnames or [])]
    if faltantes:
        return jsonify({"error": f"Faltan columnas en el CSV: {', '.join(faltantes)}"}), 400

    creados, actualizados, errores = 0, 0, []

    for n, fila in enumerate(lector, start=2):
        matricula = (fila.get("matricula") or "").strip().upper()
        curp = (fila.get("curp_prefijo") or "").strip().upper()
        nombre = (fila.get("nombre") or "").strip()
        correo = (fila.get("correo_institucional") or "").strip()

        if not matricula or not nombre or not correo:
            errores.append({"fila": n, "motivo": "Matrícula, nombre o correo vacíos"})
            continue
        if len(curp) != 10:
            errores.append({"fila": n, "motivo": f"El prefijo de CURP debe tener 10 caracteres ({matricula})"})
            continue

        registro = PadronAlumno.query.filter_by(matricula=matricula).first()
        if registro:
            # Nunca se toca `activado`: si el alumno ya definió su contraseña,
            # recargar el padrón no debe desactivarle la cuenta.
            registro.curp_prefijo = curp
            registro.nombre = nombre
            registro.correo_institucional = correo
            actualizados += 1
        else:
            db.session.add(PadronAlumno(
                matricula=matricula, curp_prefijo=curp, nombre=nombre,
                correo_institucional=correo, programa_id=current_user.programa_id,
            ))
            creados += 1

    db.session.commit()
    return jsonify({"creados": creados, "actualizados": actualizados, "errores": errores})
