import { useEffect, useState } from "react";

import { C } from "../tokens";
import { api } from "../api/cliente";
import Marco from "../componentes/Marco";
import TablaTramites from "../componentes/TablaTramites";
import { Card, Cargando, MensajeError } from "../componentes/ui";

/* Aquí solo va lo que le toca actuar. La lista completa vive en Historial:
   tenerla también aquí obligaba a distinguir a ojo qué filas eran suyas. */

export default function BandejaSecretaria() {
  const [bandeja, setBandeja] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.bandeja().then(setBandeja).catch((e) => setError(e.message));
  }, []);

  if (error) return <Marco><MensajeError>{error}</MensajeError></Marco>;
  if (bandeja === null) return <Marco><Cargando /></Marco>;

  return (
    <Marco>
      <div className="space-y-3.5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: C.azul900 }}>
            Bandeja de Secretaría
          </h1>
          <p className="mt-1 text-sm" style={{ color: C.gris500 }}>
            Trámites que esperan tu intervención. Para buscar cualquier otro, usa Historial.
          </p>
        </div>

        <Card title={`Te toca actuar (${bandeja.length})`}>
          <TablaTramites tramites={bandeja} mostrarAlumno
                         vacio="No hay trámites esperando a Secretaría." />
        </Card>
      </div>
    </Marco>
  );
}
