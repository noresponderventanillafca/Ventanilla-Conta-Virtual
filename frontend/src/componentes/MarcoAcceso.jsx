import { Link } from "react-router-dom";

import { C } from "../tokens";
import Escudo from "./Escudo";
import { FlechasGrandes } from "./Chevrones";

/* El marco de las pantallas a las que se llega sin sesión: acceso, activación
   y restablecimiento. Está aparte para que las tres se vean idénticas — quien
   llega desde un correo tiene que reconocer el sitio al instante, porque la
   duda razonable ante un enlace recibido por correo es si lleva a donde dice. */

export default function MarcoAcceso({ children }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="flex flex-col justify-between px-8 py-12 lg:w-[520px] lg:px-16 lg:py-16"
             style={{ background: C.azul900 }}>
        <div className="space-y-7">
          <Escudo alto={72} />
          <div className="space-y-3.5">
            <FlechasGrandes ancho={200} />
            <h1 className="text-4xl font-bold leading-tight" style={{ color: C.blanco }}>
              Ventanilla Virtual
            </h1>
            <p className="max-w-sm text-[17px]" style={{ color: C.azul100 }}>
              Solicitud y seguimiento de documentos escolares.
            </p>
          </div>
        </div>
        <div className="mt-12 space-y-1">
          <p className="text-[13px] font-medium" style={{ color: C.blanco }}>
            Facultad de Contaduría y Administración
          </p>
          <p className="text-[13px]" style={{ color: C.gris400 }}>
            Licenciatura en Contaduría — Modalidad Virtual
          </p>
          {/* Visible antes de entregar ningún dato, que es cuando sirve. */}
          <Link to="/privacidad" className="barra-enlace mt-3 -ml-2 inline-block rounded-md px-2 py-1.5 text-[12px]">
            Aviso de privacidad
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 items-center justify-center px-6 py-12"
           style={{ background: C.gris100 }}>
        <div className="w-full max-w-md rounded-xl px-8 py-10 sm:px-12"
             style={{ background: C.blanco, border: `1px solid ${C.gris200}` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
