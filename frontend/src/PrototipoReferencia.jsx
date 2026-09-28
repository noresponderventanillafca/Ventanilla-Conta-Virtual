import { useState, useMemo } from "react";
import {
  GraduationCap, IdCard, FileText, Paperclip, Upload, ChevronLeft, ChevronRight,
  CheckCircle2, Circle, AlertTriangle, Clock, Download, MessageSquare, Search,
  LayoutDashboard, Inbox, Wallet, ArrowLeft, Send, X
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Tokens                                                             */
/* ------------------------------------------------------------------ */

const C = {
  azul900: "#002B4A",
  azul700: "#00426A",
  azul100: "#E6EEF4",
  verde600: "#00843D",
  verde100: "#E3F1E8",
  ambar600: "#B26A00",
  ambar100: "#FBF0DE",
  rojo600: "#B3261E",
  rojo100: "#FBE9E7",
  gris700: "#3A4550",
  gris500: "#5F6B76",
  gris400: "#8A959E",
  gris200: "#DDE3E8",
  gris100: "#F4F6F8",
  blanco: "#FFFFFF",
};

const CUENTA = {
  banco: "Banco institucional",
  titular: "Universidad Veracruzana",
  cuenta: "6550 1234 5678",
  clabe: "0148 4065 5012 3456 78",
};

/* ------------------------------------------------------------------ */
/*  Catálogo y definición de etapas                                    */
/* ------------------------------------------------------------------ */

const TIPOS = [
  { id: "constancia", nombre: "Constancia de estudios", costo: 180, momentoPago: "al_solicitar" },
  { id: "constcal", nombre: "Constancia con calificaciones", costo: 180, momentoPago: "al_solicitar" },
  { id: "historial", nombre: "Historial académico", costo: 220, momentoPago: "al_solicitar" },
  { id: "kardex", nombre: "Kardex informativo", costo: 0, momentoPago: "sin_costo" },
  { id: "vigencia", nombre: "Constancia de vigencia de derechos", costo: 0, momentoPago: "sin_costo" },
  { id: "titulacion", nombre: "Trámite de titulación", costo: 1450, momentoPago: "tras_linea_de_captura" },
];

const SEC = "Secretaría";
const ADM = "Administración";
const ALU = "Alumno";

function etapasDe(momentoPago) {
  if (momentoPago === "sin_costo") {
    return [
      { nombre: "Solicitud registrada", actor: ALU, diasMax: null },
      { nombre: "Elaboración del documento", actor: SEC, diasMax: 3 },
      { nombre: "Documento entregado", actor: null, diasMax: null },
    ];
  }
  if (momentoPago === "al_solicitar") {
    return [
      { nombre: "Solicitud y comprobante enviados", actor: ALU, diasMax: null },
      { nombre: "Validación del pago", actor: ADM, diasMax: 2 },
      { nombre: "Elaboración del documento", actor: SEC, diasMax: 3 },
      { nombre: "Documento entregado", actor: null, diasMax: null },
    ];
  }
  return [
    { nombre: "Solicitud registrada", actor: ALU, diasMax: null },
    { nombre: "Línea de captura emitida", actor: SEC, diasMax: 2 },
    { nombre: "Comprobante de pago", actor: ALU, diasMax: 5 },
    { nombre: "Validación del pago", actor: ADM, diasMax: 2 },
    { nombre: "Elaboración del documento", actor: SEC, diasMax: 3 },
    { nombre: "Documento entregado", actor: null, diasMax: null },
  ];
}

const tipoDe = (id) => TIPOS.find((t) => t.id === id);

/* ------------------------------------------------------------------ */
/*  Fechas                                                             */
/* ------------------------------------------------------------------ */

const HOY = new Date();

function haceDias(n) {
  const d = new Date(HOY);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function diasHabilesEntre(desdeISO, hasta = HOY) {
  const a = new Date(desdeISO);
  let n = 0;
  const cur = new Date(a);
  while (cur < hasta) {
    cur.setDate(cur.getDate() + 1);
    const d = cur.getDay();
    if (d !== 0 && d !== 6) n++;
  }
  return n;
}

function fmtFecha(iso) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtHora(iso) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

const pesos = (n) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });

/* ------------------------------------------------------------------ */
/*  Datos iniciales                                                    */
/* ------------------------------------------------------------------ */

const ALUMNA = { nombre: "Ana Ruiz Márquez", matricula: "S23012345" };

