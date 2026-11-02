# KOINEME · Architettura

L'edificio vivente del programma KOINEME: un modello tridimensionale esplorabile, nato dalla struttura del Modulo 1, *La Soglia*.

## Che cosa c'è

- `modulo-1/index.html` · il primo prototipo dell'edificio del Modulo 1: la Soglia (l'atrio), la stanza con le otto stanze ancora chiuse, l'anticamera, il corridoio, il mezzanino, le due vie, il piano di sotto con la linea di base, le fondamenta, la forma dell'edificio. Comprende la voce che attraversa le tre domande e una prima anteprima per l'incontro introduttivo.

- `modulo-1-v5/index.html` · quinta versione, copia della quarta con queste aggiunte: una schermata di caricamento che dice che cosa si sta costruendo; qualità ridotta in automatico su telefoni e dispositivi leggeri; il percorso con lo scorrimento, in cui la rotella, il dito o le frecce portano di spazio in spazio, con i punti delle tappe e la voce guida che legge ogni spazio; e, se il 3D non si carica, il quaderno resta leggibile con tutti i testi. La quarta versione resta intatta in `modulo-1/`.

I testi degli spazi sono quelli della regia del Modulo 1, blocco 8.

- `modulo-1-v5x/` · la quinta versione rifondata su three.js 0.187 (da npm, non più da CDN): `index.html` più `main.js`. Pietre, gradini, nodi e capitelli ripetuti sono InstancedMesh; un solo sole proietta l'ombra, con una mappa piccola; il cono di luce del pozzo è cotto in una texture; il loop non crea oggetti nuovi; alla chiusura della pagina tutto viene liberato. Gli spazi rispondono al puntatore e al tocco (nome al passaggio, clic per entrare) e un pannello *Regolazioni* (lil-gui) regola luci, ombre, nebbia, piano di sotto e risoluzione. Con `?debug` nell'indirizzo espone `window.__koineme` per misurare il renderer.
- `index.html` e `src/main.js` · la scena di base del progetto: tre archi di pietra, uno per versione; si attraversano con un tocco.
- `src/lib/` · i moduli condivisi: `dispose.js` (liberare geometrie, materiali e texture) e `picker.js` (un solo Raycaster, eventi pointer, raggio limitato a `objectsToIntersect`).
- `.claude/skills/` · le regole che Claude segue in questo progetto: `3d-web-experience`, `frontend-design`, `threejs-performance`, `threejs-interaction`.

## Come si apre

È una sola pagina web. Si apre in un browser, oppure, con GitHub Pages attivo, a un indirizzo pubblico.

### Con le librerie npm (scena di base e v5x)

Serve Node 20 o più recente.

```bash
npm install
npm run dev      # sviluppo, con ricarica automatica
npm run build    # sito completo in dist/, da pubblicare
npm run preview  # prova di dist/ in locale
```

`modulo-1/` e `modulo-1-v5/` continuano a funzionare anche aperte direttamente, senza build.

