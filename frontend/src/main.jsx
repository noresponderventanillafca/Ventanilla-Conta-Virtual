import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import Salvavidas from "./componentes/Salvavidas";
import { ProveedorSesion } from "./sesion";
import { C } from "./tokens";
import "./estilos.css";

/* La paleta se publica como variables CSS para que estilos.css pueda usar los
   mismos colores que los componentes. Sin esto habría que repetir los códigos
   hexadecimales en la hoja de estilos, y tarde o temprano una copia se quedaría
   atrás. tokens.js sigue siendo el único lugar donde se define un color. */
Object.entries(C).forEach(([nombre, valor]) =>
  document.documentElement.style.setProperty(`--${nombre}`, valor));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Salvavidas>
      <BrowserRouter>
        <ProveedorSesion>
          <App />
        </ProveedorSesion>
      </BrowserRouter>
    </Salvavidas>
  </React.StrictMode>
);
