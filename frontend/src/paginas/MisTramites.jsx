import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Contact } from "lucide-react";

import { api } from "../api/cliente";
import { useSesion } from "../sesion";
import Marco from "../componentes/Marco";
import TablaTramites from "../componentes/TablaTramites";
import { Card, InfoCard, Pill, Boton, Cargando, MensajeError } from "../componentes/ui";

export default function MisTramites() {
  const { usuario } = useSesion();
  const navegar = useNavigate();
  const [tramites, setTramites] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listar().then(setTramites).catch((e) => setError(e.message));
  }, []);

  const cuenta = (f) => (tramites ?? []).filter(f).length;

  return (
    <Marco>
      <div className="space-y-3.5">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[2fr_1fr]">
          <InfoCard icon={GraduationCap} label="PROGRAMA EDUCATIVO"
                    value={usuario.programa?.nombre ?? "—"}
                    sub="Facultad de Contaduría y Administración — Xalapa" />
          <InfoCard icon={Contact} label="MATRÍCULA" value={usuario.identificador} />
        </div>

        <Card title="Mis trámites"
              right={<Boton onClick={() => navegar("/documentos")}>Nueva solicitud</Boton>}>
          {error && (
            <div className="px-5 pt-4">
              <MensajeError onReintentar={() => window.location.reload()}>{error}</MensajeError>
            </div>
          )}
          {tramites === null ? <Cargando /> : (
            <>
              <div className="flex flex-wrap gap-2 px-5 pt-4">
                <Pill tono="azul">
                  Requieren tu acción: {cuenta((t) => !t.concluido && t.responsable === "alumno")}
                </Pill>
                <Pill tono="rojo">Fuera de plazo: {cuenta((t) => t.retrasado)}</Pill>
                <Pill tono="verde">Concluidos: {cuenta((t) => t.concluido)}</Pill>
              </div>
              <div className="pt-4">
                <TablaTramites tramites={tramites}
                               vacio="Todavía no has solicitado ningún documento." />
              </div>
            </>
          )}
        </Card>
      </div>
    </Marco>
  );
}
