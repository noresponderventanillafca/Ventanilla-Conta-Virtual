import { useEffect, useState } from "react";
import { Plus, Pencil, Upload, FileText, Mail, Send } from "lucide-react";

import { C, pesos } from "../tokens";
import { api } from "../api/cliente";
import Marco from "../componentes/Marco";
import { Card, Campo, Boton, Pill, Aviso, MensajeError, Cargando, estiloInput } from "../componentes/ui";

/* Esta pantalla existe para que un procedimiento nuevo no requiera programar.
   La Coordinación define qué se puede solicitar, cuánto cuesta y a dónde se
   deposita. */

const MOMENTOS = [
  ["sin_costo", "Sin costo", "Solo interviene Secretaría."],
  ["al_solicitar", "Se paga al solicitar", "El alumno deposita y adjunta su comprobante. Interviene Administración."],
  ["tras_linea_de_captura", "Con línea de captura", "Secretaría emite la referencia y después el alumno paga."],
];

const VACIO = { clave: "", nombre: "", costo: "", momento_pago: "sin_costo",
                descripcion: "", requisitos: "", ejemplo: null };

export default function Ajustes() {
  const [documentos, setDocumentos] = useState(null);
  const [cuenta, setCuenta] = useState(null);
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState(null);

  const recargar = () => Promise.all([api.ajustesDocumentos(), api.verCuenta()])
    .then(([d, c]) => { setDocumentos(d); setCuenta(c); })
    .catch((e) => setError(e.message));

  useEffect(() => { recargar(); }, []);

  if (error && !documentos) return <Marco><MensajeError>{error}</MensajeError></Marco>;
  if (documentos === null) return <Marco><Cargando /></Marco>;

  return (
    <Marco>
      <div className="space-y-3.5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: C.azul900 }}>Ajustes</h1>
          <p className="mt-1 text-sm" style={{ color: C.gris500 }}>
            Catálogo de documentos y datos de depósito del programa.
          </p>
        </div>

        {editando ? (
          <Formulario inicial={editando}
                      onCancelar={() => setEditando(null)}
                      onGuardado={async () => { setEditando(null); await recargar(); }} />
        ) : (
          <Card title={`Documentos (${documentos.length})`}
                right={<Boton onClick={() => setEditando({ ...VACIO })}>
                  <Plus size={15} /> Agregar documento
                </Boton>}>
            <Tabla documentos={documentos} onEditar={setEditando}
                   onCambiarActivo={async (d) => {
                     await api.activarDocumento(d.id, !d.activo);
                     await recargar();
                   }} />
          </Card>
        )}

        <CuentaBancaria cuenta={cuenta} onGuardado={recargar} />

        <Vigencia />

        <Notificaciones />
      </div>
    </Marco>
  );
}

