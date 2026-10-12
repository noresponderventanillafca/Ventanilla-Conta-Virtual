# Ventanilla Virtual — Contaduría Virtual, FCA UV 
 
Portal de solicitud y seguimiento de documentos escolares. Sustituye la cadena
de correos entre alumno, Secretaría, Administración y Coordinación por un
expediente con folio, estado y bitácora.

## El problema que resuelve

El proceso por correo genera varios hilos por un mismo trámite, omite
destinatarios, obliga a preguntar el avance, y pierde el historial. Aquí la
unidad no es el correo sino el trámite: el correo queda como notificación que
el sistema genera, con enlace y **nunca con adjunto**, para que nadie responda
por esa vía.

## Decisiones de diseño que conviene no deshacer

**Un solo campo define el recorrido.** `tipos_documento.momento_pago` tiene tres
valores y de ahí se derivan las etapas, los actores y las pantallas. No hay tres
flujos programados por separado: un cuarto tipo de trámite es un valor más, no
código nuevo. Vive en `app/dominio/etapas.py`.

**La bitácora es de solo inserción.** `eventos_tramite` nunca se edita ni se
borra. El `etapa_idx` del trámite es una copia para consultar rápido; la verdad
histórica está en los eventos. De ahí sale gratis quién hizo qué, cuándo, y
cuánto lleva detenido cada trámite.

**Una cuenta por persona, nunca una por cargo.** Administración son tres
personas y Secretaría dos en turnos distintos; si compartieran una cuenta, la
bitácora diría siempre «Secretaría» y no serviría para aclarar nada. Cada quien
entra con su usuario y sus acciones quedan firmadas con su nombre.

Relevar un cargo es **dar de baja a una persona y dar de alta a otra**, no
heredar un acceso: si la nueva coordinadora entrara con la cuenta de la
anterior, todo lo que hiciera quedaría firmado con el nombre de quien ya se fue.
Las personas se dan de baja, nunca se borran, porque sus eventos siguen en la
bitácora y un evento sin autor no se puede aclarar. El sistema impide dar de
baja a la única coordinación activa: nadie podría volver a administrar usuarios.

El identificador del personal es **de puras letras**. Los alumnos entran con
matrícula, que lleva dígitos, así que las dos poblaciones no pueden colisionar.

Las colas son del rol, no de la persona: cuando un pago llega a validación, el
aviso va a los tres administradores y lo atiende quien pueda. Si dos intentan la
misma acción, la segunda falla sola, porque la etapa ya cambió.

**Nadie opera con una contraseña compartida.** El personal se da de alta con
una clave temporal y el servidor le bloquea toda la API salvo cambiarla. El
bloqueo es del lado del servidor a propósito: dejarlo solo en la interfaz no
protege, porque la API es accesible directamente.

**La recuperación no delata quién existe.** `/auth/password/olvide` responde lo
mismo exista o no la cuenta; si el mensaje cambiara, cualquiera podría averiguar
qué matrículas están registradas probándolas una por una. Los enlaces llevan
dentro una huella del hash actual, así que dejan de servir en cuanto la
contraseña cambia: uno ya usado, o uno viejo que siga en la bandeja, no vale.

**La CURP no es contraseña.** Sus primeros 10 caracteres se derivan del nombre y
la fecha de nacimiento: cualquier compañero de grupo podría calcularlos. Se usa
solo para probar que la persona está en el padrón; el enlace de activación va al
correo institucional y el alumno define su propia contraseña.

**El trámite congela sus condiciones al nacer.** Costo, recorrido
(`momento_pago`) y concepto de depósito se copian al trámite cuando se crea, y
las etapas se leen de ahí, nunca del catálogo vigente. Sin eso, editar un tipo
de documento cambiaría el recorrido de los trámites en curso: uno que iba en la
etapa 2 de 3 pasaría a ser la 2 de 4, que es otra cosa. Es lo que hace seguro
que la Coordinación edite el catálogo cuando quiera.

