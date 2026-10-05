from datetime import date

from flask import Blueprint, jsonify, request, send_file, current_app
from flask_login import login_required, current_user
from pathlib import Path

from ..extensions import db
from ..models import (
    Tramite, TipoDocumento, Archivo, TipoArchivo, Rol, MomentoPago, Evento,
)
from ..dominio import etapas as E
from ..dominio import servicios as S
from ..dominio.servicios import ErrorDominio
from ..seguridad import rol_requerido, puede_ver
from ..almacenamiento import guardar
from .. import notificaciones as N

bp = Blueprint("tramites", __name__)


@bp.errorhandler(ErrorDominio)
def error_dominio(e):
    db.session.rollback()
    return jsonify({"error": str(e)}), 400


def _obtener(folio):
    tramite = Tramite.query.filter_by(folio=folio).first_or_404()
    if not puede_ver(current_user, tramite):
        return None
    return tramite


def _visibles():
    """Todo trámite guardado es un trámite real: ya no existe estado borrador,
    porque el concepto del depósito no depende de un folio previo."""
    consulta = Tramite.query
    if current_user.rol == Rol.ALUMNO:
        return consulta.filter_by(alumno_id=current_user.id)
    if current_user.programa_id:
        consulta = consulta.filter_by(programa_id=current_user.programa_id)
    if current_user.rol == Rol.ADMINISTRADOR:
        # Un trámite sin costo nunca pasa por Administración. Mostrárselo no es
        # solo ruido: es exponerle el expediente de un alumno que no le compete.
        consulta = consulta.filter(Tramite.momento_pago != MomentoPago.SIN_COSTO)
    return consulta


# --------------------------------------------------------------------------
# Consulta
# --------------------------------------------------------------------------

@bp.get("")
@login_required
def listar():
    tramites = _visibles().order_by(Tramite.creado_en.desc()).all()
    return jsonify([S.tramite_a_dict(t) for t in tramites])


@bp.get("/bandeja")
@login_required
def bandeja():
    """Lo que le toca actuar al rol actual. Por omisión la secretaría no ve
    todos los trámites: ve los suyos."""
    tramites = [t for t in _visibles().all() if E.puede_actuar(current_user, t)]
    return jsonify([S.tramite_a_dict(t) for t in tramites])


@bp.get("/historial")
@login_required
def historial():
    """Los trámites en los que esta persona ya intervino.

    Secretaría y Administración ven únicamente los trámites en los que
    intervinieron. La vista completa del programa es de la Coordinación: ella
    supervisa el proceso y decide dónde hace falta empujar. Repartir esa vista
    da a cada persona acceso a expedientes de alumnos que nunca tocó, sin que
    nadie lo necesite para hacer su trabajo.

    La bandeja solo muestra lo pendiente; sin esta vista, un trámite concluido
    desaparecía de la vista de quien lo trabajó."""
    consulta = _visibles()
    if current_user.rol != Rol.COORDINADORA:
        mios = db.session.query(Evento.tramite_id).filter(
            Evento.autor_id == current_user.id
        ).distinct()
        consulta = consulta.filter(Tramite.id.in_(mios))
    tramites = consulta.order_by(Tramite.creado_en.desc()).all()
    return jsonify([S.tramite_a_dict(t) for t in tramites])


@bp.get("/retrasados")
@rol_requerido(Rol.COORDINADORA, Rol.SECRETARIA)
def retrasados():
    tramites = [t for t in _visibles().all() if E.esta_retrasado(t)]
    return jsonify([S.tramite_a_dict(t) for t in tramites])


@bp.get("/<folio>")
@login_required
def detalle(folio):
    tramite = _obtener(folio)
    if tramite is None:
        return jsonify({"error": "No tienes acceso a este trámite"}), 403
    return jsonify(S.tramite_a_dict(tramite, detallado=True))


# --------------------------------------------------------------------------
# Creación
# --------------------------------------------------------------------------

