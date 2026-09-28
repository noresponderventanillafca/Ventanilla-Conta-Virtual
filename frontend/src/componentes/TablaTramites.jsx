import { useNavigate } from "react-router-dom";

import { C, fecha } from "../tokens";
import { useSesion } from "../sesion";
import { Pill, Vacio, Boton } from "./ui";

/* Cuatro colores, cada uno con un significado y ninguno decorativo:
     azul   → necesita que alguien lo tome (nuevo, o esperando al alumno)
     ámbar  → alguien lo está atendiendo
     rojo   → algo va mal: fuera de plazo o devuelto para corrección
     verde  → concluido

   El rojo es el único que hay que reservar con disciplina. Si el estado normal
   ya es de color, un retraso pintado del mismo tono desaparece, y avisar de los
   retrasos es la razón de ser del tablero. */

export function estadoDe(tramite, rol) {
  const t = tramite;
  if (t.concluido) return { texto: "Concluido", tono: "verde", orden: 4 };
  if (t.retrasado)
    return { texto: `Fuera de plazo · ${t.dias_en_etapa} d`, tono: "rojo", orden: 0 };
  if (t.devolucion_motivo)
    return { texto: "Requiere corrección", tono: "rojo", orden: 0 };
  if (rol === "alumno" && t.responsable === "alumno")
    return { texto: "Requiere tu acción", tono: "azul", orden: 1 };
  if (t.nuevo) return { texto: "Nuevo", tono: "azul", orden: 1 };
  return { texto: `En atención · ${t.dias_en_etapa} d`, tono: "ambar", orden: 2 };
}

/* Lo urgente arriba y lo concluido al fondo: una lista ordenada por fecha
   obliga a recorrerla entera para encontrar lo que hay que atender. */
export function ordenarPorUrgencia(tramites, rol) {
  return [...tramites].sort((a, b) => {
    const da = estadoDe(a, rol).orden - estadoDe(b, rol).orden;
    if (da !== 0) return da;
    return new Date(b.creado_en) - new Date(a.creado_en);
  });
}

export default function TablaTramites({
  tramites,
  mostrarAlumno = false,
  vacio = "No hay trámites en esta vista.",
}) {
  const navegar = useNavigate();
  const { usuario } = useSesion();
  if (!tramites.length) return <Vacio>{vacio}</Vacio>;

  const ordenados = ordenarPorUrgencia(tramites, usuario.rol);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr style={{ background: C.gris100 }}>
            {["Folio", mostrarAlumno ? "Alumno" : "Documento", "Estado", "Etapa actual", "Solicitado", ""]
              .map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold"
                    style={{ color: C.gris500 }}>{h}</th>
              ))}
          </tr>
        </thead>
        <tbody>
          {ordenados.map((t) => {
            const est = estadoDe(t, usuario.rol);
            return (
              <tr key={t.folio} style={{
                borderTop: `1px solid ${C.gris200}`,
                // Lo concluido se atenúa: sigue consultable, pero deja de
                // competir por la atención con lo que falta por hacer.
                opacity: t.concluido ? 0.72 : 1,
              }}>
                <td className="px-4 py-3.5 text-[13px] font-semibold" style={{ color: C.azul700 }}>
                  {t.folio}
                </td>
                <td className="px-4 py-3.5 text-sm" style={{ color: C.gris700 }}>
                  {mostrarAlumno ? (
                    <>
                      <div>{t.alumno}</div>
                      <div className="text-[11px]" style={{ color: C.gris400 }}>{t.tipo}</div>
                    </>
                  ) : (
                    <>{t.tipo}</>
                  )}
                </td>
                <td className="px-4 py-3.5"><Pill tono={est.tono}>{est.texto}</Pill></td>
                <td className="px-4 py-3.5 text-xs" style={{ color: C.gris500 }}>
                  {t.concluido ? "—" : `${t.etapa_actual} · ${t.responsable ?? "—"}`}
                </td>
                <td className="px-4 py-3.5 text-xs" style={{ color: C.gris500 }}>
                  {fecha(t.creado_en)}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <Boton variante="secundario" tamano="sm"
                         onClick={() => navegar(`/tramites/${t.folio}`)}>
                    Abrir
                  </Boton>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
