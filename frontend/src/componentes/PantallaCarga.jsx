import { useEffect, useState } from "react";

import { C } from "../tokens";
import Escudo from "./Escudo";
import { FlechasGrandes } from "./Chevrones";
import { Boton } from "./ui";

/* La primera visita del día tarda entre 30 y 60 segundos: el plan gratuito de
   Render suspende el servicio tras 15 minutos sin tráfico y hay que esperar a
   que vuelva a arrancar.

   Esa espera no se puede quitar sin pagar un plan de pago, pero sí se puede
   dejar de parecer una pantalla congelada. Un «Cargando…» quieto durante
   cuarenta segundos se lee como un error, y la gente recarga —lo que reinicia
   la cuenta y alarga la espera— o se va.

   Así que la pantalla dice qué está pasando, por qué tarda y cuánto falta
   aproximadamente. Una espera explicada se tolera; una muda, no. */

const MENSAJES = [
  { desde: 0,  texto: "Conectando con el servidor…", detalle: null },
  {
    desde: 5,
    texto: "Despertando el servidor…",
    detalle: "La primera entrada del día tarda hasta un minuto. Las siguientes son inmediatas.",
  },
  {
    desde: 20,
    texto: "Sigue arrancando…",
    detalle: "Es normal. El servidor se suspende tras 15 minutos sin uso y volver a encenderlo lleva su tiempo.",
  },
  {
    desde: 50,
    texto: "Está tardando más de lo habitual.",
    detalle: "Dale unos segundos más. Si pasa de dos minutos, es probable que el servidor no esté respondiendo.",
  },
];

/* La barra nunca llega al 100 %: no sabemos cuánto falta de verdad, y una
   barra que se planta en el tope durante medio minuto miente más que una que
   avanza despacio. Se acerca al 95 % de forma asintótica. */
function avance(segundos) {
  return 95 * (1 - Math.exp(-segundos / 22));
}

export default function PantallaCarga() {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const reloj = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(reloj);
  }, []);

  const mensaje = [...MENSAJES].reverse().find((m) => segundos >= m.desde);
  const porcentaje = avance(segundos);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12"
         style={{ background: C.azul900 }}>
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-5">
          <Escudo alto={64} />
          <div className="space-y-3">
            <FlechasGrandes ancho={170} />
            <h1 className="text-3xl font-bold leading-tight" style={{ color: C.blanco }}>
              Ventanilla Virtual
            </h1>
          </div>
        </div>

        <div className="space-y-3" role="status" aria-live="polite">
          <div className="h-1.5 w-full overflow-hidden rounded-full"
               style={{ background: "rgba(255,255,255,0.18)" }}>
            <div className="h-full rounded-full"
                 style={{
                   width: `${porcentaje}%`,
                   background: C.cian,
                   transition: "width 1s linear",
                 }} />
          </div>

          <p className="text-[15px] font-medium" style={{ color: C.blanco }}>
            {mensaje.texto}
          </p>
          {mensaje.detalle && (
            <p className="text-[13px] leading-relaxed" style={{ color: C.azul100 }}>
              {mensaje.detalle}
            </p>
          )}
        </div>

        {/* El botón aparece solo cuando la espera ya dejó de ser razonable.
            Ofrecerlo desde el principio invita a recargar, y recargar durante
            el arranque no acelera nada: vuelve a empezar la cuenta. */}
        {segundos >= 50 && (
          <Boton variante="secundario" onClick={() => window.location.reload()}>
            Reintentar
          </Boton>
        )}
      </div>
    </div>
  );
}
