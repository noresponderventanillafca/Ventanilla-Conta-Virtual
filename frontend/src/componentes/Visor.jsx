import { Download, ExternalLink, FileText } from "lucide-react";

import { C } from "../tokens";
import { api } from "../api/cliente";
import { BotonEnlace } from "./ui";

/* El comprobante se revisa a simple vista. Obligar a descargarlo para poder
   leerlo convierte cada validación en varios pasos fuera del sistema, y ahí es
   donde el proceso se sale de la plataforma. */

export default function Visor({ folio, archivo, url: urlDirecta, urlDescarga, nombre, mime, alto = "h-[28rem]" }) {
  // Acepta un archivo de trámite o una URL suelta (el ejemplo del catálogo).
  const fuente = archivo ?? (urlDirecta ? { nombre, mime } : null);
  if (!fuente)
    return (
      <div className={`flex ${alto} flex-col items-center justify-center gap-2`}
           style={{ background: C.gris100 }}>
        <FileText size={38} color={C.gris400} strokeWidth={1.4} />
        <span className="text-[11px]" style={{ color: C.gris400 }}>Sin archivo adjunto</span>
      </div>
    );

  const url = urlDirecta ?? api.urlArchivo(folio, archivo.id);
  const descarga = urlDescarga ?? (archivo ? api.urlDescarga(folio, archivo.id) : `${url}?descargar=1`);
  const esImagen = (fuente.mime || "").startsWith("image/");
  const esPdf = fuente.mime === "application/pdf";

  return (
    <div>
      <div className={`${alto} w-full overflow-auto`} style={{ background: C.gris100 }}>
        {esImagen && (
          <img src={url} alt={fuente.nombre ?? "Documento"}
               className="mx-auto block max-w-full" />
        )}
        {esPdf && (
          // <object> degrada mejor que <iframe>: si el navegador no sabe
          // mostrar PDFs, enseña el contenido alterno en vez de un marco negro.
          <object data={url} type="application/pdf" className="h-full w-full">
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <FileText size={34} color={C.gris400} strokeWidth={1.4} />
              <p className="text-xs" style={{ color: C.gris500 }}>
                Tu navegador no puede mostrar PDFs aquí.
              </p>
              <BotonEnlace href={url} target="_blank" tamano="sm">
                Abrir en otra pestaña
              </BotonEnlace>
            </div>
          </object>
        )}
        {!esImagen && !esPdf && (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <FileText size={34} color={C.gris400} strokeWidth={1.4} />
            <span className="text-[11px]" style={{ color: C.gris400 }}>
              Formato no previsualizable
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 py-3"
           style={{ borderTop: `1px solid ${C.gris200}` }}>
        <BotonEnlace href={url} target="_blank" tamano="sm">
          <ExternalLink size={14} /> Abrir en otra pestaña
        </BotonEnlace>
        <BotonEnlace href={descarga} variante="neutro" tamano="sm">
          <Download size={14} /> Descargar
        </BotonEnlace>
        {archivo && (
          <span className="ml-auto text-[11px]" style={{ color: C.gris400 }}>
            {Math.round(archivo.tamanio_bytes / 1024)} KB
          </span>
        )}
      </div>
    </div>
  );
}