**Los documentos se desactivan, nunca se borran.** Hay trámites que apuntan a
ellos y un expediente sin tipo de documento es un expediente roto. Desactivado
significa que ya no se ofrece, no que desaparezca.

**Quién interviene se deriva del momento de pago**, no es un campo aparte: dos
campos que pueden contradecirse acaban contradiciéndose. Sin costo lo atiende
solo Secretaría; con pago entra Administración.

**El alumno ve la descripción y una muestra antes de pagar.** Con pago por
adelantado, pedir el documento equivocado no tiene vuelta atrás automática:
prevenir la confusión sale más barato que resolver una devolución.

**Un documento, un pago, un recibo.** Administración emite un recibo por cada
documento, así que no existe la noción de cantidad: dos constancias son dos
solicitudes con dos depósitos distintos. Eso hace que el monto esperado sea
siempre uno solo y la verificación automática no dependa de interpretar nada.

**El concepto del depósito no lleva folio.** Se arma con la matrícula y la
clave del documento (`S23012345 CONST`) y se muestra desde que el alumno elige
el documento, antes de pagar. En la práctica los alumnos ya se saben el pago y
depositan de memoria, antes de entrar al sistema: un concepto que dependiera de
un folio generado al solicitar llegaría siempre tarde. Por eso `tipos_documento`
tiene `clave`, y por eso no hay paso de borrador.

**El antiduplicado vive en la base.** `pagos.referencia_operacion` tiene índice
`UNIQUE`, más el hash del archivo. Por eso se pide el número de operación
completo y no cuatro dígitos, que colisionarían entre trámites legítimos.

**No se pregunta el monto depositado.** El alumno teclearía lo que la pantalla
le acaba de decir, así que compararlo contra lo esperado siempre pasa y no prueba
nada: el monto real está en la imagen del comprobante y solo una persona puede
leerlo. Se piden únicamente los datos que el sistema no puede conocer por su
cuenta —fecha y número de operación—, y la pantalla del administrador muestra en
grande cuánto debe decir el comprobante.

**El administrador solo ve trámites con dinero de por medio.** Un trámite sin
costo nunca pasa por Administración; mostrárselo no era solo ruido, era exponerle
el expediente de un alumno que no le compete. El filtro está en `_visibles()` y
también en `puede_ver()`, para que tampoco se abra escribiendo la URL.

**Administración verifica; Secretaría sube.** Administración coteja la
referencia declarada contra el recibo que tiene a la mano y confirma que
corresponde. No sube archivos: el recibo oficial se genera fuera del sistema y
se entrega en físico a Secretaría, que lo escanea y lo sube junto con el
documento, en un solo paso. Pedirle además al administrador que lo subiera
duplicaría el trabajo y dejaría el trámite detenido esperando un archivo que ya
viaja por otro lado.

Una casilla de «el depósito aparece en el estado de cuenta» le pedía afirmar
algo que no puede saber, y dejaba un rastro falso en la auditoría; por eso no
existe. Lo que afirma queda dicho en el propio botón: «La referencia coincide».
El sistema sigue verificando solo lo que puede: duplicados y fechas.

En la entrega, los dos archivos son obligatorios cuando hubo pago. Sin recibo el
alumno se queda sin comprobante; sin documento el trámite quedaría «entregado»
sin nada que entregar.

**Los archivos se ven sin descargarlos.** Se sirven en línea con
`Content-Disposition: inline`, y con `?descargar=1` como adjunto. Obligar a
descargar el comprobante para poder leerlo convertía cada validación en varios
pasos fuera del sistema, que es justo donde el proceso se escapa de la
plataforma. Como los suben los usuarios, van con `nosniff` y una CSP restrictiva
para que un PDF con scripts no se ejecute en el contexto del sitio.

