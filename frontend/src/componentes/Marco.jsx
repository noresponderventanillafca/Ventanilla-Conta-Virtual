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

          {/* El estado activo va en aria-current y no en un `style`: así lo
              anuncian los lectores de pantalla y, de paso, el CSS puede
              distinguirlo sin que un estilo en línea tape el :hover. Ese era
              el motivo de que la barra entera pareciera muerta al puntero. */}
          <nav className="flex flex-wrap gap-1">
            {enlaces.map(([ruta, texto]) => (
              <Link key={ruta} to={ruta}
                    aria-current={pathname.startsWith(ruta) ? "page" : undefined}
                    className="barra-enlace rounded-md px-3 py-2 text-[13px]">
                {texto}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <span className="text-[13px]" style={{ color: C.gris200 }}>
              {usuario.nombre}{usuario.rol === "alumno" ? ` · ${usuario.identificador}` : ""}
            </span>
            <Link to="/password"
                  className="barra-accion flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px]">
              <KeyRound size={15} /> Contraseña
            </Link>
            <button onClick={salir}
                    className="barra-accion flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px]">
              <LogOut size={15} /> Salir
            </button>
          </div>
        </div>

        {/* Toda la presencia de marca vive aquí, para que el resto de la interfaz
            pueda quedarse sobria y el color siga significando algo. */}
        <Chevrones alto={10} id="franja-marco" />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-8">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 sm:px-8">
        <Link to="/privacidad" className="text-[12px] underline-offset-2 hover:underline"
              style={{ color: C.gris400 }}>
          Aviso de privacidad
        </Link>
      </footer>
    </div>
  );
}
