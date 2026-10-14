import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { C } from "../tokens";
import { api } from "../api/cliente";
import { useSesion } from "../sesion";
import Marco from "../componentes/Marco";
import TablaTramites from "../componentes/TablaTramites";
import { Card, Cargando, MensajeError, estiloInput } from "../componentes/ui";

/* Secretaría y Administración ven aquí lo que atendieron. La vista completa
   del programa es de la Coordinación: ella supervisa el proceso y decide dónde
   empujar. Repartirla daría a cada persona acceso a expedientes de alumnos que
   nunca tocó, sin que nadie lo necesite para trabajar. */

export default function Historial() {
  const { usuario } = useSesion();
  const [tramites, setTramites] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    api.historial().then(setTramites).catch((e) => setError(e.message));
  }, []);

  if (error) return <Marco><MensajeError onReintentar={() => window.location.reload()}>{error}</MensajeError></Marco>;

  const q = busqueda.trim().toLowerCase();
  const filtrados = !tramites ? [] : (!q ? tramites : tramites.filter((t) =>
    [t.folio, t.alumno, t.matricula, t.tipo].some((v) => (v ?? "").toLowerCase().includes(q))
  ));

  return (
    <Marco>
      <div className="space-y-3.5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: C.azul900 }}>Historial</h1>
          <p className="mt-1 text-sm" style={{ color: C.gris500 }}>
            {usuario.rol === "coordinadora"
              ? "Todos los trámites del programa, atendidos o en curso."
              : "Trámites en los que interviniste. Quedan aquí aunque estén concluidos, para cualquier aclaración posterior."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="caja-campo ml-auto flex items-center gap-2 rounded-md px-3 py-2" style={estiloInput}>
            <Search size={14} color={C.gris400} />
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                   placeholder="Folio, matrícula o nombre"
                   className="campo-texto w-56 text-[13px]" style={{ border: "none" }} />
          </div>
        </div>

        {tramites === null ? <Cargando /> : (
          <Card title={`${tramites.length} trámites · ${tramites.filter((t) => t.concluido).length} concluidos`}>
            <TablaTramites tramites={filtrados} mostrarAlumno
                           vacio={q ? "Ningún trámite coincide con la búsqueda."
                                    : "Todavía no has atendido ningún trámite."} />
          </Card>
        )}
      </div>
    </Marco>
  );
}
