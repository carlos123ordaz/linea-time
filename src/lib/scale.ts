import type { TimelineEvent } from '../types';

const PAD = 220;
const MIN_GAP = 190;
const LOG_K = 95;
const DIA = 86_400_000;

export interface TimeScale {
  width: number;
  dateToX: (d: string | Date) => number;
  anchors: Array<{ t: number; x: number }>;
}

/**
 * Escala de tiempo comprimida: la distancia entre dos momentos crece con el
 * logaritmo de los dias que los separan. Asi los tres anios de "origen" caben
 * en pantalla sin aplastar los dias que importan de este verano.
 */
export function buildScale(events: TimelineEvent[]): TimeScale {
  const times = [...new Set(events.map((e) => new Date(e.date).getTime()))].sort((a, b) => a - b);

  if (times.length === 0) {
    return { width: 1200, dateToX: () => PAD, anchors: [] };
  }

  const anchors: Array<{ t: number; x: number }> = [{ t: times[0], x: PAD }];
  for (let i = 1; i < times.length; i++) {
    const dias = (times[i] - times[i - 1]) / DIA;
    const paso = MIN_GAP + LOG_K * Math.log10(1 + Math.max(0, dias));
    anchors.push({ t: times[i], x: anchors[i - 1].x + paso });
  }

  const width = anchors[anchors.length - 1].x + PAD;

  // Ritmo por defecto para extrapolar fuera del rango conocido.
  const ritmo =
    anchors.length > 1
      ? (anchors[anchors.length - 1].x - anchors[0].x) /
        Math.max(1, anchors[anchors.length - 1].t - anchors[0].t)
      : MIN_GAP / (30 * DIA);

  function dateToX(d: string | Date): number {
    const t = new Date(d).getTime();
    if (!Number.isFinite(t)) return anchors[anchors.length - 1].x;

    if (t <= anchors[0].t) return anchors[0].x - (anchors[0].t - t) * ritmo;
    const last = anchors[anchors.length - 1];
    if (t >= last.t) return last.x + (t - last.t) * ritmo;

    for (let i = 1; i < anchors.length; i++) {
      const a = anchors[i - 1];
      const b = anchors[i];
      if (t <= b.t) {
        const f = (t - a.t) / Math.max(1, b.t - a.t);
        return a.x + f * (b.x - a.x);
      }
    }
    return last.x;
  }

  return { width, dateToX, anchors };
}

/** Ondulacion suave del hilo principal: la linea nunca es perfectamente recta. */
export function strandX(y: number, cx: number): number {
  return cx + Math.sin(y / 190) * 11 + Math.sin(y / 61 + 1.2) * 4;
}

/** Path SVG del hilo principal (vertical). */
export function strandPath(height: number, cx: number, step = 14): string {
  let d = '';
  for (let y = 0; y <= height; y += step) {
    d += `${y === 0 ? 'M' : 'L'} ${strandX(y, cx).toFixed(1)} ${y.toFixed(1)} `;
  }
  return d;
}
