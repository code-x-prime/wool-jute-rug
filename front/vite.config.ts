import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  preview: {
    port: 4174,
    host: "0.0.0.0",
    allowedHosts: [
      "admin.wooljuterug.com",
      "www.admin.wooljuterug.com",
    ],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: [
      "admin.wooljuterug.com",
      "www.admin.wooljuterug.com",
    ],
  },
});
