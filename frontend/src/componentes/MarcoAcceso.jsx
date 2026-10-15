import { Link } from "react-router-dom";

import { C } from "../tokens";
import Escudo from "./Escudo";

/* El marco de las pantallas a las que se llega sin sesión: acceso, activación
   y restablecimiento. Está aparte para que las tres se vean idénticas — quien
   llega desde un correo tiene que reconocer el sitio al instante, porque la
   duda razonable ante un enlace recibido por correo es si lleva a donde dice.

   EL VELO SOBRE LA FOTO. El degradado negro no es un efecto: es lo que hace
   legible el texto. La fachada tiene cielo abierto y muro blanco al sol, y
   sobre esa zona el texto blanco da 1.9:1 de contraste, muy por debajo del
   4.5:1 exigido. Se midió sobre la foto real, franja por franja:

       arriba (cielo y volumen)   10–18 %   la fachada se ve casi limpia
       transición                     44 %
       título y descripción        56–60 %   5.5:1 y 7.3:1
       pie y aviso                    62 %   8–10:1

   Si algún día se cambia la fotografía hay que volver a medir: una imagen más
   clara en la zona baja deja el texto por debajo del mínimo sin que se note a
   simple vista. */

const VELO = "linear-gradient(180deg,"
  + " rgba(0,0,0,0.10) 0%,"
  + " rgba(0,0,0,0.18) 32%,"
  + " rgba(0,0,0,0.44) 48%,"
  + " rgba(0,0,0,0.58) 60%,"
  + " rgba(0,0,0,0.64) 100%)";

export default function MarcoAcceso({ children }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row" style={{ background: C.blanco }}>

      {/* La fachada. En pantalla angosta se reduce a una banda: ocupar media
          pantalla con una foto dejaría el formulario fuera de la vista. */}
      <aside className="relative h-[240px] shrink-0 overflow-hidden sm:h-[300px] lg:h-auto lg:w-[46%] lg:max-w-[600px]"
             style={{ background: "#0C0C0C" }}>
        <img src="/fachada-fca.jpg"
             alt="Fachada de la Facultad de Contaduría y Administración"
             className="absolute inset-0 h-full w-full object-cover"
             style={{ objectPosition: "center 58%" }} />
        <div aria-hidden="true" className="absolute inset-0" style={{ background: VELO }} />

        <div className="relative flex h-full flex-col justify-end px-7 py-8 sm:px-10 lg:px-14 lg:py-12">
          <div className="h-1 w-16 shrink-0" style={{ background: C.verdeUV }} />
          <h1 className="mt-5 text-3xl font-bold leading-[1.08] sm:text-4xl lg:mt-6 lg:text-[46px]"
              style={{ color: C.blanco }}>
            Ventanilla<br className="hidden sm:inline" /> Virtual
          </h1>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed lg:mt-4 lg:text-[17px]"
             style={{ color: "#F0F3F7" }}>
            Solicitud y seguimiento de documentos escolares.
          </p>

          <div className="mt-7 hidden space-y-1 border-t pt-5 lg:block"
               style={{ borderColor: "rgba(255,255,255,0.30)" }}>
            <p className="text-sm font-semibold" style={{ color: C.blanco }}>
              Facultad de Contaduría y Administración
            </p>
            <p className="text-[13px]" style={{ color: "#DDE3EA" }}>
              Licenciatura en Contaduría · Modalidad Virtual
            </p>
            <Link to="/privacidad"
                  className="mt-2.5 inline-block text-[13px] underline underline-offset-[3px]"
                  style={{ color: "#DDE3EA" }}>
              Aviso de privacidad
            </Link>
          </div>
        </div>
      </aside>

      {/* El escudo encabeza la columna blanca: el manual pide que los elementos
          de identidad se manejen sobre blanco, y ahí además no compite con la
          fachada. */}
      <div className="flex flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-4 px-7 pt-7 sm:px-10 lg:px-16 lg:pt-9">
          <Escudo alto={46} claro={false} />
          <p className="text-[15px] font-bold tracking-[0.03em]" style={{ color: C.azul700 }}>
            Universidad Veracruzana
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center px-7 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>

        {/* En pantalla angosta el pie del panel oscuro no se ve, así que los
            datos institucionales y el aviso se repiten aquí abajo. */}
        <div className="shrink-0 space-y-1 px-7 pb-8 sm:px-10 lg:hidden">
          <p className="text-[13px] font-semibold" style={{ color: C.azul900 }}>
            Facultad de Contaduría y Administración
          </p>
          <p className="text-[12px]" style={{ color: C.gris500 }}>
            Licenciatura en Contaduría · Modalidad Virtual
          </p>
          <Link to="/privacidad"
                className="mt-1.5 inline-block text-[12px] underline underline-offset-[3px]"
                style={{ color: C.azul700 }}>
            Aviso de privacidad
          </Link>
        </div>
      </div>
    </div>
  );
}