**Todo lo pulsable tiene forma de botón.** Un texto suelto no comunica que sea
accionable, y en pantalla táctil el área para acertarle es diminuta. Los enlaces
conservan la etiqueta `<a>` —navegan, abren en otra pestaña o descargan— pero se
ven igual; para eso está `BotonEnlace`. Ningún control de solo ícono baja de
36px de lado.

**La identidad y el estado usan familias de color distintas.** Los colores
institucionales de la Facultad —azul `#004B8D`, cian `#00BECD`, amarillo
`#FFC415` y verde `#0D934E`— viven en la barra superior, la franja de chevrones
y los acentos: son marca y no significan nada. El semáforo de estado es aparte y
no se toca.

El amarillo institucional nunca se usa como fondo de una etiqueta: se
confundiría con el ámbar de «en atención» y el semáforo dejaría de leerse. Toda
la presencia de marca se concentra en la franja de chevrones, para que el resto
de la interfaz pueda quedarse sobria.

**El semáforo tiene cuatro colores y ninguno decora.** Azul: necesita que
alguien lo tome (nuevo, o esperando al alumno). Ámbar: alguien lo está
atendiendo. Rojo: fuera de plazo o devuelto para corrección. Verde: concluido.

El rojo es el que hay que reservar con disciplina. Si el estado normal ya lleva
color, un retraso pintado del mismo tono desaparece, y avisar de los retrasos es
la razón de ser del tablero. Todas las píldoras llevan además texto e ícono, así
que el estado se entiende sin depender del color.

**Las listas se ordenan por urgencia, no por fecha.** Fuera de plazo primero,
después lo que espera a alguien, y lo concluido al fondo y atenuado. Una lista
por fecha obliga a recorrerla entera para encontrar lo que hay que atender.
La lógica vive en `ordenarPorUrgencia` y `estadoDe` (`TablaTramites.jsx`), en un
solo lugar, para que un trámite no se vea distinto según quién lo mire.

**Los alumnos tienen vigencia.** Pasados los años que dure la carrera (6 por
omisión, configurable en Ajustes), pierden el acceso a la ventanilla y lo que
necesiten se atiende por correo. La depuración se ejecuta a mano desde Padrón,
con vista previa: borrar datos de alumnos no debe pasar sin que alguien vea
antes a quiénes alcanza.

Y distingue dos casos, porque no son lo mismo:

- **Nunca hizo un trámite** → se elimina por completo. No hay nada que conservar
  y su nombre y correo no tienen por qué seguir ahí.
- **Sí hizo trámites** → pierde el acceso y se borran sus archivos
  (comprobantes con datos bancarios, documentos escaneados), pero el registro
  del trámite se conserva: folio, tipo, fechas y quién lo atendió son
  contabilidad de la facultad, y borrarlos dejaría huecos imposibles de aclarar.
  La depuración queda anotada en la bitácora del trámite.

**El padrón acepta Excel además de CSV.** Es lo que evita el problema de
codificación: exportar a CSV desde Excel obliga a elegir «CSV UTF-8» y, si se
elige mal, los acentos y la ñ llegan corrompidos. Con .xlsx no hay que elegir
nada. También se puede dar de alta de uno en uno: para un alumno que llega tarde
o al que se le corrigió la matrícula, preparar una hoja es más trabajo que el
alta misma.

**La vista completa del programa es de la Coordinación.** Secretaría y
Administración ven solo los trámites en los que intervinieron, más lo que les
toca ahora. Repartir la vista completa daría a cada persona acceso a expedientes
de alumnos que nunca tocó, sin que nadie lo necesite para trabajar, y diluiría
el papel de supervisión. La regla está en `/tramites/historial` y en
`puede_ver()`, para que tampoco se abra escribiendo la URL.

Efecto secundario a vigilar: si un alumno le pregunta a Secretaría por un
trámite que aún está con Administración, ella no podrá consultarlo. En principio
no hace falta, porque el alumno lo ve en su propio portal. Si resulta molesto en
la práctica, la solución es una búsqueda puntual por folio, no devolverle la
lista completa.

