import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

import { C } from "../tokens";
import { api } from "../api/cliente";
import { useSesion } from "../sesion";
import Marco from "../componentes/Marco";
import { Card, Campo, Boton, Aviso, MensajeError, estiloInput } from "../componentes/ui";

/* Cuando la contraseña es temporal, esta pantalla se muestra sola y el
   servidor bloquea todo lo demás. No es una recomendación: es un requisito. */

export default function CambiarPassword({ forzado = false }) {
  const navegar = useNavigate();
  const { usuario, setUsuario } = useSesion();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState(null);
  const [listo, setListo] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    if (nueva !== repetida) return setError("Las contraseñas nuevas no coinciden.");
    setOcupado(true);
    try {
      const r = await api.cambiarPassword(actual, nueva);
      setUsuario(r.usuario);
      setListo(true);
      if (!forzado) setTimeout(() => navegar(-1), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  };

  const formulario = (
    <form onSubmit={enviar} className="space-y-5">
      {forzado && (
        <Aviso tono="ambar" titulo="Cambia tu contraseña temporal">
          Entraste con la contraseña que te dieron al dar de alta tu cuenta. Es
          conocida por más de una persona, así que no puedes usar el sistema hasta
          reemplazarla.
        </Aviso>
      )}

      <Campo label="Contraseña actual">
        <input type="password" value={actual} onChange={(e) => setActual(e.target.value)}
               autoComplete="current-password"
               className="w-full rounded-md px-3.5 py-3 text-sm outline-none" style={estiloInput} />
      </Campo>

      <Campo label="Nueva contraseña"
             ayuda="Mínimo 10 caracteres. Una frase que recuerdes es mejor que algo corto y complicado.">
        <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)}
               autoComplete="new-password"
               className="w-full rounded-md px-3.5 py-3 text-sm outline-none" style={estiloInput} />
      </Campo>

      <Campo label="Repite la nueva contraseña">
        <input type="password" value={repetida} onChange={(e) => setRepetida(e.target.value)}
               autoComplete="new-password"
               className="w-full rounded-md px-3.5 py-3 text-sm outline-none" style={estiloInput} />
      </Campo>

      <MensajeError>{error}</MensajeError>

      {listo && (
        <div className="flex items-center gap-2 rounded-lg px-4 py-3 text-[13px]"
             style={{ background: C.verde100, color: C.verde600 }}>
          <ShieldCheck size={16} /> Contraseña actualizada.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Boton type="submit" disabled={ocupado}>
          {ocupado ? "Guardando…" : "Cambiar contraseña"}
        </Boton>
        {!forzado && (
          <Boton variante="secundario" onClick={() => navegar(-1)}>Cancelar</Boton>
        )}
      </div>
    </form>
  );

  if (forzado)
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-12"
           style={{ background: C.gris100 }}>
        <div className="w-full max-w-md rounded-xl px-8 py-10"
             style={{ background: C.blanco, border: `1px solid ${C.gris200}` }}>
          <h1 className="mb-1 text-xl font-semibold" style={{ color: C.azul900 }}>
            Hola, {usuario.nombre}
          </h1>
          <p className="mb-6 text-sm" style={{ color: C.gris500 }}>
            Un paso antes de empezar.
          </p>
          {formulario}
        </div>
      </div>
    );

  return (
    <Marco>
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-semibold" style={{ color: C.azul900 }}>
          Cambiar contraseña
        </h1>
        <Card><div className="px-5 py-6">{formulario}</div></Card>
      </div>
    </Marco>
  );
}
