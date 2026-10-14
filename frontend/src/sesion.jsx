import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api/cliente";

const Ctx = createContext(null);

/* Cierre por inactividad.

   El servidor también caduca las sesiones —es él quien manda, porque una
   comprobación en el navegador se esquiva—, pero con una ventana más holgada.
   Aquí la ventana es más corta para que sea la interfaz la que avise y cierre
   con un mensaje, en vez de que la persona descubra el problema al recibir un
   error a media captura.

   Se comparan marcas de tiempo, no pulsos de reloj. Un intervalo deja de
   contar mientras la computadora está suspendida, así que al abrir la laptop
   al día siguiente el contador creería que pasaron dos minutos. Date.now() no
   se equivoca con eso. */
const MINUTOS_INACTIVIDAD = 10;
const SEGUNDOS_AVISO = 60;

const MS_LIMITE = MINUTOS_INACTIVIDAD * 60_000;
const MS_AVISO = MS_LIMITE - SEGUNDOS_AVISO * 1000;

const SENALES = ["mousedown", "keydown", "scroll", "touchstart", "focus"];

export function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  // Por qué se cerró la sesión. La pantalla de acceso lo muestra: sin esto,
  // volver al login de golpe parece un fallo del sistema.
  const [motivo, setMotivo] = useState(null);
  const [segundosParaCerrar, setSegundosParaCerrar] = useState(null);

  const ultimaActividad = useRef(Date.now());

  const cerrar = useCallback(async (razon) => {
    setMotivo(razon);
    setSegundosParaCerrar(null);
    try {
      await api.logout();
    } catch {
      // Sin conexión la petición falla, y antes eso dejaba la sesión abierta
      // en pantalla: el botón de Salir no hacía nada. Lo que importa es soltar
      // al usuario aquí; la cookie caduca sola en el servidor.
    }
    setUsuario(null);
  }, []);

  useEffect(() => {
    api.yo().then(setUsuario).catch(() => setUsuario(null)).finally(() => setCargando(false));

    const expirada = (e) => {
      setUsuario(null);
      setMotivo(e.detail?.codigo === "sesion_caducada" ? "caducada" : "expirada");
    };
    window.addEventListener("sesion-expirada", expirada);
    return () => window.removeEventListener("sesion-expirada", expirada);
  }, []);

  // --- Vigilancia de inactividad -----------------------------------------
  useEffect(() => {
    if (!usuario) return;

    const marcar = () => {
      ultimaActividad.current = Date.now();
      setSegundosParaCerrar((s) => (s === null ? null : null));
    };
    SENALES.forEach((s) => window.addEventListener(s, marcar, { passive: true }));

    const revisar = () => {
      const quieto = Date.now() - ultimaActividad.current;
      if (quieto >= MS_LIMITE) cerrar("inactividad");
      else if (quieto >= MS_AVISO)
        setSegundosParaCerrar(Math.ceil((MS_LIMITE - quieto) / 1000));
      else setSegundosParaCerrar(null);
    };
    const reloj = setInterval(revisar, 1000);

    /* Al volver a la pestaña hay que comprobar la sesión contra el servidor,
       no solo mirar el reloj: la cookie pudo caducar mientras la pestaña
       estaba en segundo plano o la computadora dormida. Este era el caso de
       la pestaña abierta ocho horas. */
    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - ultimaActividad.current >= MS_LIMITE)
        return cerrar("inactividad");
      api.yo().then(setUsuario).catch((err) => {
        // Un fallo de red NO cierra la sesión: en el plan gratuito el servidor
        // tarda en despertar y cerrar sesión por eso sería un castigo por
        // esperar. Solo cierra si el servidor contesta que ya no vale.
        if (!err.deRed) cerrar("expirada");
      });
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      SENALES.forEach((s) => window.removeEventListener(s, marcar));
      clearInterval(reloj);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [usuario, cerrar]);

  const entrar = async (identificador, password) => {
    const u = await api.login(identificador, password);
    ultimaActividad.current = Date.now();
    setMotivo(null);
    setUsuario(u);
  };

  const seguirConectado = () => {
    ultimaActividad.current = Date.now();
    setSegundosParaCerrar(null);
  };

  return (
    <Ctx.Provider value={{
      usuario, cargando, motivo, entrar, setUsuario,
      salir: () => cerrar(null),
      segundosParaCerrar, seguirConectado,
      limpiarMotivo: () => setMotivo(null),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSesion = () => useContext(Ctx);