**Las observaciones son parte de la solicitud, no de la conversación.** El
alumno escribe al pedir el documento a qué dependencia va dirigido o para qué lo
necesita, y eso se guarda en el trámite y se muestra destacado arriba del
expediente. Como comentario quedaría enterrado entre los demás y Secretaría
podría elaborar el documento sin verlo.

**Cada rol tiene su historial.** La bandeja solo muestra lo pendiente; sin
historial, quien atiende pierde de vista a los alumnos que ya pasaron por sus
manos y no tiene dónde consultar una aclaración posterior. `/tramites/historial`
se calcula desde la bitácora. Por eso la bandeja ya no repite la lista completa:
la bandeja es lo pendiente, el historial es lo atendido.

**Las rutas verifican el rol.** `SoloRol` en `App.jsx`. Sin eso, quien llegara a
`/tramites` porque el navegador recordó la URL de otra sesión veía la pantalla
del alumno con su propio nombre en el lugar de la matrícula. El detalle del
trámite es la excepción a propósito: es la misma pantalla para los cuatro roles
y lo que cambia es la zona de acción.

**La coordinación ve todo por estructura.** No depende de que alguien la ponga
en copia.

## Puesta en marcha

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # ajusta DATABASE_URL y SECRET_KEY
```

Crea la base con la codificación correcta. El `4` de `utf8mb4` no es opcional:
sin él se rompen la ñ y los acentos.

```sql
CREATE DATABASE ventanilla CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```bash
python -m scripts.seed
flask --app wsgi run
```

No corras Alembic todavía. Mientras el esquema siga ajustándose, `seed.py` crea
las tablas directamente y no hay datos que perder. Genera la primera migración
cuando el esquema esté congelado.

### Si cambia el esquema

Verás un error tipo `Unknown column 'tipos_documento.clave' in 'field list'`:
significa que tus tablas se crearon con una versión anterior de los modelos.
Con datos de prueba, se rehacen:

```bash
python -m scripts.seed --reiniciar
```

Pide confirmación escribiendo `BORRAR`, porque elimina todas las tablas.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite hace proxy de `/api` al backend, así que la cookie de sesión funciona sin
configurar CORS en desarrollo.

## Estructura

```
backend/
  app/
    dominio/etapas.py       ← la máquina de estados: empieza a leer aquí
    dominio/servicios.py    ← transiciones; todo cambio pasa por acá
    models/                 ← esquema; los comentarios explican el porqué
    api/                    ← auth, catálogo, trámites, padrón, ajustes
    seguridad.py            ← permisos por rol y filtro por programa
    almacenamiento.py       ← archivos fuera del directorio público
  scripts/seed.py
frontend/
  src/api/cliente.js        ← todas las llamadas al backend
  src/tokens.js             ← paleta y regla de uso del color
  src/componentes/          ← LineaTiempo, Comentarios, TablaTramites, ui
  src/paginas/              ← las ocho pantallas, conectadas a la API
ejemplos/padron-ejemplo.csv ← formato esperado para la carga del padrón
```

## Si sale `ECONNREFUSED` en la consola de Vite

El frontend corre pero el backend no responde. Son **dos terminales a la vez**:
Flask en una, Vite en la otra. Revisa la terminal de Flask: si muestra un error
de columna desconocida, falta `python -m scripts.seed --reiniciar`.

El proxy apunta a `127.0.0.1` y no a `localhost` a propósito: en Windows con Node
moderno, `localhost` se resuelve primero a IPv6 y Flask solo escucha en IPv4, lo
que produce ese mismo error aunque el backend sí esté corriendo.

## Si el navegador sale en blanco

Ya no debería: hay una barrera de errores que muestra el detalle técnico en
pantalla en lugar de dejarla vacía, y un mensaje explícito cuando el backend no
responde. Si aun así ves blanco, abre la consola del navegador (F12): un import
que no existe tumba el módulo entero sin dejar rastro visible.

