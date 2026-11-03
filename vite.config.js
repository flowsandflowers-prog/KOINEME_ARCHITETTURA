import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Più pagine nello stesso sito: la scena di base e le versioni dell'edificio.
// base './' perché il sito funzioni anche in una sottocartella (GitHub Pages).
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        modulo1: resolve(import.meta.dirname, 'modulo-1/index.html'),
        modulo1v5: resolve(import.meta.dirname, 'modulo-1-v5/index.html'),
        modulo1v5x: resolve(import.meta.dirname, 'modulo-1-v5x/index.html'),
        soglia: resolve(import.meta.dirname, 'soglia/index.html'),
        sogliaStudio: resolve(import.meta.dirname, 'soglia/studio/index.html'),
        sogliaDirezioni: resolve(import.meta.dirname, 'soglia/studio/direzioni.html'),
        sogliaMatrice: resolve(import.meta.dirname, 'soglia/studio/matrice.html'),
        sogliaMatrice2: resolve(import.meta.dirname, 'soglia/studio/matrice2.html'),
        sogliaMatrice3: resolve(import.meta.dirname, 'soglia/studio/matrice3.html'),
        sogliaMatrice4: resolve(import.meta.dirname, 'soglia/studio/matrice4.html'),
        sogliaDaemon: resolve(import.meta.dirname, 'soglia/studio/daemon.html'),
        sogliaAnimali: resolve(import.meta.dirname, 'soglia/studio/animali.html'),
      },
      // three.js in un file a sé: resta in cache tra una pagina e l'altra
      output: { manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined) },
    },
    chunkSizeWarningLimit: 700,
  },
});
