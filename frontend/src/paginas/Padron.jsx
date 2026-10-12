import { useEffect, useState } from "react";
import { Upload, Users, CheckCircle2, AlertTriangle, UserPlus, Trash2 } from "lucide-react";

import { C } from "../tokens";
import { api } from "../api/cliente";
import { useSesion } from "../sesion";
import Marco from "../componentes/Marco";
import { Card, Campo, Boton, Pill, Aviso, Cargando, MensajeError, Vacio, estiloInput } from "../componentes/ui";

/* El padrón es lo que cierra el sistema: quien no está aquí no puede activar
   cuenta, así que no hay registro abierto ni alumnos de otras facultades. */

const VACIO = { matricula: "", curp_prefijo: "", nombre: "",
                correo_institucional: "", fecha_ingreso: "" };

export default function Padron() {
  const { usuario } = useSesion();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [vista, setVista] = useState(null);

  const recargar = () => api.padron().then(setDatos).catch((e) => setError(e.message));
  useEffect(() => { recargar(); }, []);

  if (error && !datos) return <Marco><MensajeError>{error}</MensajeError></Marco>;
  if (datos === null) return <Marco><Cargando /></Marco>;

  const esSecretaria = usuario.rol === "secretaria";

  return (
    <Marco>
      <div className="space-y-3.5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: C.azul900 }}>
            Padrón de alumnos
          </h1>
          <p className="mt-1 text-sm" style={{ color: C.gris500 }}>
            {datos.total} alumnos · {datos.activados} con cuenta activa ·
            vigencia de {datos.anios_vigencia} años
          </p>
        </div>

        <MensajeError>{error}</MensajeError>

        {esSecretaria && (
          <>
            {vista === "alta"
              ? <AltaIndividual onCancelar={() => setVista(null)}
                                onGuardado={async () => { setVista(null); await recargar(); }} />
              : <div className="flex flex-wrap gap-2">
                  <Boton onClick={() => setVista("alta")}>
                    <UserPlus size={15} /> Agregar un alumno
                  </Boton>
                  <Boton variante="secundario" onClick={() => setVista("archivo")}>
                    <Upload size={15} /> Cargar desde archivo
                  </Boton>
                </div>}

            {vista === "archivo" && (
              <CargaMasiva onCerrar={() => setVista(null)} onCargado={recargar} />
            )}
          </>
        )}

        {usuario.rol === "coordinadora" && (
          <Depuracion anios={datos.anios_vigencia} vencidos={datos.vencidos} onHecho={recargar} />
        )}

        <Card title={`Alumnos registrados (${datos.total})`}
              right={<span className="inline-flex items-center gap-1.5 text-xs" style={{ color: C.gris500 }}>
                <Users size={14} /> {datos.activados} con cuenta activa
              </span>}>
          {datos.alumnos.length === 0 ? (
            <Vacio>El padrón está vacío. Agrega un alumno o carga un archivo.</Vacio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr style={{ background: C.gris100 }}>
                    {["Matrícula", "Nombre", "Correo", "Ingreso", "Antigüedad", "Cuenta"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold"
                          style={{ color: C.gris500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datos.alumnos.map((a) => (
                    <tr key={a.matricula}
                        style={{ borderTop: `1px solid ${C.gris200}`,
                                 opacity: a.dado_de_baja ? 0.5 : 1 }}>
                      <td className="px-4 py-3 text-[13px] font-semibold" style={{ color: C.azul700 }}>
                        {a.matricula}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: C.gris700 }}>{a.nombre}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: C.gris500 }}>{a.correo}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: C.gris500 }}>
                        {a.fecha_ingreso}
                      </td>
                      <td className="px-4 py-3 text-xs"
                          style={{ color: a.vencido ? C.rojo600 : C.gris500 }}>
                        {a.anios} años{a.vencido ? " · vencida" : ""}
                      </td>
                      <td className="px-4 py-3 text-xs"
                          style={{ color: a.dado_de_baja ? C.gris400
                                         : a.activado ? C.verde600 : C.gris400 }}>
                        {a.dado_de_baja ? "Dado de baja" : a.activado ? "Activa" : "Sin activar"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Marco>
  );
}

/* No siempre hay un archivo: para un alumno que llega tarde o al que se le
   corrigió la matrícula, preparar una hoja de cálculo es más trabajo que el
   alta misma. */
function AltaIndividual({ onCancelar, onGuardado }) {
  const [d, setD] = useState({ ...VACIO });
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const campo = (k) => (e) => setD({ ...d, [k]: e.target.value });

  const guardar = async () => {
    setOcupado(true); setError(null);
    try { await api.agregarAlumno(d); await onGuardado(); }
    catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };

  return (
    <Card title="Agregar un alumno">
      <div className="space-y-4 px-5 py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Matrícula">
            <input value={d.matricula} placeholder="S26001234"
                   onChange={(e) => setD({ ...d, matricula: e.target.value.toUpperCase() })}
                   className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px] uppercase"
                   style={estiloInput} />
          </Campo>
          <Campo label="Primeros 10 caracteres de la CURP"
                 ayuda="Con esto el alumno comprueba que está en el padrón al activar su cuenta.">
            <input value={d.curp_prefijo} maxLength={10} placeholder="RUMA030214"
                   onChange={(e) => setD({ ...d, curp_prefijo: e.target.value.toUpperCase() })}
                   className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px] uppercase"
                   style={estiloInput} />
          </Campo>
        </div>
        <Campo label="Nombre completo">
          <input value={d.nombre} onChange={campo("nombre")}
                 className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px]" style={estiloInput} />
        </Campo>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Correo institucional">
            <input type="email" value={d.correo_institucional} onChange={campo("correo_institucional")}
                   className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px]" style={estiloInput} />
          </Campo>
          <Campo label="Año de ingreso"
                 ayuda="Sirve para calcular su vigencia. Si lo dejas vacío, cuenta desde hoy.">
            <input value={d.fecha_ingreso} onChange={campo("fecha_ingreso")} placeholder="2026"
                   className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px]" style={estiloInput} />
          </Campo>
        </div>
        <MensajeError>{error}</MensajeError>
        <div className="flex flex-wrap gap-3">
          <Boton onClick={guardar} disabled={ocupado}>
            {ocupado ? "Guardando…" : "Agregar al padrón"}
          </Boton>
          <Boton variante="neutro" onClick={onCancelar}>Cancelar</Boton>
        </div>
      </div>
    </Card>
  );
}

