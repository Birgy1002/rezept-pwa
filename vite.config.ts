import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Standard Dev-Port für Vite
    proxy: {
      // Alle Anfragen an /proxy -> laufen automatisch auf den Node-Server (Port 3001)
      "/proxy": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
