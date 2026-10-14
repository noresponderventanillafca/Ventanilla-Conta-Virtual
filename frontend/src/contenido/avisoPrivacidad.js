/* Aviso de privacidad de la Ventanilla Virtual.
 *
 * ESTE ES EL ÚNICO ORIGEN DEL TEXTO. La pantalla /privacidad lo muestra y el
 * documento AVISO-DE-PRIVACIDAD.md se genera de aquí con
 * `node scripts/generar-aviso.mjs`, para que no acaben diciendo cosas distintas.
 *
 * ANTES DE PUBLICAR: la Coordinación Universitaria de Transparencia, Acceso a
 * la Información y Protección de Datos Personales de la UV tiene que validarlo
 * y registrarlo. Está redactado siguiendo la estructura que la Universidad ya
 * usa en sus otros avisos, pero quien lo autoriza es esa Coordinación, no esta
 * aplicación.
 *
 * Las finalidades y el inventario de datos describen lo que el sistema hace
 * HOY. Si se agrega un campo, una finalidad o un destinatario, hay que
 * actualizarlo aquí y volver a notificarlo: un aviso que no corresponde con el
 * tratamiento real no protege a nadie.
 */

export const RESPONSABLE = {
  nombre: "Universidad Veracruzana",
  area: "Coordinación de la Licenciatura en Contaduría — Modalidad Virtual, "
      + "Facultad de Contaduría y Administración, región Xalapa",
  domicilio: "Circuito Gonzalo Aguirre Beltrán s/n, Zona Universitaria, "
           + "C.P. 91000, Xalapa, Veracruz",
};

export const TRANSPARENCIA = {
  nombre: "Coordinación Universitaria de Transparencia, Acceso a la Información "
        + "y Protección de Datos Personales",
  domicilio: "Calle Guillermo Prieto 103, colonia Dos de Abril, C.P. 91030, "
           + "Xalapa, Veracruz",
  correo: "datospersonales@uv.mx",
  telefono: "(228) 842 1700 ext. 10504 · (228) 841 5920",
  avisos: "https://www.uv.mx/transparencia/infpublica/avisos-privacidad/",
};

export const ACTUALIZADO = "Pendiente de validación por la Coordinación Universitaria de Transparencia";

/* El aviso simplificado: lo que se muestra donde se recaban los datos. */
export const SIMPLIFICADO = {
  titulo: "Aviso de privacidad simplificado",
  parrafos: [
    `La ${RESPONSABLE.nombre}, a través de la ${RESPONSABLE.area}, es responsable `
    + "del tratamiento de los datos personales que se recaban en la Ventanilla "
    + "Virtual.",

    "Tus datos se usan únicamente para recibir y atender tu solicitud de "
    + "documentos escolares: comprobar que perteneces al padrón del programa, "
    + "verificar el pago cuando el trámite tiene costo, elaborar y entregarte el "
    + "documento, y avisarte por correo cuando esté listo.",

    "No se utilizan para ninguna finalidad distinta ni se transfieren a "
    + "terceros, salvo requerimiento de autoridad competente debidamente fundado "
    + "y motivado.",
  ],
  cierre: "Puedes consultar el aviso de privacidad integral en la pantalla "
        + "«Aviso de privacidad» de este sistema.",
};

