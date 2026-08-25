/* ─────────────────────────────────────────────────────────────
   LA HISTORIA REAL.
   Edita los nombres y el año aquí: es lo único que necesitas
   cambiar para que la línea de tiempo sea 100% de ustedes dos.
   ───────────────────────────────────────────────────────────── */
const YO = 'Carlos';
const ELLA = 'Diesslly';
const VICTOR = 'Víctor';
const AMIGO = 'Tu amigo';       // <-- el ingeniero de sistemas, novio de su amiga
const SU_AMIGA = 'Su amiga';    // <-- la abogada que la invitó a la fiesta
const ANIO = 2026;              // año en que se conocieron
/* ───────────────────────────────────────────────────────────── */

export const historia = [
  {
    title: `${VICTOR}, el primer hilo`,
    date: new Date(`${ANIO - 3}-03-15T20:00:00`),
    kind: 'origen' as const,
    emoji: '🧵',
    importance: 4,
    isPivot: true,
    people: [YO, VICTOR],
    place: '',
    description:
      `Mucho antes de que ${ELLA} existiera en tu mundo, existió ${VICTOR}. Nadie lo sabía ` +
      `todavía, pero ese primer hilo era el que sostenía todo lo demás. Sin ${VICTOR}, ninguna ` +
      `de las líneas que siguen llega a tocarse jamás.\n\n(Ajusta esta fecha a cuando lo conociste de verdad.)`,
  },
  {
    title: `${VICTOR} te presenta a ${AMIGO}`,
    date: new Date(`${ANIO - 2}-06-10T19:00:00`),
    kind: 'origen' as const,
    emoji: '🤝',
    importance: 4,
    isPivot: true,
    people: [YO, VICTOR, AMIGO],
    place: '',
    description:
      `${VICTOR} te presenta a ${AMIGO}, ingeniero de sistemas como tú. Fue una presentación ` +
      `cualquiera, de esas que uno no anota en ningún lado. Pero el universo sí la anotó: acababa ` +
      `de colocar la pieza que, dos años después, te iba a poner en la misma sala que ella.`,
  },
  {
    title: `${AMIGO} y ${SU_AMIGA} empiezan a salir`,
    date: new Date(`${ANIO - 1}-02-14T21:00:00`),
    kind: 'conexion' as const,
    emoji: '💞',
    importance: 4,
    isPivot: true,
    people: [AMIGO, SU_AMIGA],
    place: '',
    description:
      `Aquí pasa algo enorme sin que tú te enteres: ${AMIGO} se hace novio de ${SU_AMIGA}, abogada, ` +
      `amiga de ${ELLA}. En ese instante tu línea y la de ${ELLA} dejan de ser dos mundos separados ` +
      `y quedan a un solo paso de distancia. Un paso que todavía faltaba por dar.`,
  },
  {
    title: 'Dos invitaciones para la misma fiesta',
    date: new Date(`${ANIO}-07-16T12:00:00`),
    kind: 'conexion' as const,
    emoji: '✉️',
    importance: 5,
    isPivot: true,
    people: [YO, ELLA, AMIGO, SU_AMIGA],
    place: 'La fiesta',
    description:
      `${SU_AMIGA} invita a ${ELLA}, porque son abogadas y son amigas.\n` +
      `${AMIGO} te invita a ti, porque son ingenieros de sistemas y son amigos.\n\n` +
      `Dos invitaciones distintas, hechas por razones distintas, que apuntaban sin saberlo ` +
      `al mismo lugar y a la misma noche. Este es el punto nexo: si una sola de las dos no se ` +
      `hubiera enviado, la fiesta habría pasado igual y ustedes nunca se habrían visto.\n\n` +
      `(Ajusta la fecha al día en que realmente los invitaron.)`,
  },
  {
    title: 'La noche en que se conocieron',
    date: new Date(`${ANIO}-07-18T22:30:00`),
    kind: 'encuentro' as const,
    emoji: '💃',
    importance: 5,
    isPivot: true,
    people: [YO, ELLA],
    place: 'La fiesta',
    description:
      `18 de julio. Todas las líneas de arriba (${VICTOR}, ${AMIGO}, ${SU_AMIGA}, las dos ` +
      `invitaciones) existieron únicamente para llegar a este punto exacto.\n\n` +
      `Se conocieron. Y bailaron por primera vez.\n\n` +
      `De todos los futuros posibles, este es el único donde ${YO} y ${ELLA} están en la misma ` +
      `canción al mismo tiempo.`,
  },
  {
    title: `Le pides a ${ELLA} que sea tu novia`,
    date: new Date(`${ANIO}-08-18T20:00:00`),
    kind: 'hito' as const,
    emoji: '💍',
    importance: 5,
    isPivot: false,
    people: [YO, ELLA],
    place: '',
    description:
      `Un mes exacto después de la primera canción, el 18 de agosto, se lo preguntaste.\n\n` +
      `Y dijo que sí.\n\n` +
      `A partir de aquí la línea deja de ser casualidad y empieza a ser decisión: ya no es el ` +
      `universo el que los junta, son ustedes dos los que eligen quedarse.`,
  },
];
