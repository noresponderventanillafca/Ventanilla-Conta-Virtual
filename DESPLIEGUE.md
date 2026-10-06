# Despliegue gratuito y funcional

Pensado para una prueba de dos años sin costo, con los archivos a salvo. La
única pieza que el plan gratuito de Render no puede sostener son los archivos
subidos, y eso se resuelve sacándolos a Cloudflare R2.

| Pieza | Servicio | Gratuito |
|---|---|---|
| Frontend | Netlify | Sí |
| Backend | Render (plan gratuito) | 750 horas/mes, duerme a los 15 min |
| Base de datos | Aiven MySQL | 1 GB, 76 conexiones, sin caducidad |
| Archivos | Cloudflare R2 | 10 GB, sin salida de datos facturada |
| Monitor | cron-job.org o UptimeRobot | Sí |

Con 800 alumnos y comprobantes de medio mega, 10 GB alcanzan para varios años.
La base de datos guarda solo texto: 1 GB es de sobra.

---

## 1. Archivos en Cloudflare R2

Crea una cuenta en Cloudflare, entra a **R2**, crea un bucket llamado
`ventanilla` y genera un token de API con permiso de lectura y escritura sobre
él.

Guarda tres datos: el **endpoint**
(`https://<id-de-cuenta>.r2.cloudflarestorage.com`), la **clave de acceso** y el
**secreto**.

Deja el bucket **privado**. Los archivos no se sirven nunca con una URL pública:
se leen desde el backend, que es donde se comprueba quién puede verlos. Un
comprobante lleva datos bancarios de un alumno.

## 2. Base de datos en Aiven

Crea un servicio **MySQL** en el plan gratuito. De la consola copia la URI y
ármala así:

```
DATABASE_URL=mysql+pymysql://avnadmin:PASSWORD@HOST:PUERTO/defaultdb?charset=utf8mb4
```

Aiven exige SSL. Descarga el certificado CA desde la consola y agrégalo:
`&ssl_ca=/ruta/al/ca.pem`. Si lo omites la conexión puede ser rechazada.

Aiven apaga los servicios gratuitos tras un periodo largo de inactividad,
avisando antes por correo. Con uso diario no ocurre.

## 3. Backend en Render

Conecta el repositorio. Después, **antes de desplegar**, entra a
**Settings → Build & Deploy** y pon:

```
Root Directory:  backend
Build Command:   pip install -r requirements.txt
Start Command:   gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --timeout 60
Health Check Path: /api/salud
```

El **Root Directory** es lo que más se olvida. Sin él, Render busca
`requirements.txt` en la raíz del repositorio, no lo encuentra y el despliegue
falla con `Could not open requirements file`.

El `render.yaml` de la raíz ya trae todo esto, pero **solo se aplica si creaste
el servicio como *Blueprint***. Si lo creaste a mano desde el panel, hay que
configurarlo ahí.

Configura estas variables en el panel:

```
PYTHON_VERSION=3.12.9
FLASK_ENV=production
SECRET_KEY=              (deja que Render la genere)
DATABASE_URL=            (la de Aiven)

ALMACENAMIENTO=s3
S3_ENDPOINT=https://<id-de-cuenta>.r2.cloudflarestorage.com
S3_CLAVE=
S3_SECRETO=
S3_BUCKET=ventanilla
S3_REGION=auto

URL_PUBLICA=https://tu-sitio.netlify.app
FRONTEND_ORIGIN=https://tu-sitio.netlify.app

SMTP_HOST=smtp.gmail.com
SMTP_PUERTO=587
SMTP_USUARIO=
SMTP_PASSWORD=           (contraseña de aplicación, no la normal)
CORREO_REMITENTE=
```

`URL_PUBLICA` es la del **frontend**, no la del backend: es la que va en los
enlaces de los correos. Si la pones mal, todos salen con enlaces rotos.

Fija `PYTHON_VERSION`: si lo dejas al criterio de Render, elegirá la versión más
nueva que exista ese día —hoy 3.14— y algunas bibliotecas todavía no tienen
paquetes compilados para ella. El archivo `backend/.python-version` ya lo deja
anotado, pero la variable es más explícita.

