# Puente de correo con Google Apps Script

Alternativa de último recurso cuando el servidor bloquea los puertos SMTP y los
servicios de correo transaccional no dejan registrarse. Funciona por HTTPS y
envía con una cuenta de Google.

## Publicarlo

1. Entra a [script.google.com](https://script.google.com) con la cuenta desde la
   que quieras enviar y crea un proyecto nuevo.
2. Pega el contenido de `Codigo.gs`.
3. **Configuración del proyecto → Propiedades del script → Agregar propiedad**:
   - Nombre: `CLAVE_COMPARTIDA`
   - Valor: una cadena larga y aleatoria. Guárdala, la vas a necesitar.
4. **Implementar → Nueva implementación → Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
5. Autoriza el permiso de enviar correo. Google mostrará una advertencia de
   "aplicación no verificada": entra en *Configuración avanzada → Ir a (nombre
   del proyecto)*. Es normal en scripts propios.
6. Copia la URL que termina en `/exec`.

Para comprobar que quedó, abre esa URL en el navegador. Debe responder algo como
`{"estado":"activo","restantes":100,"codigo":200}`.

## Conectarlo al sistema

En Render:

```
CORREO_PROVEEDOR=google
CORREO_API_URL=      (la URL que termina en /exec)
CORREO_API_CLAVE=    (la misma CLAVE_COMPARTIDA del script)
CORREO_REMITENTE=    (la dirección de la cuenta que publicó el script)
```

## Qué vigilar

**El límite diario.** Una cuenta de Gmail gratuita permite 100 destinatarios al
día; una de Workspace, 1500. Con el esquema de avisos actual, un trámite genera
cinco o seis, así que 100 dan para unos quince trámites diarios. Suficiente para
200 alumnos; ajustado si algún día son 800 y coinciden muchos el mismo día.

**La clave compartida.** Es lo único que separa tu cuenta de que cualquiera
envíe correos desde ella. Si se filtra, cámbiala en las propiedades del script y
en Render.

**Cada cambio del script necesita una implementación nueva.** Editar el código
no basta: hay que ir a *Implementar → Gestionar implementaciones* y crear una
versión, o la URL seguirá sirviendo la anterior.
