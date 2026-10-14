import { useState } from "react";
import { Link } from "react-router-dom";

import { C } from "../tokens";
import { api } from "../api/cliente";
import { useSesion } from "../sesion";
import MarcoAcceso from "../componentes/MarcoAcceso";
import { Boton, Campo, MensajeError, Aviso, estiloInput, claseInput } from "../componentes/ui";

/* La CURP prueba que la persona está en el padrón y ahí termina su papel.
   No es contraseña: sus primeros 10 caracteres se derivan del nombre y la
   fecha de nacimiento, así que un compañero de grupo podría calcularlos.
   El enlace al correo institucional es lo que prueba que es el titular. */

/* Volver al inicio de sesión sin explicación se lee como un fallo. Decir por
   qué pasó evita el «se descompuso» y, sobre todo, evita que alguien vuelva a
   escribir todo creyendo que lo perdió por un error del sistema. */
const MOTIVOS = {
  inactividad: {
    titulo: "Cerramos tu sesión por inactividad",
    texto: "Pasaron 10 minutos sin actividad. Es una medida de seguridad: "
         + "estas pantallas muestran datos personales de los alumnos.",
  },
  caducada: {
    titulo: "Tu sesión caducó",
    texto: "Por seguridad, hay que volver a entrar al menos una vez al día.",
  },
  expirada: {
    titulo: "Tu sesión ya no estaba activa",
    texto: "Suele pasar cuando la pestaña queda abierta mucho tiempo. "
         + "Vuelve a entrar y continúa donde ibas.",
  },
};

export default function Acceso() {
  const { entrar, motivo } = useSesion();
  const [modo, setModo] = useState("login");
  const aviso = MOTIVOS[motivo];

  return (
    <MarcoAcceso>
      {aviso && modo === "login" && (
        <div className="mb-5">
          <Aviso tono="ambar" titulo={aviso.titulo}>{aviso.texto}</Aviso>
        </div>
      )}
      {modo === "login" && (
        <FormLogin entrar={entrar}
                   irActivar={() => setModo("activar")}
                   irOlvide={() => setModo("olvide")} />
      )}
      {modo === "activar" && <FormActivar irLogin={() => setModo("login")} />}
      {modo === "olvide" && <FormOlvide irLogin={() => setModo("login")} />}
    </MarcoAcceso>
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
               className={claseInput} style={estiloInput} />
      </Campo>

      <Campo label="Contraseña">
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
               autoComplete="current-password"
               className={claseInput} style={estiloInput} />
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

/* Pedir el token a mano era pedirle a un alumno que distinguiera, dentro de
   una dirección larga, qué parte era «el código». Ahora esta pantalla termina
   en «revisa tu correo» y el enlace hace el resto. */
function FormActivar({ irLogin }) {
  const [matricula, setMatricula] = useState("");
  const [curp, setCurp] = useState("");
  const [enviado, setEnviado] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const verificar = async (e) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      setEnviado(await api.verificarPadron(matricula, curp));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (enviado)
    return <RevisaTuCorreo mensaje={enviado.mensaje} token={enviado.token_desarrollo}
                           ruta="/activar" irLogin={irLogin} />;

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
               placeholder="S23012345" autoFocus
               className={claseInput} style={estiloInput} />
      </Campo>

      <Campo label="Primeros 10 caracteres de tu CURP"
             ayuda="Cuatro letras y seis dígitos. Ejemplo: RUMA030214">
        <input value={curp} onChange={(e) => setCurp(e.target.value.toUpperCase())}
               maxLength={10}
               className={`${claseInput} uppercase`} style={estiloInput} />
      </Campo>

      <MensajeError>{error}</MensajeError>
      <Boton type="submit" disabled={enviando} className="w-full">
        {enviando ? "Comprobando…" : "Enviarme el enlace"}
      </Boton>
      <Boton type="button" variante="neutro" onClick={irLogin} className="w-full">
        Volver a iniciar sesión
      </Boton>
    </form>
  );
}

/* El mensaje es idéntico exista o no la cuenta: si cambiara, cualquiera podría
   averiguar qué matrículas están registradas probando una por una. */
function FormOlvide({ irLogin }) {
  const [identificador, setIdentificador] = useState("");
  const [enviado, setEnviado] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const solicitar = async (e) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      setEnviado(await api.olvidePassword(identificador));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (enviado)
    return <RevisaTuCorreo mensaje={enviado.mensaje} token={enviado.token_desarrollo}
                           ruta="/restablecer" irLogin={irLogin} />;

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
               placeholder="S23012345" autoFocus
               className={claseInput} style={estiloInput} />
      </Campo>

      <MensajeError>{error}</MensajeError>
      <Boton type="submit" disabled={enviando} className="w-full">
        {enviando ? "Enviando…" : "Enviar enlace"}
      </Boton>
      <Boton type="button" variante="neutro" onClick={irLogin} className="w-full">
        Volver a iniciar sesión
      </Boton>
    </form>
  );
}

function RevisaTuCorreo({ mensaje, token, ruta, irLogin }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: C.azul900 }}>
          Revisa tu correo
        </h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: C.gris500 }}>{mensaje}</p>
      </div>

      {/* El correo sale de una cuenta de Gmail, no del dominio uv.mx, así que
          Outlook lo suele mandar a «no deseado». Decirlo aquí ahorra la mayor
          parte de los «no me llegó nada». */}
      <Aviso tono="azul" titulo="Si no lo ves en unos minutos">
        Busca en la carpeta de correo no deseado. Abre el mensaje y haz clic en
        el enlace: no hace falta copiar ningún código.
      </Aviso>

      {/* Solo en desarrollo, donde no hay correo configurado y el backend
          devuelve el token para no bloquear las pruebas. */}
      {token && (
        <div className="rounded-lg p-4" style={{ background: C.ambar100 }}>
          <p className="text-xs font-semibold" style={{ color: C.ambar600 }}>
            Modo desarrollo
          </p>
          <p className="mt-1 text-xs" style={{ color: C.ambar600 }}>
            No hay correo configurado, así que el enlace aparece aquí.
          </p>
          <Link to={`${ruta}?token=${token}`}
                className="btn mt-3 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-medium"
                style={{
                  "--btn-bg": C.blanco, "--btn-fg": C.ambar600,
                  "--btn-bd": C.ambar600, "--btn-bg-hover": C.ambar100,
                  "--btn-bg-active": C.ambar100,
                }}>
            Abrir el enlace
          </Link>
        </div>
      )}

      <Boton variante="neutro" onClick={irLogin} className="w-full">
        Volver a iniciar sesión
      </Boton>
    </div>
  );
}
