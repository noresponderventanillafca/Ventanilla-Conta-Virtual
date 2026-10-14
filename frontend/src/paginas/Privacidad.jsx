import { Link } from "react-router-dom";

import { C } from "../tokens";
import { useSesion } from "../sesion";
import Marco from "../componentes/Marco";
import MarcoAcceso from "../componentes/MarcoAcceso";
import { Boton } from "../componentes/ui";
import { INTEGRAL, RESPONSABLE, ACTUALIZADO } from "../contenido/avisoPrivacidad";

/* El aviso de privacidad integral.

   Es pública a propósito: un alumno tiene derecho a leer qué se hace con sus
   datos ANTES de entregar ninguno, no después de activar su cuenta. Por eso se
   puede abrir con o sin sesión, y la pantalla se adapta a las dos situaciones.*/

export default function Privacidad() {
  const { usuario } = useSesion();
  const Envoltura = usuario ? Marco : MarcoAcceso;

  const contenido = (
    <article className="space-y-7">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold" style={{ color: C.azul900 }}>
          Aviso de privacidad
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: C.gris500 }}>
          Ventanilla Virtual · {RESPONSABLE.area}
        </p>
      </header>

      {INTEGRAL.map((seccion) => (
        <section key={seccion.titulo} className="space-y-2.5">
          <h2 className="text-[15px] font-semibold" style={{ color: C.azul900 }}>
            {seccion.titulo}
          </h2>

          {seccion.parrafos?.map((p, i) => (
            <p key={i} className="text-[13px] leading-relaxed" style={{ color: C.gris700 }}>
              {p}
            </p>
          ))}

          {seccion.listas?.map((lista, i) => (
            <div key={i} className="space-y-1.5">
              {lista.encabezado && (
                <p className="text-[13px] font-medium" style={{ color: C.gris700 }}>
                  {lista.encabezado}
                </p>
              )}
              <ul className="space-y-1.5 pl-1">
                {lista.puntos.map((punto, j) => (
                  <li key={j} className="flex gap-2.5 text-[13px] leading-relaxed"
                      style={{ color: C.gris700 }}>
                    <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full"
                          style={{ background: C.cian }} />
                    <span>{punto}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {seccion.cierre && (
            <p className="text-[13px] leading-relaxed" style={{ color: C.gris700 }}>
              {seccion.cierre}
            </p>
          )}
        </section>
      ))}

      <footer className="space-y-3 pt-5" style={{ borderTop: `1px solid ${C.gris200}` }}>
        <p className="text-[11px]" style={{ color: C.gris400 }}>
          Última actualización: {ACTUALIZADO}
        </p>
        {!usuario && (
          <Link to="/" className="btn inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-medium"
                style={{
                  "--btn-bg": C.blanco, "--btn-fg": C.azul700, "--btn-bd": C.gris200,
                  "--btn-bg-hover": C.azul100, "--btn-bd-hover": C.azul500,
                  "--btn-bg-active": C.azul200,
                }}>
            Volver al inicio de sesión
          </Link>
        )}
      </footer>
    </article>
  );

  if (usuario)
    return <Envoltura><div className="max-w-3xl">{contenido}</div></Envoltura>;

  // Sin sesión se reutiliza el marco de acceso, pero más ancho: el aviso es un
  // documento para leer, no una tarjeta de formulario.
  return (
    <div className="min-h-screen px-6 py-12" style={{ background: C.gris100 }}>
      <div className="mx-auto max-w-3xl rounded-xl px-7 py-9 sm:px-10"
           style={{ background: C.blanco, border: `1px solid ${C.gris200}` }}>
        {contenido}
      </div>
    </div>
  );
}