const SEMILLA = [
  {
    folio: "CV-2026-0147",
    tipoId: "constancia",
    cantidad: 2,
    alumno: ALUMNA.nombre,
    matricula: ALUMNA.matricula,
    creado: haceDias(4),
    etapaIdx: 1,
    desde: haceDias(4),
    devolucion: null,
    pago: { monto: 360, fecha: haceDias(4), operacion: "MBAN01002609021847", archivo: "comprobante-deposito.jpg" },
    eventos: [
      { tipo: "etapa", texto: "Solicitud y comprobante enviados", autor: ALUMNA.nombre, rol: ALU, fecha: haceDias(4) },
      { tipo: "comentario", texto: "La constancia debe ir dirigida a la Secretaría de Educación de Veracruz, no a \"a quien corresponda\". Anexo un ejemplo de cómo me la pidieron.", autor: ALUMNA.nombre, rol: ALU, fecha: haceDias(3), archivo: "ejemplo-constancia.pdf" },
      { tipo: "comentario", texto: "Recibido, se ajusta el destinatario. No afecta el costo ni el avance del trámite.", autor: SEC, rol: SEC, fecha: haceDias(3) },
    ],
  },
  {
    folio: "CV-2026-0139",
    tipoId: "kardex",
    cantidad: 1,
    alumno: ALUMNA.nombre,
    matricula: ALUMNA.matricula,
    creado: haceDias(2),
    etapaIdx: 1,
    desde: haceDias(2),
    devolucion: null,
    pago: null,
    eventos: [
      { tipo: "etapa", texto: "Solicitud registrada", autor: ALUMNA.nombre, rol: ALU, fecha: haceDias(2) },
    ],
  },
  {
    folio: "CV-2026-0118",
    tipoId: "titulacion",
    cantidad: 1,
    alumno: ALUMNA.nombre,
    matricula: ALUMNA.matricula,
    creado: haceDias(9),
    etapaIdx: 2,
    desde: haceDias(6),
    devolucion: null,
    pago: null,
    lineaCaptura: "4410-8827-2026",
    eventos: [
      { tipo: "etapa", texto: "Solicitud registrada", autor: ALUMNA.nombre, rol: ALU, fecha: haceDias(9) },
      { tipo: "etapa", texto: "Línea de captura emitida — referencia 4410-8827-2026", autor: SEC, rol: SEC, fecha: haceDias(6) },
    ],
  },
  {
    folio: "CV-2026-0121",
    tipoId: "constcal",
    cantidad: 1,
    alumno: ALUMNA.nombre,
    matricula: ALUMNA.matricula,
    creado: haceDias(20),
    etapaIdx: 3,
    desde: haceDias(14),
    devolucion: null,
    pago: { monto: 180, fecha: haceDias(19), operacion: "MBAN01002608141122", archivo: "comprobante-deposito.jpg" },
    eventos: [
      { tipo: "etapa", texto: "Solicitud y comprobante enviados", autor: ALUMNA.nombre, rol: ALU, fecha: haceDias(20) },
      { tipo: "etapa", texto: "Pago validado", autor: ADM, rol: ADM, fecha: haceDias(18) },
      { tipo: "etapa", texto: "Documento elaborado y entregado", autor: SEC, rol: SEC, fecha: haceDias(14) },
    ],
  },
  {
    folio: "CV-2026-0152",
    tipoId: "historial",
    cantidad: 1,
    alumno: "Luis Ángel Domínguez",
    matricula: "S23011980",
    creado: haceDias(1),
    etapaIdx: 1,
    desde: haceDias(1),
    devolucion: null,
    pago: { monto: 220, fecha: haceDias(1), operacion: "MBAN01002609051402", archivo: "recibo-transferencia.pdf" },
    eventos: [
      { tipo: "etapa", texto: "Solicitud y comprobante enviados", autor: "Luis Ángel Domínguez", rol: ALU, fecha: haceDias(1) },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Derivados                                                          */
/* ------------------------------------------------------------------ */

function infoTramite(tr) {
  const tipo = tipoDe(tr.tipoId);
  const etapas = etapasDe(tipo.momentoPago);
  const etapa = etapas[tr.etapaIdx];
  const concluido = tr.etapaIdx >= etapas.length - 1;
  const dias = diasHabilesEntre(tr.desde);
  const retrasado = !concluido && etapa.diasMax != null && dias > etapa.diasMax;
  const total = tipo.costo * tr.cantidad;
  return { tipo, etapas, etapa, concluido, dias, retrasado, total };
}

function estadoTexto(tr) {
  const { etapa, concluido, dias, retrasado } = infoTramite(tr);
  if (concluido) return { texto: "Concluido", tono: "verde" };
  if (tr.devolucion) return { texto: "Requiere tu corrección", tono: "rojo" };
  if (etapa.actor === ALU) return { texto: etapa.nombre, tono: "azul" };
  if (retrasado) return { texto: `${etapa.nombre} · ${dias} días`, tono: "ambar" };
  return { texto: `${etapa.nombre} · ${dias} d`, tono: "neutro" };
}

/* ------------------------------------------------------------------ */
/*  Piezas visuales                                                    */
/* ------------------------------------------------------------------ */

const TONOS = {
  azul: { bg: C.azul100, fg: C.azul700 },
  verde: { bg: C.verde100, fg: C.verde600 },
  ambar: { bg: C.ambar100, fg: C.ambar600 },
  rojo: { bg: C.rojo100, fg: C.rojo600 },
};

function Pill({ children, tono = "azul" }) {
  if (tono === "neutro")
    return <span className="text-xs" style={{ color: C.gris500 }}>{children}</span>;
  const s = TONOS[tono];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.fg }} />
      {children}
    </span>
  );
}

