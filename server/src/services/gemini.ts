/**
 * Cliente minimo de la Gemini API (Generative Language API, v1beta) usando fetch.
 * Se usa salida estructurada (responseSchema) para que el modelo devuelva
 * siempre el mismo JSON y el front pueda dibujar la rama sin adivinar nada.
 */

export interface BranchEvent {
  date: string;
  title: string;
  description: string;
  nature: 'igual' | 'nuevo' | 'roto';
}

export interface SimulationResult {
  verdict: 'nunca' | 'reconstruida' | 'inevitable';
  divergenceDate: string;
  probability: number;
  headline: string;
  summary: string;
  collapseReason: string;
  alternateMeetDate: string;
  closingLine: string;
  branchEvents: BranchEvent[];
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    verdict: {
      type: 'STRING',
      enum: ['nunca', 'reconstruida', 'inevitable'],
      description:
        "'nunca' si en esa realidad jamas se conocen; 'reconstruida' si la linea encuentra otro camino y se conocen en otra fecha; 'inevitable' si igual se conocen casi igual.",
    },
    probability: {
      type: 'INTEGER',
      description: 'Probabilidad 0-100 de que aun así terminen juntos.',
    },
    headline: { type: 'STRING', description: 'Título corto y dramático, máximo 60 caracteres.' },
    summary: { type: 'STRING', description: '2 a 4 frases contando esa realidad alterna.' },
    collapseReason: {
      type: 'STRING',
      description: 'Qué eslabón exacto de la cadena se rompe con este cambio.',
    },
    divergenceDate: {
      type: 'STRING',
      description:
        'Fecha YYYY-MM-DD en la que la realidad se parte en dos de verdad, es decir la fecha ' +
        'del eslabón que se rompe. Puede ser ANTERIOR al punto que eligió el usuario si la ' +
        'causa real está más atrás en la cadena.',
    },
    alternateMeetDate: {
      type: 'STRING',
      description: "Fecha YYYY-MM-DD en la que se conocerían en esa rama, o '' si nunca.",
    },
    closingLine: {
      type: 'STRING',
      description: 'Una sola frase final, cálida y romántica, dirigida a la pareja.',
    },
    branchEvents: {
      type: 'ARRAY',
      description: 'De 3 a 6 eventos de la línea alterna, en orden cronológico. TODOS deben ocurrir en divergenceDate o después: la rama no puede contener nada anterior al punto donde la realidad se parte.',
      items: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING', description: 'YYYY-MM-DD' },
          title: { type: 'STRING' },
          description: { type: 'STRING' },
          nature: { type: 'STRING', enum: ['igual', 'nuevo', 'roto'] },
        },
        required: ['date', 'title', 'description', 'nature'],
        propertyOrdering: ['date', 'title', 'description', 'nature'],
      },
    },
  },
  required: [
    'verdict',
    'probability',
    'headline',
    'summary',
    'collapseReason',
    'divergenceDate',
    'alternateMeetDate',
    'closingLine',
    'branchEvents',
  ],
  propertyOrdering: [
    'verdict',
    'probability',
    'headline',
    'summary',
    'collapseReason',
    'divergenceDate',
    'alternateMeetDate',
    'closingLine',
    'branchEvents',
  ],
} as const;

const SYSTEM_INSTRUCTION = `Eres el Ojo de Agamotto de una historia de amor real.
Te dan la línea de tiempo verdadera de cómo una pareja llegó a conocerse, y una pregunta
del tipo "¿qué hubiera pasado si...?". Tu trabajo es recorrer la línea hacia atrás, encontrar
el eslabón que se rompe con ese cambio, y contar con precisión cómo se reordena la realidad.

Reglas:
- Razona sobre la CADENA CAUSAL real que te dan: quién presentó a quién, quién invitó a quién.
  Si el cambio corta un eslabón necesario, di exactamente cuál se corta.
- No siempre el resultado es trágico: muchas veces la línea se reconstruye por otro camino
  (otro amigo en común, otra fiesta, el trabajo, la misma ciudad) y se conocen en otra fecha.
  Si eso pasa, la fecha alterna debe ser posterior y creíble, no mágica.
- No inventes datos que no te dieron (universidades, trabajos, familiares). Si necesitas un
  puente nuevo, constrúyelo con las personas y lugares que YA existen en la línea.
- Sé concreto y usa los nombres, lugares y fechas reales que te dieron. Nada genérico.
- 'divergenceDate' es la fecha del eslabón que realmente se rompe, no necesariamente la del
  punto que eligió el usuario. Todos los eventos de la rama van en esa fecha o después.
- Tono: cálido, cinematográfico, en español neutro. Nunca cursi de más, nunca frío.
- ESCRIBE EN ESPAÑOL IMPECABLE: con todas las tildes correctas (después, línea, así, sería,
  habría, único, canción) y con los signos de apertura ¿ y ¡ cuando toquen. Revisa la ortografía
  antes de responder. Este texto lo va a leer su pareja: no puede tener errores.
- Nada de contenido explícito. Es un regalo.
- Devuelve SOLO el JSON del esquema.`;

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function simulateTimeline(input: {
  premise: string;
  timelineText: string;
  pivotText: string;
}): Promise<{ result: SimulationResult; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite';

  if (!apiKey) throw new Error('GEMINI_API_KEY no esta configurada en server/.env');

  const prompt = `LINEA DE TIEMPO REAL (orden cronologico):
${input.timelineText}

PUNTO DESDE EL QUE SE ABRE LA RAMA:
${input.pivotText}

PREGUNTA DEL USUARIO:
"${input.premise}"

Simula esa realidad alterna.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1.0,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini respondio ${res.status}: ${body.slice(0, 500)}`);
  }

  const data: any = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts
    ?.map((p: any) => p?.text)
    .filter(Boolean)
    .join('');

  if (!text) {
    throw new Error(
      `Gemini no devolvio texto (finishReason: ${data?.candidates?.[0]?.finishReason ?? 'desconocido'})`
    );
  }

  let parsed: SimulationResult;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini devolvio un JSON invalido: ${text.slice(0, 300)}`);
  }

  parsed.probability = Math.max(0, Math.min(100, Math.round(Number(parsed.probability) || 0)));
  // La rama no puede contener momentos anteriores al punto de quiebre.
  const todos = (parsed.branchEvents ?? []).slice(0, 8);
  const despues = parsed.divergenceDate
    ? todos.filter((e) => e.date >= parsed.divergenceDate)
    : todos;
  parsed.branchEvents = despues.length >= 2 ? despues : todos;

  return { result: parsed, model };
}