function Tabla({ documentos, onEditar, onCambiarActivo }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr style={{ background: C.gris100 }}>
            {["Clave", "Documento", "Costo", "Quién interviene", "Muestra", "Trámites", ""]
              .map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold"
                    style={{ color: C.gris500 }}>{h}</th>
              ))}
          </tr>
        </thead>
        <tbody>
          {documentos.map((d) => (
            <tr key={d.id} style={{ borderTop: `1px solid ${C.gris200}`, opacity: d.activo ? 1 : 0.55 }}>
              <td className="px-4 py-3.5 text-[13px] font-semibold" style={{ color: C.azul700 }}>
                {d.clave}
              </td>
              <td className="px-4 py-3.5 text-sm" style={{ color: C.gris700 }}>
                {d.nombre}
                {!d.activo && <span className="ml-2 text-[11px]" style={{ color: C.gris400 }}>
                  (no se ofrece)
                </span>}
              </td>
              <td className="px-4 py-3.5 text-[13px]"
                  style={{ color: d.costo === 0 ? C.verde600 : C.gris700 }}>
                {d.costo === 0 ? "Sin costo" : pesos(d.costo)}
              </td>
              <td className="px-4 py-3.5 text-xs" style={{ color: C.gris500 }}>
                {d.participantes.join(" y ")}
              </td>
              <td className="px-4 py-3.5">
                {d.ejemplo
                  ? <FileText size={16} color={C.verde600} />
                  : <span className="text-[11px]" style={{ color: C.gris400 }}>falta</span>}
              </td>
              <td className="px-4 py-3.5 text-xs" style={{ color: C.gris500 }}>{d.tramites}</td>
              <td className="px-4 py-3.5">
                <div className="flex justify-end gap-2">
                  <Boton variante="secundario" tamano="sm" onClick={() => onEditar(d)}>
                    <Pencil size={13} /> Editar
                  </Boton>
                  {/* Nunca se borran: hay trámites que apuntan a ellos y un
                      expediente sin tipo de documento es un expediente roto. */}
                  <Boton variante="neutro" tamano="sm" onClick={() => onCambiarActivo(d)}>
                    {d.activo ? "Dejar de ofrecer" : "Volver a ofrecer"}
                  </Boton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Formulario({ inicial, onCancelar, onGuardado }) {
  const [d, setD] = useState({ ...VACIO, ...inicial, costo: String(inicial.costo ?? "") });
  const [ejemplo, setEjemplo] = useState(null);
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const campo = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const sinCosto = d.momento_pago === "sin_costo";
  const momento = MOMENTOS.find(([v]) => v === d.momento_pago);

  const guardar = async () => {
    setOcupado(true); setError(null);
    try {
      const datos = {
        clave: d.clave, nombre: d.nombre,
        costo: sinCosto ? "0" : d.costo,
        momento_pago: d.momento_pago,
        descripcion: d.descripcion ?? "", requisitos: d.requisitos ?? "",
        ejemplo,
      };
      if (d.id) await api.editarDocumento(d.id, datos);
      else await api.crearDocumento(datos);
      await onGuardado();
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Card title={d.id ? `Editar ${d.nombre}` : "Nuevo documento"}>
      <div className="space-y-4 px-5 py-5">
        {d.id && d.tramites > 0 && (
          <Aviso titulo={`Este documento tiene ${d.tramites} trámites`}>
            Los cambios solo afectan a las solicitudes nuevas. Cada trámite
            guardó su costo, su recorrido y su concepto de depósito al crearse,
            así que los que están en curso no se alteran.
          </Aviso>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
          <Campo label="Nombre del documento">
            <input value={d.nombre} onChange={campo("nombre")}
                   placeholder="Constancia de estudios"
                   className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px]" style={estiloInput} />
          </Campo>
          <Campo label="Clave"
                 ayuda="Corta y sin espacios: el alumno la teclea en el banco.">
            <input value={d.clave} onChange={(e) => setD({ ...d, clave: e.target.value.toUpperCase() })}
                   maxLength={12} placeholder="CONST"
                   className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px] uppercase"
                   style={estiloInput} />
          </Campo>
        </div>

        <Campo label="¿Lleva pago?">
          <div className="space-y-2">
            {MOMENTOS.map(([valor, etiqueta, nota]) => (
              <label key={valor} className="flex cursor-pointer gap-3 rounded-md px-3.5 py-2.5"
                     style={{
                       border: `1px solid ${d.momento_pago === valor ? C.azul700 : C.gris200}`,
                       background: d.momento_pago === valor ? C.azul100 : C.blanco,
                     }}>
                <input type="radio" name="momento" value={valor} className="mt-0.5"
                       checked={d.momento_pago === valor}
                       onChange={() => setD({ ...d, momento_pago: valor })} />
                <span>
                  <span className="block text-[13px] font-medium" style={{ color: C.azul900 }}>
                    {etiqueta}
                  </span>
                  <span className="block text-xs" style={{ color: C.gris500 }}>{nota}</span>
                </span>
              </label>
            ))}
          </div>
        </Campo>

        {/* Quién interviene no se pregunta aparte: se deriva del pago. Dos
            campos que pueden contradecirse acaban contradiciéndose. */}
        <div className="rounded-md px-4 py-3" style={{ background: C.gris100 }}>
          <span className="text-xs" style={{ color: C.gris500 }}>
            Con esta opción el trámite lo atienden:{" "}
            <strong style={{ color: C.gris700 }}>
              {sinCosto ? "Secretaría" : "Administración y Secretaría"}
            </strong>. La Coordinación lo supervisa siempre.
          </span>
        </div>

        {!sinCosto && (
          <Campo label="Costo por documento">
            <input type="number" step="0.01" min="0" value={d.costo} onChange={campo("costo")}
                   placeholder="0.00"
                   className="campo-texto w-full max-w-[220px] rounded-md px-3 py-2.5 text-[13px]"
                   style={estiloInput} />
          </Campo>
        )}

        <Campo label="Para qué sirve"
               ayuda="Lo lee el alumno antes de decidir. Con pago por adelantado, una descripción clara evita devoluciones.">
          <textarea rows={2} value={d.descripcion ?? ""} onChange={campo("descripcion")}
                    className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px]" style={estiloInput} />
        </Campo>

        <Campo label="Requisitos">
          <textarea rows={2} value={d.requisitos ?? ""} onChange={campo("requisitos")}
                    className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px]" style={estiloInput} />
        </Campo>

        <Campo label="Documento de muestra"
               ayuda="Una imagen o PDF de ejemplo. El alumno lo ve antes de solicitar.">
          <label className="caja-campo flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-[13px]"
                 style={estiloInput}>
            <Upload size={15} color={C.gris400} />
            {ejemplo ? ejemplo.name : d.ejemplo ? `Actual: ${d.ejemplo.nombre}` : "Selecciona un archivo"}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                   onChange={(e) => setEjemplo(e.target.files?.[0] ?? null)} />
          </label>
        </Campo>

        <MensajeError>{error}</MensajeError>

        <div className="flex flex-wrap gap-3">
          <Boton onClick={guardar} disabled={ocupado}>
            {ocupado ? "Guardando…" : d.id ? "Guardar cambios" : "Crear documento"}
          </Boton>
          <Boton variante="neutro" onClick={onCancelar}>Cancelar</Boton>
        </div>
      </div>
    </Card>
  );
}

function CuentaBancaria({ cuenta, onGuardado }) {
  const [d, setD] = useState(cuenta ?? {});
  const [editar, setEditar] = useState(false);
  const [error, setError] = useState(null);
  const [listo, setListo] = useState(false);

  useEffect(() => { setD(cuenta ?? {}); }, [cuenta]);

  const campo = (k) => (e) => setD({ ...d, [k]: e.target.value });

  const guardar = async () => {
    setError(null);
    try {
      await api.guardarCuenta(d);
      await onGuardado();
      setEditar(false);
      setListo(true);
      setTimeout(() => setListo(false), 2500);
    } catch (e) {
      setError(e.message);
    }
  };

  const CAMPOS = [["banco", "Banco"], ["titular", "Titular"],
                  ["cuenta", "Número de cuenta"], ["clabe", "CLABE"]];

  return (
    <Card title="Cuenta para depósitos"
          right={!editar && <Boton variante="secundario" tamano="sm" onClick={() => setEditar(true)}>
            <Pencil size={13} /> Editar
          </Boton>}>
      <div className="space-y-4 px-5 py-5">
        {editar ? (
          <>
            <Aviso tono="ambar" titulo="Cambiar la cuenta afecta a los depósitos que aún no se hacen">
              Los alumnos que ya vieron la cuenta anterior podrían depositar ahí.
              Avisa a Administración antes de guardar el cambio.
            </Aviso>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {CAMPOS.map(([k, etiqueta]) => (
                <Campo key={k} label={etiqueta}>
                  <input value={d[k] ?? ""} onChange={campo(k)}
                         className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px]"
                         style={estiloInput} />
                </Campo>
              ))}
            </div>
            <MensajeError>{error}</MensajeError>
            <div className="flex gap-3">
              <Boton onClick={guardar}>Guardar cuenta</Boton>
              <Boton variante="neutro" onClick={() => { setD(cuenta ?? {}); setEditar(false); }}>
                Cancelar
              </Boton>
            </div>
          </>
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              {CAMPOS.map(([k, etiqueta]) => (
                <div key={k}>
                  <dt className="text-[11px] font-semibold" style={{ color: C.gris400 }}>
                    {etiqueta.toUpperCase()}
                  </dt>
                  <dd className="text-sm" style={{ color: d[k] ? C.gris700 : C.rojo600 }}>
                    {d[k] || "Sin configurar"}
                  </dd>
                </div>
              ))}
            </dl>
            {cuenta?.actualizado_por && (
              <p className="text-[11px]" style={{ color: C.gris400 }}>
                Última modificación por {cuenta.actualizado_por}.
              </p>
            )}
            {listo && <Pill tono="verde">Cuenta actualizada</Pill>}
          </>
        )}
      </div>
    </Card>
  );
}


/* La Coordinación recibe aviso de todo porque supervisa el proceso completo.
   Es preferencia y no regla fija: si la bandeja se le llena, lo apaga aquí y
   le queda el tablero, que sigue mostrándolo todo. */
function Notificaciones() {
  const [datos, setDatos] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { api.verNotificaciones().then(setDatos).catch((e) => setError(e.message)); }, []);
  if (!datos) return null;

  const cambiar = async (valor) => {
    setError(null);
    try {
      const r = await api.guardarNotificaciones(valor);
      setDatos({ ...datos, ...r });
    } catch (e) { setError(e.message); }
  };

  const probar = async () => {
    setError(null); setMensaje(null);
    try { setMensaje((await api.probarCorreo()).mensaje); }
    catch (e) { setError(e.message); }
  };

  return (
    <Card title="Mis notificaciones">
      <div className="space-y-4 px-5 py-5">
        <label className="flex cursor-pointer gap-3 rounded-md px-3.5 py-3"
               style={{ border: `1px solid ${datos.notificaciones_todas ? C.azul700 : C.gris200}`,
                        background: datos.notificaciones_todas ? C.azul100 : C.blanco }}>
          <input type="checkbox" className="mt-0.5" checked={datos.notificaciones_todas}
                 onChange={(e) => cambiar(e.target.checked)} />
          <span>
            <span className="block text-[13px] font-medium" style={{ color: C.azul900 }}>
              Avisarme de todos los trámites
            </span>
            <span className="block text-xs" style={{ color: C.gris500 }}>
              Recibes un correo en cada avance, comentario y rechazo del programa.
              Si te resulta demasiado, apágalo: el tablero sigue mostrándote todo.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: C.gris500 }}>
            <Mail size={15} color={C.gris400} /> Se envían a {datos.correo}
          </div>
          <Boton variante="secundario" tamano="sm" onClick={probar} className="ml-auto">
            <Send size={13} /> Enviar correo de prueba
          </Boton>
        </div>

        {!datos.correo_configurado && (
          <Aviso tono="ambar" titulo="Todavía no hay servidor de correo configurado">
            Los avisos se escriben en la consola del servidor en lugar de enviarse.
            Sirve para probar el flujo, pero nadie recibe nada.
          </Aviso>
        )}

        {mensaje && <Pill tono="verde">{mensaje}</Pill>}
        <MensajeError>{error}</MensajeError>
      </div>
    </Card>
  );
}


