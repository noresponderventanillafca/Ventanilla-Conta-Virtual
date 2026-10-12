import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";

import { C, pesos, fecha } from "../tokens";
import { api } from "../api/cliente";
import Marco from "../componentes/Marco";
import Visor from "../componentes/Visor";
import DatosAlumno from "../componentes/DatosAlumno";
import { Card, Boton, Cargando, Vacio, MensajeError, estiloInput } from "../componentes/ui";

const MOTIVOS = ["Monto incorrecto", "Comprobante ilegible", "Depósito no localizado", "Los datos no coinciden"];

export default function ValidacionPagos() {
  const navegar = useNavigate();
  const [cola, setCola] = useState(null);
  const [i, setI] = useState(0);
  const [detalle, setDetalle] = useState(null);
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const cargarCola = () => api.bandeja().then((b) => { setCola(b); setI(0); });

  useEffect(() => { cargarCola().catch((e) => setError(e.message)); }, []);

  useEffect(() => {
    if (!cola?.length) return setDetalle(null);
    const actual = cola[Math.min(i, cola.length - 1)];
    setDetalle(null);
    setRechazando(false);
    api.detalle(actual.folio).then(setDetalle).catch((e) => setError(e.message));
  }, [cola, i]);

  if (cola === null) return <Marco><Cargando /></Marco>;
  if (!cola.length)
    return <Marco>
      <Card title="Validación de pagos">
        <Vacio>No hay pagos pendientes de validar.</Vacio>
      </Card>
    </Marco>;

  const t = detalle;
  const idx = Math.min(i, cola.length - 1);
  const comprobante = t?.archivos?.find((a) => a.tipo === "comprobante_pago") ?? t?.archivos?.[0];

  const ejecutar = async (fn) => {
    setOcupado(true); setError(null);
    try { await fn(); await cargarCola(); }
    catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };

  return (
    <Marco>
      <div className="space-y-3.5">
        <h1 className="text-xl font-semibold" style={{ color: C.azul900 }}>Validación de pagos</h1>

        <div className="flex flex-wrap items-center gap-3 rounded-lg px-4 py-3.5"
             style={{ background: C.blanco, border: `1px solid ${C.gris200}` }}>
          <div className="min-w-0">
            <div className="text-[11px]" style={{ color: C.gris400 }}>{cola[idx].folio}</div>
            <div className="text-sm font-semibold" style={{ color: C.azul900 }}>
              {cola[idx].tipo}
            </div>
          </div>
          {/* Navegar la cola sin abrir y cerrar pantallas: a veinte trámites,
              lo contrario se vuelve insoportable. */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs" style={{ color: C.gris500 }}>
              {idx + 1} de {cola.length} pendientes
            </span>
            {/* 36px de lado: por debajo de eso es difícil acertarle con el dedo. */}
            <button onClick={() => setI(Math.max(0, idx - 1))} aria-label="Trámite anterior"
                    className="flex h-9 w-9 items-center justify-center rounded-md"
                    style={{ border: `1px solid ${C.gris200}`, background: C.blanco }}>
              <ChevronLeft size={17} color={C.gris700} />
            </button>
            <button onClick={() => setI(Math.min(cola.length - 1, idx + 1))} aria-label="Trámite siguiente"
                    className="flex h-9 w-9 items-center justify-center rounded-md"
                    style={{ border: `1px solid ${C.gris200}`, background: C.blanco }}>
              <ChevronRight size={17} color={C.gris700} />
            </button>
          </div>
        </div>

        {t && <DatosAlumno tramite={t} />}

        {!t ? <Cargando /> : (
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.15fr_1fr]">
            <Card title={comprobante?.nombre ?? "Sin comprobante"}>
              <Visor folio={t.folio} archivo={comprobante} />
            </Card>

            <div className="space-y-3.5">
              {/* El monto va en grande porque es lo único que el sistema no
                  puede comprobar: hay que leerlo en el comprobante. */}
              <Card title="Coteja contra el comprobante">
                <div className="px-5 py-4">
                  <div className="rounded-md px-4 py-3" style={{ background: C.azul100 }}>
                    <div className="text-[11px] font-semibold" style={{ color: C.azul700 }}>
                      EL DEPÓSITO DEBE SER POR
                    </div>
                    <div className="text-2xl font-semibold" style={{ color: C.azul900 }}>
                      {pesos(t.total)}
                    </div>
                  </div>
                  <dl className="mt-3 space-y-2">
                    {[["Fecha declarada", t.pago ? fecha(t.pago.fecha_deposito) : "—"],
                      ["Operación declarada", t.pago?.referencia_operacion ?? "—"],
                      ["Concepto esperado", t.concepto_deposito]].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3">
                        <dt className="text-xs" style={{ color: C.gris500 }}>{k}</dt>
                        <dd className="text-right text-xs font-medium" style={{ color: C.gris700 }}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </Card>

              {/* Separadas a propósito: cuando esto se audite, la bitácora debe
                  distinguir lo que garantizó la máquina de lo que afirmó una
                  persona con nombre y hora. */}
              <Card title="Verificado por el sistema">
                <div className="px-5 py-4">
                  {(t.verificaciones ?? []).map((v, k) => (
                    <div key={k} className="flex items-start gap-2.5 py-1">
                      {v.ok ? <CheckCircle2 size={16} color={C.verde600} className="shrink-0" />
                            : <AlertTriangle size={16} color={C.rojo600} className="shrink-0" />}
                      <span className="text-xs leading-snug"
                            style={{ color: v.ok ? C.gris700 : C.rojo600 }}>{v.texto}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Aquí no se sube nada. El recibo se genera fuera del sistema y
                  se entrega en físico a Secretaría, que lo escanea junto con el
                  documento. Pedirle además al administrador que lo subiera
                  duplicaría el trabajo. */}
              <Card title="Qué sigue si confirmas">
                <ol className="space-y-2 px-5 py-4">
                  {["Generas el recibo en el sistema de la universidad.",
                    "Se lo entregas en físico a Secretaría.",
                    "Secretaría lo escanea y lo sube junto con el documento."]
                    .map((paso, i) => (
                      <li key={i} className="flex gap-3 text-xs leading-relaxed"
                          style={{ color: C.gris700 }}>
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                              style={{ background: C.azul100, color: C.azul700 }}>{i + 1}</span>
                        {paso}
                      </li>
                    ))}
                </ol>
              </Card>

              <MensajeError>{error}</MensajeError>

              {rechazando ? (
                <Card title="Motivo del rechazo">
                  <div className="space-y-3 px-5 py-4">
                    <select value={motivo} onChange={(e) => setMotivo(e.target.value)}
                            className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px]" style={estiloInput}>
                      {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
                    </select>
                    <p className="text-[11px]" style={{ color: C.gris500 }}>
                      El alumno verá este motivo en su trámite y podrá corregir sin escribir un correo.
                    </p>
                    <div className="flex gap-2">
                      <Boton variante="peligro" disabled={ocupado}
                             onClick={() => ejecutar(() => api.rechazarPago(t.folio, motivo))}>
                        Confirmar rechazo
                      </Boton>
                      <Boton variante="secundario" onClick={() => setRechazando(false)}>Cancelar</Boton>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {/* El texto del botón dice lo que la persona está afirmando:
                      que la referencia corresponde al recibo que tiene enfrente. */}
                  <Boton disabled={ocupado}
                         onClick={() => ejecutar(() => api.confirmarPago(t.folio))}>
                    La referencia coincide — elaborar recibo
                  </Boton>
                  <Boton variante="peligro" onClick={() => setRechazando(true)}>Rechazar…</Boton>
                  <Boton variante="secundario" onClick={() => navegar(`/tramites/${t.folio}`)}>
                    Ver expediente
                  </Boton>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Marco>
  );
}