Crea las tablas una sola vez, desde la consola de Render (Shell):

```bash
python -m scripts.seed
```

## 4. Frontend en Netlify

Conecta el repositorio, raíz en `frontend/`. `netlify.toml` ya trae el comando
de compilación.

**Edita `frontend/public/_redirects`** y cambia `TU-BACKEND.onrender.com` por la
URL real de Render.

Ese archivo es lo que hace que el inicio de sesión funcione. Netlify reenvía
`/api` al backend, así que para el navegador todo es el mismo sitio y la cookie
de sesión viaja normal. Sin él, Netlify y Render son dominios distintos, la
cookie `SameSite=Lax` no se envía y nadie puede entrar — aunque en desarrollo
todo funcione, porque el proxy de Vite hace exactamente lo mismo.

## 5. Mantener despierto el backend

Render duerme el servicio tras 15 minutos sin tráfico, y despertarlo tarda entre
30 y 60 segundos. Un alumno que entra por la mañana esperaría casi un minuto
antes de ver la pantalla de acceso.

Registra en **cron-job.org** o **UptimeRobot** una revisión cada 10 minutos a:

```
https://TU-BACKEND.onrender.com/api/salud
```

Las 750 horas mensuales del plan gratuito alcanzan para un servicio despierto
todo el mes (unas 730 horas), siempre que sea **un solo servicio**.

Tiene que ser esa ruta y no `robots.txt`: Render responde ese archivo por su
cuenta mientras el servicio duerme, así que no lo despierta.

`/api/salud` además dice si la base y el almacén de archivos responden, lo que
sirve para enterarse de un problema antes que los usuarios.

### Si los correos no salen

Síntoma típico en un servidor gratuito: el puerto 587 da `TimeoutError` y el 465
tampoco entrega nada. **Muchos proveedores bloquean los puertos de correo
saliente** para evitar spam, y no hay configuración que lo evite.

La salida es enviar por HTTPS en vez de SMTP. Hay tres proveedores soportados,
y lo difícil no es enviar sino **conseguir que te activen la cuenta**: varios
revisan a mano los registros hechos con un correo de dominio gratuito. Usa el
que logres activar; los tres permiten verificar una sola dirección en lugar de
exigir un dominio propio.

| Proveedor | Gratis | `CORREO_API_CLAVE` |
|---|---|---|
| Google Apps Script | 100/día con Gmail, 1500 con Workspace | la clave que tú inventas |
| Mailjet | 200/día, 6 000/mes | `api_key:api_secret`, con dos puntos en medio |
| Brevo | 300/día | la clave tal cual |
| Resend | 100/día, 3 000/mes | la clave tal cual |

**Google Apps Script** es el más confiable de los cuatro para este caso, porque
no depende de que ningún proveedor te apruebe la cuenta: usas tu propia cuenta
de Google. Las instrucciones están en `apps-script/LEEME.md`. Necesita una
variable extra:

```
CORREO_PROVEEDOR=google
CORREO_API_URL=      (la URL del script, termina en /exec)
CORREO_API_CLAVE=    (la clave compartida que pusiste en el script)
```

En los tres: verifica primero la dirección de remitente, genera la clave, y en
Render pon

```
CORREO_PROVEEDOR=mailjet        (o brevo, o resend)
CORREO_API_CLAVE=
CORREO_REMITENTE=               (la dirección verificada, idéntica)
```

Las variables `SMTP_*` dejan de usarse. `/api/salud` muestra por dónde se está
enviando.

El error más común es olvidar la verificación del remitente: la API responde con
un rechazo que el sistema te muestra completo, incluyendo el código y el motivo.

Con el esquema de avisos actual, un trámite genera cinco o seis correos, así que
cualquiera de los tres planes sobra.

### Si `/api/salud` falla en los archivos

El mensaje dice exactamente qué revisar. Los dos tropiezos más comunes:

