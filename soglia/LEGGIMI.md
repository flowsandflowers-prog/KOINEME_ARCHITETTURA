# La Soglia · il modello 3D dell'edificio del Modulo 1, da capo

Stato: prima versione navigabile del modello (`index.html`, `main.js`, `mondo.js`), costruita sulla quarta prova visiva. Gli studi restano in `studio/`.

| File | Che cos'è |
|---|---|
| `fonte/PROMPT_MODULO_1.md` | Il prompt del Modulo 1, così come l'hai dato: l'unica fonte dei testi. |
| `testi.js` | Tutti i testi del modello, in tre blocchi: dal prompt (alla lettera), approvati in chat, proposte mie da approvare. |
| `COPIONE.md` | Il copione della voce narrante da registrare: 58 pezzi, ognuno con il nome del file. Si genera da `testi.js`. |
| `index.html`, `main.js`, `mondo.js` | Il modello: due modi (Racconta, Attraversa), gli spazi con i testi, le tredici voci dello Smistamento, il piano di sotto con quota, ampiezza, valenza, attivazione e i quattro appoggi. |
| `../public/soglia/voce/` | Le registrazioni della voce narrante: un file per pezzo del copione, e il suo nome in `elenco.json`. Finché un file manca, legge la voce sintetica. |
| `../public/soglia/modelli/volpe.glb` | Proposta per il compagno: «Fox» dei glTF Sample Assets di Khronos, CC-BY 4.0: modello di PixelMannen, rig e animazioni di @tomkranis, conversione di @AsoboStudio e @scurest. |
| `../public/soglia/modelli/cicogna.glb`, `pappagallo.glb` | Proposte per il compagno: «Stork» e «Parrot» dagli esempi di three.js (r171), animali animati di mirada.com per ro.me. |
| `../public/soglia/modelli/animali/` | Varianti per il mutaforma: lupo, cane, cervo, cerva, cavallo, toro, alpaca dal pacchetto «Ultimate Animated Animals» di Quaternius (CC0, tramite il progetto danwahl/animasim), alleggeriti; il fenicottero dagli esempi di three.js (r171). |
| `../public/soglia/modelli/animali/lepre.glb`, `lepre_*.webp` | La lepre: «Rabbit» di Čestmír Dammer (kelgar.org), CC0, fornita da te; convertita dal `.blend`, con le sue animazioni (corsa, salto, guardia, seduta). |
| `studio/animali.html` | Gli animali disponibili per il mutaforma, uno per riquadro. |
| `studio/daemon.html` | Le cinque proposte per sostituire il manichino: volpe, cicogna, mutaforma, sciame, filo. |
| `mutaforma.js` | Il mutaforma: davanti al primo passaggio vaga sulla piattaforma e, a caso, si scioglie in polvere e si ricompone in un altro animale (cervo, volpe, lepre, cicogna). |
| `abitanti.js` | Anteprima dei percorsi (si apre con `?percorsi`): un animale in ogni spazio di destinazione, per decidere l'abbinamento. |
| `studio/` | Gli studi visivi e le immagini in `studio/immagini/`. |

Comandi:

```bash
npm run testi     # controlla che ogni testo del prompt sia copiato alla lettera, ed elenca le proposte in sospeso
npm run copione   # rigenera COPIONE.md da testi.js
```

Decisioni prese in chat (2 novembre 2026): disposizione A (la Soglia sola, a una quota sua; una via sale, una scende); la struttura è l'ossatura in tubi di cartone, invisibile da fuori e visibile come pianta in trasparenza; il piano di sotto è un serbatoio (quota = livello, ampiezza = grandezza); le otto stanze chiuse hanno i nomi di Plutchik, con le opposte una di fronte all'altra; voce narrante sempre guidata, da registrare; tappeto sonoro generato; plastico in sezione, legno, bambù, carta, cartone.
