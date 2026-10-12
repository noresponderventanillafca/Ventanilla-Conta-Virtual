import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { C } from "../tokens";
import { api } from "../api/cliente";
import { useSesion } from "../sesion";
import MarcoAcceso from "../componentes/MarcoAcceso";
import { Boton, Campo, MensajeError, Aviso, estiloInput, claseInput } from "../componentes/ui";

/* La pantalla a la que lleva el enlace del correo.

   Antes esta ruta no existía: el correo mandaba a /activar?token=… , React
   Router no encontraba nada, el comodín redirigía a «/» y el alumno acababa
   en la pantalla de inicio de sesión sin contraseña que escribir y sin pista
   de qué había pasado. El token, que iba en la dirección, se perdía.

   Ahora el token se lee de la dirección y nadie tiene que recortarlo del
   correo ni saber qué parte del enlace es «el código». */

const MINIMO = 10;

export default function Activar() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  if (!token) return <MarcoAcceso><SinToken /></MarcoAcceso>;
  return <MarcoAcceso><DefinirPassword token={token} /></MarcoAcceso>;
}

/* Alguien escribió /activar a mano, o el correo recortó la dirección.
   Conviene decirlo: callarlo deja a la persona mirando un formulario que no
   puede funcionar. */
function SinToken() {
  const navegar = useNavigate();
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold" style={{ color: C.azul900 }}>
        Falta el enlace de activación
      </h2>
      <Aviso tono="ambar" titulo="Esta dirección está incompleta">
        El enlace del correo incluye un código al final. Si lo copiaste a mano,
        es probable que se haya cortado: vuelve al correo y haz clic
        directamente sobre el enlace.
      </Aviso>
      <p className="text-[13px] leading-relaxed" style={{ color: C.gris500 }}>
        ¿No te llegó? Revisa la carpeta de correo no deseado. Si tampoco está,
        puedes pedir otro desde la pantalla de acceso.
      </p>
      <Boton className="w-full" onClick={() => navegar("/", { replace: true })}>
        Ir a la pantalla de acceso
      </Boton>
    </div>
  );
}

function DefinirPassword({ token }) {
  const { setUsuario } = useSesion();
  const navegar = useNavigate();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < MINIMO)
      return setError(`La contraseña debe tener al menos ${MINIMO} caracteres.`);
    if (password !== password2) return setError("Las contraseñas no coinciden.");

    setEnviando(true);
    try {
      const usuario = await api.confirmarActivacion(token, password);
      setUsuario(usuario);
      // El backend ya dejó la sesión iniciada. Sin esta navegación, la
      // aplicación seguiría mostrando esta ruta pública con el token a la
      // vista en la barra de direcciones.
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
          Define tu contraseña
        </h2>
        <p className="mt-1 text-sm" style={{ color: C.gris500 }}>
          Es el último paso. Después entrarás directo a la Ventanilla.
        </p>
      </div>

      <Campo label="Contraseña" ayuda={`Mínimo ${MINIMO} caracteres. No uses tu matrícula.`}>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
               autoComplete="new-password" autoFocus
               className={claseInput} style={estiloInput} />
      </Campo>

      <Campo label="Repite la contraseña">
        <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)}
               autoComplete="new-password"
               className={claseInput} style={estiloInput} />
      </Campo>

      <MensajeError>{error}</MensajeError>

      <Boton type="submit" disabled={enviando} className="w-full">
        {enviando ? "Activando…" : "Activar y entrar"}
      </Boton>

      <p className="text-[12px] leading-relaxed" style={{ color: C.gris400 }}>
        El enlace vence 48 horas después de solicitarlo y solo sirve una vez.
      </p>
    </form>
  );
}
