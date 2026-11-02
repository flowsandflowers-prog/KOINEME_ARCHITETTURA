// I testi del modello «La Soglia». È l'UNICA fonte di testo del modello:
// la scena, il pannello e la voce prendono le parole solo da qui.
//
// Tre provenienze, tenute separate:
//   1. PROMPT  → copiato alla lettera da fonte/PROMPT_MODULO_1.md.
//                scripts/verifica-testi.mjs controlla che ogni stringa ci sia, carattere per carattere
//                (è ammessa solo la maiuscola iniziale, quando un pezzo diventa etichetta: decisione D2).
//   2. APPROVATI → parole che non sono nel prompt ma che hai approvato in chat (con la data).
//   3. PROPOSTE  → parole mie, da approvare. Finché sono qui il controllo le segnala.

/* ===================== 1. PROMPT ===================== */

// Gli spazi, nell'ordine del prompt. «stato» è il pezzo dell'elenco iniziale che va sotto il nome (D2, punto 4).
export const SPAZI = {
  edificio: {
    nome: "L'edificio",
    testo: ["Quello che abbiamo attraversato ha una forma, e ogni spazio ha un nome."],
    nota: "Trascina per girarci intorno. Tocca un nome per entrare.",
  },
  quote: {
    nome: "Le quote",
    testo: ["Il piano di sopra. La quota in cui accadono gli episodi, e in cui si vive. Qui ci sono le pareti, e per questo qui esistono i confini: le distinzioni che abbiamo fatto in questo modulo valgono a questa quota e non altrove."],
    nota: "Sotto: il piano di sotto, poi le fondamenta.",
  },
  soglia: {
    nome: "La Soglia",
    stato: "la valutazione",
    testo: [
      "L'atrio. Lo spazio da cui ogni altro spazio è raggiungibile, e in cui si legge in quale si sta andando. È quello che li distribuisce.",
      "È dove siamo stati per tutta quest'ora, e si chiama la Soglia.",
    ],
    formula: "La Soglia (Scherer) · il verbo è distinguere · la domanda è riguarda che cosa?",
  },
  stanza: {
    nome: "La stanza",
    stato: "l'emozione",
    testo: ["L'episodio sincronizzato: un oggetto, una valutazione, le componenti allineate. Ha una porta, quindi si entra e si esce, e la permanenza si misura in secondi o minuti. È l'emozione, e la sua proprietà architettonica è di essere l'unico di questi spazi che ha un dentro."],
    formula: "Dentro, i quattro passi · C Costruisci · O Onora · R Riconosci · E Espandi",
    nota: "Intorno, otto stanze ancora chiuse.",
  },
  anticamera: {
    nome: "L'anticamera",
    stato: "l'atteggiamento",
    testo: ["Sei girato verso qualcuno, in posizione, e la porta non si è aperta. È l'atteggiamento: una prontezza con un oggetto preciso e senza episodio. In anticamera si può stare anni, e il passaggio nella stanza accade in pochi secondi, quando le componenti si allineano."],
  },
  corridoio: {
    nome: "Il corridoio",
    stato: "il pensiero",
    testo: ["Passaggio, e non destinazione. È il pensiero, la valutazione senza corpo: da qui si parla delle stanze stando fuori da tutte. E un pensiero che prova a entrare e non riesce resta a camminare lì, avanti e indietro, e cammina perché la porta non si apre. Quella è la ruminazione."],
  },
  mezzanino: {
    nome: "Il mezzanino",
    stato: "la stance interpersonale",
    testo: ["Mezza quota fra la stanza e la struttura, raggiungibile da entrambe e identico a nessuna delle due. Diffidenza verso una persona precisa, per tutto l'incontro: dura troppo per essere un episodio, e la valutazione da cui nasce è parziale, perché si riaccende quando quella persona compare e si abbassa quando esce. Durata intermedia, valutazione intermedia, quota intermedia."],
  },
  vie: {
    nome: "Le due vie",
    testo: [
      "La Soglia si attraversa sempre. I quattro passi no.",
      "L'esito che manda al piano di sotto è il più frequente dei due, e per questo l'atrio serve più delle stanze.",
    ],
    formula: "SOGLIA → C.O.R.E.",
  },
  sotto: {
    nome: "Il piano di sotto",
    stato: "il core affect",
    testo: [
      "Il sentire di fondo: valenza e attivazione, sempre presente, senza oggetto. È un pavimento continuo e senza pareti, e lo percorri tutto il giorno senza accorgerti di farlo, come si percorre un piano vuoto. Ha una quota, e la quota è la linea di base. Quando lo stato a quella quota si prolunga per ore o per giorni, quello è restare a quota, ed è l'umore.",
      "I quattro appoggi del piano di sotto: sonno, cibo, acqua, movimento. Tengono il pavimento alla sua quota.",
    ],
    nota: "Muovi la quota e l'ampiezza: tutto l'edificio risponde.",
  },
  fondamenta: {
    nome: "Le fondamenta",
    stato: "i sentimenti omeostatici",
    testo: ["Lo strato il cui oggetto è il corpo: fame, sete, stanchezza, dolore, nausea, malessere, benessere. Nessuno visita le proprie fondamenta, e le fondamenta si sentono in ogni stanza. Quando cedono di un millimetro, le porte di sopra smettono di chiudere, e in genere si cerca il guasto nelle porte."],
  },
  struttura: {
    nome: "La struttura dell'edificio",
    stato: "il tratto",
    testo: ["Quali porte sono larghe, quali stanze grandi, quali passaggi stretti. È il tratto disegnato della mappa, e non è un posto in cui ti trovi: è il modo in cui la tua casa è costruita."],
  },
};
export const ORDINE = ['edificio', 'quote', 'soglia', 'stanza', 'anticamera', 'corridoio', 'mezzanino', 'vie', 'sotto', 'fondamenta', 'struttura'];

