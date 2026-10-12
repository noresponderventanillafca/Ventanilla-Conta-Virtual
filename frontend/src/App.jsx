import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { useSesion } from "./sesion";
import PantallaCarga from "./componentes/PantallaCarga";
import Acceso from "./paginas/Acceso";
import Activar from "./paginas/Activar";
import Restablecer from "./paginas/Restablecer";
import MisTramites from "./paginas/MisTramites";
import NuevaSolicitud from "./paginas/NuevaSolicitud";
import DetalleTramite from "./paginas/DetalleTramite";
import BandejaSecretaria from "./paginas/BandejaSecretaria";
import ValidacionPagos from "./paginas/ValidacionPagos";
import TableroCoordinacion from "./paginas/TableroCoordinacion";
import Padron from "./paginas/Padron";
import Historial from "./paginas/Historial";
import Catalogo from "./paginas/Catalogo";
import Ajustes from "./paginas/Ajustes";
import Personal from "./paginas/Personal";
import CambiarPassword from "./paginas/CambiarPassword";

/* Una sola pantalla de detalle para los cuatro roles: lo que cambia es la
   zona de acción, no la pantalla completa. */

const INICIO = {
  alumno: "/tramites",
  secretaria: "/bandeja",
  administrador: "/validacion",
  coordinadora: "/tablero",
};

/* Sin esta verificación, cualquiera que llegue a /tramites —porque el navegador
   recordó la URL de otra sesión— ve la pantalla del alumno con su propio nombre
   en el lugar de la matrícula. No era caché: las rutas no miraban el rol. */
function SoloRol({ roles, children }) {
  const { usuario } = useSesion();
  if (!roles.includes(usuario.rol)) return <Navigate to={INICIO[usuario.rol]} replace />;
  return children;
}


/* Rutas a las que se llega desde un correo, siempre sin sesión iniciada.
   Tienen que resolverse ANTES de mirar la sesión: mientras se comprobaban
   después, el enlace de activación caía en el comodín de abajo y terminaba
   en la pantalla de acceso, tirando el token que venía en la dirección. */
const PUBLICAS = {
  "/activar": <Activar />,
  "/restablecer": <Restablecer />,
};

export default function App() {
  const { usuario, cargando } = useSesion();
  const { pathname, search } = useLocation();

  // Además de arreglar el enlace, esto hace que estas dos pantallas aparezcan
  // de inmediato, sin esperar a que el servidor despierte: lo que necesitan
  // del backend es el envío del formulario, no el dibujo de la página.
  //
  // Con un token en la dirección la ruta pública gana aunque haya sesión
  // abierta. En una computadora compartida —una sala de cómputo, la casa—
  // quien hace clic en el enlace de su propio correo vería, si no, el
  // escritorio de la última persona que entró.
  if (PUBLICAS[pathname] &&
      (!usuario || new URLSearchParams(search).has("token")))
    return PUBLICAS[pathname];

  if (cargando) return <PantallaCarga />;
  if (!usuario) return <Acceso />;

  // El servidor bloquea el resto de la API mientras la contraseña sea
  // temporal; la interfaz lo refleja en vez de mostrar errores 403 sueltos.
  if (usuario.debe_cambiar_password) return <CambiarPassword forzado />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={INICIO[usuario.rol]} replace />} />
      <Route path="/tramites" element={
        <SoloRol roles={["alumno"]}><MisTramites /></SoloRol>} />
      <Route path="/tramites/nuevo" element={
        <SoloRol roles={["alumno"]}><NuevaSolicitud /></SoloRol>} />
      <Route path="/documentos" element={
        <SoloRol roles={["alumno"]}><Catalogo /></SoloRol>} />
      <Route path="/ajustes" element={
        <SoloRol roles={["coordinadora"]}><Ajustes /></SoloRol>} />
      <Route path="/personal" element={
        <SoloRol roles={["coordinadora"]}><Personal /></SoloRol>} />
      {/* El detalle sí es para todos: es la misma pantalla y lo que cambia es
          la zona de acción. */}
      <Route path="/tramites/:folio" element={<DetalleTramite />} />
      <Route path="/historial" element={
        <SoloRol roles={["secretaria", "administrador", "coordinadora"]}><Historial /></SoloRol>} />
      <Route path="/bandeja" element={
        <SoloRol roles={["secretaria"]}><BandejaSecretaria /></SoloRol>} />
      <Route path="/validacion" element={
        <SoloRol roles={["administrador"]}><ValidacionPagos /></SoloRol>} />
      <Route path="/tablero" element={
        <SoloRol roles={["coordinadora"]}><TableroCoordinacion /></SoloRol>} />
      <Route path="/padron" element={
        <SoloRol roles={["secretaria", "coordinadora"]}><Padron /></SoloRol>} />
      <Route path="/password" element={<CambiarPassword />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