/* El aviso integral: la versión completa. */
export const INTEGRAL = [
  {
    titulo: "Quién es responsable de tus datos",
    parrafos: [
      `La ${RESPONSABLE.nombre}, con domicilio en ${RESPONSABLE.domicilio}, a `
      + `través de la ${RESPONSABLE.area}, es la responsable del tratamiento de `
      + "los datos personales que recaba la Ventanilla Virtual.",
    ],
  },
  {
    titulo: "Qué datos se recaban",
    parrafos: [
      "El sistema trata únicamente los datos necesarios para atender un trámite "
      + "de documentos escolares. Se agrupan según de dónde provienen:",
    ],
    listas: [
      {
        encabezado: "Del padrón del programa, que entrega la propia Facultad:",
        puntos: [
          "Matrícula.",
          "Primeros diez caracteres de la CURP, usados una sola vez para "
          + "comprobar tu identidad al activar la cuenta.",
          "Nombre completo.",
          "Correo electrónico institucional.",
          "Programa educativo y fecha de ingreso.",
        ],
      },
      {
        encabezado: "Que aportas tú al usar el sistema:",
        puntos: [
          "Una contraseña, que se guarda cifrada y que nadie —tampoco la "
          + "Coordinación— puede leer.",
          "Las observaciones y comentarios que escribas en tus trámites.",
          "El comprobante del depósito bancario cuando el trámite tiene costo, "
          + "junto con la fecha y la referencia de la operación.",
          "Los archivos que adjuntes a un comentario.",
        ],
      },
      {
        encabezado: "Que genera el propio sistema:",
        puntos: [
          "El folio, el tipo de documento, el costo y las fechas de cada etapa.",
          "Una bitácora de quién atendió el trámite y en qué momento.",
          "El recibo y el documento escolar que se emiten.",
          "El registro de intentos de acceso fallidos, para bloquear la cuenta "
          + "temporalmente ante un intento de adivinar la contraseña.",
        ],
      },
    ],
    cierre: "No se recaban datos personales sensibles: ni origen étnico, ni "
          + "estado de salud, ni creencias, ni opiniones políticas, ni "
          + "preferencia sexual, ni ningún otro de los que la ley clasifica "
          + "como tales.",
  },
  {
    titulo: "Para qué se usan",
    parrafos: ["Los datos se tratan con las siguientes finalidades, todas "
             + "necesarias para el trámite que solicitas:"],
    listas: [{
      puntos: [
        "Comprobar que perteneces al padrón del programa y que eres la persona "
        + "titular de la matrícula.",
        "Recibir tu solicitud, darle seguimiento y mostrarte en qué etapa va.",
        "Verificar el pago de derechos cuando el documento tiene costo.",
        "Elaborar, emitir y entregarte el documento escolar y el recibo.",
        "Avisarte por correo cuando se registra tu solicitud y cuando tu "
        + "documento está listo.",
        "Dejar constancia de quién atendió cada trámite, para poder aclarar "
        + "después cualquier duda sobre su manejo.",
      ],
    }],
    cierre: "No existen finalidades adicionales: tus datos no se usan para "
          + "difusión, publicidad, evaluación del desempeño ni ningún fin "
          + "distinto del trámite.",
  },
  {
    titulo: "Quién puede verlos dentro de la Universidad",
    parrafos: [
      "El sistema limita lo que ve cada persona según su función, de modo que "
      + "nadie accede a más de lo que necesita para su parte del trámite:",
    ],
    listas: [{
      puntos: [
        "Secretaría ve los trámites que le toca atender y el padrón.",
        "Administración ve únicamente los trámites que implican un pago; los "
        + "trámites sin costo no aparecen en su pantalla.",
        "La Coordinación supervisa el conjunto de los trámites del programa.",
        "Cada alumno ve solamente sus propios trámites y archivos.",
      ],
    }],
  },
  {
    titulo: "Transferencias",
    parrafos: [
      "Tus datos no se transfieren a persona o institución alguna, salvo cuando "
      + "lo requiera una autoridad competente mediante solicitud debidamente "
      + "fundada y motivada.",
      "Para funcionar, el sistema se apoya en proveedores de servicios "
      + "informáticos que almacenan la información por cuenta de la "
      + "Universidad y que no pueden usarla para ningún fin propio. Esos "
      + "proveedores actúan como encargados del tratamiento, no como "
      + "destinatarios de una transferencia.",
    ],
  },
  {
    titulo: "Cuánto tiempo se conservan",
    parrafos: [
      "Los datos del padrón se conservan mientras dure tu vigencia como "
      + "estudiante del programa, por un máximo de seis años contados desde tu "
      + "ingreso.",
      "Cumplido ese plazo, si no realizaste ningún trámite tu registro se "
      + "elimina por completo. Si realizaste trámites, se eliminan tus archivos "
      + "—comprobantes de pago y documentos— y se conserva únicamente el "
      + "registro del trámite: folio, tipo, fechas y quién lo atendió, que "
      + "forma parte de los registros de la Facultad.",
    ],
  },
  {
    titulo: "Tus derechos ARCO",
    parrafos: [
      "Tienes derecho a conocer qué datos personales tenemos de ti y para qué "
      + "los usamos (Acceso); a pedir que se corrijan si están desactualizados "
      + "o son inexactos (Rectificación); a solicitar que se eliminen cuando "
      + "consideres que no se requieren para alguna de las finalidades "
      + "señaladas (Cancelación); y a oponerte al uso de tus datos para fines "
      + "específicos (Oposición).",
      `Para ejercerlos, acude a la ${TRANSPARENCIA.nombre}, con domicilio en `
      + `${TRANSPARENCIA.domicilio}, o escribe a ${TRANSPARENCIA.correo}. `
      + `También puedes llamar al ${TRANSPARENCIA.telefono}.`,
      "La solicitud debe indicar tu nombre, un medio para recibir la respuesta, "
      + "los documentos que acrediten tu identidad o la representación legal, la "
      + "descripción clara de los datos sobre los que buscas ejercer el derecho "
      + "y cualquier elemento que facilite su localización.",
    ],
  },
  {
    titulo: "Fundamento legal",
    parrafos: [
      "El tratamiento se realiza con fundamento en la Ley 316 de Protección de "
      + "Datos Personales en Posesión de Sujetos Obligados para el Estado de "
      + "Veracruz de Ignacio de la Llave, en el Estatuto General de la "
      + "Universidad Veracruzana y en la demás normatividad aplicable.",
    ],
  },
  {
    titulo: "Cambios a este aviso",
    parrafos: [
      "Cualquier modificación a este aviso se publicará en esta misma pantalla y "
      + `en el portal de transparencia de la Universidad: ${TRANSPARENCIA.avisos}`,
    ],
  },
];