// Pezzi dei testi usati come etichette nella scena e nei comandi (D2: sì).
export const ETICHETTE = {
  ruminazione: "la ruminazione",               // la figura nel corridoio
  passi: ["C Costruisci", "O Onora", "R Riconosci", "E Espandi"], // dentro la stanza
  appoggiTitolo: "I quattro appoggi del piano di sotto",
  appoggi: ["sonno", "cibo", "acqua", "movimento"],
  corpo: ["fame", "sete", "stanchezza", "dolore", "nausea", "malessere", "benessere"], // nelle fondamenta
  quota: "La quota",                           // comando: il livello del serbatoio
  ampiezza: "L'ampiezza",                      // comando: la grandezza del serbatoio
  valenza: "valenza",
  attivazione: "attivazione",
  lineaDiBase: "la linea di base",
  voci: "Le voci dello Smistamento",
  tornaAllInsieme: "L'edificio",               // pulsante: torna alla vista d'insieme
};

// Lo Smistamento: le tre domande (intestazioni della tabella) e le tredici voci.
export const DOMANDE = ["Riguarda che cosa?", "Valutazione di rilevanza?", "Si muovono insieme?"];
export const DOVE_VA = "Dove va";
// spazio: dove arriva la voce nel modello (chiave di SPAZI)
export const VOCI = [
  { n: 1, voce: "Nausea a metà mattina, a stomaco vuoto.", risposte: ["il corpo", "no", "no"], doveVa: "sentimento omeostatico · le fondamenta", spazio: 'fondamenta' },
  { n: 2, voce: "«Avrebbero dovuto avvisarmi prima.»", risposte: ["loro, la mancanza", "sì", "no, solo contenuto mentale"], doveVa: "pensiero e giudizio · il corridoio", spazio: 'corridoio' },
  { n: 3, voce: "Il collega mi ha zittito davanti a tutti: il calore al viso, e la risposta che mi è partita subito.", risposte: ["il collega, quella frase", "sì", "sì"], doveVa: "emozione · la stanza", spazio: 'stanza' },
  { n: 4, voce: "Tenerezza guardando dormire una persona cara.", risposte: ["quella persona, adesso", "sì", "sì"], doveVa: "emozione · la stanza", spazio: 'stanza' },
  { n: 5, voce: "Stanchezza dopo una giornata cominciata all'alba.", risposte: ["il corpo", "no", "no"], doveVa: "sentimento omeostatico · le fondamenta", spazio: 'fondamenta' },
  { n: 6, voce: "Da sempre, davanti a qualunque imprevisto, sono il primo a preoccuparmi.", risposte: ["niente di preciso, qualunque imprevisto", "no, nessuna valutazione in corso", "no"], doveVa: "tratto · la struttura dell'edificio", spazio: 'struttura' },
  { n: 7, voce: "Ogni volta che ripenso a quella telefonata mi si stringe lo stomaco e mi viene la nausea.", risposte: ["la telefonata", "sì", "sì"], doveVa: "emozione · la stanza", spazio: 'stanza' },
  { n: 8, voce: "Ansia diffusa da settimane, che cambia oggetto ogni giorno.", risposte: ["niente di preciso, cambia ogni giorno", "no", "no"], doveVa: "core affect e umore · il piano di sotto", spazio: 'sotto' },
  { n: 9, voce: "Da tre settimane dormo male, e oggi ogni cosa che mi chiedono mi fa scattare.", risposte: ["niente di preciso, cambia ogni volta", "no", "no"], doveVa: "core affect e umore · il piano di sotto", spazio: 'sotto' },
  { n: 10, voce: "Vergogna dopo aver urlato.", risposte: ["quello che ho fatto", "sì", "sì"], doveVa: "emozione · la stanza", spazio: 'stanza' },
  { n: 11, voce: "L'affetto per quella stessa persona, anche adesso che non è qui.", risposte: ["quella persona", "sì, ma non adesso", "no"], doveVa: "atteggiamento · l'anticamera", spazio: 'anticamera' },
  { n: 12, voce: "«Questa giornata è cominciata troppo presto, ecco da dove viene questa stanchezza.»", risposte: ["la stanchezza", "sì", "no, solo contenuto mentale"], doveVa: "pensiero e giudizio · il corridoio", spazio: 'corridoio' },
  { n: 13, voce: "Diffidenza verso una collega, per tutta la riunione.", risposte: ["quella collega", "sì, ma parziale: si riaccende ogni volta che lei compare", "in parte"], doveVa: "stance interpersonale · il mezzanino", spazio: 'mezzanino' },
];

