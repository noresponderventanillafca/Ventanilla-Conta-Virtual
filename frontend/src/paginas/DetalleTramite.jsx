import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Paperclip, Download, Upload } from "lucide-react";

import { C, pesos, fecha } from "../tokens";
import { api } from "../api/cliente";
import { useSesion } from "../sesion";
import Marco from "../componentes/Marco";
import LineaTiempo from "../componentes/LineaTiempo";
import { estadoDe } from "../componentes/TablaTramites";
import Comentarios from "../componentes/Comentarios";
import Visor from "../componentes/Visor";
import DatosAlumno from "../componentes/DatosAlumno";
import { Card, InfoCard, Pill, Boton, BotonEnlace, Aviso, Campo, MensajeError, Cargando, estiloInput } from "../componentes/ui";

const ETIQUETAS = {
  comprobante_pago: "Comprobante de pago",
  recibo: "Recibo oficial",
  documento_final: "Documento emitido",
  linea_captura: "Línea de captura",
  anexo_comentario: "Anexo de un comentario",
};

const INICIO = {
  alumno: "/tramites", secretaria: "/bandeja",
  administrador: "/validacion", coordinadora: "/tablero",
};

/* Una sola pantalla de detalle para los cuatro roles. Lo que cambia es la
   zona de acción, no la pantalla: así el trámite se ve igual para todos. */