@bp.post("")
@rol_requerido(Rol.ALUMNO)
def crear():
    """Un documento por solicitud. Si el alumno necesita dos constancias,
    envía dos solicitudes con dos depósitos distintos."""
    tipo = db.session.get(TipoDocumento, request.form.get("tipo_documento_id", type=int)
                          or (request.get_json(silent=True) or {}).get("tipo_documento_id"))
    if not tipo or not tipo.activo:
        return jsonify({"error": "Ese documento no está disponible."}), 400

    datos_pago, meta = None, None
    if tipo.momento_pago == MomentoPago.AL_SOLICITAR:
        archivo = request.files.get("comprobante")
        if not archivo:
            raise ErrorDominio("Adjunta tu comprobante de pago.")
        meta = guardar(archivo, "temporal")
        datos_pago = {
            "fecha_deposito": date.fromisoformat(request.form.get("fecha_deposito")),
            "referencia_operacion": request.form.get("referencia_operacion", ""),
            "hash_archivo": meta["hash_sha256"],
        }

    tramite = S.crear_solicitud(
        current_user, tipo, datos_pago,
        observaciones=request.form.get("observaciones")
                      or (request.get_json(silent=True) or {}).get("observaciones"),
    )

    if meta:
        db.session.add(Archivo(
            tramite_id=tramite.id, tipo=TipoArchivo.COMPROBANTE_PAGO,
            subido_por_id=current_user.id, **meta,
        ))

    db.session.commit()
    N.tramite_iniciado(tramite, current_user)
    return jsonify(S.tramite_a_dict(tramite, detallado=True)), 201


# --------------------------------------------------------------------------
# Transiciones
# --------------------------------------------------------------------------

@bp.post("/<folio>/avanzar")
@login_required
def avanzar(folio):
    """Avance genérico: emitir línea de captura, entregar documento, etc.
    Quién puede hacerlo lo decide la máquina de estados, no el endpoint."""
    tramite = _obtener(folio)
    if tramite is None:
        return jsonify({"error": "No tienes acceso a este trámite"}), 403

    datos = request.get_json() or {}
    etapa = E.etapa_actual(tramite)

    if etapa.clave == "linea_captura":
        referencia = (datos.get("linea_captura") or "").strip()
        if not referencia:
            raise ErrorDominio("Registra la referencia de la línea de captura.")
        tramite.linea_captura = referencia
        texto = f"Línea de captura emitida — referencia {referencia}"
    else:
        texto = datos.get("texto") or etapa.nombre

    S.avanzar_etapa(tramite, current_user, texto)
    db.session.commit()
    return jsonify(S.tramite_a_dict(tramite, detallado=True))


@bp.post("/<folio>/comprobante")
@rol_requerido(Rol.ALUMNO)
def subir_comprobante(folio):
    """Solo para trámites con línea de captura: aquí el pago ocurre después
    de la solicitud, así que el comprobante llega en su propia etapa."""
    tramite = _obtener(folio)
    if tramite is None:
        return jsonify({"error": "No tienes acceso a este trámite"}), 403

    if E.etapa_actual(tramite).clave != "comprobante":
        raise ErrorDominio("Este trámite no está esperando tu comprobante.")

    archivo = request.files.get("comprobante")
    if not archivo:
        raise ErrorDominio("Adjunta tu comprobante de pago.")

    meta = guardar(archivo, tramite.folio)
    S.registrar_pago(tramite, {
        "fecha_deposito": date.fromisoformat(request.form.get("fecha_deposito")),
        "referencia_operacion": request.form.get("referencia_operacion", ""),
        "hash_archivo": meta["hash_sha256"],
    })
    db.session.add(Archivo(
        tramite_id=tramite.id, tipo=TipoArchivo.COMPROBANTE_PAGO,
        subido_por_id=current_user.id, **meta,
    ))
    S.avanzar_etapa(tramite, current_user, "Comprobante de pago enviado")
    db.session.commit()
    return jsonify(S.tramite_a_dict(tramite, detallado=True))


@bp.post("/<folio>/documento")
@rol_requerido(Rol.SECRETARIA)
def entregar_documento(folio):
    """Cierra el trámite. Secretaría sube los dos archivos a la vez: el recibo
    que Administración le entregó en físico y ya escaneó, y el documento que
    elaboró.

    Los dos son obligatorios. Sin recibo el alumno se queda sin comprobante de
    su pago; sin documento el trámite quedaría 'entregado' sin nada que
    entregar, y el alumno recibiría aviso de algo que no existe. El del recibo
    solo se exige cuando hubo pago."""
    tramite = _obtener(folio)
    if tramite is None:
        return jsonify({"error": "No tienes acceso a este trámite"}), 403

    if E.etapa_actual(tramite).clave != "elaboracion":
        raise ErrorDominio("Este trámite no está esperando el recibo y el documento.")

    documento = request.files.get("documento")
    if not documento:
        raise ErrorDominio("Adjunta el documento elaborado.")

    lleva_pago = tramite.momento_pago != MomentoPago.SIN_COSTO
    recibo = request.files.get("recibo")
    if lleva_pago and not recibo:
        raise ErrorDominio("Adjunta también el recibo escaneado que te entregó Administración.")

    if recibo and lleva_pago:
        db.session.add(Archivo(
            tramite_id=tramite.id, tipo=TipoArchivo.RECIBO,
            subido_por_id=current_user.id, **guardar(recibo, tramite.folio),
        ))
    db.session.add(Archivo(
        tramite_id=tramite.id, tipo=TipoArchivo.DOCUMENTO_FINAL,
        subido_por_id=current_user.id, **guardar(documento, tramite.folio),
    ))

    S.avanzar_etapa(tramite, current_user, "Recibo y documento entregados")
    db.session.commit()
    N.tramite_concluido(tramite, current_user)
    return jsonify(S.tramite_a_dict(tramite, detallado=True))


