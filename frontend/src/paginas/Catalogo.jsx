import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Users, CircleDollarSign, Search } from "lucide-react";

import { C, pesos } from "../tokens";
import { api } from "../api/cliente";
import Marco from "../componentes/Marco";
import Visor from "../componentes/Visor";
import { Card, Boton, Cargando, MensajeError, Aviso, estiloInput } from "../componentes/ui";

/* Con pago por adelantado, pedir el documento equivocado ya no tiene vuelta
   atrás automática. Por eso el alumno puede leer para qué sirve cada uno y ver
   una muestra ANTES de depositar: es más barato prevenir la confusión que
   resolver una devolución. */

export default function Catalogo() {
  const navegar = useNavigate();
  const [documentos, setDocumentos] = useState(null);
  const [elegido, setElegido] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    api.documentos()
      .then((d) => { setDocumentos(d); if (d.length) setElegido(d[0]); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <Marco><MensajeError onReintentar={() => window.location.reload()}>{error}</MensajeError></Marco>;
  if (documentos === null) return <Marco><Cargando /></Marco>;

  // Busca también en la descripción: el alumno rara vez conoce el nombre
  // oficial del documento, pero sí sabe para qué lo necesita.
  const q = busqueda.trim().toLowerCase();
  const filtrados = !q ? documentos : documentos.filter((d) =>
    [d.nombre, d.clave, d.descripcion, d.requisitos]
      .some((v) => (v ?? "").toLowerCase().includes(q))
  );

  return (
    <Marco>
      <div className="space-y-3.5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: C.azul900 }}>
            Documentos que puedes solicitar
          </h1>
          <p className="mt-1 text-sm" style={{ color: C.gris500 }}>
            Revisa para qué sirve cada uno y cómo se ve antes de solicitarlo.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[320px_1fr] lg:items-start">
          <nav className="space-y-2">
            <div className="caja-campo flex items-center gap-2 rounded-md px-3 py-2.5" style={estiloInput}>
              <Search size={15} color={C.gris400} />
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                     placeholder="Buscar documento"
                     className="campo-texto w-full text-[13px]" style={{ border: "none" }} />
            </div>

            {filtrados.length === 0 && (
              <p className="px-1 py-3 text-[13px]" style={{ color: C.gris500 }}>
                Ningún documento coincide. Si el que necesitas no aparece,
                escríbele a la Coordinación.
              </p>
            )}

            {filtrados.map((d) => {
              const activo = elegido?.id === d.id;
              return (
                <button key={d.id} onClick={() => setElegido(d)}
                        className="w-full rounded-lg px-4 py-3 text-left"
                        style={{
                          background: activo ? C.azul100 : C.blanco,
                          border: `1px solid ${activo ? C.azul700 : C.gris200}`,
                        }}>
                  <div className="text-sm font-semibold" style={{ color: C.azul900 }}>
                    {d.nombre}
                  </div>
                  <div className="mt-0.5 text-xs" style={{ color: d.costo === 0 ? C.verde600 : C.gris500 }}>
                    {d.costo === 0 ? "Sin costo" : pesos(d.costo)}
                  </div>
                </button>
              );
            })}
          </nav>

          {elegido && (
            <div className="space-y-3.5">
              <Card title={elegido.nombre}>
                <div className="space-y-4 px-5 py-5">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <CircleDollarSign size={17} color={C.gris400} />
                      <span className="text-sm font-semibold"
                            style={{ color: elegido.costo === 0 ? C.verde600 : C.azul900 }}>
                        {elegido.costo === 0 ? "Sin costo" : pesos(elegido.costo)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={17} color={C.gris400} />
                      <span className="text-sm" style={{ color: C.gris700 }}>
                        Lo atiende {elegido.participantes.join(" y ")}
                      </span>
                    </div>
                  </div>

                  {elegido.descripcion && (
                    <div>
                      <div className="text-[11px] font-semibold" style={{ color: C.gris400 }}>
                        PARA QUÉ SIRVE
                      </div>
                      <p className="mt-1 text-sm leading-relaxed" style={{ color: C.gris700 }}>
                        {elegido.descripcion}
                      </p>
                    </div>
                  )}

                  {elegido.requisitos && (
                    <div>
                      <div className="text-[11px] font-semibold" style={{ color: C.gris400 }}>
                        REQUISITOS
                      </div>
                      <p className="mt-1 text-sm leading-relaxed" style={{ color: C.gris700 }}>
                        {elegido.requisitos}
                      </p>
                    </div>
                  )}

                  {elegido.costo > 0 && (
                    <Aviso tono="ambar" titulo="El pago se hace antes de solicitar">
                      Revisa que este sea el documento que necesitas. El depósito no se
                      devuelve de forma automática; si tienes duda, pregunta a la
                      Coordinación antes de pagar.
                    </Aviso>
                  )}

                  <Boton onClick={() => navegar(`/tramites/nuevo?tipo=${elegido.id}`)}>
                    Solicitar este documento
                  </Boton>
                </div>
              </Card>

              <Card title="Así se ve el documento">
                {elegido.ejemplo ? (
                  <Visor url={api.urlEjemplo(elegido.id)}
                         nombre={elegido.ejemplo.nombre}
                         mime={elegido.ejemplo.mime}
                         alto="h-96" />
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center gap-2"
                       style={{ background: C.gris100 }}>
                    <FileText size={32} color={C.gris400} strokeWidth={1.4} />
                    <span className="text-xs" style={{ color: C.gris500 }}>
                      Todavía no hay una muestra de este documento.
                    </span>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </Marco>
  );
}