**El endpoint.** Debe ser el de la **cuenta**,
`https://<id-de-cuenta>.r2.cloudflarestorage.com`, sin el nombre del bucket al
final. El panel de Cloudflare muestra bien a la vista la URL con el bucket
incluido, así que copiarla completa es el error más común: produce un 403 que
parece de permisos sin serlo. El sistema recorta esa parte para seguir
funcionando, pero `/api/salud` lo reporta hasta que corrijas la variable.

**El permiso del token.** Tiene que ser **Object Read & Write**. Un token de
solo lectura deja pasar la comprobación de conexión pero falla al subir el
primer comprobante.

### Variables que suelen quedarse vacías

`SECRET_KEY`, `URL_PUBLICA` y `FRONTEND_ORIGIN` no dan error al configurarlas,
pero las tres importan:

- **Sin `SECRET_KEY`** el sistema ya no arranca en producción, a propósito. Antes
  funcionaba con una clave por omisión escrita en el repositorio, y cualquiera
  que la viera podía firmarse una cookie de coordinación.
- **Sin `URL_PUBLICA`** los correos salen con enlaces rotos. `/api/salud` lo
  reporta.
- **Sin `FRONTEND_ORIGIN`** el navegador puede rechazar peticiones si algún día
  se deja de usar el proxy de Netlify.

## 6. Comprobar

1. Abre `https://TU-BACKEND.onrender.com/api/salud`. Debe decir `ok` en base de
   datos y en archivos.
2. Abre el sitio de Netlify: aparece la pantalla de acceso.
3. Entra con la coordinación y cambia la contraseña temporal. Si la pantalla
   carga pero el login falla, revisa `_redirects`.
4. En Ajustes, usa *Enviar correo de prueba*. Si falla, el mensaje dice por qué.
5. Crea un trámite completo de prueba y descarga el documento final.
6. **Fuerza un redespliegue en Render y vuelve a descargar ese documento.** Es
   la prueba de que los archivos sobreviven, que es el motivo de todo esto.

---

## Rotar credenciales

Si alguna clave se compartió por error —en una captura de pantalla, un correo o
un commit—, hay que rotarla; no basta con borrarla de donde se vio:

- **R2**: crea un token nuevo en *Manage API tokens* y elimina el anterior.
- **Gmail**: revoca la contraseña de aplicación en la cuenta de Google y genera
  otra.
- **Aiven**: cambia la contraseña del usuario `avnadmin` desde la consola.
- **Cloudflare**: elimina el API token expuesto.

Después actualiza las variables en Render. Toma diez minutos y es más barato que
averiguar después quién entró.

## Respaldos

Aiven respalda la base, pero son sus respaldos: si se pierde la cuenta, se
pierden con ella. El script deja una copia comprimida en R2, que es otro
proveedor:

```bash
python -m scripts.respaldo
```

Conserva las ocho copias más recientes y borra las anteriores. Prográmalo
semanalmente en cron-job.org, o córrelo a mano.

Prueba una restauración al menos una vez. Un respaldo que nunca se restauró no
es un respaldo.

---

## Qué vigilar durante los dos años

**Las horas de Render.** 750 al mes dan para un servicio despierto. Si algún día
agregan un segundo servicio, se acaban antes de fin de mes y el sistema se
apaga.

**El espacio en R2.** 10 GB. Revisa el consumo cada semestre. La depuración por
antigüedad del padrón libera espacio al borrar archivos de alumnos vencidos.

**Que los planes gratuitos cambian.** Los tres proveedores pueden modificar sus
términos. Vale la pena revisarlo una vez al año y tener presente que el respaldo
en R2 es lo que permitiría mudarse sin perder nada.

**Que el correo sale desde una cuenta de Gmail.** Funciona, pero un alumno puede
dudar de un correo institucional que llega de un `@gmail.com`. Si la DGTI
termina dando una dirección del dominio `uv.mx`, solo hay que cambiar variables.

## Si al cabo de los dos años deciden quedarse

Lo que habría que resolver, en orden: alojamiento propio o de pago para no
depender de planes gratuitos, correo del dominio institucional, respaldos
dentro de la infraestructura de la UV, y la firma electrónica de los documentos
emitidos. Nada de eso obliga a reescribir el sistema: son variables de entorno y
un servidor distinto.
