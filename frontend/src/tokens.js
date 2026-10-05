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
  // Identidad
  azul900: "#00335F",
  azul700: "#004B8D",
  azul500: "#1C6FB5",
  azul100: "#E4EEF8",
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

  // Neutros
  gris700: "#3A4550",
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