function Card({ title, right, children, className = "" }) {
  return (
    <section
      className={`rounded-lg overflow-hidden ${className}`}
      style={{ background: C.blanco, border: `1px solid ${C.gris200}` }}
    >
      {title && (
        <header
          className="flex items-center gap-3 px-5 py-3.5"
          style={{ borderBottom: `1px solid ${C.gris200}` }}
        >
          <h2 className="text-sm font-semibold" style={{ color: C.azul900 }}>{title}</h2>
          {right && <div className="ml-auto">{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

function InfoCard({ icon: Icon, label, value, sub, right }) {
  return (
    <div
      className="flex items-center gap-4 rounded-lg px-4 py-3.5"
      style={{ background: C.blanco, border: `1px solid ${C.gris200}` }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
        style={{ background: C.azul100 }}
      >
        <Icon size={21} color={C.azul700} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold tracking-wide" style={{ color: C.gris400 }}>{label}</div>
        <div className="text-[15px] font-semibold truncate" style={{ color: C.azul900 }}>{value}</div>
        {sub && <div className="text-[11px] truncate" style={{ color: C.gris400 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function Boton({ children, onClick, variante = "primario", disabled, className = "" }) {
  const base = "rounded-md px-4 py-2.5 text-[13px] font-medium transition-colors";
  if (variante === "primario")
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${base} ${className}`}
        style={{
          background: disabled ? C.gris200 : C.azul700,
          color: disabled ? C.gris400 : C.blanco,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {children}
      </button>
    );
  if (variante === "peligro")
    return (
      <button onClick={onClick} className={`${base} ${className}`}
        style={{ background: C.blanco, color: C.rojo600, border: `1px solid ${C.gris200}` }}>
        {children}
      </button>
    );
  return (
    <button onClick={onClick} className={`${base} ${className}`}
      style={{ background: C.blanco, color: C.gris700, border: `1px solid ${C.gris200}` }}>
      {children}
    </button>
  );
}

function Campo({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px]" style={{ color: C.gris700 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  border: `1px solid ${C.gris200}`,
  color: C.gris700,
  background: C.blanco,
};

/* ------------------------------------------------------------------ */
/*  Línea de tiempo                                                    */
/* ------------------------------------------------------------------ */

function LineaTiempo({ tr }) {
  const { etapas, dias, retrasado } = infoTramite(tr);
  const eventosEtapa = tr.eventos.filter((e) => e.tipo === "etapa");

  return (
    <div className="px-5 pt-5 pb-3">
      {etapas.map((et, i) => {
        const hecha = i < tr.etapaIdx;
        const activa = i === tr.etapaIdx;
        const ultima = i === etapas.length - 1;
        const final = ultima && tr.etapaIdx >= etapas.length - 1;
        const ev = eventosEtapa[i];

        const colorPunto = hecha || final ? C.verde600 : activa ? (retrasado ? C.ambar600 : C.azul700) : C.gris200;
        const colorLinea = hecha || final ? C.verde600 : C.gris200;
        const colorTitulo = hecha || activa || final ? C.azul900 : C.gris400;

        return (
          <div key={et.nombre} className="flex gap-3.5">
            <div className="flex w-3 shrink-0 flex-col items-center">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{
                  background: colorPunto,
                  boxShadow: activa ? `0 0 0 4px ${retrasado ? C.ambar100 : C.azul100}` : "none",
                }}
              />
              {!ultima && <span className="w-0.5 flex-1" style={{ background: colorLinea }} />}
            </div>

            <div className={ultima ? "flex-1 pb-1" : "flex-1 pb-6"}>
              <div className="text-sm font-semibold leading-tight" style={{ color: colorTitulo }}>
                {et.nombre}
              </div>
              <div className="mt-1 text-xs" style={{ color: hecha || activa || final ? C.gris500 : C.gris400 }}>
                {final && ev
                  ? `${ev.autor} · ${fmtHora(ev.fecha)}`
                  : hecha && ev
                  ? `${ev.autor} · ${fmtHora(ev.fecha)}`
                  : activa
                  ? `${et.actor ?? "—"} · en curso desde el ${fmtFecha(tr.desde)}`
                  : `${et.actor ?? "—"} · pendiente`}
              </div>

              {activa && retrasado && (
                <div
                  className="mt-2 inline-block rounded px-3 py-1.5 text-xs font-medium"
                  style={{ background: C.ambar100, color: C.ambar600 }}
                >
                  Lleva {dias} días hábiles · el plazo es de {et.diasMax}
                </div>
              )}

              {activa && tr.devolucion && (
                <div
                  className="mt-2 rounded px-3 py-2 text-xs"
                  style={{ background: C.rojo100, color: C.rojo600 }}
                >
                  Devuelto: {tr.devolucion.motivo}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Comentarios                                                        */
/* ------------------------------------------------------------------ */

function Comentarios({ tr, rol, onComentar }) {
  const [texto, setTexto] = useState("");
  const [archivo, setArchivo] = useState(null);
  const comentarios = tr.eventos.filter((e) => e.tipo === "comentario");

  const enviar = () => {
    if (!texto.trim()) return;
    onComentar(tr.folio, texto.trim(), archivo?.name ?? null, rol);
    setTexto("");
    setArchivo(null);
  };

  return (
    <Card
      title="Comentarios del trámite"
      right={<span className="text-[11px]" style={{ color: C.gris400 }}>Visible para todos los participantes</span>}
    >
      <div className="space-y-5 px-5 py-5">
        {comentarios.length === 0 && (
          <p className="text-[13px]" style={{ color: C.gris500 }}>
            Aún no hay comentarios. Úsalos para pedir ajustes al documento o aclarar datos.
          </p>
        )}

        {comentarios.map((c, i) => (
          <div key={i} className="flex gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
              style={{ background: C.azul100, color: C.azul700 }}
            >
              {c.autor.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[13px] font-semibold" style={{ color: C.azul900 }}>{c.autor}</span>
                <span className="text-[11px]" style={{ color: C.gris400 }}>{c.rol} · {fmtHora(c.fecha)}</span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed" style={{ color: C.gris700 }}>{c.texto}</p>
              {c.archivo && (
                <div
                  className="mt-2 inline-flex items-center gap-2 rounded-md px-3 py-2"
                  style={{ border: `1px solid ${C.gris200}` }}
                >
                  <Paperclip size={15} color={C.gris400} />
                  <span className="text-xs" style={{ color: C.gris700 }}>{c.archivo}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        <div style={{ borderTop: `1px solid ${C.gris200}` }} className="pt-4">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            placeholder="Escribe un comentario sobre este trámite…"
            className="w-full rounded-md px-3.5 py-3 text-[13px] outline-none"
            style={inputStyle}
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label
              className="inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs"
              style={{ border: `1px solid ${C.gris200}`, color: C.gris700 }}
            >
              <Paperclip size={14} color={C.gris500} />
              {archivo ? archivo.name : "Adjuntar archivo"}
              <input type="file" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
            </label>
            {archivo && (
              <button onClick={() => setArchivo(null)} aria-label="Quitar archivo">
                <X size={15} color={C.gris400} />
              </button>
            )}
            <Boton onClick={enviar} disabled={!texto.trim()} className="ml-auto">
              <span className="inline-flex items-center gap-2"><Send size={14} /> Enviar</span>
            </Boton>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Detalle del trámite (compartido por todos los roles)               */
/* ------------------------------------------------------------------ */

function ZonaAccion({ tr, rol, acciones }) {
  const { etapa, concluido, tipo } = infoTramite(tr);

  if (concluido) {
    return (
      <div className="rounded-lg p-5" style={{ background: C.verde100 }}>
        <div className="text-sm font-semibold" style={{ color: C.verde600 }}>Trámite concluido</div>
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: C.verde600 }}>
          El documento fue entregado el {fmtFecha(tr.eventos[tr.eventos.length - 1].fecha)}.
        </p>
        {rol === ALU && (
          <button
            className="mt-3 inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-medium"
            style={{ background: C.blanco, color: C.verde600, border: `1px solid ${C.gris200}` }}
          >
            <Download size={14} /> Descargar PDF
          </button>
        )}
      </div>
    );
  }

  const meToca =
    (rol === ALU && etapa.actor === ALU) ||
    (rol === SEC && etapa.actor === SEC) ||
    (rol === ADM && etapa.actor === ADM);

  if (!meToca) {
    return (
      <div className="rounded-lg p-5" style={{ background: C.azul100 }}>
        <div className="text-sm font-semibold leading-snug" style={{ color: C.azul900 }}>
          {rol === ALU ? "No necesitas hacer nada por ahora" : "No requiere tu intervención"}
        </div>
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: C.azul700 }}>
          {etapa.actor} tiene este trámite desde el {fmtFecha(tr.desde)}.
          {rol === ALU && " Te llegará un correo en cuanto avance."}
        </p>
      </div>
    );
  }

  if (rol === SEC && etapa.nombre === "Línea de captura emitida") {
    return (
      <div className="rounded-lg p-5" style={{ background: C.azul100 }}>
        <div className="text-sm font-semibold" style={{ color: C.azul900 }}>Emite la línea de captura</div>
        <p className="mt-1.5 mb-3 text-xs leading-relaxed" style={{ color: C.azul700 }}>
          Genera la referencia de pago por {pesos(tipo.costo * tr.cantidad)} y regístrala aquí.
        </p>
        <Boton onClick={() => acciones.avanzar(tr.folio, "Línea de captura emitida", SEC)}>
          Registrar línea de captura
        </Boton>
      </div>
    );
  }

  if (rol === SEC && etapa.nombre === "Elaboración del documento") {
    return (
      <div className="rounded-lg p-5" style={{ background: C.azul100 }}>
        <div className="text-sm font-semibold" style={{ color: C.azul900 }}>Elabora y entrega el documento</div>
        <p className="mt-1.5 mb-3 text-xs leading-relaxed" style={{ color: C.azul700 }}>
          Sube el PDF firmado. El alumno lo recibirá por correo y podrá descargarlo aquí.
        </p>
        <Boton onClick={() => acciones.avanzar(tr.folio, "Documento elaborado y entregado", SEC)}>
          Subir documento y entregar
        </Boton>
      </div>
    );
  }

  if (rol === ALU && etapa.nombre === "Comprobante de pago") {
    return (
      <div className="rounded-lg p-5" style={{ background: C.azul100 }}>
        <div className="text-sm font-semibold" style={{ color: C.azul900 }}>Sube tu comprobante de pago</div>
        <p className="mt-1.5 mb-3 text-xs leading-relaxed" style={{ color: C.azul700 }}>
          Línea de captura {tr.lineaCaptura} · {pesos(tipo.costo * tr.cantidad)}
        </p>
        <Boton onClick={() => acciones.avanzar(tr.folio, "Comprobante de pago enviado", ALU)}>
          Subir comprobante
        </Boton>
      </div>
    );
  }

  return null;
}

function Detalle({ tr, rol, acciones, onVolver }) {
  const { tipo, etapas, concluido, total } = infoTramite(tr);
  const est = estadoTexto(tr);
  const archivos = [];
  if (tr.pago?.archivo) archivos.push([tr.pago.archivo, `Comprobante · ${fmtFecha(tr.pago.fecha)}`]);
  tr.eventos.filter((e) => e.archivo).forEach((e) => archivos.push([e.archivo, `Anexo · ${fmtFecha(e.fecha)}`]));

  return (
    <div className="space-y-3.5">
      <button
        onClick={onVolver}
        className="inline-flex items-center gap-2 text-[13px] font-medium"
        style={{ color: C.azul700 }}
      >
        <ArrowLeft size={15} /> Volver a la lista
      </button>

      <InfoCard
        icon={FileText}
        label={`FOLIO ${tr.folio}`}
        value={tr.cantidad > 1 ? `${tipo.nombre} × ${tr.cantidad}` : tipo.nombre}
        sub={`${tr.alumno} · ${tr.matricula} · Solicitado el ${fmtFecha(tr.creado)}${
          tipo.costo > 0 ? ` · ${pesos(total)}` : " · sin costo"
        }`}
        right={<Pill tono={est.tono === "neutro" ? "azul" : est.tono}>{concluido ? "Concluido" : "En proceso"}</Pill>}
      />

      <div
        className="flex items-center gap-4 rounded-lg px-4 py-3.5"
        style={{ background: C.blanco, border: `1px solid ${C.gris200}` }}
      >
        <span className="shrink-0 text-[13px] font-semibold" style={{ color: C.gris700 }}>Avance</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: C.gris200 }}>
          <div
            className="h-full rounded-full"
            style={{ background: C.verde600, width: `${(tr.etapaIdx / (etapas.length - 1)) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-xs" style={{ color: C.gris500 }}>
          {tr.etapaIdx} de {etapas.length - 1} etapas
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        <div className="space-y-3.5 lg:col-span-2">
          <Card title="Etapas del trámite">
            <LineaTiempo tr={tr} />
          </Card>
          <Comentarios tr={tr} rol={rol} onComentar={acciones.comentar} />
        </div>

        <div className="space-y-3.5">
          <ZonaAccion tr={tr} rol={rol} acciones={acciones} />

          {tr.pago && (
            <Card title="Pago declarado">
              <dl className="space-y-2.5 px-5 py-4">
                {[
                  ["Monto", pesos(tr.pago.monto)],
                  ["Fecha", fmtFecha(tr.pago.fecha)],
                  ["Operación", tr.pago.operacion],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-xs" style={{ color: C.gris500 }}>{k}</dt>
                    <dd className="text-right text-xs font-medium" style={{ color: C.gris700 }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          {archivos.length > 0 && (
            <Card title="Archivos">
              <div className="space-y-2 px-5 py-4">
                {archivos.map(([nombre, meta], i) => (
                  <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2.5" style={{ background: C.gris100 }}>
                    <Paperclip size={15} color={C.gris400} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium" style={{ color: C.gris700 }}>{nombre}</div>
                      <div className="text-[11px]" style={{ color: C.gris400 }}>{meta}</div>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: C.azul700 }}>Ver</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabla de trámites                                                  */
/* ------------------------------------------------------------------ */

function Tabla({ tramites, onAbrir, mostrarAlumno = false }) {
  if (tramites.length === 0)
    return (
      <p className="px-5 py-8 text-center text-[13px]" style={{ color: C.gris500 }}>
        No hay trámites en esta vista.
      </p>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr style={{ background: C.gris100 }}>
            {["Folio", mostrarAlumno ? "Alumno" : "Documento", "Etapa actual", "Solicitado", ""].map((h, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide"
                style={{ color: C.gris500 }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tramites.map((tr) => {
            const est = estadoTexto(tr);
            const { tipo } = infoTramite(tr);
            return (
              <tr key={tr.folio} style={{ borderTop: `1px solid ${C.gris200}` }}>
                <td className="px-4 py-3.5 text-[13px] font-semibold" style={{ color: C.azul700 }}>{tr.folio}</td>
                <td className="px-4 py-3.5 text-sm" style={{ color: C.gris700 }}>
                  {mostrarAlumno ? (
                    <div>
                      <div>{tr.alumno}</div>
                      <div className="text-[11px]" style={{ color: C.gris400 }}>{tipo.nombre}</div>
                    </div>
                  ) : (
                    <>{tr.cantidad > 1 ? `${tipo.nombre} × ${tr.cantidad}` : tipo.nombre}</>
                  )}
                </td>
                <td className="px-4 py-3.5"><Pill tono={est.tono}>{est.texto}</Pill></td>
                <td className="px-4 py-3.5 text-xs" style={{ color: C.gris500 }}>{fmtFecha(tr.creado)}</td>
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => onAbrir(tr.folio)}
                    className="text-xs font-semibold"
                    style={{ color: C.azul700 }}
                  >
                    Abrir
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Nueva solicitud                                                    */
/* ------------------------------------------------------------------ */

function NuevaSolicitud({ acciones, onVolver, operacionesUsadas }) {
  const [tipoId, setTipoId] = useState(TIPOS[0].id);
  const [cantidad, setCantidad] = useState(1);
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [operacion, setOperacion] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState(null);

  const tipo = tipoDe(tipoId);
  const total = tipo.costo * cantidad;
  const folioBorrador = "CV-2026-0161";

  const enviar = () => {
    if (tipo.momentoPago === "al_solicitar") {
      if (!monto || !fecha || !operacion.trim() || !archivo) {
        setError("Completa el monto, la fecha, el número de operación y adjunta el comprobante.");
        return;
      }
      if (Number(monto) !== total) {
        setError(`El monto no coincide. Se esperan ${pesos(total)} por ${cantidad} documento(s).`);
        return;
      }
      if (operacionesUsadas.includes(operacion.trim())) {
        setError("Ese número de operación ya está registrado en otro trámite.");
        return;
      }
    }
    setError(null);
    acciones.crear({
      tipoId, cantidad,
      pago: tipo.momentoPago === "al_solicitar"
        ? { monto: Number(monto), fecha: new Date(fecha).toISOString(), operacion: operacion.trim(), archivo: archivo.name }
        : null,
    });
  };

  return (
    <div className="space-y-3.5">
      <button onClick={onVolver} className="inline-flex items-center gap-2 text-[13px] font-medium" style={{ color: C.azul700 }}>
        <ArrowLeft size={15} /> Cancelar
      </button>

      <h1 className="text-xl font-semibold" style={{ color: C.azul900 }}>Nueva solicitud</h1>

      <Card title="Documento">
        <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-[1fr_120px_auto] sm:items-end">
          <Campo label="¿Qué documento necesitas?">
            <select
              value={tipoId}
              onChange={(e) => { setTipoId(e.target.value); setError(null); }}
              className="w-full rounded-md px-3 py-2.5 text-[13px] outline-none"
              style={inputStyle}
            >
              {TIPOS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} — {t.costo === 0 ? "sin costo" : pesos(t.costo)}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Cantidad">
            <input
              type="number" min={1} max={10} value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-md px-3 py-2.5 text-[13px] outline-none"
              style={inputStyle}
            />
          </Campo>
          <div className="rounded-md px-4 py-2.5 text-[15px] font-semibold" style={{ background: C.azul100, color: C.azul700 }}>
            {total === 0 ? "Sin costo" : pesos(total)}
          </div>
        </div>
      </Card>

      {tipo.momentoPago === "tras_linea_de_captura" && (
        <div className="rounded-lg p-5" style={{ background: C.azul100 }}>
          <div className="text-sm font-semibold" style={{ color: C.azul900 }}>Este trámite lleva línea de captura</div>
          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: C.azul700 }}>
            Envía la solicitud y Secretaría generará tu referencia de pago. Te avisaremos por correo para que deposites.
          </p>
        </div>
      )}

      {tipo.momentoPago === "al_solicitar" && (
        <>
          <Card title="Realiza el depósito">
            <div className="px-5 py-5">
              <dl className="grid grid-cols-2 gap-4 rounded-md p-4 sm:grid-cols-4" style={{ background: C.gris100 }}>
                {[["Banco", CUENTA.banco], ["Titular", CUENTA.titular], ["Cuenta", CUENTA.cuenta], ["CLABE", CUENTA.clabe]].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11px]" style={{ color: C.gris400 }}>{k}</dt>
                    <dd className="text-[13px]" style={{ color: C.gris700 }}>{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex gap-3 rounded-md p-3.5" style={{ background: C.ambar100 }}>
                <AlertTriangle size={17} color={C.ambar600} className="shrink-0" />
                <p className="text-xs leading-relaxed" style={{ color: C.ambar600 }}>
                  Escribe <strong className="font-semibold">{ALUMNA.matricula} {folioBorrador}</strong> en el concepto
                  del depósito. Sin ese dato, identificar tu pago puede tardar varios días. Deposita exactamente {pesos(total)}.
                </p>
              </div>
            </div>
          </Card>

          <Card title="Comprobante de pago">
            <div className="px-5 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Campo label="Monto depositado">
                  <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00"
                    className="w-full rounded-md px-3 py-2.5 text-[13px] outline-none" style={inputStyle} />
                </Campo>
                <Campo label="Fecha del depósito">
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                    className="w-full rounded-md px-3 py-2.5 text-[13px] outline-none" style={inputStyle} />
                </Campo>
                <Campo label="Número de operación">
                  <input value={operacion} onChange={(e) => setOperacion(e.target.value)} placeholder="Clave de rastreo o folio"
                    className="w-full rounded-md px-3 py-2.5 text-[13px] outline-none" style={inputStyle} />
                </Campo>
              </div>

              <label
                className="mt-4 flex cursor-pointer flex-col items-center gap-1.5 rounded-md px-4 py-6"
                style={{ border: `1px dashed ${C.gris400}`, background: C.gris100 }}
              >
                <Upload size={22} color={C.gris400} />
                <span className="text-[13px]" style={{ color: C.gris700 }}>
                  {archivo ? archivo.name : "Selecciona tu comprobante"}
                </span>
                <span className="text-[11px]" style={{ color: C.gris400 }}>JPG, PNG o PDF · máximo 5 MB</span>
                <input type="file" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </Card>
        </>
      )}

      {error && (
        <div className="rounded-lg px-4 py-3 text-[13px]" style={{ background: C.rojo100, color: C.rojo600 }}>
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Boton onClick={enviar}>Enviar solicitud</Boton>
        <span className="text-xs" style={{ color: C.gris500 }}>
          {tipo.momentoPago === "al_solicitar"
            ? "Pasará a validación de Administración."
            : tipo.momentoPago === "sin_costo"
            ? "Pasará directamente a Secretaría."
            : "Secretaría emitirá tu línea de captura."}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Validación del pago (Administración)                               */
/* ------------------------------------------------------------------ */

function Validacion({ tramites, acciones }) {
  const [idx, setIdx] = useState(0);
  const [chk1, setChk1] = useState(false);
  const [chk2, setChk2] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("Monto incorrecto");

  const cola = tramites.filter((tr) => infoTramite(tr).etapa.actor === ADM);

  if (cola.length === 0)
    return (
      <Card title="Validación de pagos">
        <p className="px-5 py-10 text-center text-[13px]" style={{ color: C.gris500 }}>
          No hay pagos pendientes de validar.
        </p>
      </Card>
    );

  const i = Math.min(idx, cola.length - 1);
  const tr = cola[i];
  const { tipo, total } = infoTramite(tr);

  const montoOk = tr.pago && tr.pago.monto === total;
  const opUnica = tramites.filter((t) => t.pago?.operacion === tr.pago?.operacion).length === 1;
  const fechaOk = tr.pago && new Date(tr.pago.fecha) >= new Date(new Date(tr.creado).getTime() - 864e5);

  const reset = () => { setChk1(false); setChk2(false); setRechazando(false); };

  const Check = ({ ok, children }) => (
    <div className="flex items-start gap-2.5 py-1">
      {ok ? <CheckCircle2 size={16} color={C.verde600} className="shrink-0" />
          : <AlertTriangle size={16} color={C.rojo600} className="shrink-0" />}
      <span className="text-xs leading-snug" style={{ color: ok ? C.gris700 : C.rojo600 }}>{children}</span>
    </div>
  );

  return (
    <div className="space-y-3.5">
      <div
        className="flex flex-wrap items-center gap-3 rounded-lg px-4 py-3.5"
        style={{ background: C.blanco, border: `1px solid ${C.gris200}` }}
      >
        <div className="min-w-0">
          <div className="text-[11px]" style={{ color: C.gris400 }}>{tr.folio} · {tr.alumno} · {tr.matricula}</div>
          <div className="text-sm font-semibold" style={{ color: C.azul900 }}>
            {tr.cantidad > 1 ? `${tipo.nombre} × ${tr.cantidad}` : tipo.nombre}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs" style={{ color: C.gris500 }}>{i + 1} de {cola.length} pendientes</span>
          <button onClick={() => { setIdx(Math.max(0, i - 1)); reset(); }}
            className="rounded-md p-1.5" style={{ border: `1px solid ${C.gris200}` }} aria-label="Anterior">
            <ChevronLeft size={15} color={C.gris500} />
          </button>
          <button onClick={() => { setIdx(Math.min(cola.length - 1, i + 1)); reset(); }}
            className="rounded-md p-1.5" style={{ border: `1px solid ${C.gris200}` }} aria-label="Siguiente">
            <ChevronRight size={15} color={C.gris500} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.15fr_1fr]">
        <Card title={tr.pago?.archivo ?? "Sin comprobante"}>
          <div className="flex h-72 flex-col items-center justify-center gap-2" style={{ background: C.gris100 }}>
            <FileText size={38} color={C.gris400} strokeWidth={1.4} />
            <span className="text-[11px]" style={{ color: C.gris400 }}>Comprobante a tamaño completo</span>
          </div>
        </Card>

        <div className="space-y-3.5">
          <Card title="Declarado por el alumno">
            <dl className="space-y-2 px-5 py-4">
              {[
                ["Monto", tr.pago ? pesos(tr.pago.monto) : "—"],
                ["Fecha", tr.pago ? fmtFecha(tr.pago.fecha) : "—"],
                ["Operación", tr.pago?.operacion ?? "—"],
                ["Concepto", `${tr.matricula} ${tr.folio}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-xs" style={{ color: C.gris500 }}>{k}</dt>
                  <dd className="text-right text-xs font-medium" style={{ color: C.gris700 }}>{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="Verificado por el sistema">
            <div className="px-5 py-4">
              <Check ok={montoOk}>
                {montoOk
                  ? `Monto correcto: ${tr.cantidad} × ${pesos(tipo.costo)}`
                  : `Monto no coincide: se esperan ${pesos(total)}`}
              </Check>
              <Check ok={opUnica}>
                {opUnica ? "Operación no registrada antes" : "Operación duplicada en otro trámite"}
              </Check>
              <Check ok={fechaOk}>
                {fechaOk ? "Fecha coherente con la solicitud" : "Fecha anterior a la solicitud"}
              </Check>
            </div>
          </Card>

          <Card title="Confirma manualmente">
            <div className="space-y-1 px-5 py-4">
              {[
                [chk1, setChk1, "El comprobante coincide con lo declarado"],
                [chk2, setChk2, "El depósito aparece en el estado de cuenta"],
              ].map(([val, set, label], k) => (
                <label key={k} className="flex cursor-pointer items-start gap-2.5 py-1.5">
                  <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} className="mt-0.5" />
                  <span className="text-xs leading-snug" style={{ color: C.gris700 }}>{label}</span>
                </label>
              ))}
            </div>
          </Card>

          {rechazando ? (
            <Card title="Motivo del rechazo">
              <div className="space-y-3 px-5 py-4">
                <select value={motivo} onChange={(e) => setMotivo(e.target.value)}
                  className="w-full rounded-md px-3 py-2.5 text-[13px] outline-none" style={inputStyle}>
                  {["Monto incorrecto", "Comprobante ilegible", "Depósito no localizado", "Los datos no coinciden"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Boton variante="peligro" onClick={() => { acciones.rechazar(tr.folio, motivo); reset(); }}>
                    Confirmar rechazo
                  </Boton>
                  <Boton variante="secundario" onClick={() => setRechazando(false)}>Cancelar</Boton>
                </div>
              </div>
            </Card>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Boton
                disabled={!chk1 || !chk2}
                onClick={() => { acciones.avanzar(tr.folio, "Pago validado", ADM); reset(); }}
              >
                Aprobar y generar recibo
              </Boton>
              <Boton variante="peligro" onClick={() => setRechazando(true)}>Rechazar…</Boton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tablero de la coordinación                                         */
/* ------------------------------------------------------------------ */

function Tablero({ tramites, onAbrir }) {
  const retrasados = tramites.filter((tr) => infoTramite(tr).retrasado);
  const activos = tramites.filter((tr) => !infoTramite(tr).concluido);
  const porActor = [SEC, ADM, ALU].map((a) => ({
    actor: a,
    n: activos.filter((tr) => infoTramite(tr).etapa.actor === a).length,
  }));

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {[
          ["En proceso", activos.length, C.azul700],
          ["Fuera de plazo", retrasados.length, retrasados.length ? C.ambar600 : C.gris400],
          ["Concluidos", tramites.length - activos.length, C.verde600],
          ["Total", tramites.length, C.gris700],
        ].map(([label, n, color]) => (
          <div key={label} className="rounded-lg px-4 py-4" style={{ background: C.blanco, border: `1px solid ${C.gris200}` }}>
            <div className="text-[11px] font-semibold tracking-wide" style={{ color: C.gris400 }}>{label}</div>
            <div className="mt-1 text-2xl font-semibold" style={{ color }}>{n}</div>
          </div>
        ))}
      </div>

      <Card title="Trámites fuera de plazo">
        {retrasados.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px]" style={{ color: C.gris500 }}>
            Ningún trámite excede su plazo. Todo va a tiempo.
          </p>
        ) : (
          <div className="divide-y" style={{ borderColor: C.gris200 }}>
            {retrasados.map((tr) => {
              const { etapa, dias } = infoTramite(tr);
              return (
                <div key={tr.folio} className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                     style={{ borderTop: `1px solid ${C.gris200}` }}>
                  <Clock size={16} color={C.ambar600} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold" style={{ color: C.azul900 }}>
                      {tr.folio} · {tr.alumno}
                    </div>
                    <div className="text-xs" style={{ color: C.gris500 }}>
                      {etapa.nombre} — detenido con {etapa.actor} desde hace {dias} días hábiles
                    </div>
                  </div>
                  <button onClick={() => onAbrir(tr.folio)} className="ml-auto text-xs font-semibold" style={{ color: C.azul700 }}>
                    Abrir
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Carga por área">
        <div className="grid grid-cols-3 gap-4 px-5 py-5">
          {porActor.map(({ actor, n }) => (
            <div key={actor}>
              <div className="text-xs" style={{ color: C.gris500 }}>{actor}</div>
              <div className="text-lg font-semibold" style={{ color: C.azul900 }}>{n}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Todos los trámites">
        <Tabla tramites={tramites} onAbrir={onAbrir} mostrarAlumno />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Aplicación                                                         */
/* ------------------------------------------------------------------ */

const ROLES = [
  { id: ALU, etiqueta: "Alumno", icono: GraduationCap },
  { id: SEC, etiqueta: "Secretaría", icono: Inbox },
  { id: ADM, etiqueta: "Administración", icono: Wallet },
  { id: "Coordinación", etiqueta: "Coordinación", icono: LayoutDashboard },
];

export default function VentanillaVirtual() {
  const [tramites, setTramites] = useState(SEMILLA);
  const [rol, setRol] = useState(ALU);
  const [vista, setVista] = useState({ pantalla: "lista", folio: null });
  const [aviso, setAviso] = useState(null);

  const mostrarAviso = (t) => {
    setAviso(t);
    setTimeout(() => setAviso(null), 3500);
  };

  const acciones = useMemo(() => ({
    avanzar(folio, texto, autor) {
      setTramites((prev) =>
        prev.map((tr) => {
          if (tr.folio !== folio) return tr;
          const { etapas } = infoTramite(tr);
          const nuevoIdx = Math.min(tr.etapaIdx + 1, etapas.length - 1);
          return {
            ...tr,
            etapaIdx: nuevoIdx,
            desde: new Date().toISOString(),
            devolucion: null,
            eventos: [...tr.eventos, { tipo: "etapa", texto, autor, rol: autor, fecha: new Date().toISOString() }],
          };
        })
      );
      mostrarAviso(`${folio}: ${texto.toLowerCase()}`);
    },
    rechazar(folio, motivo) {
      setTramites((prev) =>
        prev.map((tr) => {
          if (tr.folio !== folio) return tr;
          const { tipo } = infoTramite(tr);
          const destino = tipo.momentoPago === "al_solicitar" ? 0 : 2;
          return {
            ...tr,
            etapaIdx: destino,
            desde: new Date().toISOString(),
            devolucion: { motivo, fecha: new Date().toISOString() },
            eventos: [...tr.eventos, { tipo: "comentario", texto: `Pago rechazado: ${motivo}`, autor: ADM, rol: ADM, fecha: new Date().toISOString() }],
          };
        })
      );
      mostrarAviso(`${folio}: devuelto al alumno`);
    },
    comentar(folio, texto, archivo, autor) {
      setTramites((prev) =>
        prev.map((tr) =>
          tr.folio === folio
            ? { ...tr, eventos: [...tr.eventos, { tipo: "comentario", texto, autor, rol: autor, archivo, fecha: new Date().toISOString() }] }
            : tr
        )
      );
      mostrarAviso("Comentario publicado. Se notificó a los participantes.");
    },
    crear({ tipoId, cantidad, pago }) {
      const n = 160 + tramites.length;
      const folio = `CV-2026-0${n}`;
      setTramites((prev) => [
        {
          folio, tipoId, cantidad,
          alumno: ALUMNA.nombre, matricula: ALUMNA.matricula,
          creado: new Date().toISOString(),
          etapaIdx: 1,
          desde: new Date().toISOString(),
          devolucion: null,
          pago,
          eventos: [{
            tipo: "etapa",
            texto: pago ? "Solicitud y comprobante enviados" : "Solicitud registrada",
            autor: ALUMNA.nombre, rol: ALU, fecha: new Date().toISOString(),
          }],
        },
        ...prev,
      ]);
      setVista({ pantalla: "detalle", folio });
      mostrarAviso(`Solicitud ${folio} registrada.`);
    },
  }), [tramites.length]);

  const mios = rol === ALU ? tramites.filter((tr) => tr.matricula === ALUMNA.matricula) : tramites;
  const bandeja = tramites.filter((tr) => infoTramite(tr).etapa.actor === rol);
  const abierto = tramites.find((tr) => tr.folio === vista.folio);
  const operacionesUsadas = tramites.map((tr) => tr.pago?.operacion).filter(Boolean);

  const irA = (pantalla, folio = null) => setVista({ pantalla, folio });

  const identidad =
    rol === ALU ? `${ALUMNA.nombre} · ${ALUMNA.matricula}` : rol;

  return (
    <div className="min-h-screen" style={{ background: C.gris100, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Barra de prototipo */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5" style={{ background: C.gris700 }}>
        <span className="mr-2 text-[11px] font-semibold tracking-wide" style={{ color: C.gris200 }}>
          PROTOTIPO · cambia de rol para ver la misma información
        </span>
        {ROLES.map((r) => {
          const Icono = r.icono;
          const activo = rol === r.id;
          return (
            <button
              key={r.id}
              onClick={() => { setRol(r.id); irA(r.id === "Coordinación" ? "tablero" : r.id === ADM ? "validacion" : "lista"); }}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium"
              style={{ background: activo ? C.blanco : "transparent", color: activo ? C.azul900 : C.gris200 }}
            >
              <Icono size={14} /> {r.etiqueta}
            </button>
          );
        })}
      </div>

      {/* Barra institucional */}
      <header className="flex items-center gap-4 px-6 py-3.5 sm:px-10" style={{ background: C.azul900 }}>
        <span
          className="rounded px-2.5 py-1.5 text-[9px] font-semibold"
          style={{ border: `1px dashed ${C.gris500}`, color: C.gris400 }}
        >
          ESCUDO UV
        </span>
        <span className="text-base font-semibold" style={{ color: C.blanco }}>Ventanilla Virtual</span>
        <span className="ml-auto text-[13px]" style={{ color: C.gris200 }}>{identidad}</span>
      </header>

      {aviso && (
        <div className="px-6 pt-4 sm:px-10">
          <div className="rounded-lg px-4 py-2.5 text-[13px]" style={{ background: C.verde100, color: C.verde600 }}>
            {aviso}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-8">
        {/* ---------------- Alumno ---------------- */}
        {rol === ALU && vista.pantalla === "lista" && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[2fr_1fr]">
              <InfoCard
                icon={GraduationCap}
                label="PROGRAMA EDUCATIVO"
                value="Contaduría · Modalidad virtual"
                sub="Facultad de Contaduría y Administración — Xalapa"
              />
              <InfoCard icon={IdCard} label="MATRÍCULA" value={ALUMNA.matricula} />
            </div>

            <Card
              title="Mis trámites"
              right={<Boton onClick={() => irA("nueva")}>Nueva solicitud</Boton>}
            >
              <div className="flex flex-wrap gap-2 px-5 pt-4">
                <Pill tono="azul">
                  Requieren tu acción: {mios.filter((tr) => infoTramite(tr).etapa.actor === ALU && !infoTramite(tr).concluido).length}
                </Pill>
                <Pill tono="ambar">Fuera de plazo: {mios.filter((tr) => infoTramite(tr).retrasado).length}</Pill>
                <Pill tono="verde">Concluidos: {mios.filter((tr) => infoTramite(tr).concluido).length}</Pill>
              </div>
              <div className="pt-4">
                <Tabla tramites={mios} onAbrir={(f) => irA("detalle", f)} />
              </div>
            </Card>
          </div>
        )}

        {rol === ALU && vista.pantalla === "nueva" && (
          <NuevaSolicitud acciones={acciones} onVolver={() => irA("lista")} operacionesUsadas={operacionesUsadas} />
        )}

        {/* ---------------- Secretaría ---------------- */}
        {rol === SEC && vista.pantalla === "lista" && (
          <div className="space-y-3.5">
            <h1 className="text-xl font-semibold" style={{ color: C.azul900 }}>Bandeja de Secretaría</h1>
            <Card title={`Te toca actuar (${bandeja.length})`}>
              <Tabla tramites={bandeja} onAbrir={(f) => irA("detalle", f)} mostrarAlumno />
            </Card>
            <Card
              title="Todos los trámites"
              right={<Search size={16} color={C.gris400} />}
            >
              <Tabla tramites={tramites} onAbrir={(f) => irA("detalle", f)} mostrarAlumno />
            </Card>
          </div>
        )}

        {/* ---------------- Administración ---------------- */}
        {rol === ADM && vista.pantalla === "validacion" && (
          <div className="space-y-3.5">
            <h1 className="text-xl font-semibold" style={{ color: C.azul900 }}>Validación de pagos</h1>
            <Validacion tramites={tramites} acciones={acciones} />
          </div>
        )}

        {/* ---------------- Coordinación ---------------- */}
        {rol === "Coordinación" && vista.pantalla === "tablero" && (
          <div className="space-y-3.5">
            <h1 className="text-xl font-semibold" style={{ color: C.azul900 }}>Tablero de la Coordinación</h1>
            <Tablero tramites={tramites} onAbrir={(f) => irA("detalle", f)} />
          </div>
        )}

        {/* ---------------- Detalle (todos los roles) ---------------- */}
        {vista.pantalla === "detalle" && abierto && (
          <Detalle
            tr={abierto}
            rol={rol}
            acciones={acciones}
            onVolver={() => irA(rol === "Coordinación" ? "tablero" : rol === ADM ? "validacion" : "lista")}
          />
        )}
      </main>
    </div>
  );
}
