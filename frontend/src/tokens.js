/* Paleta institucional. Verifícala contra el manual de identidad gráfica
   de la UV antes de publicar.

   Regla de uso, y es lo que sostiene la legibilidad de la interfaz:
   el azul carga la navegación y lo que requiere acción del alumno;
   el verde significa completado y nada más; el ámbar significa retraso;
   el gris significa pendiente. Ningún color decora. */

export const C = {
  azul900: "#002B4A",
  azul700: "#00426A",
  azul100: "#E6EEF4",
  verde600: "#00843D",
  verde100: "#E3F1E8",
  ambar600: "#B26A00",
  ambar100: "#FBF0DE",
  rojo600: "#B3261E",
  rojo100: "#FBE9E7",
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
