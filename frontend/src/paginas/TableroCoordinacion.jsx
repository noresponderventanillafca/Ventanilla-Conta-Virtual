import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";

import { C } from "../tokens";
import { api } from "../api/cliente";
import Marco from "../componentes/Marco";
import TablaTramites from "../componentes/TablaTramites";
import { Card, Cargando, Vacio, MensajeError, Boton } from "../componentes/ui";

/* La visibilidad de la Coordinación es estructural: no depende de que alguien
   se acuerde de ponerla en copia. */
export default function TableroCoordinacion() {
  const navegar = useNavigate();
  const [tramites, setTramites] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listar().then(setTramites).catch((e) => setError(e.message));
  }, []);

  if (error) return <Marco><MensajeError onReintentar={() => window.location.reload()}>{error}</MensajeError></Marco>;
  if (tramites === null) return <Marco><Cargando /></Marco>;

  const activos = tramites.filter((t) => !t.concluido);
  const retrasados = tramites.filter((t) => t.retrasado);
  const porArea = ["secretaria", "administrador", "alumno"].map((rol) => ({
    rol, n: activos.filter((t) => t.responsable === rol).length,
  }));

  const NOMBRES = { secretaria: "Secretaría", administrador: "Administración", alumno: "Alumnos" };

  return (
    <Marco>
      <div className="space-y-3.5">
        <h1 className="text-xl font-semibold" style={{ color: C.azul900 }}>
          Tablero de la Coordinación
        </h1>

        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {[["En proceso", activos.length, C.azul700],
            ["Fuera de plazo", retrasados.length, retrasados.length ? C.rojo600 : C.gris400],
            ["Concluidos", tramites.length - activos.length, C.verde600],
            ["Total", tramites.length, C.gris700]].map(([label, n, color]) => (
            <div key={label} className="rounded-lg px-4 py-4"
                 style={{ background: C.blanco, border: `1px solid ${C.gris200}` }}>
              <div className="text-[11px] font-semibold" style={{ color: C.gris400 }}>{label}</div>
              <div className="mt-1 text-2xl font-semibold" style={{ color }}>{n}</div>
            </div>
          ))}
        </div>

        <Card title="Trámites fuera de plazo">
          {retrasados.length === 0 ? (
            <Vacio>Ningún trámite excede su plazo. Todo va a tiempo.</Vacio>
          ) : (
            retrasados.map((t) => (
              <div key={t.folio} className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                   style={{ borderTop: `1px solid ${C.gris200}` }}>
                <Clock size={16} color={C.rojo600} />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold" style={{ color: C.azul900 }}>
                    {t.folio} · {t.alumno}
                  </div>
                  <div className="text-xs" style={{ color: C.gris500 }}>
                    {t.etapa_actual} — detenido con {NOMBRES[t.responsable] ?? t.responsable} desde
                    hace {t.dias_en_etapa} días hábiles (plazo: {t.dias_max})
                  </div>
                </div>
                <Boton variante="secundario" tamano="sm" className="ml-auto"
                       onClick={() => navegar(`/tramites/${t.folio}`)}>
                  Abrir
                </Boton>
              </div>
            ))
          )}
        </Card>

        <Card title="Carga por área">
          <div className="grid grid-cols-3 gap-4 px-5 py-5">
            {porArea.map(({ rol, n }) => (
              <div key={rol}>
                <div className="text-xs" style={{ color: C.gris500 }}>{NOMBRES[rol]}</div>
                <div className="text-lg font-semibold" style={{ color: C.azul900 }}>{n}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Todos los trámites">
          <TablaTramites tramites={tramites} mostrarAlumno />
        </Card>
      </div>
    </Marco>
  );
}
