import { useState } from "react";

import { C } from "../tokens";
import { api } from "../api/cliente";
import { useSesion } from "../sesion";
import { FlechasGrandes } from "../componentes/Chevrones";
import Escudo from "../componentes/Escudo";
import { Boton, Campo, MensajeError, estiloInput } from "../componentes/ui";

/* La CURP prueba que la persona está en el padrón y ahí termina su papel.
   No es contraseña: sus primeros 10 caracteres se derivan del nombre y la
   fecha de nacimiento, así que un compañero de grupo podría calcularlos.
   El enlace al correo institucional es lo que prueba que es el titular. */

export default function Acceso() {
  const { entrar, setUsuario } = useSesion();
  const [modo, setModo] = useState("login");

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="flex flex-col justify-between px-8 py-12 lg:w-[520px] lg:px-16 lg:py-16"
             style={{ background: C.azul900 }}>
        <div className="space-y-7">
          <Escudo alto={72} />
          <div className="space-y-3.5">
            <FlechasGrandes ancho={200} />
            <h1 className="text-4xl font-bold leading-tight" style={{ color: C.blanco }}>
              Ventanilla Virtual
            </h1>
            <p className="max-w-sm text-[17px]" style={{ color: C.azul100 }}>
              Solicitud y seguimiento de documentos escolares.
            </p>
          </div>
        </div>
        <div className="mt-12 space-y-1">
          <p className="text-[13px] font-medium" style={{ color: C.blanco }}>
            Facultad de Contaduría y Administración
          </p>
          <p className="text-[13px]" style={{ color: C.gris400 }}>
            Licenciatura en Contaduría — Modalidad Virtual
          </p>
        </div>
      </aside>

      <div className="flex flex-1 items-center justify-center px-6 py-12" style={{ background: C.gris100 }}>
        <div className="w-full max-w-md rounded-xl px-8 py-10 sm:px-12"
             style={{ background: C.blanco, border: `1px solid ${C.gris200}` }}>
          {modo === "login" && (
            <FormLogin entrar={entrar}
                       irActivar={() => setModo("activar")}
                       irOlvide={() => setModo("olvide")} />
          )}
          {modo === "activar" && (
            <FormActivar setUsuario={setUsuario} irLogin={() => setModo("login")} />
          )}
          {modo === "olvide" && (
            <FormOlvide setUsuario={setUsuario} irLogin={() => setModo("login")} />
          )}
        </div>
      </div>
    </div>
  );
}

function FormLogin({ entrar, irActivar, irOlvide }) {
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      await entrar(identificador, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: C.azul900 }}>Iniciar sesión</h2>
        <p className="mt-1 text-sm" style={{ color: C.gris500 }}>
          Acceso para alumnos y personal registrado.
        </p>
      </div>

      <Campo label="Matrícula o usuario">
        <input value={identificador} onChange={(e) => setIdentificador(e.target.value)}
               autoComplete="username" placeholder="S23012345"
               className="w-full rounded-md px-3.5 py-3 text-sm outline-none" style={estiloInput} />
      </Campo>

      <Campo label="Contraseña">
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
               autoComplete="current-password"
               className="w-full rounded-md px-3.5 py-3 text-sm outline-none" style={estiloInput} />
      </Campo>

      <MensajeError>{error}</MensajeError>

      <Boton type="submit" disabled={cargando} className="w-full">
        {cargando ? "Entrando…" : "Entrar"}
      </Boton>

      <Boton type="button" variante="neutro" onClick={irOlvide} className="w-full">
        ¿Olvidaste tu contraseña?
      </Boton>

      <div className="pt-4 space-y-1.5" style={{ borderTop: `1px solid ${C.gris200}` }}>
        <p className="pt-3 text-sm font-semibold" style={{ color: C.gris700 }}>
          ¿Primera vez que entras?
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: C.gris500 }}>
          Activa tu cuenta con tu matrícula y los primeros 10 caracteres de tu CURP.
          Te enviaremos un enlace a tu correo institucional para que definas tu contraseña.
        </p>
        <Boton type="button" variante="secundario" onClick={irActivar} className="w-full">
          Activar mi cuenta
        </Boton>
      </div>
    </form>
  );
}