export default function DetalleTramite() {
  const { folio } = useParams();
  const navegar = useNavigate();
  const { usuario } = useSesion();
  const [tramite, setTramite] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setTramite(null);
    api.detalle(folio).then(setTramite).catch((e) => setError(e.message));
  }, [folio]);

  if (error) return <Marco><MensajeError>{error}</MensajeError></Marco>;
  if (!tramite) return <Marco><Cargando /></Marco>;

  const archivos = tramite.archivos ?? [];
  const destacado =
    archivos.find((a) => a.tipo === "documento_final") ??
    archivos.find((a) => a.tipo === "recibo") ?? null;

  return (
    <Marco>
      <div className="space-y-3.5">
        <Boton variante="neutro" onClick={() => navegar(INICIO[usuario.rol])}>
          <ArrowLeft size={15} /> Volver
        </Boton>

        {/* El personal necesita estos datos a la mano; el alumno ya sabe quién es. */}
        {usuario.rol !== "alumno" && <DatosAlumno tramite={tramite} />}

        <InfoCard
          icon={FileText}
          label={`FOLIO ${tramite.folio}`}
          value={tramite.tipo}
          sub={`Solicitado el ${fecha(tramite.creado_en)}` +
               (tramite.total > 0 ? ` · ${pesos(tramite.total)}` : " · sin costo")}
          right={(() => {
            const est = estadoDe(tramite, usuario.rol);
            return <Pill tono={est.tono}>{est.texto}</Pill>;
          })()}
        />

        {/* Es la instrucción del alumno sobre cómo quiere el documento: va
            arriba y destacada, no enterrada entre los comentarios. */}
        {tramite.observaciones && (
          <div className="rounded-lg px-5 py-4" style={{ background: C.azul100 }}>
            <div className="text-[11px] font-semibold" style={{ color: C.azul700 }}>
              OBSERVACIONES DE LA SOLICITUD
            </div>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: C.azul900 }}>
              {tramite.observaciones}
            </p>
          </div>
        )}

        <div className="flex items-center gap-4 rounded-lg px-4 py-3.5"
             style={{ background: C.blanco, border: `1px solid ${C.gris200}` }}>
          <span className="shrink-0 text-[13px] font-semibold" style={{ color: C.gris700 }}>Avance</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: C.gris200 }}>
            <div className="h-full rounded-full"
                 style={{ background: C.verde600,
                          width: `${(tramite.etapa_idx / (tramite.etapas.length - 1)) * 100}%` }} />
          </div>
          <span className="shrink-0 text-xs" style={{ color: C.gris500 }}>
            {tramite.etapa_idx} de {tramite.etapas.length - 1} etapas
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
          <div className="space-y-3.5 lg:col-span-2">
            <Card title="Etapas del trámite">
              <LineaTiempo tramite={tramite} />
            </Card>
            <Comentarios tramite={tramite} onActualizar={setTramite} />
          </div>

          <div className="space-y-3.5">
            <ZonaAccion tramite={tramite} usuario={usuario} onActualizar={setTramite} />

            {tramite.pago && (
              <Card title="Pago declarado">
                <dl className="space-y-2.5 px-5 py-4">
                  {[["Monto esperado", pesos(tramite.total)],
                    ["Fecha del depósito", fecha(tramite.pago.fecha_deposito)],
                    ["Operación", tramite.pago.referencia_operacion]].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-xs" style={{ color: C.gris500 }}>{k}</dt>
                      <dd className="text-right text-xs font-medium" style={{ color: C.gris700 }}>{v}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}

            {archivos.length > 0 && (
              <Card title="Archivos">
                <div className="space-y-2 px-5 py-4">
                  {archivos.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-md px-3 py-2.5"
                         style={{ background: C.gris100 }}>
                      <Paperclip size={15} color={C.gris400} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium" style={{ color: C.gris700 }}>
                          {ETIQUETAS[a.tipo] ?? a.nombre}
                        </div>
                        <div className="text-[11px]" style={{ color: C.gris400 }}>
                          {Math.round(a.tamanio_bytes / 1024)} KB · {fecha(a.creado_en)}
                        </div>
                      </div>
                      {/* Ver abre en línea; descargar es una acción aparte. */}
                      <BotonEnlace href={api.urlArchivo(tramite.folio, a.id)} target="_blank" tamano="sm">
                        Ver
                      </BotonEnlace>
                      <BotonEnlace href={api.urlDescarga(tramite.folio, a.id)} variante="neutro"
                                   tamano="sm" aria-label={`Descargar ${a.nombre}`}>
                        <Download size={14} />
                      </BotonEnlace>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* El recibo y el documento final se muestran completos: son lo que
                el alumno viene a buscar. */}
            {destacado && (
              <Card title={ETIQUETAS[destacado.tipo]}>
                <Visor folio={tramite.folio} archivo={destacado} alto="h-80" />
              </Card>
            )}
          </div>
        </div>
      </div>
    </Marco>
  );
}

/* Una sola acción posible a la vez. Si no te toca, no ves botones: ves quién
   tiene el trámite y desde cuándo. Ahí muere la pregunta "¿cómo va lo mío?". */
function ZonaAccion({ tramite, usuario, onActualizar }) {
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [linea, setLinea] = useState("");
  const [pago, setPago] = useState({ fecha_deposito: "", referencia_operacion: "", comprobante: null });
  const [documento, setDocumento] = useState(null);

  const ejecutar = async (fn) => {
    setOcupado(true);
    setError(null);
    try {
      onActualizar(await fn());
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  };

  if (tramite.concluido)
    return (
      <Aviso tono="verde" titulo="Trámite concluido">
        El documento fue entregado. Puedes descargarlo desde la lista de archivos.
      </Aviso>
    );

  const esMio = usuario.rol === "alumno" && tramite.matricula === usuario.identificador;
  const meToca = tramite.responsable === usuario.rol && (usuario.rol !== "alumno" || esMio);

  if (!meToca)
    return (
      <Aviso titulo={usuario.rol === "alumno" ? "No necesitas hacer nada por ahora" : "No requiere tu intervención"}>
        {tramite.etapa_actual} — {tramite.responsable ?? "sin responsable"} lo tiene desde
        el {fecha(tramite.desde)}.
        {usuario.rol === "alumno" && " Te llegará un correo en cuanto avance."}
      </Aviso>
    );

  if (tramite.etapa_clave === "linea_captura")
    return (
      <Aviso titulo="Emite la línea de captura">
        <div className="mt-3 space-y-3">
          <input value={linea} onChange={(e) => setLinea(e.target.value)}
                 placeholder="Referencia de pago"
                 className="w-full rounded-md px-3 py-2.5 text-[13px] outline-none" style={estiloInput} />
          <MensajeError>{error}</MensajeError>
          <Boton disabled={ocupado || !linea.trim()}
                 onClick={() => ejecutar(() => api.avanzar(tramite.folio, { linea_captura: linea.trim() }))}>
            Registrar línea de captura
          </Boton>
        </div>
      </Aviso>
    );

  if (tramite.etapa_clave === "elaboracion")
    return (
      <Aviso titulo="Elabora y entrega el documento">
        Sube el PDF firmado. El alumno recibirá un correo con el enlace y podrá
        descargarlo desde aquí.
        {/* El archivo es obligatorio: un trámite no puede quedar "entregado"
            sin documento, o el alumno recibiría aviso de algo que no existe. */}
        <div className="mt-3 space-y-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-[13px]"
                 style={estiloInput}>
            <Upload size={15} color={C.gris400} />
            {documento ? documento.name : "Selecciona el documento firmado"}
            <input type="file" accept=".pdf" className="hidden"
                   onChange={(e) => setDocumento(e.target.files?.[0] ?? null)} />
          </label>
          <MensajeError>{error}</MensajeError>
          <Boton disabled={ocupado || !documento}
                 onClick={() => ejecutar(() => api.entregarDocumento(tramite.folio, documento))}>
            Entregar documento
          </Boton>
        </div>
      </Aviso>
    );

  if (tramite.etapa_clave === "comprobante")
    return (
      <Aviso titulo="Sube tu comprobante de pago">
        Línea de captura {tramite.linea_captura} · {pesos(tramite.total)}
        <div className="mt-3 space-y-2.5">
          <input type="date" value={pago.fecha_deposito}
                 onChange={(e) => setPago({ ...pago, fecha_deposito: e.target.value })}
                 className="w-full rounded-md px-3 py-2.5 text-[13px] outline-none" style={estiloInput} />
          <input placeholder="Número de operación completo" value={pago.referencia_operacion}
                 onChange={(e) => setPago({ ...pago, referencia_operacion: e.target.value })}
                 className="w-full rounded-md px-3 py-2.5 text-[13px] outline-none" style={estiloInput} />
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-[13px]"
                 style={{ ...estiloInput }}>
            <Upload size={15} color={C.gris400} />
            {pago.comprobante ? pago.comprobante.name : "Selecciona tu comprobante"}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                   onChange={(e) => setPago({ ...pago, comprobante: e.target.files?.[0] ?? null })} />
          </label>
          <MensajeError>{error}</MensajeError>
          <Boton disabled={ocupado || !pago.comprobante}
                 onClick={() => ejecutar(() => api.subirComprobante(tramite.folio, pago))}>
            Enviar comprobante
          </Boton>
        </div>
      </Aviso>
    );

  return null;
}
