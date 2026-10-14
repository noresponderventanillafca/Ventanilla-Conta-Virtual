/* Todas las peticiones llevan credenciales: la sesión vive en una cookie
   HttpOnly, no en localStorage. Un token en localStorage es legible por
   cualquier script inyectado en la página. */

async function peticion(ruta, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, { credentials: "include", ...opciones });
  } catch {
    // Marcado como fallo de red para distinguirlo de un rechazo del servidor.
    // No es lo mismo «no hay internet» —o el servidor gratuito despertando—
    // que «tu sesión ya no vale»: lo primero se reintenta, lo segundo manda al
    // inicio de sesión. Sin esta distinción, perder el wifi un momento sacaba
    // a la persona del sistema.
    const error = new Error(
      navigator.onLine
        ? "El servidor no responde. Puede estar despertando: vuelve a intentarlo en unos segundos."
        : "Parece que no hay conexión a internet. Revísala y vuelve a intentarlo."
    );
    error.deRed = true;
    throw error;
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (respuesta.status === 401) {
    window.dispatchEvent(new CustomEvent("sesion-expirada", {
      detail: { codigo: datos.codigo },
    }));
    throw new Error(datos.error || "No has iniciado sesión");
  }

  if (!respuesta.ok) throw new Error(datos.error || "Ocurrió un error");
  return datos;
}

const json = (ruta, cuerpo, metodo = "POST") =>
  peticion(ruta, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo ?? {}),
  });

const formulario = (ruta, datos) => {
  const fd = new FormData();
  Object.entries(datos).forEach(([k, v]) => v != null && fd.append(k, v));
  return peticion(ruta, { method: "POST", body: fd });
};

export const api = {
  // Sesión
  yo: () => peticion("/auth/yo"),
  login: (identificador, password) => json("/auth/login", { identificador, password }),
  logout: () => json("/auth/logout"),
  cambiarPassword: (actual, nueva) => json("/auth/password", { actual, nueva }),
  olvidePassword: (identificador) => json("/auth/password/olvide", { identificador }),
  restablecerPassword: (token, nueva) => json("/auth/password/restablecer", { token, nueva }),
  verificarPadron: (matricula, curp_prefijo) => json("/auth/activar/verificar", { matricula, curp_prefijo }),
  confirmarActivacion: (token, password) => json("/auth/activar/confirmar", { token, password }),

  // Catálogo
  documentos: () => peticion("/catalogo/documentos"),
  cuenta: () => peticion("/catalogo/cuenta"),
  urlEjemplo: (tipoId) => `/api/ajustes/documentos/${tipoId}/ejemplo`,

  // Ajustes (Coordinación)
  ajustesDocumentos: () => peticion("/ajustes/documentos"),
  crearDocumento: (datos) => formulario("/ajustes/documentos", datos),
  editarDocumento: (id, datos) => formulario(`/ajustes/documentos/${id}`, datos),
  activarDocumento: (id, activo) => json(`/ajustes/documentos/${id}/activo`, { activo }),
  verCuenta: () => peticion("/ajustes/cuenta"),
  guardarCuenta: (datos) => json("/ajustes/cuenta", datos, "PUT"),
  verNotificaciones: () => peticion("/ajustes/notificaciones"),
  guardarNotificaciones: (notificaciones_todas) =>
    json("/ajustes/notificaciones", { notificaciones_todas }, "PUT"),
  probarCorreo: () => json("/ajustes/notificaciones/prueba"),

  // Personal
  usuarios: () => peticion("/usuarios"),
  crearUsuario: (datos) => json("/usuarios", datos),
  editarUsuario: (id, datos) => json(`/usuarios/${id}`, datos, "PUT"),
  activarUsuario: (id, activo) => json(`/usuarios/${id}/activo`, { activo }),
  reiniciarPassword: (id) => json(`/usuarios/${id}/password`),
  eliminarUsuario: (id) => peticion(`/usuarios/${id}`, { method: "DELETE" }),

  // Trámites
  listar: () => peticion("/tramites"),
  bandeja: () => peticion("/tramites/bandeja"),
  historial: () => peticion("/tramites/historial"),
  retrasados: () => peticion("/tramites/retrasados"),
  detalle: (folio) => peticion(`/tramites/${folio}`),
  crear: (datos) => formulario("/tramites", datos),
  subirComprobante: (folio, datos) => formulario(`/tramites/${folio}/comprobante`, datos),
  avanzar: (folio, datos) => json(`/tramites/${folio}/avanzar`, datos),
  entregarDocumento: (folio, archivos) => formulario(`/tramites/${folio}/documento`, archivos),
  confirmarPago: (folio) => json(`/tramites/${folio}/confirmar-pago`),
  rechazarPago: (folio, motivo) => json(`/tramites/${folio}/rechazar-pago`, { motivo }),
  comentar: (folio, texto, adjunto) => formulario(`/tramites/${folio}/comentarios`, { texto, adjunto }),
  urlArchivo: (folio, id) => `/api/tramites/${folio}/archivos/${id}`,
  urlDescarga: (folio, id) => `/api/tramites/${folio}/archivos/${id}?descargar=1`,

  // Padrón
  padron: () => peticion("/padron"),
  agregarAlumno: (datos) => json("/padron", datos),
  eliminarAlumno: (id) => peticion(`/padron/${id}`, { method: "DELETE" }),
  cargarPadron: (archivo) => formulario("/padron/cargar", { archivo }),
  revisarDepuracion: () => peticion("/padron/depurar"),
  depurarPadron: () => json("/padron/depurar", { confirmar: true }),
  verVigencia: () => peticion("/ajustes/vigencia"),
  guardarVigencia: (anios_vigencia) => json("/ajustes/vigencia", { anios_vigencia }, "PUT"),
};
