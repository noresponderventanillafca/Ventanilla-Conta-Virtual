import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { C } from "../tokens";
import { api } from "../api/cliente";
import { useSesion } from "../sesion";
import MarcoAcceso from "../componentes/MarcoAcceso";
import { Boton, Campo, MensajeError, Aviso, estiloInput, claseInput } from "../componentes/ui";

/* Gemela de Activar: el correo de recuperación manda a /restablecer?token=…
   y tenía el mismo problema —la ruta no existía—. Se mantienen separadas
   porque los textos, los plazos y el motivo por el que la persona llegó son
   distintos, y mezclarlos obligaría a condicionar media pantalla. */

const MINIMO = 10;

export default function Restablecer() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  if (!token) return <MarcoAcceso><SinToken /></MarcoAcceso>;
  return <MarcoAcceso><NuevaPassword token={token} /></MarcoAcceso>;
}

function SinToken() {
  const navegar = useNavigate();
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold" style={{ color: C.azul900 }}>
        Falta el enlace de recuperación
      </h2>
      <Aviso tono="ambar" titulo="Esta dirección está incompleta">
        El enlace del correo incluye un código al final. Vuelve al correo y haz
        clic directamente sobre el enlace, sin copiarlo a mano.
      </Aviso>
      <Boton className="w-full" onClick={() => navegar("/", { replace: true })}>
        Ir a la pantalla de acceso
      </Boton>
    </div>
  );
}

function NuevaPassword({ token }) {
  const { setUsuario } = useSesion();
  const navegar = useNavigate();
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    if (nueva.length < MINIMO)
      return setError(`La contraseña debe tener al menos ${MINIMO} caracteres.`);
    if (nueva !== repetida) return setError("Las contraseñas no coinciden.");

    setEnviando(true);
    try {
      const usuario = await api.restablecerPassword(token, nueva);
      setUsuario(usuario);
      navegar("/", { replace: true });
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: C.azul900 }}>
          Nueva contraseña
        </h2>
        <p className="mt-1 text-sm" style={{ color: C.gris500 }}>
          Elige una distinta de la anterior. Entrarás en cuanto la guardes.
        </p>
      </div>

      <Campo label="Nueva contraseña" ayuda={`Mínimo ${MINIMO} caracteres.`}>
        <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)}
               autoComplete="new-password" autoFocus
               className={claseInput} style={estiloInput} />
      </Campo>

      <Campo label="Repite la contraseña">
        <input type="password" value={repetida} onChange={(e) => setRepetida(e.target.value)}
               autoComplete="new-password"
               className={claseInput} style={estiloInput} />
      </Campo>

      <MensajeError>{error}</MensajeError>

      <Boton type="submit" disabled={enviando} className="w-full">
        {enviando ? "Guardando…" : "Restablecer y entrar"}
      </Boton>

      <p className="text-[12px] leading-relaxed" style={{ color: C.gris400 }}>
        El enlace vence 2 horas después de solicitarlo y solo sirve una vez.
      </p>
    </form>
  );
}
