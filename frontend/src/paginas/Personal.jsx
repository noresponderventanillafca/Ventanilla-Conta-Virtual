import { useEffect, useState } from "react";
import { Plus, Pencil, KeyRound, Copy, Check, Trash2 } from "lucide-react";

import { C } from "../tokens";
import { api } from "../api/cliente";
import { useSesion } from "../sesion";
import Marco from "../componentes/Marco";
import { Card, Campo, Boton, Pill, Aviso, MensajeError, Cargando, estiloInput } from "../componentes/ui";

/* Una cuenta por persona, nunca una por cargo. Relevar a alguien es darla de
   baja y dar de alta a quien la sustituye: así la bitácora conserva quién hizo
   cada cosa, en vez de decir siempre "Secretaría". */

const ROLES = [
  ["secretaria", "Secretaría", "Emite líneas de captura y elabora los documentos."],
  ["administrador", "Administración", "Revisa comprobantes y emite los recibos."],
  ["coordinadora", "Coordinación", "Supervisa el proceso y administra estos ajustes."],
];

const VACIO = { identificador: "", nombre: "", correo: "", rol: "secretaria",
                notificaciones_todas: false };

export default function Personal() {
  const { usuario: yo } = useSesion();
  const [personas, setPersonas] = useState(null);
  const [editando, setEditando] = useState(null);
  const [credencial, setCredencial] = useState(null);
  const [error, setError] = useState(null);

  const recargar = () => api.usuarios().then(setPersonas).catch((e) => setError(e.message));
  useEffect(() => { recargar(); }, []);

  if (error && !personas) return <Marco><MensajeError>{error}</MensajeError></Marco>;
  if (personas === null) return <Marco><Cargando /></Marco>;

  const accion = async (fn) => {
    setError(null);
    try { const r = await fn(); await recargar(); return r; }
    catch (e) { setError(e.message); }
  };

  return (
    <Marco>
      <div className="space-y-3.5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: C.azul900 }}>Personal</h1>
          <p className="mt-1 text-sm" style={{ color: C.gris500 }}>
            Cada persona con su propia cuenta. Así la bitácora registra quién hizo
            cada cosa, y no solo el cargo.
          </p>
        </div>

        {credencial && (
          <Credencial credencial={credencial} onCerrar={() => setCredencial(null)} />
        )}

        <MensajeError>{error}</MensajeError>

        {editando ? (
          <Formulario inicial={editando} onCancelar={() => setEditando(null)}
                      onGuardado={async (datos) => {
                        const r = await accion(() => editando.id
                          ? api.editarUsuario(editando.id, datos)
                          : api.crearUsuario(datos));
                        if (r) {
                          setEditando(null);
                          if (r.password_temporal) setCredencial(r);
                        }
                      }} />
        ) : (
          <Card title={`Personas (${personas.filter((p) => p.activo).length} activas)`}
                right={<Boton onClick={() => setEditando({ ...VACIO })}>
                  <Plus size={15} /> Dar de alta
                </Boton>}>
            <Tabla personas={personas} yo={yo}
                   onEditar={setEditando}
                   onActivo={(p) => accion(() => api.activarUsuario(p.id, !p.activo))}
                   onPassword={async (p) => {
                     const r = await accion(() => api.reiniciarPassword(p.id));
                     if (r) setCredencial(r);
                   }}
                   onEliminar={(p) => accion(() => api.eliminarUsuario(p.id))} />
          </Card>
        )}
      </div>
    </Marco>
  );
}

/* La contraseña se muestra una sola vez: no se guarda en claro en ningún lado.
   Si se pierde, se genera otra. */
function Credencial({ credencial, onCerrar }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = () => {
    navigator.clipboard?.writeText(credencial.password_temporal);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="rounded-lg px-5 py-4" style={{ background: C.azul100 }}>
      <div className="text-[11px] font-semibold" style={{ color: C.azul700 }}>
        CONTRASEÑA TEMPORAL DE {credencial.nombre.toUpperCase()}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="text-xl font-semibold tracking-wide" style={{ color: C.azul900 }}>
          {credencial.password_temporal}
        </span>
        <Boton variante="secundario" tamano="sm" onClick={copiar}>
          {copiado ? <Check size={14} /> : <Copy size={14} />} {copiado ? "Copiada" : "Copiar"}
        </Boton>
        <Boton variante="neutro" tamano="sm" onClick={onCerrar} className="ml-auto">
          Ya la entregué
        </Boton>
      </div>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: C.azul700 }}>
        Entrégala en persona a {credencial.nombre} ({credencial.identificador}). No se
        guarda en ningún lado, así que si se pierde habrá que generar otra. El
        sistema le pedirá cambiarla en cuanto entre.
      </p>
    </div>
  );
}

