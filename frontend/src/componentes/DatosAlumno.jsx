import { useState } from "react";
import { Copy, Check } from "lucide-react";

import { C } from "../tokens";

/* El personal atiende a alguien, no a un folio. Estos datos van grandes y
   copiables porque se pegan constantemente en el sistema escolar, en el
   documento que se elabora y en los correos de aclaración. Teclearlos a mano
   es donde aparecen las matrículas equivocadas. */

function Dato({ etiqueta, valor, grande = false }) {
  const [copiado, setCopiado] = useState(false);
  if (!valor) return null;

  const copiar = () => {
    navigator.clipboard?.writeText(valor);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1600);
  };

  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold" style={{ color: C.gris400 }}>{etiqueta}</div>
      <div className="flex items-center gap-2">
        <span className={`truncate ${grande ? "text-lg font-semibold" : "text-sm"}`}
              style={{ color: grande ? C.azul900 : C.gris700 }}>
          {valor}
        </span>
        <button onClick={copiar} aria-label={`Copiar ${etiqueta.toLowerCase()}`} title="Copiar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                style={{ border: `1px solid ${C.gris200}`, background: C.blanco }}>
          {copiado ? <Check size={15} color={C.verde600} /> : <Copy size={15} color={C.gris500} />}
        </button>
      </div>
    </div>
  );
}

export default function DatosAlumno({ tramite }) {
  return (
    <div className="rounded-lg px-5 py-4" style={{ background: C.blanco, border: `1px solid ${C.gris200}` }}>
      <div className="mb-3 text-[11px] font-semibold" style={{ color: C.gris400 }}>
        DATOS DEL ALUMNO
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Dato etiqueta="NOMBRE" valor={tramite.alumno} grande />
        <Dato etiqueta="MATRÍCULA" valor={tramite.matricula} grande />
        <Dato etiqueta="PROGRAMA EDUCATIVO" valor={tramite.programa} />
      </div>
      {tramite.correo_alumno && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.gris200}` }}>
          <Dato etiqueta="CORREO INSTITUCIONAL" valor={tramite.correo_alumno} />
        </div>
      )}
    </div>
  );
}
