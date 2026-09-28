import { useEffect, useState } from "react";
import { Upload, Users, CheckCircle2, AlertTriangle } from "lucide-react";

import { C } from "../tokens";
import { api } from "../api/cliente";
import Marco from "../componentes/Marco";
import { Card, Boton, Cargando, MensajeError, Vacio } from "../componentes/ui";

/* El padrón es lo que cierra el sistema: quien no está aquí no puede activar
   cuenta, así que no hay registro abierto ni alumnos de otras facultades. */

export default function Padron() {
  const [datos, setDatos] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const recargar = () => api.padron().then(setDatos).catch((e) => setError(e.message));
  useEffect(() => { recargar(); }, []);

  const subir = async () => {
    if (!archivo) return;
    setCargando(true); setError(null); setResultado(null);
    try {
      setResultado(await api.cargarPadron(archivo));
      setArchivo(null);
      await recargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Marco>
      <div className="space-y-3.5">
        <h1 className="text-xl font-semibold" style={{ color: C.azul900 }}>
          Padrón de alumnos
        </h1>

        <Card title="Cargar padrón">
          <div className="space-y-4 px-5 py-5">
            <p className="text-[13px] leading-relaxed" style={{ color: C.gris500 }}>
              Sube un CSV con las columnas <strong style={{ color: C.gris700 }}>matricula,
              curp_prefijo, nombre, correo_institucional</strong>. Si un alumno ya existe se
              actualizan sus datos, pero nunca se desactiva su cuenta: recargar el padrón
              no obliga a nadie a volver a activarse.
            </p>

            <div className="rounded-md p-3.5" style={{ background: C.ambar100 }}>
              <p className="text-xs leading-relaxed" style={{ color: C.ambar600 }}>
                Si exportas desde Excel, guarda como <strong>CSV UTF-8</strong>. En otro
                formato los acentos y la ñ llegan corrompidos al sistema.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md px-3.5 py-2.5 text-[13px]"
                     style={{ border: `1px solid ${C.gris200}`, color: C.gris700 }}>
                <Upload size={15} color={C.gris500} />
                {archivo ? archivo.name : "Selecciona el archivo CSV"}
                <input type="file" accept=".csv" className="hidden"
                       onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setResultado(null); }} />
              </label>
              <Boton onClick={subir} disabled={!archivo || cargando}>
                {cargando ? "Procesando…" : "Cargar"}
              </Boton>
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
                    {/* Se reporta fila por fila: con cientos de renglones,
                        "el archivo tiene un error" no sirve de nada. */}
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

        {datos === null ? <Cargando /> : (
          <Card title={`Alumnos registrados (${datos.total})`}
                right={<span className="inline-flex items-center gap-1.5 text-xs" style={{ color: C.gris500 }}>
                  <Users size={14} /> {datos.activados} con cuenta activa
                </span>}>
            {datos.alumnos.length === 0 ? (
              <Vacio>El padrón está vacío. Carga un CSV para empezar.</Vacio>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse">
                  <thead>
                    <tr style={{ background: C.gris100 }}>
                      {["Matrícula", "Nombre", "Correo institucional", "Cuenta"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold"
                            style={{ color: C.gris500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datos.alumnos.map((a) => (
                      <tr key={a.matricula} style={{ borderTop: `1px solid ${C.gris200}` }}>
                        <td className="px-4 py-3 text-[13px] font-semibold" style={{ color: C.azul700 }}>
                          {a.matricula}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: C.gris700 }}>{a.nombre}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: C.gris500 }}>{a.correo}</td>
                        <td className="px-4 py-3 text-xs"
                            style={{ color: a.activado ? C.verde600 : C.gris400 }}>
                          {a.activado ? "Activa" : "Sin activar"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </Marco>
  );
}