/* Cuántos años puede un alumno usar la ventanilla. La depuración vive en la
   pantalla de Padrón, junto a los datos que va a borrar. */
function Vigencia() {
  const [anios, setAnios] = useState(null);
  const [editando, setEditando] = useState("");
  const [error, setError] = useState(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    api.verVigencia().then((r) => { setAnios(r.anios_vigencia); setEditando(String(r.anios_vigencia)); })
      .catch((e) => setError(e.message));
  }, []);
  if (anios === null) return null;

  const guardar = async () => {
    setError(null);
    try {
      const r = await api.guardarVigencia(Number(editando));
      setAnios(r.anios_vigencia);
      setListo(true);
      setTimeout(() => setListo(false), 2500);
    } catch (e) { setError(e.message); }
  };

  return (
    <Card title="Vigencia de los alumnos">
      <div className="space-y-4 px-5 py-5">
        <p className="text-[13px] leading-relaxed" style={{ color: C.gris500 }}>
          Duración máxima de la carrera. Pasado ese tiempo el alumno pierde el acceso
          a la ventanilla y lo que necesite se atiende por correo. La depuración se
          ejecuta desde la pantalla de Padrón.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Campo label="Años">
            <input type="number" min="1" max="20" value={editando}
                   onChange={(e) => setEditando(e.target.value)}
                   className="campo-texto w-24 rounded-md px-3 py-2.5 text-[13px]"
                   style={estiloInput} />
          </Campo>
          <Boton onClick={guardar} disabled={String(anios) === editando}>Guardar</Boton>
          {listo && <Pill tono="verde">Vigencia actualizada</Pill>}
        </div>
        <MensajeError>{error}</MensajeError>
      </div>
    </Card>
  );
}