function CargaMasiva({ onCerrar, onCargado }) {
  const [archivo, setArchivo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const subir = async () => {
    if (!archivo) return;
    setCargando(true); setError(null); setResultado(null);
    try {
      setResultado(await api.cargarPadron(archivo));
      setArchivo(null);
      await onCargado();
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  };

  return (
    <Card title="Cargar desde archivo">
      <div className="space-y-4 px-5 py-5">
        <p className="text-[13px] leading-relaxed" style={{ color: C.gris500 }}>
          Excel (.xlsx) o CSV con las columnas <strong style={{ color: C.gris700 }}>matricula,
          curp_prefijo, nombre, correo_institucional</strong>, y opcionalmente{" "}
          <strong style={{ color: C.gris700 }}>fecha_ingreso</strong>. Si un alumno ya existe
          se actualizan sus datos, pero nunca se desactiva su cuenta.
        </p>

        {/* Excel evita el problema de codificación del CSV: los acentos y la ñ
            viajan bien sin que nadie tenga que elegir el formato al exportar. */}
        <div className="rounded-md p-3.5" style={{ background: C.cianClaro }}>
          <p className="text-xs leading-relaxed" style={{ color: C.azul700 }}>
            Si trabajas en Excel, sube el .xlsx directamente. Exportarlo a CSV obliga a
            elegir «CSV UTF-8» y, si se elige mal, los acentos y la ñ llegan corrompidos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md px-3.5 py-2.5 text-[13px]"
                 style={{ border: `1px solid ${C.gris200}`, color: C.gris700 }}>
            <Upload size={15} color={C.gris500} />
            {archivo ? archivo.name : "Selecciona el archivo"}
            <input type="file" accept=".csv,.xlsx,.xlsm" className="hidden"
                   onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setResultado(null); }} />
          </label>
          <Boton onClick={subir} disabled={!archivo || cargando}>
            {cargando ? "Procesando…" : "Cargar"}
          </Boton>
          <Boton variante="neutro" onClick={onCerrar}>Cerrar</Boton>
        </div>

        <MensajeError>{error}</MensajeError>

        {resultado && (
          <div className="space-y-2 rounded-md p-4" style={{ background: C.gris100 }}>
            <div className="flex items-center gap-2 text-[13px]" style={{ color: C.verde600 }}>
              <CheckCircle2 size={16} />
              {resultado.creados} nuevos · {resultado.actualizados} actualizados
            </div>
            {resultado.errores?.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[13px]" style={{ color: C.ambar600 }}>
                  <AlertTriangle size={16} />
                  {resultado.errores.length} fila(s) no se cargaron
                </div>
                <ul className="ml-6 space-y-0.5">
                  {resultado.errores.map((e, i) => (
                    <li key={i} className="text-xs" style={{ color: C.gris500 }}>
                      Fila {e.fila}: {e.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/* Borrar datos de alumnos no debe pasar sin que alguien vea antes exactamente
   a quiénes alcanza y qué se conserva de cada uno. */
function Depuracion({ anios, vencidos, onHecho }) {
  const [vista, setVista] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const revisar = async () => {
    setError(null); setResultado(null);
    try { setVista(await api.revisarDepuracion()); }
    catch (e) { setError(e.message); }
  };

  const ejecutar = async () => {
    setOcupado(true); setError(null);
    try {
      setResultado(await api.depurarPadron());
      setVista(null);
      await onHecho();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };

  return (
    <Card title="Depuración por antigüedad">
      <div className="space-y-4 px-5 py-5">
        <p className="text-[13px] leading-relaxed" style={{ color: C.gris500 }}>
          Pasados {anios} años, el alumno pierde el acceso a la ventanilla y lo que
          necesite se atiende por correo. Hay{" "}
          <strong style={{ color: vencidos ? C.rojo600 : C.gris700 }}>{vencidos}</strong>{" "}
          con la vigencia cumplida.
        </p>

        {!vista && !resultado && (
          <Boton variante="secundario" onClick={revisar} disabled={!vencidos}>
            Revisar a quiénes alcanza
          </Boton>
        )}

        <MensajeError>{error}</MensajeError>

        {resultado && (
          <div className="rounded-md p-4" style={{ background: C.verde100 }}>
            <p className="text-[13px]" style={{ color: C.verde600 }}>
              {resultado.eliminados} eliminados por completo ·{" "}
              {resultado.dados_de_baja} dados de baja ·{" "}
              {resultado.archivos_borrados} archivos borrados.
            </p>
          </div>
        )}

        {vista && (
          <>
            <div className="overflow-x-auto rounded-md" style={{ border: `1px solid ${C.gris200}` }}>
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr style={{ background: C.gris100 }}>
                    {["Matrícula", "Nombre", "Antigüedad", "Trámites", "Qué pasa"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold"
                          style={{ color: C.gris500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vista.alumnos.map((a) => (
                    <tr key={a.matricula} style={{ borderTop: `1px solid ${C.gris200}` }}>
                      <td className="px-4 py-3 text-[13px] font-semibold" style={{ color: C.azul700 }}>
                        {a.matricula}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: C.gris700 }}>{a.nombre}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: C.gris500 }}>{a.anios} años</td>
                      <td className="px-4 py-3 text-xs" style={{ color: C.gris500 }}>
                        {a.tramites} · {a.archivos} archivos
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: C.gris700 }}>{a.accion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Aviso tono="rojo" titulo="Esto no se puede deshacer">
              Quien nunca hizo un trámite se elimina por completo. Quien sí los hizo
              pierde el acceso y se borran sus archivos —comprobantes y documentos
              escaneados—, pero el registro de sus trámites se conserva: folio, tipo,
              fechas y quién los atendió son contabilidad de la facultad.
            </Aviso>

            <div className="flex flex-wrap gap-3">
              <Boton variante="peligro" onClick={ejecutar} disabled={ocupado}>
                <Trash2 size={14} /> {ocupado ? "Depurando…" : `Depurar ${vista.alumnos.length} alumnos`}
              </Boton>
              <Boton variante="neutro" onClick={() => setVista(null)}>Cancelar</Boton>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