// Il paragrafo sulla stance interpersonale: dal prompt, da mostrare forse nella scheda del mezzanino
// (tua risposta: «b forse sì»). Resta spento finché non lo confermi.
export const MEZZANINO_SPIEGAZIONE = {
  attivo: false,
  testo: "La stance interpersonale (il mezzanino) è la posizione affettiva che si prende verso una persona precisa dentro un'interazione: dura quanto l'incontro, minuti o ore, e si riaccende ogni volta che quella persona compare. La disposizione stabile verso quella persona, che dura mesi, è invece un atteggiamento (l'anticamera).",
};

/* ===================== 2. APPROVATI IN CHAT ===================== */

// Le otto stanze chiuse: nomi e opposte una di fronte all'altra (risposta D3 e conferma del 2 novembre 2026).
// L'ordine è quello del giro: ogni stanza ha di fronte la quarta dopo di lei.
export const STANZE_CHIUSE = ["gioia", "fiducia", "paura", "sorpresa", "tristezza", "disgusto", "rabbia", "anticipazione"];

/* ===================== 3. PROPOSTE, DA APPROVARE ===================== */

// Testi d'interfaccia che nel prompt non ci sono (punto 3: «ti preparo l'elenco completo»).
export const INTERFACCIA = {
  titoloPagina: "KOINEME · La Soglia",
  faiEntrare: "Fai entrare la voce",
  voce: "Voce",
  suono: "Suono",
  mostraTesti: "Mostra i testi",
  nascondiTesti: "Nascondi i testi",
  caricamento: "Sto costruendo l'edificio",
  senza3D: "Il modello non si apre su questo dispositivo. I testi restano qui.",
};

// Raccordi della voce narrante (punto 6: «testi, aggiungendo frasi di raccordo»).
// Si sentono e si leggono come sottotitolo; stanno nel COPIONE.md con il nome del file da registrare.
export const RACCORDI = {
  apertura: "Prima di entrare lo guardiamo da fuori, tutto intero, così come lo vede chi arriva, e poi lo attraversiamo spazio per spazio.",
  voceEntra: "Adesso arriva una voce da fuori, e la seguiamo mentre passa sotto i tre archi della Soglia.",
  voceArriva: "Passati i tre archi, la Soglia la manda qui.",
  voceStruttura: "Questa voce resta nella Soglia, e intorno a lei l'edificio lascia vedere la sua struttura.",
  appoggiInvito: "Prova a togliere uno dei quattro appoggi e guarda che cosa succede al livello, e a tutto quello che ci sta sopra.",
};
