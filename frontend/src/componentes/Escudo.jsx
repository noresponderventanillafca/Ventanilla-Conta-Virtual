import { useState } from "react";

import { C } from "../tokens";

/* El escudo vive en frontend/public/ y se sirve desde la raíz del sitio:
     public/escudo-uv-blanco.png  → para la barra azul y la portada
     public/escudo-uv.png         → para fondos claros

   Mientras no existan, se muestra el recuadro punteado en su lugar, para que
   la interfaz no se rompa ni deje un hueco mudo.

   No lo deformes: el manual de identidad de la UV fija proporciones y un
   margen mínimo alrededor. Por eso aquí solo se controla el alto y el ancho
   se calcula solo. */

export default function Escudo({ alto = 34, claro = true }) {
  const [falla, setFalla] = useState(false);
  const archivo = claro ? "/escudo-uv-blanco.png" : "/escudo-uv.png";

  if (falla)
    return (
      <span className="rounded px-2.5 py-1.5 text-[9px] font-semibold"
            style={{
              border: `1px dashed ${claro ? C.azul500 : C.gris400}`,
              color: claro ? C.gris200 : C.gris400,
            }}>
        ESCUDO UV
      </span>
    );

  return (
    <img src={archivo} alt="Universidad Veracruzana"
         style={{ height: alto, width: "auto" }}
         onError={() => setFalla(true)} />
  );
}
