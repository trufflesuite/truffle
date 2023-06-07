import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "src/docs",
  build: { outDir: "../../docs", emptyOutDir: true },
  plugins: [react({ jsxRuntime: "classic" })]
});