## Prueba de humo

```bash
cd backend
python -m scripts.prueba_humo
```

Recorre los tres flujos completos contra una base temporal y verifica también
las reglas de permisos. **Córrelo después de cada cambio al modelo o a la API.**
Es lo que detecta los residuos que Python no ve: una consulta que filtra por una
columna eliminada compila sin problema y solo revienta cuando alguien abre esa
pantalla.

## Comprobado

Las reglas del dominio están verificadas de extremo a extremo contra la base:
monto que no coincide se rechaza, operación duplicada la bloquea el índice
`UNIQUE`, aprobar sin las dos confirmaciones humanas lanza error, y un trámite
sin costo nunca incluye al administrador entre sus actores. Además: el concepto
existe en el catálogo antes de que haya trámite, dos solicitudes del mismo
documento conviven con el mismo concepto y se distinguen por el número de
operación, y un depósito por el doble del costo ya no se acepta.

El frontend compila limpio (`npm run build`) y el bundle se sirve correctamente.

## Notificaciones

Dos reglas que sostienen el proyecto y conviene no deshacer.

Los correos llevan **enlace, nunca adjunto**. Si el archivo viaja por correo, la
gente responde por correo y vuelve la cadena de hilos que la ventanilla vino a
eliminar.

La **Coordinación recibe aviso de todo**, porque supervisa el proceso completo
y necesita enterarse sin estar pendiente del tablero. Es una preferencia por
usuario (`notificaciones_todas`), configurable desde Ajustes, no una regla fija:
si la bandeja se le llena puede apagarla y le queda el tablero, que sigue
mostrándolo todo.

Cuántos correos recibe cada quien en un trámite completo:

- **Alumno: dos.** Cuando su solicitud queda registrada y cuando su documento
  está listo. Más una excepción: si Administración devuelve su pago. Sin ese
  aviso se quedaría esperando un documento que nunca va a llegar.
- **Secretaría, Administración y Coordinación: uno**, al crearse el trámite. No
  se avisa en cada cambio de etapa: un correo por movimiento termina en que
  nadie los lee. El avance se sigue desde la ventanilla.
- **A Administración solo si hay pago.** Un trámite sin costo nunca pasa por
  ahí, y de hecho ni siquiera puede verlo.
- **Comentarios:** solo se avisa al alumno, y solo si comentó alguien más. El
  personal los ve al abrir el trámite; el alumno no está pendiente del sistema.

Nunca se notifica a quien causó el evento. La preferencia
`notificaciones_todas` viene apagada: encenderla en Ajustes hace que esa persona
reciba aviso de cada movimiento, a costa de muchos más correos.

Consecuencia a vigilar: Secretaría se entera al inicio, no cuando el trámite
llega a su cola. En un trámite con línea de captura eso pueden ser días. Su
bandeja lo muestra, pero si en la práctica se les pasa, la solución es volver a
avisar al cambiar de etapa. El
envío corre en segundo plano y un fallo de SMTP no tumba un trámite ya
guardado. Sin `SMTP_HOST` configurado, los correos se escriben al log: puedes
probar el flujo completo sin correo institucional.

## Qué falta (`app/notificaciones.py`, aún no existe).
- Generación automática del PDF con folio y QR de verificación. Hoy Secretaría
  sube el documento ya firmado, que sí funciona; falta que el sistema lo genere.
- Conciliación por lote contra el estado de cuenta. A 800 alumnos, validar
  pagos uno por uno se vuelve el trabajo de tiempo completo del administrador.
- Tabla de días festivos: `dias_habiles_desde` hoy solo descuenta fines de semana.
- Respaldo diario de base y archivos, en otro servidor, con restauración probada.

## El escudo de la UV

Va en `frontend/public/`, con estos nombres exactos:

```
public/escudo-uv-blanco.png   versión blanca, para la barra azul y el acceso
public/escudo-uv.png          versión a color, para fondos claros
```

