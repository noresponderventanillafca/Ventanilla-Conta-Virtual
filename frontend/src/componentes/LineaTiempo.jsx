import { C, fecha } from "../tokens";

const fechaHora = (iso) =>
  new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/* La línea de tiempo es lo que responde la pregunta que hoy se hace por
   correo: en qué etapa va, con quién está, y desde cuándo. */
export default function LineaTiempo({ tramite }) {
  const { etapas, etapa_idx, concluido, retrasado, dias_en_etapa, devolucion_motivo } = tramite;
  const eventosEtapa = (tramite.eventos ?? []).filter((e) => e.tipo === "etapa");

  return (
    <div className="px-5 pt-5 pb-3">
      {etapas.map((et, i) => {
        const hecha = i < etapa_idx;
        const activa = i === etapa_idx && !concluido;
        const ultima = i === etapas.length - 1;
        const final = ultima && concluido;

        // Mismo semáforo que las tablas: ámbar en atención, rojo fuera de plazo.
        const punto = hecha || final ? C.verde600
                    : activa ? (retrasado ? C.rojo600 : C.ambar600)
                    : C.gris200;
        const linea = hecha || final ? C.verde600 : C.gris200;
        const titulo = hecha || activa || final ? C.azul900 : C.gris400;
        const ev = eventosEtapa[i];

        return (
          <div key={et.clave} className="flex gap-3.5">
            <div className="flex w-3 shrink-0 flex-col items-center">
              <span className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      background: punto,
                      boxShadow: activa ? `0 0 0 4px ${retrasado ? C.rojo100 : C.ambar100}` : "none",
                    }} />
              {!ultima && <span className="w-0.5 flex-1" style={{ background: linea }} />}
            </div>

            <div className={ultima ? "flex-1 pb-1" : "flex-1 pb-6"}>
              <div className="text-sm font-semibold leading-tight" style={{ color: titulo }}>
                {et.nombre}
              </div>
              <div className="mt-1 text-xs" style={{ color: hecha || activa || final ? C.gris500 : C.gris400 }}>
                {(hecha || final) && ev
                  ? `${ev.autor} · ${fechaHora(ev.fecha)}`
                  : activa
                  ? `${et.actor ?? "—"} · en curso desde el ${fecha(tramite.desde)}`
                  : `${et.actor ?? "—"} · pendiente`}
              </div>

              {activa && retrasado && (
                <div className="mt-2 inline-block rounded px-3 py-1.5 text-xs font-medium"
                     style={{ background: C.rojo100, color: C.rojo600 }}>
                  Lleva {dias_en_etapa} días hábiles · el plazo es de {et.dias_max}
                </div>
              )}

              {activa && devolucion_motivo && (
                <div className="mt-2 rounded px-3 py-2 text-xs"
                     style={{ background: C.rojo100, color: C.rojo600 }}>
                  Devuelto: {devolucion_motivo}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
