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

const ESTILOS_BOTON = {
  primario: (d) => ({ background: d ? C.gris200 : C.azul700, color: d ? C.gris400 : C.blanco }),
  secundario: () => ({ background: C.blanco, color: C.azul700, border: `1px solid ${C.gris200}` }),
  neutro: () => ({ background: C.blanco, color: C.gris700, border: `1px solid ${C.gris200}` }),
  peligro: () => ({ background: C.blanco, color: C.rojo600, border: `1px solid ${C.gris200}` }),
};

const TAMANOS = {
  // Nunca por debajo de 36px de alto: es el mínimo para acertarle con el dedo.
  sm: "rounded-md px-3 py-2 text-xs font-semibold",
  md: "rounded-md px-4 py-2.5 text-[13px] font-medium",
};

export function Boton({
  children, onClick, variante = "primario", tamano = "md",
  disabled, type = "button", className = "",
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
            className={`inline-flex items-center justify-center gap-2 ${TAMANOS[tamano]} ${className}`}
            style={{ ...ESTILOS_BOTON[variante](disabled), cursor: disabled ? "not-allowed" : "pointer" }}>
      {children}
    </button>
  );
}

/** Enlace con apariencia de botón: sigue siendo <a> para que navegue,
 *  abra en otra pestaña o descargue como el usuario espera. */
export function BotonEnlace({
  children, href, variante = "secundario", tamano = "md",
  target, download, className = "", ...resto
}) {
  return (
    <a href={href} target={target} rel={target === "_blank" ? "noreferrer" : undefined}
       download={download}
       className={`inline-flex items-center justify-center gap-2 ${TAMANOS[tamano]} ${className}`}
       style={ESTILOS_BOTON[variante]()} {...resto}>
      {children}
    </a>
  );
}

export const estiloInput = {
  border: `1px solid ${C.gris200}`,
  color: C.gris700,
  background: C.blanco,
};

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
   ni son vagos sobre la causa. */
export function MensajeError({ children }) {
  if (!children) return null;
  return (
    <div className="rounded-lg px-4 py-3 text-[13px]"
         style={{ background: C.rojo100, color: C.rojo600 }}>
      {children}
    </div>
  );
}
