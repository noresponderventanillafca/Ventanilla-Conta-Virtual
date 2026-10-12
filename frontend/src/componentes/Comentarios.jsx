import { useState } from "react";
import { Paperclip, Send, X } from "lucide-react";

import { C } from "../tokens";
import { api } from "../api/cliente";
import { Card, Boton, BotonEnlace, MensajeError, estiloInput } from "./ui";

const fechaHora = (iso) =>
  new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const iniciales = (n) => n.split(" ").map((w) => w[0]).slice(0, 2).join("");

/* Un comentario nunca mueve el trámite de etapa. Si el alumno pide un cambio,
   Secretaría debe devolverlo formalmente; si no, habría trámites que
   "avanzaron" en la conversación pero no en el estado. */
export default function Comentarios({ tramite, onActualizar }) {
  const [texto, setTexto] = useState("");
  const [adjunto, setAdjunto] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const comentarios = (tramite.eventos ?? []).filter(
    (e) => e.tipo === "comentario" || e.tipo === "devolucion"
  );

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      onActualizar(await api.comentar(tramite.folio, texto.trim(), adjunto));
      setTexto("");
      setAdjunto(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card
      title="Comentarios del trámite"
      right={<span className="text-[11px]" style={{ color: C.gris400 }}>
        Visible para todos los participantes
      </span>}
    >
      <div className="space-y-5 px-5 py-5">
        {comentarios.length === 0 && (
          <p className="text-[13px]" style={{ color: C.gris500 }}>
            Aún no hay comentarios. Úsalos para pedir ajustes al documento o aclarar datos.
          </p>
        )}

        {comentarios.map((c, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                 style={{ background: C.azul100, color: C.azul700 }}>
              {iniciales(c.autor)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[13px] font-semibold" style={{ color: C.azul900 }}>{c.autor}</span>
                <span className="text-[11px]" style={{ color: C.gris400 }}>{c.rol} · {fechaHora(c.fecha)}</span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed"
                 style={{ color: c.tipo === "devolucion" ? C.rojo600 : C.gris700 }}>
                {c.texto}
              </p>
              {(c.archivos ?? []).map((a) => (
                <BotonEnlace key={a.id} href={api.urlArchivo(tramite.folio, a.id)}
                             target="_blank" variante="neutro" tamano="sm" className="mt-2">
                  <Paperclip size={14} /> {a.nombre}
                </BotonEnlace>
              ))}
            </div>
          </div>
        ))}

        <div style={{ borderTop: `1px solid ${C.gris200}` }} className="space-y-2 pt-4">
          <textarea
            value={texto} rows={2}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe un comentario sobre este trámite…"
            className="campo-texto w-full rounded-md px-3.5 py-3 text-[13px]"
            style={estiloInput}
          />
          <MensajeError>{error}</MensajeError>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs"
                   style={{ border: `1px solid ${C.gris200}`, color: C.gris700 }}>
              <Paperclip size={14} color={C.gris500} />
              {adjunto ? adjunto.name : "Adjuntar archivo"}
              <input type="file" className="hidden"
                     onChange={(e) => setAdjunto(e.target.files?.[0] ?? null)} />
            </label>
            {adjunto && (
              <button onClick={() => setAdjunto(null)} aria-label="Quitar archivo adjunto"
                      className="flex h-9 w-9 items-center justify-center rounded-md"
                      style={{ border: `1px solid ${C.gris200}`, background: C.blanco }}>
                <X size={15} color={C.gris500} />
              </button>
            )}
            <Boton onClick={enviar} disabled={!texto.trim() || enviando} className="ml-auto">
              <span className="inline-flex items-center gap-2">
                <Send size={14} /> {enviando ? "Enviando…" : "Enviar"}
              </span>
            </Boton>
          </div>
        </div>
      </div>
    </Card>
  );
}