@bp.post("/<folio>/confirmar-pago")
@rol_requerido(Rol.ADMINISTRADOR)
def confirmar_pago(folio):
    """Administración coteja la referencia declarada contra el recibo que tiene
    a la mano y confirma que corresponde. No sube archivos: el recibo oficial lo
    genera fuera del sistema y se lo entrega en físico a Secretaría."""
    tramite = _obtener(folio)
    if tramite is None:
        return jsonify({"error": "No tienes acceso a este trámite"}), 403

    if E.etapa_actual(tramite).clave != "validacion":
        raise ErrorDominio("Este trámite no está esperando verificación de pago.")

    S.confirmar_pago(tramite, current_user)
    db.session.commit()
    return jsonify(S.tramite_a_dict(tramite, detallado=True))


@bp.post("/<folio>/rechazar-pago")
@rol_requerido(Rol.ADMINISTRADOR)
def rechazar_pago(folio):
    tramite = _obtener(folio)
    if tramite is None:
        return jsonify({"error": "No tienes acceso a este trámite"}), 403

    motivo = (request.get_json() or {}).get("motivo", "")
    S.rechazar_pago(tramite, current_user, motivo)
    db.session.commit()
    N.pago_rechazado(tramite, motivo, current_user)
    return jsonify(S.tramite_a_dict(tramite, detallado=True))


# --------------------------------------------------------------------------
# Comentarios y archivos
# --------------------------------------------------------------------------

@bp.post("/<folio>/comentarios")
@login_required
def comentar(folio):
    tramite = _obtener(folio)
    if tramite is None:
        return jsonify({"error": "No tienes acceso a este trámite"}), 403

    texto = request.form.get("texto") or (request.get_json() or {}).get("texto", "")
    evento = S.comentar(tramite, current_user, texto)

    archivo = request.files.get("adjunto")
    if archivo:
        meta = guardar(archivo, tramite.folio)
        db.session.add(Archivo(
            tramite_id=tramite.id, evento_id=evento.id,
            tipo=TipoArchivo.ANEXO_COMENTARIO,
            subido_por_id=current_user.id, **meta,
        ))

    db.session.commit()
    N.nuevo_comentario(tramite, current_user, E.etapa_actual(tramite))
    return jsonify(S.tramite_a_dict(tramite, detallado=True))


@bp.get("/<folio>/archivos/<int:archivo_id>")
@login_required
def ver_archivo(folio, archivo_id):
    """Por omisión se sirve EN LÍNEA, para poder revisar el comprobante sin
    descargarlo. Con ?descargar=1 se entrega como adjunto."""
    tramite = _obtener(folio)
    if tramite is None:
        return jsonify({"error": "No tienes acceso a este trámite"}), 403

    archivo = db.session.get(Archivo, archivo_id)
    if not archivo or archivo.tramite_id != tramite.id:
        return jsonify({"error": "Archivo no encontrado"}), 404

    ruta = Path(current_app.config["RUTA_ARCHIVOS"]) / archivo.ruta_relativa
    if not ruta.exists():
        return jsonify({"error": "El archivo ya no está en el servidor"}), 404

    adjunto = request.args.get("descargar") == "1"
    respuesta = send_file(
        ruta,
        mimetype=archivo.mime,
        download_name=archivo.nombre_original,
        as_attachment=adjunto,
        conditional=True,
    )
    # Estos archivos los suben los usuarios. Servirlos en línea sin blindaje
    # permitiría que un PDF con scripts se ejecute en el contexto del sitio.
    respuesta.headers["X-Content-Type-Options"] = "nosniff"
    respuesta.headers["Content-Security-Policy"] = "default-src 'none'; sandbox; object-src 'self'"
    return respuesta
