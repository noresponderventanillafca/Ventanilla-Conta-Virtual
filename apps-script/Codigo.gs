/**
 * Puente de correo para la Ventanilla Virtual.
 *
 * Existe porque los servidores gratuitos bloquean los puertos de correo
 * saliente (25, 465, 587). Apps Script responde por HTTPS, que nunca se
 * bloquea, y envía con la cuenta de Google que publica el script.
 *
 * CÓMO PUBLICARLO
 *   1. script.google.com → Nuevo proyecto → pega este archivo.
 *   2. Configuración del proyecto → Propiedades del script → agrega
 *      CLAVE_COMPARTIDA con una cadena larga y aleatoria.
 *      No la escribas aquí: este archivo puede acabar en el repositorio.
 *   3. Implementar → Nueva implementación → Aplicación web.
 *        Ejecutar como:    Yo
 *        Quién tiene acceso: Cualquier usuario
 *   4. Autoriza el permiso de enviar correo cuando lo pida.
 *   5. Copia la URL que termina en /exec.
 *
 * "Cualquier usuario" es necesario para que el servidor pueda llamarlo sin una
 * sesión de Google. Por eso la clave compartida no es opcional: sin ella,
 * quien descubra la URL podría enviar correos desde tu cuenta.
 *
 * LÍMITE: una cuenta de Gmail gratuita permite 100 destinatarios al día;
 * una de Google Workspace, 1500. La respuesta incluye cuántos quedan.
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return _responder(400, { error: 'Petición sin contenido.' });
    }

    var datos = JSON.parse(e.postData.contents);

    var esperada = PropertiesService.getScriptProperties()
      .getProperty('CLAVE_COMPARTIDA');
    if (!esperada) {
      return _responder(500, {
        error: 'Falta CLAVE_COMPARTIDA en las propiedades del script.'
      });
    }
    // Comparación de longitud constante: una comparación normal filtra, por el
    // tiempo que tarda, cuántos caracteres del principio son correctos.
    if (!_igualdadSegura(String(datos.clave || ''), esperada)) {
      return _responder(403, { error: 'Clave incorrecta.' });
    }

    var destinatarios = [].concat(datos.para || []);
    if (destinatarios.length === 0) {
      return _responder(400, { error: 'Sin destinatarios.' });
    }
    if (!datos.asunto || !datos.cuerpo) {
      return _responder(400, { error: 'Falta el asunto o el cuerpo.' });
    }

    var restantes = MailApp.getRemainingDailyQuota();
    if (restantes < destinatarios.length) {
      return _responder(429, {
        error: 'Cuota diaria agotada.',
        restantes: restantes
      });
    }

    MailApp.sendEmail({
      to: destinatarios.join(','),
      subject: datos.asunto,
      body: datos.cuerpo,
      name: datos.remitente || 'Ventanilla Virtual'
    });

    return _responder(200, {
      enviado: destinatarios.length,
      restantes: MailApp.getRemainingDailyQuota()
    });
  } catch (error) {
    return _responder(500, { error: String(error) });
  }
}

/** Para comprobar desde el navegador que el script está publicado. */
function doGet() {
  return _responder(200, {
    estado: 'activo',
    restantes: MailApp.getRemainingDailyQuota()
  });
}

function _responder(codigo, cuerpo) {
  cuerpo.codigo = codigo;
  return ContentService
    .createTextOutput(JSON.stringify(cuerpo))
    .setMimeType(ContentService.MimeType.JSON);
}

function _igualdadSegura(a, b) {
  if (a.length !== b.length) return false;
  var diferencia = 0;
  for (var i = 0; i < a.length; i++) {
    diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diferencia === 0;
}
