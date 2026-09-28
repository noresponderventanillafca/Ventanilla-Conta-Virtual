import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api/cliente";

const Ctx = createContext(null);

export function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.yo().then(setUsuario).catch(() => setUsuario(null)).finally(() => setCargando(false));
    const salir = () => setUsuario(null);
    window.addEventListener("sesion-expirada", salir);
    return () => window.removeEventListener("sesion-expirada", salir);
  }, []);

  const entrar = async (identificador, password) => {
    setUsuario(await api.login(identificador, password));
  };

  const salir = async () => {
    await api.logout();
    setUsuario(null);
  };

  return <Ctx.Provider value={{ usuario, cargando, entrar, salir, setUsuario }}>{children}</Ctx.Provider>;
}

export const useSesion = () => useContext(Ctx);
