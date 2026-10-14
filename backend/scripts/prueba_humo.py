"""Recorre los tres flujos completos contra una base temporal.

    python -m scripts.prueba_humo

Córrelo después de cada cambio al modelo o a la API. Es lo que detecta los
residuos que el intérprete no ve: una consulta que filtra por una columna que
ya no existe compila bien y solo revienta cuando alguien abre esa pantalla.
"""
import io
import os
import sys
import tempfile
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

tmp = tempfile.mkdtemp(prefix="ventanilla-prueba-")
os.environ["DATABASE_URL"] = f"sqlite:///{tmp}/prueba.db"
os.environ.setdefault("SECRET_KEY", "prueba")
os.environ["RUTA_ARCHIVOS"] = f"{tmp}/archivos"

from app import crear_app
from app.extensions import db
from app.models import Programa, Usuario, Rol, TipoDocumento, MomentoPago

app = crear_app()
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {}

fallos = []
contador = [0]


def archivo(nombre):
    contador[0] += 1
    return (io.BytesIO(f"%PDF-1.4 archivo {contador[0]}".encode()), nombre)


def main():
    with app.app_context():
        db.drop_all()
        db.create_all()
        prog = Programa(clave="CV", nombre="Contaduría Virtual")
        db.session.add(prog)
        db.session.flush()

        tipos = {}
        for clave, nombre, costo, mp in [
            ("CONST", "Constancia", 180, MomentoPago.AL_SOLICITAR),
            ("KARDEX", "Kardex", 0, MomentoPago.SIN_COSTO),
            ("TITUL", "Titulación", 1450, MomentoPago.TRAS_LINEA_DE_CAPTURA),
        ]:
            t = TipoDocumento(programa_id=prog.id, clave=clave, nombre=nombre,
                              costo=costo, momento_pago=mp)
            db.session.add(t)
            db.session.flush()
            tipos[clave] = t.id

        ids = {}
        for ident, nombre, rol in [
            ("S23012345", "Ana Ruiz", Rol.ALUMNO), ("SEC", "Secretaría", Rol.SECRETARIA),
            ("ADM", "Administración", Rol.ADMINISTRADOR), ("COORD", "Coordinación", Rol.COORDINADORA),
        ]:
            u = Usuario(identificador=ident, nombre=nombre, correo=f"{ident}@uv.mx",
                        rol=rol, programa_id=prog.id)
            u.definir_password("contrasena-larga")
            u.notificaciones_todas = False
            db.session.add(u)
            db.session.flush()
            ids[rol] = u.id
        db.session.commit()

    cliente = app.test_client()

    def sesion(rol):
        with cliente.session_transaction() as s:
            s["_user_id"] = str(ids[rol])
            s["_fresh"] = True

    def chk(nombre, respuesta, esperado=200):
        ok = respuesta.status_code == esperado
        print(f"  {'ok  ' if ok else 'FALLA'} {nombre}: {respuesta.status_code}")
        if not ok:
            fallos.append((nombre, respuesta.get_data(as_text=True)[:200]))
        return respuesta.get_json() if respuesta.is_json else None

    hoy = date.today().isoformat()
    mp = "multipart/form-data"

    print("Alumno")
    sesion(Rol.ALUMNO)
    chk("catálogo", cliente.get("/api/catalogo/documentos"))
    chk("lista", cliente.get("/api/tramites"))
    t1 = chk("crear con pago", cliente.post("/api/tramites", data={
        "tipo_documento_id": tipos["CONST"], "fecha_deposito": hoy,
        "referencia_operacion": "OP-1", "comprobante": archivo("r1.pdf"),
        "observaciones": "Dirigida a la Secretaría de Educación de Veracruz."},
        content_type=mp), 201)
    if t1 and t1.get("observaciones") != "Dirigida a la Secretaría de Educación de Veracruz.":
        fallos.append(("las observaciones del alumno no se guardaron", str(t1.get("observaciones"))))
    t2 = chk("crear sin costo", cliente.post("/api/tramites", data={
        "tipo_documento_id": tipos["KARDEX"]}, content_type=mp), 201)
    t3 = chk("crear con línea de captura", cliente.post("/api/tramites", data={
        "tipo_documento_id": tipos["TITUL"]}, content_type=mp), 201)
    chk("sin comprobante se rechaza", cliente.post("/api/tramites", data={
        "tipo_documento_id": tipos["CONST"], "fecha_deposito": hoy,
        "referencia_operacion": "OP-X"}, content_type=mp), 400)
    chk("operación duplicada se rechaza", cliente.post("/api/tramites", data={
        "tipo_documento_id": tipos["CONST"], "fecha_deposito": hoy,
        "referencia_operacion": "OP-1", "comprobante": archivo("r.pdf")}, content_type=mp), 400)
    detalle = chk("detalle", cliente.get(f"/api/tramites/{t1['folio']}"))
    arch_id = detalle["archivos"][0]["id"]
    r = cliente.get(f"/api/tramites/{t1['folio']}/archivos/{arch_id}")
    chk("ver archivo en línea", r)
    if "inline" not in r.headers.get("Content-Disposition", ""):
        fallos.append(("el archivo no se sirve en línea", r.headers.get("Content-Disposition", "")))
    rd = cliente.get(f"/api/tramites/{t1['folio']}/archivos/{arch_id}?descargar=1")
    chk("descargar archivo", rd)
    if "attachment" not in rd.headers.get("Content-Disposition", ""):
        fallos.append(("?descargar=1 no entrega adjunto", rd.headers.get("Content-Disposition", "")))
    chk("comentario con adjunto", cliente.post(f"/api/tramites/{t1['folio']}/comentarios",
        data={"texto": "Va dirigida a la SEV", "adjunto": archivo("ej.pdf")}, content_type=mp))

    print("Secretaría")
    sesion(Rol.SECRETARIA)
    chk("bandeja", cliente.get("/api/tramites/bandeja"))
    chk("padrón", cliente.get("/api/padron"))
    chk("cargar padrón CSV", cliente.post("/api/padron/cargar", data={"archivo": (io.BytesIO(
        "matricula,curp_prefijo,nombre,correo_institucional\n"
        "S23099999,RUMA030214,Ñandú Pérez,z@uv.mx\n".encode()), "p.csv")}, content_type=mp))
    chk("alta de uno en uno", cliente.post("/api/padron", json={
        "matricula": "S26001234", "curp_prefijo": "NUEV060101",
        "nombre": "Alumno Nuevo", "correo_institucional": "an@uv.mx",
        "fecha_ingreso": "2026"}), 201)
    chk("matrícula repetida se rechaza", cliente.post("/api/padron", json={
        "matricula": "S26001234", "curp_prefijo": "NUEV060101",
        "nombre": "Otro", "correo_institucional": "o@uv.mx"}), 400)
    chk("CURP corta se rechaza", cliente.post("/api/padron", json={
        "matricula": "S26009999", "curp_prefijo": "CORTA",
        "nombre": "X", "correo_institucional": "x@uv.mx"}), 400)
    chk("formato no aceptado se rechaza", cliente.post("/api/padron/cargar", data={
        "archivo": (io.BytesIO(b"cualquier cosa"), "p.txt")}, content_type=mp), 400)
    chk("emitir línea de captura", cliente.post(f"/api/tramites/{t3['folio']}/avanzar",
        json={"linea_captura": "4410-8827"}))
    chk("entregar sin archivo se rechaza", cliente.post(
        f"/api/tramites/{t2['folio']}/documento", data={}, content_type=mp), 400)
    chk("el kardex no exige recibo", cliente.post(f"/api/tramites/{t2['folio']}/documento",
        data={"documento": archivo("k.pdf")}, content_type=mp))

    print("Alumno: comprobante posterior")
    sesion(Rol.ALUMNO)
    chk("subir comprobante", cliente.post(f"/api/tramites/{t3['folio']}/comprobante", data={
        "fecha_deposito": hoy, "referencia_operacion": "OP-3",
        "comprobante": archivo("r3.pdf")}, content_type=mp))

    print("Administración")
    sesion(Rol.ADMINISTRADOR)
    chk("cola", cliente.get("/api/tramites/bandeja"))
    chk("confirmar pago t1", cliente.post(f"/api/tramites/{t1['folio']}/confirmar-pago"))
    chk("confirmar pago t3", cliente.post(f"/api/tramites/{t3['folio']}/confirmar-pago"))
    chk("no puede confirmar dos veces", cliente.post(
        f"/api/tramites/{t1['folio']}/confirmar-pago"), 400)

    print("Secretaría: entrega")
    sesion(Rol.SECRETARIA)
    chk("con pago exige también el recibo", cliente.post(
        f"/api/tramites/{t1['folio']}/documento",
        data={"documento": archivo("c1.pdf")}, content_type=mp), 400)
    chk("entregar t1 con recibo y documento", cliente.post(
        f"/api/tramites/{t1['folio']}/documento",
        data={"recibo": archivo("rec1.pdf"), "documento": archivo("c1.pdf")},
        content_type=mp))
    final = chk("entregar t3 con recibo y documento", cliente.post(
        f"/api/tramites/{t3['folio']}/documento",
        data={"recibo": archivo("rec3.pdf"), "documento": archivo("c3.pdf")},
        content_type=mp))
    tipos_archivo = sorted({a["tipo"] for a in (final or {}).get("archivos", [])})
    print(f"       archivos del expediente: {tipos_archivo}")
    for esperado in ("recibo", "documento_final"):
        if esperado not in tipos_archivo:
            fallos.append((f"falta el archivo {esperado} en el expediente", str(tipos_archivo)))

    print("Contraseñas")
    c2 = app.test_client()
    chk("login", c2.post("/api/auth/login",
        json={"identificador": "SEC", "password": "contrasena-larga"}))
    chk("cambio con actual incorrecta se rechaza", c2.post("/api/auth/password",
        json={"actual": "equivocada", "nueva": "otra-clave-larga"}), 400)
    chk("contraseña corta se rechaza", c2.post("/api/auth/password",
        json={"actual": "contrasena-larga", "nueva": "corta"}), 400)
    chk("contraseña igual a la actual se rechaza", c2.post("/api/auth/password",
        json={"actual": "contrasena-larga", "nueva": "contrasena-larga"}), 400)
    chk("cambio válido", c2.post("/api/auth/password",
        json={"actual": "contrasena-larga", "nueva": "nueva-clave-secreta"}))
    chk("login con la anterior falla", c2.post("/api/auth/login",
        json={"identificador": "SEC", "password": "contrasena-larga"}), 401)
    chk("login con la nueva funciona", c2.post("/api/auth/login",
        json={"identificador": "SEC", "password": "nueva-clave-secreta"}))

    print("Recuperación")
    c3 = app.test_client()
    r = c3.post("/api/auth/password/olvide", json={"identificador": "S23012345"})
    chk("solicitar enlace", r)
    token = r.get_json().get("token_desarrollo")
    inexistente = c3.post("/api/auth/password/olvide", json={"identificador": "NOEXISTE"})
    chk("cuenta inexistente responde igual", inexistente)
    if inexistente.get_json()["mensaje"] != r.get_json()["mensaje"]:
        fallos.append(("el mensaje delata qué cuentas existen", ""))
    chk("token inválido se rechaza", c3.post("/api/auth/password/restablecer",
        json={"token": "basura", "nueva": "clave-nueva-valida"}), 400)
    chk("restablecer", c3.post("/api/auth/password/restablecer",
        json={"token": token, "nueva": "clave-nueva-valida"}))
    chk("el mismo enlace ya no sirve", c3.post("/api/auth/password/restablecer",
        json={"token": token, "nueva": "otra-clave-valida"}), 400)

    print("Contraseña temporal")
    with app.app_context():
        u = db.session.get(Usuario, ids[Rol.ADMINISTRADOR])
        u.definir_password("temporal-conocida", temporal=True)
        db.session.commit()
    c4 = app.test_client()
    chk("login con temporal", c4.post("/api/auth/login",
        json={"identificador": "ADM", "password": "temporal-conocida"}))
    chk("el resto queda bloqueado", c4.get("/api/tramites"), 403)
    chk("puede cambiarla", c4.post("/api/auth/password",
        json={"actual": "temporal-conocida", "nueva": "mi-clave-personal"}))
    chk("ya puede trabajar", c4.get("/api/tramites"))

    print("Alcance del administrador")
    sesion(Rol.ADMINISTRADOR)
    todos = chk("lista", cliente.get("/api/tramites"))
    sin_costo = [x for x in todos if x["folio"] == t2["folio"]]
    if sin_costo:
        fallos.append(("el administrador no debe ver trámites sin costo", t2["folio"]))
    else:
        print(f"       ve {len(todos)} con pago y ninguno sin costo")
    chk("el kardex tampoco por URL directa", cliente.get(f"/api/tramites/{t2['folio']}"), 403)

    print("Historial")
    h = chk("historial del administrador", cliente.get("/api/tramites/historial"))
    if h is not None and len(h) != 2:
        fallos.append(("el administrador solo debería ver los 2 que atendió", str(len(h))))
    else:
        print(f"       solo los {len(h)} que atendió, no el resto del programa")
    sesion(Rol.ALUMNO)
    ha = chk("historial del alumno", cliente.get("/api/tramites/historial"))
    print(f"       el alumno ve {len(ha)} suyos")
    detalle2 = cliente.get(f"/api/tramites/{t1['folio']}").get_json()
    for campo in ("correo_alumno", "programa"):
        if not detalle2.get(campo):
            fallos.append((f"falta {campo} en la respuesta", ""))
    print(f"       datos del alumno: {detalle2['alumno']} · {detalle2['matricula']} · {detalle2['programa']}")

    print("Personal")
    sesion(Rol.COORDINADORA)
    chk("listar personal", cliente.get("/api/usuarios"))
    creado = chk("crear cuenta", cliente.post("/api/usuarios", json={
        "identificador": "MENDOZAAP", "nombre": "Ana Paula Mendoza",
        "correo": "apmendoza@uv.mx", "rol": "secretaria"}), 201)
    if creado and not creado.get("password_temporal"):
        fallos.append(("debe devolver una contraseña temporal", str(creado)))
    else:
        print(f"       contraseña temporal entregada una sola vez")
    # El personal sí puede llevar números; lo que no puede es coincidir con una
    # matrícula, porque alumnos y personal comparten la columna de identificador.
    chk("usuario con números se acepta", cliente.post("/api/usuarios", json={
        "identificador": "SEC123", "nombre": "Con Números", "correo": "sec123@uv.mx",
        "rol": "secretaria"}), 201)
    chk("usuario con espacios se rechaza", cliente.post("/api/usuarios", json={
        "identificador": "CON ESPACIO", "nombre": "X", "correo": "x@uv.mx",
        "rol": "secretaria"}), 400)
    chk("usuario con forma de matrícula se rechaza", cliente.post("/api/usuarios", json={
        "identificador": "S30001111", "nombre": "X", "correo": "x@uv.mx",
        "rol": "secretaria"}), 400)
    chk("matrícula mal formada se rechaza", cliente.post("/api/padron", json={
        "matricula": "26008888", "curp_prefijo": "XXXX010101",
        "nombre": "Mal", "correo_institucional": "m@uv.mx"}), 400)
    chk("usuario repetido se rechaza", cliente.post("/api/usuarios", json={
        "identificador": "MENDOZAAP", "nombre": "Otra", "correo": "o@uv.mx",
        "rol": "secretaria"}), 400)
    chk("rol de alumno se rechaza", cliente.post("/api/usuarios", json={
        "identificador": "PRUEBA", "nombre": "X", "correo": "x@uv.mx",
        "rol": "alumno"}), 400)
    chk("no puede darse de baja a sí misma", cliente.post(
        f"/api/usuarios/{ids[Rol.COORDINADORA]}/activo", json={"activo": False}), 400)
    chk("dar de baja a otra persona", cliente.post(
        f"/api/usuarios/{creado['id']}/activo", json={"activo": False}))
    chk("generar nueva contraseña", cliente.post(f"/api/usuarios/{creado['id']}/password"))
    sesion(Rol.SECRETARIA)
    chk("secretaría no administra personal", cliente.get("/api/usuarios"), 403)

    print("La nueva persona entra con su propia cuenta")
    c5 = app.test_client()
    nueva = cliente  # reutilizamos el objeto para claridad
    with app.app_context():
        u = db.session.get(Usuario, creado["id"])
        u.activo = True
        u.definir_password("clave-de-prueba-larga")
        db.session.commit()
    chk("login de la nueva secretaría", c5.post("/api/auth/login", json={
        "identificador": "MENDOZAAP", "password": "clave-de-prueba-larga"}))
    yo = chk("su sesión", c5.get("/api/auth/yo"))
    if yo and yo["nombre"] != "Ana Paula Mendoza":
        fallos.append(("la sesión debe identificar a la persona, no al rol", str(yo)))
    else:
        print(f"       la bitácora firmará como {yo['nombre']} ({yo['rol']})")

    print("Notificaciones")
    with app.app_context():
        from app import notificaciones as N
        from app.dominio import etapas as E
        from app.models import Tramite

        enviados = []
        original = N._en_segundo_plano
        N._en_segundo_plano = lambda destinos, asunto, cuerpo: enviados.append(sorted(destinos))
        try:
            tramite = Tramite.query.filter_by(folio=t1["folio"]).first()
            alumna = db.session.get(Usuario, ids[Rol.ALUMNO])
            with app.test_request_context():
                N.tramite_iniciado(tramite, alumna)
        finally:
            N._en_segundo_plano = original

    # Dos correos: la confirmación al alumno y un único aviso a las tres áreas.
    print(f"       correos generados: {len(enviados)}")
    for destinos in enviados:
        print(f"         {destinos}")
    plano = [d for grupo in enviados for d in grupo]
    from collections import Counter
    veces = Counter(plano)
    if veces["S23012345@uv.mx"] != 1:
        fallos.append(("el alumno debe recibir una confirmación", str(enviados)))
    for correo in ("SEC@uv.mx", "ADM@uv.mx", "COORD@uv.mx"):
        if veces[correo] != 1:
            fallos.append((f"{correo} debe recibir exactamente un aviso", str(veces)))
    if any("S23012345@uv.mx" in g and len(g) > 1 for g in enviados):
        fallos.append(("la confirmación del alumno no debe mezclarse con el aviso interno",
                       str(enviados)))

    print("Alcance de Secretaría")
    sesion(Rol.SECRETARIA)
    hs = chk("historial de secretaría", cliente.get("/api/tramites/historial"))
    print(f"       ve {len(hs)} trámites en los que intervino")

    print("Vigencia y depuración")
    sesion(Rol.COORDINADORA)
    chk("vista previa de depuración", cliente.get("/api/padron/depurar"))
    chk("depurar sin confirmar se rechaza", cliente.post("/api/padron/depurar", json={}), 400)
    chk("cambiar vigencia", cliente.put("/api/ajustes/vigencia", json={"anios_vigencia": 7}))
    chk("vigencia fuera de rango se rechaza", cliente.put("/api/ajustes/vigencia",
        json={"anios_vigencia": 50}), 400)
    sesion(Rol.SECRETARIA)
    chk("secretaría no depura", cliente.post("/api/padron/depurar", json={"confirmar": True}), 403)

    print("Ajustes de la Coordinación")
    sesion(Rol.COORDINADORA)
    chk("catálogo completo", cliente.get("/api/ajustes/documentos"))
    nuevo = chk("crear documento", cliente.post("/api/ajustes/documentos", data={
        "clave": "CARTA", "nombre": "Carta de pasante", "costo": "95",
        "momento_pago": "al_solicitar", "descripcion": "Acredita que concluiste créditos.",
        "requisitos": "100% de créditos.", "ejemplo": archivo("muestra.pdf")},
        content_type=mp), 201)
    if nuevo and nuevo["participantes"] != ["Administración", "Secretaría"]:
        fallos.append(("los participantes deberían derivarse del momento de pago", str(nuevo)))
    chk("clave repetida se rechaza", cliente.post("/api/ajustes/documentos", json={
        "clave": "CARTA", "nombre": "Otro", "costo": "50", "momento_pago": "al_solicitar"}), 400)
    chk("sin costo con precio se rechaza", cliente.post("/api/ajustes/documentos", json={
        "clave": "XX", "nombre": "Otro", "costo": "50", "momento_pago": "sin_costo"}), 400)
    chk("clave con espacios se rechaza", cliente.post("/api/ajustes/documentos", json={
        "clave": "MI CLAVE", "nombre": "Otro", "costo": "50", "momento_pago": "al_solicitar"}), 400)
    chk("ver el ejemplo", cliente.get(f"/api/ajustes/documentos/{nuevo['id']}/ejemplo"))
    chk("editar documento", cliente.post(f"/api/ajustes/documentos/{nuevo['id']}",
        data={"clave": "CARTA", "nombre": "Carta de pasante", "costo": "120",
              "momento_pago": "al_solicitar"}, content_type=mp))
    chk("desactivar documento", cliente.post(f"/api/ajustes/documentos/{nuevo['id']}/activo",
        json={"activo": False}))
    chk("guardar cuenta", cliente.put("/api/ajustes/cuenta", json={
        "banco": "Banco X", "titular": "UV", "cuenta": "1234", "clabe": "0148"}))
    sesion(Rol.SECRETARIA)
    chk("secretaría no entra a ajustes", cliente.get("/api/ajustes/documentos"), 403)
    sesion(Rol.ALUMNO)
    cat = chk("el alumno ve el catálogo", cliente.get("/api/catalogo/documentos"))
    inactivo = [d for d in cat if d["clave"] == "CARTA"]
    if inactivo:
        fallos.append(("un documento desactivado no debe ofrecerse al alumno", "CARTA"))
    else:
        print(f"       el alumno ve {len(cat)} documentos activos, sin el desactivado")
    cuenta = chk("cuenta desde la base", cliente.get("/api/catalogo/cuenta"))
    if cuenta and cuenta.get("banco") != "Banco X":
        fallos.append(("el alumno debería ver la cuenta editada", str(cuenta)))

    print("Editar el catálogo no altera trámites en curso")
    antes = cliente.get(f"/api/tramites/{t1['folio']}").get_json()
    sesion(Rol.COORDINADORA)
    cliente.post(f"/api/ajustes/documentos/{tipos['CONST']}", data={
        "clave": "CONSTNUEVA", "nombre": "Constancia de estudios", "costo": "999",
        "momento_pago": "tras_linea_de_captura"}, content_type=mp)
    sesion(Rol.ALUMNO)
    despues = cliente.get(f"/api/tramites/{t1['folio']}").get_json()
    for campo in ("total", "momento_pago", "concepto_deposito"):
        if antes.get(campo) != despues.get(campo):
            fallos.append((f"el trámite cambió de {campo} al editar el catálogo",
                           f"{antes.get(campo)} -> {despues.get(campo)}"))
    if len(antes["etapas"]) != len(despues["etapas"]):
        fallos.append(("el trámite cambió de recorrido al editar el catálogo", ""))
    else:
        print(f"       conserva {despues['total']}, {len(despues['etapas'])} etapas y su concepto")

    print("Coordinación")
    sesion(Rol.COORDINADORA)
    lista = chk("tablero", cliente.get("/api/tramites"))
    chk("retrasados", cliente.get("/api/tramites/retrasados"))
    chk("no puede confirmar pagos", cliente.post(
        f"/api/tramites/{t1['folio']}/confirmar-pago"), 403)
    hc = chk("la coordinación sí ve todo", cliente.get("/api/tramites/historial"))
    if hc is not None and len(hc) < 3:
        fallos.append(("la coordinación debería ver todos los trámites", str(len(hc))))

    if lista and not all(t["concluido"] for t in lista):
        fallos.append(("los tres trámites debían quedar concluidos", str(lista)))

    print()
    if fallos:
        print(f"{len(fallos)} FALLAS")
        for nombre, detalle in fallos:
            print(f"  - {nombre}: {detalle}")
        return 1
    print("Todo correcto: los tres flujos completos y las reglas de permisos.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
