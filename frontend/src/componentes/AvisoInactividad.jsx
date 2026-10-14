import { useEffect, useRef } from "react";

import { C } from "../tokens";
import { useSesion } from "../sesion";
import { Boton } from "./ui";

/* Un minuto de aviso antes de cerrar.

   Sin él, una secretaria que se detiene a leer un expediente largo o a buscar
   un dato en papel vuelve al teclado y encuentra el formulario vacío. Cerrar
   sesión protege los datos del alumno; hacerlo sin avisar solo hace que la
   gente escriba más rápido y peor. */

export default function AvisoInactividad() {
  const { segundosParaCerrar, seguirConectado, salir } = useSesion();
  const boton = useRef(null);

  useEffect(() => {
    if (segundosParaCerrar !== null) boton.current?.focus();
  }, [segundosParaCerrar !== null]);

  if (segundosParaCerrar === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
         style={{ background: "rgba(0, 51, 95, 0.55)" }}
         role="alertdialog" aria-modal="true" aria-labelledby="titulo-inactividad">
      <div className="w-full max-w-sm rounded-xl p-6"
           style={{ background: C.blanco, border: `1px solid ${C.gris200}` }}>
        <h2 id="titulo-inactividad" className="text-lg font-semibold"
            style={{ color: C.azul900 }}>
          ¿Sigues ahí?
        </h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: C.gris500 }}>
          Por seguridad cerraremos tu sesión en{" "}
          <strong style={{ color: C.azul900 }}>{segundosParaCerrar} segundos</strong>{" "}
          si no hay actividad. Lo que tengas escrito sin guardar se perderá.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {/* Cualquier tecla o clic ya renueva la sesión. El botón existe para
              que no haya que adivinarlo. */}
          <Boton ref={boton} onClick={seguirConectado}>Seguir trabajando</Boton>
          <Boton variante="neutro" onClick={salir}>Cerrar sesión ahora</Boton>
        </div>
      </div>
    </div>
  );
}
