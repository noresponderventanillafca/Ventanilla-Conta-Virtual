/* Genera AVISO-DE-PRIVACIDAD.md desde src/contenido/avisoPrivacidad.js
 *
 *   node scripts/generar-aviso.mjs
 *
 * Existe para que el documento que se lleva a la Coordinación de Transparencia
 * y el texto que ve el alumno en pantalla sean literalmente el mismo. Mantener
 * dos copias a mano termina siempre igual: se corrige una y se olvida la otra,
 * y el aviso publicado deja de describir lo que el sistema hace.
 *
 * Si Transparencia pide cambios de redacción, se aplican en avisoPrivacidad.js
 * y se vuelve a correr esto.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  INTEGRAL, SIMPLIFICADO, RESPONSABLE, TRANSPARENCIA, ACTUALIZADO,
} from "../src/contenido/avisoPrivacidad.js";

const lineas = [
  "# Aviso de privacidad — Ventanilla Virtual",
  "",
  `**Responsable:** ${RESPONSABLE.nombre}`,
  `**Área:** ${RESPONSABLE.area}`,
  `**Domicilio:** ${RESPONSABLE.domicilio}`,
  "",
  "> **Borrador.** Debe ser revisado, validado y registrado por la",
  `> ${TRANSPARENCIA.nombre} antes de publicarse.`,
  "> Está redactado siguiendo la estructura que la Universidad ya usa en sus",
  "> demás avisos y describe el tratamiento que el sistema realiza hoy.",
  "",
  "---",
  "",
  `## ${SIMPLIFICADO.titulo}`,
  "",
  "Se muestra en la pantalla donde el alumno entrega sus datos.",
  "",
  ...SIMPLIFICADO.parrafos.flatMap((p) => [p, ""]),
  SIMPLIFICADO.cierre,
  "",
  "---",
  "",
  "## Aviso de privacidad integral",
  "",
];

for (const seccion of INTEGRAL) {
  lineas.push(`### ${seccion.titulo}`, "");
  for (const p of seccion.parrafos ?? []) lineas.push(p, "");
  for (const lista of seccion.listas ?? []) {
    if (lista.encabezado) lineas.push(lista.encabezado, "");
    for (const punto of lista.puntos) lineas.push(`- ${punto}`);
    lineas.push("");
  }
  if (seccion.cierre) lineas.push(seccion.cierre, "");
}

lineas.push(
  "---",
  "",
  "## Contacto para derechos ARCO",
  "",
  TRANSPARENCIA.nombre,
  "",
  `- Domicilio: ${TRANSPARENCIA.domicilio}`,
  `- Correo: ${TRANSPARENCIA.correo}`,
  `- Teléfono: ${TRANSPARENCIA.telefono}`,
  `- Avisos de la Universidad: ${TRANSPARENCIA.avisos}`,
  "",
  `_Última actualización: ${ACTUALIZADO}_`,
  "",
);

const aqui = dirname(fileURLToPath(import.meta.url));
const destino = join(aqui, "..", "..", "AVISO-DE-PRIVACIDAD.md");
writeFileSync(destino, lineas.join("\n"), "utf8");
console.log(`Escrito: ${destino}`);
