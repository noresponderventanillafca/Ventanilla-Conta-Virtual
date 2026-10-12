import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Upload, Copy } from "lucide-react";

import { C, pesos } from "../tokens";
import { api } from "../api/cliente";
import Marco from "../componentes/Marco";
import { Card, Campo, Boton, BotonEnlace, Aviso, MensajeError, Cargando, estiloInput } from "../componentes/ui";

/* Un documento por solicitud: Administración emite un recibo por cada uno,
   así que dos constancias son dos solicitudes con dos depósitos distintos.

   El concepto del depósito se muestra desde que se elige el documento, no
   después. Los alumnos depositan de memoria, antes de entrar al sistema: un
   concepto que dependiera de un folio generado al solicitar llegaría tarde. */

export default function NuevaSolicitud() {
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const [documentos, setDocumentos] = useState(null);
  const [cuenta, setCuenta] = useState(null);
  const [tipoId, setTipoId] = useState("");
  const [pago, setPago] = useState({ fecha_deposito: "", referencia_operacion: "", comprobante: null });
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    Promise.all([api.documentos(), api.cuenta()])
      .then(([docs, cta]) => {
        setDocumentos(docs);
        setCuenta(cta);
        // Si llegó desde el catálogo, respeta el documento que ya eligió.
        const pedido = params.get("tipo");
        const existe = docs.some((d) => String(d.id) === pedido);
        if (existe) setTipoId(pedido);
        else if (docs.length) setTipoId(String(docs[0].id));
      })
      .catch((e) => setError(e.message));
  }, []);

  if (documentos === null) return <Marco><Cargando /></Marco>;

  const tipo = documentos.find((d) => String(d.id) === tipoId);
  const conPago = tipo?.momento_pago === "al_solicitar";

  const copiar = (texto) => {
    navigator.clipboard?.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const enviar = async () => {
    setError(null);
    if (conPago && (!pago.fecha_deposito || !pago.referencia_operacion.trim() || !pago.comprobante))
      return setError("Completa la fecha, el número de operación y adjunta el comprobante.");
    setEnviando(true);
    try {
      const t = await api.crear({
        tipo_documento_id: tipo.id, observaciones, ...(conPago ? pago : {}),
      });
      navegar(`/tramites/${t.folio}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Marco>
      <div className="space-y-3.5">
        <Boton variante="neutro" onClick={() => navegar("/tramites")}>
          <ArrowLeft size={15} /> Cancelar
        </Boton>

        <h1 className="text-xl font-semibold" style={{ color: C.azul900 }}>Nueva solicitud</h1>

        <Card title="Documento">
          <div className="space-y-4 px-5 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <Campo label="¿Qué documento necesitas?">
                <select value={tipoId} onChange={(e) => { setTipoId(e.target.value); setError(null); }}
                        className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px]" style={estiloInput}>
                  {documentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre} — {d.costo === 0 ? "sin costo" : pesos(d.costo)}
                    </option>
                  ))}
                </select>
              </Campo>
              <div className="rounded-md px-4 py-2.5 text-[15px] font-semibold"
                   style={{ background: C.azul100, color: C.azul700 }}>
                {tipo?.costo === 0 ? "Sin costo" : pesos(tipo?.costo ?? 0)}
              </div>
            </div>

            {tipo?.descripcion && (
              <p className="text-[13px] leading-relaxed" style={{ color: C.gris700 }}>
                {tipo.descripcion}
              </p>
            )}
            {tipo?.requisitos && (
              <p className="text-xs leading-relaxed" style={{ color: C.gris500 }}>
                <strong style={{ color: C.gris700 }}>Requisitos:</strong> {tipo.requisitos}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {tipo?.ejemplo && (
                <BotonEnlace href={api.urlEjemplo(tipo.id)} target="_blank"
                             variante="neutro" tamano="sm">
                  Ver cómo se ve este documento
                </BotonEnlace>
              )}
              <p className="text-xs leading-relaxed" style={{ color: C.gris500 }}>
                Cada documento lleva su propio depósito y su propio recibo. Si necesitas
                dos, envía dos solicitudes con dos depósitos por separado.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Observaciones">
          <div className="px-5 py-5">
            <Campo label="¿Necesitas algún ajuste en el documento?"
                   ayuda="Por ejemplo, a qué dependencia va dirigido o para qué lo vas a usar. Secretaría lo verá al elaborarlo.">
              <textarea rows={3} value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Opcional"
                        className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px]"
                        style={estiloInput} />
            </Campo>
          </div>
        </Card>

        {tipo?.momento_pago === "tras_linea_de_captura" && (
          <Aviso titulo="Este trámite lleva línea de captura">
            Envía la solicitud y Secretaría generará tu referencia de pago.
            Te avisaremos por correo para que deposites.
          </Aviso>
        )}

        {conPago && (
          <>
            <Card title="Datos para tu depósito">
              <div className="px-5 py-5">
                {/* El concepto aparece aquí, antes de pedir nada: es el dato
                    que el alumno necesita para ir al banco. */}
                <div className="rounded-md px-4 py-4" style={{ background: C.azul100 }}>
                  <div className="text-[11px] font-semibold" style={{ color: C.azul700 }}>
                    ESCRIBE ESTO EN EL CONCEPTO
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3">
                    <span className="text-xl font-semibold tracking-wide" style={{ color: C.azul900 }}>
                      {tipo.concepto}
                    </span>
                    <button onClick={() => copiar(tipo.concepto)}
                            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold"
                            style={{ background: C.blanco, color: C.azul700,
                                     border: `1px solid ${C.gris200}` }}>
                      <Copy size={14} /> {copiado ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: C.azul700 }}>
                    Tu matrícula más la clave del documento. Es siempre el mismo para
                    este trámite, así que puedes anotarlo antes de ir al banco.
                  </p>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-4 rounded-md p-4 sm:grid-cols-4"
                    style={{ background: C.gris100 }}>
                  {[["Banco", cuenta?.banco], ["Titular", cuenta?.titular],
                    ["Cuenta", cuenta?.cuenta], ["CLABE", cuenta?.clabe]].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px]" style={{ color: C.gris400 }}>{k}</dt>
                      <dd className="text-[13px]" style={{ color: C.gris700 }}>{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-3 flex gap-3 rounded-md p-3.5" style={{ background: C.ambar100 }}>
                  <AlertTriangle size={17} color={C.ambar600} className="shrink-0" />
                  <p className="text-xs leading-relaxed" style={{ color: C.ambar600 }}>
                    Deposita exactamente {pesos(tipo.costo)}. Un monto distinto no se
                    puede validar automáticamente y el trámite se detiene. Si tienes
                    duda sobre qué documento necesitas, pregunta a la Coordinación
                    antes de depositar: el pago no se devuelve de forma automática.
                  </p>
                </div>
              </div>
            </Card>

            <Card title="Comprobante de pago">
              <div className="px-5 py-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* El monto no se pregunta: el alumno teclearía lo que la
                      pantalla le acaba de decir, así que no verificaría nada.
                      Solo se piden datos que están en su recibo y que el
                      sistema no puede conocer por su cuenta. */}
                  <Campo label="Fecha del depósito">
                    <input type="date" value={pago.fecha_deposito}
                           onChange={(e) => setPago({ ...pago, fecha_deposito: e.target.value })}
                           className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px]" style={estiloInput} />
                  </Campo>
                  <Campo label="Número de operación"
                         ayuda="Completo. Es lo que distingue un depósito de otro.">
                    <input value={pago.referencia_operacion}
                           onChange={(e) => setPago({ ...pago, referencia_operacion: e.target.value })}
                           placeholder="Clave de rastreo o folio"
                           className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px]" style={estiloInput} />
                  </Campo>
                </div>

                <label className="mt-4 flex cursor-pointer flex-col items-center gap-1.5 rounded-md px-4 py-6"
                       style={{ border: `1px dashed ${C.gris400}`, background: C.gris100 }}>
                  <Upload size={22} color={C.gris400} />
                  <span className="text-[13px]" style={{ color: C.gris700 }}>
                    {pago.comprobante ? pago.comprobante.name : "Selecciona tu comprobante"}
                  </span>
                  <span className="text-[11px]" style={{ color: C.gris400 }}>
                    JPG, PNG o PDF · máximo 5 MB
                  </span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                         onChange={(e) => setPago({ ...pago, comprobante: e.target.files?.[0] ?? null })} />
                </label>
              </div>
            </Card>
          </>
        )}

        <MensajeError>{error}</MensajeError>

        <div className="flex flex-wrap items-center gap-3">
          <Boton onClick={enviar} disabled={enviando || !tipo}>
            {enviando ? "Enviando…" : "Enviar solicitud"}
          </Boton>
          <span className="text-xs" style={{ color: C.gris500 }}>
            {tipo?.momento_pago === "sin_costo"
              ? "Pasará directamente a Secretaría."
              : conPago
              ? "Pasará a validación de Administración."
              : "Secretaría emitirá tu línea de captura."}
          </span>
        </div>
      </div>
    </Marco>
  );
}
