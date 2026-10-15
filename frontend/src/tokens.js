/* Paleta institucional de la UV, tomada de los materiales de la Facultad.
   Verifícala contra el manual de identidad gráfica antes de publicar.

   Dos familias que NO se mezclan:

   IDENTIDAD — azul, cian, amarillo y verde institucionales. Viven en la barra
   superior, la franja de chevrones, los títulos y los acentos. Son decoración
   y no significan nada.

   ESTADO — azul, ámbar, rojo y verde de las píldoras y la línea de tiempo.
   Cada uno significa una cosa: necesita que alguien lo tome, alguien lo está
   atendiendo, algo va mal, concluido.

   El amarillo institucional nunca se usa como fondo de una etiqueta: se
   confundiría con el ámbar de "en atención" y el semáforo dejaría de leerse.
*/

export const C = {
  /* Identidad — tomada del manual oficial de la UV
     (comunicacionuv/T130-Color-institucionales.pdf):

       Azul  #18529D  · Pantone 2728 C · «siempre será el contenedor»
       Verde #28AD56  · Pantone 355 C  · representa el área administrativa
       Blanco y negro completan la paleta.

     Antes se usaba un azul más oscuro que no venía del manual. azul700 es
     ahora el institucional exacto y manda en botones, enlaces y acentos;
     azul900 y azul950 son solo sombras suyas para superficies profundas y
     para el momento del clic, que una sola tinta no puede expresar. */
  azul700: "#18529D",
  azul900: "#113D76",
  azul950: "#0A2A52",
  azul500: "#4C86C6",
  azul200: "#C9DEF2",
  azul100: "#E6EEF8",

  /* El verde institucional. Deliberadamente SEPARADO de verde600, que en el
     semáforo significa «concluido»: si fueran el mismo tono, el color dejaría
     de informar y pasaría a ser decoración. Este vive en la marca —la regla
     del acceso, los acentos— y nunca en una píldora de estado. */
  verdeUV: "#28AD56",

  /* Cian y amarillo NO están en el manual: vienen de la franja de chevrones.
     Se conservan porque esa franja es parte de la identidad que ya estaba en
     uso, pero si Comunicación Universitaria pide apego estricto, es lo
     primero que habría que retirar. */
  cian: "#00BECD",
  cianClaro: "#E0F7F9",
  amarillo: "#FFC415",

  // Estado
  verde600: "#0D934E",
  verde100: "#E4F4EB",
  ambar600: "#B26A00",
  ambar100: "#FBF0DE",
  rojo600: "#B3261E",
  rojo100: "#FBE9E7",

  rojo200: "#F5CFCC",

  // Neutros
  gris700: "#3A4550",
  gris300: "#C8D1D8",
  gris500: "#5F6B76",
  gris400: "#8A959E",
  gris200: "#DDE3E8",
  gris100: "#F4F6F8",
  blanco: "#FFFFFF",
};

export const pesos = (n) =>
  Number(n).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export const fecha = (iso) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
