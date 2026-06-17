import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  define: {
    "process.env": {},
  },
  plugins: [react()],
  resolve: {
    alias: {
      "fengari/src/lualib.js": fileURLToPath(new URL("./src/shims/fengari-lualib.js", import.meta.url)),
      os: fileURLToPath(new URL("./src/shims/os.js", import.meta.url)),
    },
  },
});
