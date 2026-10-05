import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // El backend usa cookies de sesión: el proxy evita problemas de CORS
    // y de SameSite durante el desarrollo.
    //
    // 127.0.0.1 y no "localhost": en Windows con Node moderno, "localhost"
    // se resuelve primero a IPv6 (::1) y Flask solo escucha en IPv4, lo que
    // produce un ECONNREFUSED aunque el backend esté corriendo.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        // Sin esto, un backend apagado solo deja un error en la consola de
        // Vite y la pantalla se queda en blanco sin explicar por qué.
        configure: (proxy) => {
          proxy.on("error", (err, req, res) => {
            if (res.writeHead && !res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" });
            }
            res.end(JSON.stringify({
              error: "No se pudo conectar con el servidor. ¿Está corriendo Flask "
                     + "en el puerto 5000?",
            }));
          });
        },
      },
    },
  },
});