function Tabla({ personas, yo, onEditar, onActivo, onPassword, onEliminar }) {
  const [confirmando, setConfirmando] = useState(null);

  const NOMBRE_ROL = Object.fromEntries(ROLES.map(([v, n]) => [v, n]));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr style={{ background: C.gris100 }}>
            {["Usuario", "Nombre", "Rol", "Correo", "Acciones registradas", ""].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold"
                  style={{ color: C.gris500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {personas.map((p) => (
            <tr key={p.id} style={{ borderTop: `1px solid ${C.gris200}`, opacity: p.activo ? 1 : 0.55 }}>
              <td className="px-4 py-3.5 text-[13px] font-semibold" style={{ color: C.azul700 }}>
                {p.identificador}
              </td>
              <td className="px-4 py-3.5 text-sm" style={{ color: C.gris700 }}>
                {p.nombre}
                {p.id === yo.id && <span className="ml-2 text-[11px]" style={{ color: C.gris400 }}>(tú)</span>}
                {!p.activo && <span className="ml-2 text-[11px]" style={{ color: C.gris400 }}>(dada de baja)</span>}
              </td>
              <td className="px-4 py-3.5 text-xs" style={{ color: C.gris500 }}>{NOMBRE_ROL[p.rol]}</td>
              <td className="px-4 py-3.5 text-xs" style={{ color: C.gris500 }}>{p.correo}</td>
              <td className="px-4 py-3.5 text-xs" style={{ color: C.gris500 }}>
                {p.acciones}
                {p.debe_cambiar_password && (
                  <span className="ml-2"><Pill tono="ambar">Sin entrar aún</Pill></span>
                )}
              </td>
              <td className="px-4 py-3.5">
                {/* Eliminar no se puede deshacer, así que pide confirmación en
                    la propia fila: un diálogo del navegador se cierra sin leer
                    y no deja ver de quién se trata. */}
                {confirmando === p.id ? (
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[12px]" style={{ color: C.rojo600 }}>
                      ¿Eliminar a {p.nombre}? No se puede deshacer.
                    </span>
                    <Boton variante="peligro" tamano="sm"
                           onClick={() => { setConfirmando(null); onEliminar(p); }}>
                      Sí, eliminar
                    </Boton>
                    <Boton variante="neutro" tamano="sm" onClick={() => setConfirmando(null)}>
                      Cancelar
                    </Boton>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2">
                    <Boton variante="secundario" tamano="sm" onClick={() => onEditar(p)}>
                      <Pencil size={13} /> Editar
                    </Boton>
                    <Boton variante="neutro" tamano="sm" onClick={() => onPassword(p)}>
                      <KeyRound size={13} /> Contraseña
                    </Boton>
                    <Boton variante="neutro" tamano="sm" onClick={() => onActivo(p)}>
                      {p.activo ? "Dar de baja" : "Reactivar"}
                    </Boton>
                    {/* Solo aparece en cuentas sin rastro. El servidor decide
                        quién lo es; aquí únicamente se obedece. */}
                    {p.eliminable && (
                      <Boton variante="peligro" tamano="sm"
                             onClick={() => setConfirmando(p.id)}>
                        <Trash2 size={13} /> Eliminar
                      </Boton>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Formulario({ inicial, onCancelar, onGuardado }) {
  const [d, setD] = useState({ ...VACIO, ...inicial });
  const [ocupado, setOcupado] = useState(false);
  const campo = (k) => (e) => setD({ ...d, [k]: e.target.value });

  return (
    <Card title={d.id ? `Editar a ${d.nombre}` : "Dar de alta a una persona"}>
      <div className="space-y-4 px-5 py-5">
        {d.id && d.acciones > 0 && (
          <Aviso titulo={`Esta persona tiene ${d.acciones} acciones registradas`}>
            Cambiarle el nombre o el rol no reescribe la bitácora: lo que hizo
            sigue firmado con los datos que tenía en ese momento.
          </Aviso>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nombre completo">
            <input value={d.nombre} onChange={campo("nombre")}
                   placeholder="Ana Paula Mendoza"
                   className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px]" style={estiloInput} />
          </Campo>
          <Campo label="Usuario"
                 ayuda="Letras o números, sin espacios ni acentos. No puede tener forma de matrícula (S y ocho dígitos), que está reservada para los alumnos.">
            <input value={d.identificador} maxLength={20}
                   onChange={(e) => setD({ ...d, identificador: e.target.value.toUpperCase() })}
                   placeholder="MENDOZAAP"
                   className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px] uppercase"
                   style={estiloInput} />
          </Campo>
        </div>

        <Campo label="Correo institucional" ayuda="Ahí llegan las notificaciones del sistema.">
          <input type="email" value={d.correo} onChange={campo("correo")}
                 className="campo-texto w-full rounded-md px-3 py-2.5 text-[13px]" style={estiloInput} />
        </Campo>

        <Campo label="Rol">
          <div className="space-y-2">
            {ROLES.map(([valor, etiqueta, nota]) => (
              <label key={valor} className="flex cursor-pointer gap-3 rounded-md px-3.5 py-2.5"
                     style={{ border: `1px solid ${d.rol === valor ? C.azul700 : C.gris200}`,
                              background: d.rol === valor ? C.azul100 : C.blanco }}>
                <input type="radio" name="rol" className="mt-0.5" checked={d.rol === valor}
                       onChange={() => setD({ ...d, rol: valor })} />
                <span>
                  <span className="block text-[13px] font-medium" style={{ color: C.azul900 }}>
                    {etiqueta}
                  </span>
                  <span className="block text-xs" style={{ color: C.gris500 }}>{nota}</span>
                </span>
              </label>
            ))}
          </div>
        </Campo>

        <label className="flex cursor-pointer gap-3 rounded-md px-3.5 py-2.5"
               style={{ border: `1px solid ${C.gris200}` }}>
          <input type="checkbox" className="mt-0.5" checked={!!d.notificaciones_todas}
                 onChange={(e) => setD({ ...d, notificaciones_todas: e.target.checked })} />
          <span className="text-[13px]" style={{ color: C.gris700 }}>
            Avisarle de todos los trámites por correo
            <span className="block text-xs" style={{ color: C.gris500 }}>
              Actívalo para quien supervisa. Para quien solo atiende su cola, sobra.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap gap-3">
          <Boton disabled={ocupado}
                 onClick={async () => { setOcupado(true); await onGuardado(d); setOcupado(false); }}>
            {ocupado ? "Guardando…" : d.id ? "Guardar cambios" : "Dar de alta"}
          </Boton>
          <Boton variante="neutro" onClick={onCancelar}>Cancelar</Boton>
        </div>
      </div>
    </Card>
  );
}
