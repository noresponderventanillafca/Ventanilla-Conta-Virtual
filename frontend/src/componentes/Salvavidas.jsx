import { Component } from "react";

/* Sin esto, cualquier error de JavaScript deja la página en blanco y sin
   pista de qué pasó. Con una sola persona manteniendo el sistema, eso cuesta
   horas de depuración a ciegas. */
export default class Salvavidas extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Error no controlado:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: 40, fontFamily: "system-ui, sans-serif", color: "#3A4550" }}>
        <h1 style={{ color: "#B3261E", fontSize: 20, margin: 0 }}>
          Algo falló en la interfaz
        </h1>
        <p style={{ fontSize: 14, marginTop: 8 }}>
          Recarga la página. Si vuelve a pasar, este es el detalle técnico:
        </p>
        <pre style={{ background: "#F4F6F8", padding: 16, borderRadius: 8,
                      fontSize: 12, overflowX: "auto" }}>
          {String(this.state.error?.stack || this.state.error)}
        </pre>
      </div>
    );
  }
}