PNG con fondo transparente (o SVG, cambiando la extensión en
`src/componentes/Escudo.jsx`), de al menos 200px de alto. Mientras no existan,
la interfaz muestra un recuadro punteado en su lugar y nada se rompe.

Pide los archivos oficiales a la Facultad o a Comunicación Universitaria, no los
saques de una búsqueda de imágenes: suelen estar deformados o desactualizados.
El componente solo controla el alto, para que nunca se estire.

## Correo saliente

Si el servidor bloquea los puertos SMTP —habitual en planes gratuitos— el envío
se hace por HTTPS. Hay cuatro proveedores soportados; el de Google Apps Script
(`apps-script/`) es el único que no depende de que nadie te apruebe una cuenta.


Sin `SMTP_HOST` los avisos se escriben en la consola: puedes recorrer el flujo
completo sin servidor de correo. Ajustes tiene un botón para enviarte una prueba
y verificar la configuración sin provocar un trámite real.

Con Gmail: `smtp.gmail.com`, puerto 587, y una **contraseña de aplicación** —la
contraseña normal de la cuenta no funciona desde 2022, y las contraseñas de
aplicación solo aparecen con la verificación en dos pasos activada.

El puerto decide el protocolo: **587 usa STARTTLS y 465 usa SSL directo**. Si se
mezclan, la conexión se queda esperando un saludo que nunca llega y termina en
`TimeoutError`, que parece un problema de red sin serlo. El código elige el
protocolo según el puerto, así que basta cambiar `SMTP_PUERTO`.

Un timeout también aparece cuando la red bloquea la salida por ese puerto, cosa
común en redes universitarias. Compruébalo antes de revisar el código:

```powershell
Test-NetConnection smtp.gmail.com -Port 587
Test-NetConnection smtp.gmail.com -Port 465
```

Si ninguno conecta, el bloqueo es de la red y no hay configuración que lo
arregle: hace falta pedirle la salida a sistemas, o probar desde otra conexión.

Con Microsoft 365 (`smtp.office365.com`, puerto 587) puede aparecer
`SmtpClientAuthentication is disabled for the Mailbox`: la autenticación básica
está en retirada y muchos buzones la traen deshabilitada sin opción para el
usuario. Habilitarla depende del área de sistemas de la UV, y en todo caso es
una salida temporal. Para producción conviene pedir un relevo SMTP institucional
y una dirección tipo `ventanilla-noreply@uv.mx`: si los correos salen desde la
cuenta de la Coordinación, los alumnos van a responderle ahí y vuelve el
problema que la ventanilla resuelve.

## Despliegue

Ver `DESPLIEGUE.md`. Lo esencial: el frontend llama al backend **a través del
proxy de Netlify** (`frontend/public/_redirects`), no directamente. Así el
navegador ve un solo origen, la cookie de sesión viaja normal y no hay CORS.
Llamar al backend desde otro dominio rompe el inicio de sesión.

Y el plan gratuito de Render **pierde los archivos subidos** en cada reinicio o
redespliegue. Sirve para enseñar el sistema; no para usarlo.

## Antes de producción

- Cambia `SECRET_KEY` por una cadena larga y aleatoria. Los enlaces de
  activación y recuperación se firman con ella.
- Configura `URL_PUBLICA` con el dominio real, o los correos saldrán con
  enlaces rotos.
- Sirve detrás de HTTPS con un servidor WSGI real (gunicorn, waitress en
  Windows). `flask run` es solo para desarrollo.
- Respaldo diario de base y archivos, en otro servidor, con una restauración
  probada al menos una vez.

## Decisión pendiente que no es técnica

Qué ocurre cuando el monto depositado no coincide: ¿complemento, devolución, o
se aplica a otro trámite? El administrador necesita ese botón y necesita saber
qué significa. Sin esa definición, esos casos se saldrán del sistema por
WhatsApp y se pierde la trazabilidad.
