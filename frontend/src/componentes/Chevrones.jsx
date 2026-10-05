import { C } from "../tokens";

/* El motivo de chevrones de los materiales de la Facultad. Es el elemento que
   más identifica a la UV en su comunicación, y aquí carga toda la presencia de
   marca en un solo lugar: así el resto de la interfaz puede quedarse sobria y
   el color seguir significando algo. */

const COLORES = [C.azul700, C.cian, C.amarillo, C.verde600];

/** Franja de chevrones repetidos bajo la barra superior. */
export default function Chevrones({ alto = 10, id = "chevrones" }) {
  const paso = 13;
  const ancho = COLORES.length * paso;
  return (
    <svg width="100%" height={alto} role="presentation" aria-hidden="true"
         style={{ display: "block" }}>
      <defs>
        <pattern id={id} width={ancho} height={alto} patternUnits="userSpaceOnUse">
          {COLORES.map((color, i) => (
            <path key={color}
                  d={`M${i * paso + 3} 2 L${i * paso + 9} ${alto / 2} L${i * paso + 3} ${alto - 2}`}
                  stroke={color} strokeWidth="3" fill="none" strokeLinecap="square" />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height={alto} fill={`url(#${id})`} />
    </svg>
  );
}

/** Versión grande, con la forma de flecha, para las pantallas de portada. */
export function FlechasGrandes({ ancho = 220 }) {
  return (
    <svg width={ancho} height={ancho * 0.28} viewBox="0 0 220 62" fill="none"
         role="presentation" aria-hidden="true">
      {COLORES.map((color, i) => (
        <path key={color}
              d={`M${8 + i * 52} 8 L${40 + i * 52} 31 L${8 + i * 52} 54`}
              stroke={color} strokeWidth="13" strokeLinecap="square" />
      ))}
    </svg>
  );
}
