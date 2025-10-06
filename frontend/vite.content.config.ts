import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: "extension",
    emptyOutDir: false,
    rollupOptions: {
        input: "src/content-script.ts",
        output: {
            entryFileNames: "content-script.js",
            format: "iife"
        }
    }
  }})
