import { forwardRef } from "react";

import { C } from "../tokens";

/* Tonos con significado, nunca decorativos:
     azul   → necesita que alguien lo tome
     ámbar  → alguien lo está atendiendo
     rojo   → algo va mal: fuera de plazo o devuelto
     verde  → concluido
   Fuera del semáforo de trámites, el ámbar se usa en avisos de advertencia
   (montos, formatos de archivo). Son contextos distintos y no compiten. */
const TONOS = {
  azul: { bg: C.azul100, fg: C.azul700 },
  verde: { bg: C.verde100, fg: C.verde600 },
  ambar: { bg: C.ambar100, fg: C.ambar600 },
  rojo: { bg: C.rojo100, fg: C.rojo600 },
};

export function Pill({ children, tono = "azul" }) {
  if (tono === "neutro")
    return <span className="text-xs" style={{ color: C.gris500 }}>{children}</span>;
  const s = TONOS[tono];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.fg }} />
      {children}
    </span>
  );
}

export function Card({ title, right, children, className = "" }) {
  return (
    <section
      className={`rounded-lg overflow-hidden ${className}`}
      style={{ background: C.blanco, border: `1px solid ${C.gris200}` }}
    >
      {title && (
        <header className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                style={{ borderBottom: `1px solid ${C.gris200}` }}>
          {/* Acento fino en cian: da identidad sin competir con el semáforo,
              que es lo que pasaría con una franja de color rellena. */}
          <span className="h-4 w-1 shrink-0 rounded-full" style={{ background: C.cian }} />
          <h2 className="text-sm font-semibold" style={{ color: C.azul900 }}>{title}</h2>
          {right && <div className="ml-auto">{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function InfoCard({ icon: Icon, label, value, sub, right }) {
  return (
    <div className="flex items-center gap-4 rounded-lg px-4 py-3.5"
         style={{ background: C.blanco, border: `1px solid ${C.gris200}` }}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
           style={{ background: C.cianClaro }}>
        <Icon size={21} color={C.azul700} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold" style={{ color: C.gris400 }}>{label}</div>
        <div className="truncate text-[15px] font-semibold" style={{ color: C.azul900 }}>{value}</div>
        {sub && <div className="truncate text-[11px]" style={{ color: C.gris400 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

/* Todo lo que se puede pulsar tiene forma de botón. Un texto suelto no
   comunica que sea accionable, y en pantalla táctil el área para acertarle es
   diminuta. Los enlaces conservan la etiqueta <a> —navegan o descargan— pero
   se ven igual. */

/* Cada variante declara también su color al pasar el puntero y al pulsar.
   Van como variables CSS porque las pseudo-clases (:hover, :active) no
   existen en un `style` en línea; estilos.css las consume. */
const ESTILOS_BOTON = {
  primario: {
    "--btn-bg": C.azul700, "--btn-fg": C.blanco,
    "--btn-bg-hover": C.azul900, "--btn-bg-active": C.azul950,
  },
  secundario: {
    "--btn-bg": C.blanco, "--btn-fg": C.azul700, "--btn-bd": C.gris200,
    "--btn-bg-hover": C.azul100, "--btn-bd-hover": C.azul500,
    "--btn-bg-active": C.azul200,
  },
  neutro: {
    "--btn-bg": C.blanco, "--btn-fg": C.gris700, "--btn-bd": C.gris200,
    "--btn-bg-hover": C.gris100, "--btn-bd-hover": C.gris400,
    "--btn-bg-active": C.gris200,
  },
  peligro: {
    "--btn-bg": C.blanco, "--btn-fg": C.rojo600, "--btn-bd": C.gris200,
    "--btn-bg-hover": C.rojo100, "--btn-bd-hover": C.rojo600,
    "--btn-bg-active": C.rojo200,
  },
  /* Acción secundaria con aspecto de enlace. Sigue siendo <button> —cambia el
     estado de la pantalla, no navega— pero sin peso visual, para que «Entrar»
     siga siendo lo único que destaca. */
  enlace: {
    "--btn-bg": "transparent", "--btn-fg": C.azul700, "--btn-bd": "transparent",
    "--btn-bg-hover": C.azul100, "--btn-bd-hover": "transparent",
    "--btn-bg-active": C.azul200,
  },
};

/* Un botón deshabilitado no debe reaccionar: si cambiara al pasar el puntero
   prometería algo que no va a pasar. */
const DESHABILITADO = {
  "--btn-bg": C.gris100, "--btn-fg": C.gris400, "--btn-bd": C.gris200,
  "--btn-bg-hover": C.gris100, "--btn-bd-hover": C.gris200,
  "--btn-bg-active": C.gris100,
};

const TAMANOS = {
  // Nunca por debajo de 36px de alto: es el mínimo para acertarle con el dedo.
  sm: "rounded-md px-3 py-2 text-xs font-semibold",
  md: "rounded-md px-4 py-2.5 text-[13px] font-medium",
};

/* forwardRef porque en React 18 un `ref` pasado a un componente de función se
   descarta sin avisar. Hace falta para poder enfocar un botón desde fuera,
   como el del aviso de inactividad. */
export const Boton = forwardRef(function Boton({
  children, onClick, variante = "primario", tamano = "md",
  disabled, type = "button", className = "", ...resto
}, ref) {
  return (
    <button ref={ref} type={type} onClick={onClick} disabled={disabled}
            className={`btn inline-flex items-center justify-center gap-2 ${TAMANOS[tamano]} ${className}`}
            style={disabled ? DESHABILITADO : ESTILOS_BOTON[variante]} {...resto}>
      {children}
    </button>
  );
});

/** Enlace con apariencia de botón: sigue siendo <a> para que navegue,
 *  abra en otra pestaña o descargue como el usuario espera. */
export function BotonEnlace({
  children, href, variante = "secundario", tamano = "md",
  target, download, className = "", ...resto
}) {
  return (
    <a href={href} target={target} rel={target === "_blank" ? "noreferrer" : undefined}
       download={download}
       className={`btn inline-flex items-center justify-center gap-2 ${TAMANOS[tamano]} ${className}`}
       style={ESTILOS_BOTON[variante]} {...resto}>
      {children}
    </a>
  );
}

/* Vacío a propósito. El borde, el fondo y el color del texto se mudaron a la
   clase .campo-texto de estilos.css: mientras estuvieron aquí, como estilo en
   línea, ganaban a cualquier regla de :focus y el campo activo no se
   distinguía. Se conserva el nombre para no tocar las veinte pantallas que lo
   pasan en `style`, y para que siga habiendo un sitio donde añadir un ajuste
   puntual si hiciera falta. */
export const estiloInput = {};

/* Las clases que todo campo de texto debe llevar. Se exporta como constante
   para no repetir la lista en cada pantalla y que el foco se vea igual en
   todas. */
export const claseInput =
  "campo-texto w-full rounded-md px-3.5 py-3 text-sm outline-none";

export function Campo({ label, children, ayuda }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px]" style={{ color: C.gris700 }}>{label}</span>
      {children}
      {ayuda && <span className="mt-1 block text-[11px]" style={{ color: C.gris400 }}>{ayuda}</span>}
    </label>
  );
}

export function Aviso({ tono = "azul", titulo, children }) {
  const s = TONOS[tono];
  return (
    <div className="rounded-lg p-5" style={{ background: s.bg }}>
      {titulo && <div className="text-sm font-semibold leading-snug" style={{ color: s.fg }}>{titulo}</div>}
      {children && <div className="mt-1.5 text-xs leading-relaxed" style={{ color: s.fg }}>{children}</div>}
    </div>
  );
}

export function Cargando({ texto = "Cargando…" }) {
  return <p className="px-5 py-10 text-center text-[13px]" style={{ color: C.gris500 }}>{texto}</p>;
}

export function Vacio({ children }) {
  return <p className="px-5 py-10 text-center text-[13px]" style={{ color: C.gris500 }}>{children}</p>;
}

/* Los errores explican qué pasó y cómo arreglarlo. No piden disculpas
   ni son vagos sobre la causa.

   Con onReintentar añaden además una salida. Un error de conexión a secas deja
   la pantalla muerta: la única opción visible es recargar a mano, y mucha
   gente no se le ocurre o cree que perdió el acceso. */
export function MensajeError({ children, onReintentar }) {
  if (!children) return null;
  return (
    <div className="rounded-lg px-4 py-3 text-[13px]"
         style={{ background: C.rojo100, color: C.rojo600 }}>
      <div>{children}</div>
      {onReintentar && (
        <Boton variante="neutro" tamano="sm" className="mt-3" onClick={onReintentar}>
          Reintentar
        </Boton>
      )}
    </div>
  );
}