function FormActivar({ setUsuario, irLogin }) {
  const [paso, setPaso] = useState(1);
  const [matricula, setMatricula] = useState("");
  const [curp, setCurp] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);

  const verificar = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const r = await api.verificarPadron(matricula, curp);
      setMensaje(r.mensaje);
      // En desarrollo el backend devuelve el token para no depender del correo.
      if (r.token_desarrollo) setToken(r.token_desarrollo);
      setPaso(2);
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmar = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== password2) return setError("Las contraseñas no coinciden.");
    if (password.length < 10) return setError("La contraseña debe tener al menos 10 caracteres.");
    try {
      setUsuario(await api.confirmarActivacion(token, password));
    } catch (err) {
      setError(err.message);
    }
  };

  if (paso === 1)
    return (
      <form onSubmit={verificar} className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: C.azul900 }}>Activar mi cuenta</h2>
          <p className="mt-1 text-sm" style={{ color: C.gris500 }}>
            Comprobamos que estés en el padrón de Contaduría Virtual.
          </p>
        </div>

        <Campo label="Matrícula">
          <input value={matricula} onChange={(e) => setMatricula(e.target.value)}
                 placeholder="S23012345"
                 className="w-full rounded-md px-3.5 py-3 text-sm outline-none" style={estiloInput} />
        </Campo>

        <Campo label="Primeros 10 caracteres de tu CURP"
               ayuda="Cuatro letras y seis dígitos. Ejemplo: RUMA030214">
          <input value={curp} onChange={(e) => setCurp(e.target.value.toUpperCase())}
                 maxLength={10}
                 className="w-full rounded-md px-3.5 py-3 text-sm uppercase outline-none" style={estiloInput} />
        </Campo>

        <MensajeError>{error}</MensajeError>
        <Boton type="submit" className="w-full">Continuar</Boton>
        <Boton type="button" variante="neutro" onClick={irLogin} className="w-full">
          Volver a iniciar sesión
        </Boton>
      </form>
    );

  return (
    <form onSubmit={confirmar} className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: C.azul900 }}>Define tu contraseña</h2>
        <p className="mt-1 text-sm" style={{ color: C.gris500 }}>{mensaje}</p>
      </div>

      <Campo label="Enlace de activación"
             ayuda="Pégalo desde el correo que te enviamos.">
        <input value={token} onChange={(e) => setToken(e.target.value)}
               className="w-full rounded-md px-3.5 py-3 text-xs outline-none" style={estiloInput} />
      </Campo>

      <Campo label="Nueva contraseña" ayuda="Mínimo 10 caracteres.">
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
               autoComplete="new-password"
               className="w-full rounded-md px-3.5 py-3 text-sm outline-none" style={estiloInput} />
      </Campo>

      <Campo label="Repite la contraseña">
        <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)}
               autoComplete="new-password"
               className="w-full rounded-md px-3.5 py-3 text-sm outline-none" style={estiloInput} />
      </Campo>

      <MensajeError>{error}</MensajeError>
      <Boton type="submit" className="w-full">Activar y entrar</Boton>
    </form>
  );
}


/* El mensaje es idéntico exista o no la cuenta: si cambiara, cualquiera podría
   averiguar qué matrículas están registradas probando una por una. */
function FormOlvide({ setUsuario, irLogin }) {
  const [paso, setPaso] = useState(1);
  const [identificador, setIdentificador] = useState("");
  const [token, setToken] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);

  const solicitar = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const r = await api.olvidePassword(identificador);
      setMensaje(r.mensaje);
      if (r.token_desarrollo) setToken(r.token_desarrollo);
      setPaso(2);
    } catch (err) {
      setError(err.message);
    }
  };

  const restablecer = async (e) => {
    e.preventDefault();
    setError(null);
    if (nueva !== repetida) return setError("Las contraseñas no coinciden.");
    try {
      setUsuario(await api.restablecerPassword(token, nueva));
    } catch (err) {
      setError(err.message);
    }
  };

  if (paso === 1)
    return (
      <form onSubmit={solicitar} className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: C.azul900 }}>
            Recuperar contraseña
          </h2>
          <p className="mt-1 text-sm" style={{ color: C.gris500 }}>
            Te enviaremos un enlace al correo registrado en tu cuenta.
          </p>
        </div>

        <Campo label="Matrícula o usuario">
          <input value={identificador} onChange={(e) => setIdentificador(e.target.value)}
                 placeholder="S23012345"
                 className="w-full rounded-md px-3.5 py-3 text-sm outline-none" style={estiloInput} />
        </Campo>

        <MensajeError>{error}</MensajeError>
        <Boton type="submit" className="w-full">Enviar enlace</Boton>
        <Boton type="button" variante="neutro" onClick={irLogin} className="w-full">
          Volver a iniciar sesión
        </Boton>
      </form>
    );

  return (
    <form onSubmit={restablecer} className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: C.azul900 }}>
          Nueva contraseña
        </h2>
        <p className="mt-1 text-sm" style={{ color: C.gris500 }}>{mensaje}</p>
      </div>

      <Campo label="Enlace de recuperación" ayuda="Pégalo desde el correo. Vence en 2 horas.">
        <input value={token} onChange={(e) => setToken(e.target.value)}
               className="w-full rounded-md px-3.5 py-3 text-xs outline-none" style={estiloInput} />
      </Campo>

      <Campo label="Nueva contraseña" ayuda="Mínimo 10 caracteres.">
        <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)}
               autoComplete="new-password"
               className="w-full rounded-md px-3.5 py-3 text-sm outline-none" style={estiloInput} />
      </Campo>

      <Campo label="Repite la contraseña">
        <input type="password" value={repetida} onChange={(e) => setRepetida(e.target.value)}
               autoComplete="new-password"
               className="w-full rounded-md px-3.5 py-3 text-sm outline-none" style={estiloInput} />
      </Campo>

      <MensajeError>{error}</MensajeError>
      <Boton type="submit" className="w-full">Restablecer y entrar</Boton>
      <Boton type="button" variante="neutro" onClick={irLogin} className="w-full">
        Volver a iniciar sesión
      </Boton>
    </form>
  );
}
