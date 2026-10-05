import { Link, useLocation } from "react-router-dom";
import { LogOut, KeyRound } from "lucide-react";

import { C } from "../tokens";
import { useSesion } from "../sesion";
import Chevrones from "./Chevrones";
import Escudo from "./Escudo";

const NAV = {
  alumno: [["/tramites", "Mis trámites"], ["/documentos", "Documentos"]],
  secretaria: [["/bandeja", "Bandeja"], ["/historial", "Historial"], ["/padron", "Padrón"]],
  administrador: [["/validacion", "Validación de pagos"], ["/historial", "Historial"]],
  coordinadora: [["/tablero", "Tablero"], ["/historial", "Historial"],
                 ["/padron", "Padrón"], ["/personal", "Personal"], ["/ajustes", "Ajustes"]],
};

export default function Marco({ children }) {
  const { usuario, salir } = useSesion();
  const { pathname } = useLocation();
  const enlaces = NAV[usuario.rol] ?? [];

  return (
    <div className="min-h-screen" style={{ background: C.gris100 }}>
      <header style={{ background: C.azul900 }}>
        <div className="flex flex-wrap items-center gap-4 px-5 py-3.5 sm:px-10">
          <Escudo alto={34} />
          <span className="text-base font-semibold" style={{ color: C.blanco }}>
            Ventanilla Virtual
          </span>

          <nav className="flex flex-wrap gap-1">
            {enlaces.map(([ruta, texto]) => (
              <Link key={ruta} to={ruta}
                    className="rounded-md px-3 py-2 text-[13px]"
                    style={{
                      background: pathname.startsWith(ruta) ? C.azul700 : "transparent",
                      color: pathname.startsWith(ruta) ? C.blanco : C.gris200,
                    }}>
                {texto}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <span className="text-[13px]" style={{ color: C.gris200 }}>
              {usuario.nombre}{usuario.rol === "alumno" ? ` · ${usuario.identificador}` : ""}
            </span>
            <Link to="/password"
                  className="flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px]"
                  style={{ color: C.gris200, border: `1px solid ${C.azul500}` }}>
              <KeyRound size={15} /> Contraseña
            </Link>
            <button onClick={salir}
                    className="flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px]"
                    style={{ color: C.gris200, border: `1px solid ${C.azul500}` }}>
              <LogOut size={15} /> Salir
            </button>
          </div>
        </div>

        {/* Toda la presencia de marca vive aquí, para que el resto de la interfaz
            pueda quedarse sobria y el color siga significando algo. */}
        <Chevrones alto={10} id="franja-marco" />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-8">{children}</main>
    </div>
  );
}
