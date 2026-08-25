import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Simulation, TimelineEvent } from '../types';
import { buildScale, strandPath, strandY } from '../lib/scale';
import { fechaCorta } from '../lib/format';

const HEIGHT = 720;
const CY = HEIGHT / 2;

/** Paleta pensada para papel claro: oro oscurecido y colores saturados. */
const VERDICT_COLOR: Record<Simulation['verdict'], { core: string; glow: string; soft: string }> = {
  nunca: { core: '#c0392b', glow: '#e05c4a', soft: 'rgba(192, 57, 43, 0.16)' },
  reconstruida: { core: '#0e7c93', glow: '#3fb6cf', soft: 'rgba(14, 124, 147, 0.16)' },
  inevitable: { core: '#17845a', glow: '#3fbe8c', soft: 'rgba(23, 132, 90, 0.16)' },
};

/** RNG con semilla: los filamentos decorativos no deben bailar en cada render. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Props {
  events: TimelineEvent[];
  simulation: Simulation | null;
  selectedId: string | null;
  onSelect: (e: TimelineEvent) => void;
  zoom: number;
  onZoom: (delta: number) => void;
}

export function TimelineCanvas({ events, simulation, selectedId, onSelect, zoom, onZoom }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<SVGPathElement>(null);
  const [branchPoints, setBranchPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [edges, setEdges] = useState({ left: false, right: false });

  const scale = useMemo(() => buildScale(events), [events]);

  /* ── Geometría de la rama alterna ───────────────────────────── */
  const branch = useMemo(() => {
    if (!simulation) return null;

    // La rama nace donde la realidad se parte de verdad. Gemini puede ubicar ese
    // punto antes del que eligió el usuario, si la causa real está más atrás.
    const div = simulation.divergenceDate ? new Date(simulation.divergenceDate) : null;
    const quiebre =
      div && Number.isFinite(div.getTime()) ? div : simulation.pivotDate ?? events[0]?.date;
    if (!quiebre) return null;

    const px = scale.dateToX(quiebre);
    const py = strandY(px, CY);
    const color = VERDICT_COLOR[simulation.verdict];

    if (simulation.verdict === 'nunca') {
      const ex = px + 780;
      const ey = py + 248;
      return {
        color,
        d: `M ${px},${py} C ${px + 140},${py + 70} ${px + 430},${ey - 70} ${ex},${ey}`,
        end: { x: ex, y: ey },
        rejoins: false,
        frays: [0.28, 0.02, -0.24].map(
          (k) =>
            `M ${ex},${ey} C ${ex + 40},${ey + 30 * k + 10} ${ex + 80},${ey + 120 * k} ${
              ex + 128
            },${ey + 190 * k}`
        ),
      };
    }

    const alt = simulation.alternateMeetDate ? new Date(simulation.alternateMeetDate) : null;
    const valid = alt && Number.isFinite(alt.getTime());
    const rx = Math.max(px + 620, valid ? scale.dateToX(alt!) : px + 700);
    const ry = strandY(rx, CY);
    const amp = simulation.verdict === 'inevitable' ? 95 : 200;
    const dx = rx - px;

    return {
      color,
      d: `M ${px},${py} C ${px + dx * 0.26},${py - amp} ${px + dx * 0.74},${ry - amp} ${rx},${ry}`,
      end: { x: rx, y: ry },
      rejoins: true,
      frays: [] as string[],
    };
  }, [simulation, scale, events]);

  const width = Math.max(scale.width, 1400, branch ? branch.end.x + 320 : 0);

  const filaments = useMemo(() => {
    const rand = rng(Math.round(width));
    return Array.from({ length: Math.max(12, Math.floor(width / 150)) }, () => {
      const x = rand() * width;
      const dir = rand() > 0.5 ? -1 : 1;
      const len = 90 + rand() * 260;
      const lift = (50 + rand() * 190) * dir;
      const y = strandY(x, CY);
      return {
        d: `M ${x},${y} C ${x + len * 0.3},${y + lift * 0.55} ${x + len * 0.6},${y + lift} ${
          x + len
        },${y + lift * 1.12}`,
        o: 0.1 + rand() * 0.22,
        w: 0.6 + rand() * 0.9,
        delay: rand() * 9,
      };
    });
  }, [width]);

  const years = useMemo(() => {
    if (events.length === 0) return [];
    const first = new Date(events[0].date).getFullYear();
    const last = new Date(events[events.length - 1].date).getFullYear();
    const out: Array<{ y: number; x: number }> = [];
    for (let y = first; y <= last; y++) out.push({ y, x: scale.dateToX(new Date(y, 0, 1)) });
    return out;
  }, [events, scale]);

  /* Colocamos los eventos de la rama midiendo el path real. */
  useLayoutEffect(() => {
    const path = branchRef.current;
    if (!path || !simulation || simulation.branchEvents.length === 0) {
      setBranchPoints([]);
      return;
    }
    const total = path.getTotalLength();
    const n = simulation.branchEvents.length;

    // La rama que cae puede usar casi todo su recorrido. La que se reencuentra
    // no: sus dos extremos tocan el hilo dorado y las etiquetas se pisarían.
    const [desde, hasta] = simulation.verdict === 'nunca' ? [0.22, 0.82] : [0.28, 0.78];

    setBranchPoints(
      simulation.branchEvents.map((_, i) => {
        const f = n === 1 ? (desde + hasta) / 2 : desde + (i / (n - 1)) * (hasta - desde);
        const p = path.getPointAtLength(total * f);
        return { x: p.x, y: p.y };
      })
    );
  }, [simulation, branch]);

  /* ── Bordes: pistas de que hay más línea a los lados ────────── */
  const syncEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 24,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 24,
    });
  }, []);

  useEffect(() => {
    syncEdges();
    window.addEventListener('resize', syncEdges);
    return () => window.removeEventListener('resize', syncEdges);
  }, [syncEdges, width, zoom]);

  const nudge = (dir: -1 | 1) =>
    scrollRef.current?.scrollBy({ left: dir * 420, behavior: 'smooth' });

  /* ── Arrastrar para recorrer la línea ───────────────────────── */
  const drag = useRef({ active: false, startX: 0, startScroll: 0 });
  const movedRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft };
    movedRef.current = false;
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.active) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) movedRef.current = true;
    el.scrollLeft = drag.current.startScroll - dx;
  }

  const endDrag = () => {
    drag.current.active = false;
    setDragging(false);
  };

  /* Rueda: vertical mueve la línea; con Cmd/Ctrl hace zoom. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        onZoom(e.deltaY > 0 ? -0.1 : 0.1);
        return;
      }
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onZoom]);

  /* Al abrir centramos el encuentro; al simular, el punto de quiebre. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || events.length === 0) return;
    const target =
      (simulation?.divergenceDate && new Date(simulation.divergenceDate)) ||
      (simulation?.pivotDate && new Date(simulation.pivotDate)) ||
      new Date((events.find((e) => e.kind === 'encuentro') ?? events[events.length - 1]).date);
    const x = scale.dateToX(target) * zoom;
    el.scrollTo({ left: Math.max(0, x - el.clientWidth / 2), behavior: 'smooth' });
  }, [simulation, events, scale, zoom]);

  /* Si eliges un momento con el teclado, lo traemos a la vista. */
  useEffect(() => {
    const el = scrollRef.current;
    const ev = events.find((e) => e._id === selectedId);
    if (!el || !ev) return;
    const x = scale.dateToX(ev.date) * zoom;
    const margen = 180;
    if (x < el.scrollLeft + margen || x > el.scrollLeft + el.clientWidth - margen) {
      el.scrollTo({ left: Math.max(0, x - el.clientWidth / 2), behavior: 'smooth' });
    }
  }, [selectedId, events, scale, zoom]);

  const svgW = width * zoom;
  const svgH = HEIGHT * zoom;

  return (
    <div className="canvas-outer">
      <div
        className={`canvas-wrap${dragging ? ' is-dragging' : ''}`}
        ref={scrollRef}
        onScroll={syncEdges}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <svg width={svgW} height={svgH} viewBox={`0 0 ${width} ${HEIGHT}`} className="canvas-svg">
          <defs>
            <filter id="glow-soft" x="-30%" y="-200%" width="160%" height="500%">
              <feGaussianBlur stdDeviation="9" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-hard" x="-30%" y="-200%" width="160%" height="500%">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8a5a12" />
              <stop offset="20%" stopColor="#c98b28" />
              <stop offset="50%" stopColor="#e8bd68" />
              <stop offset="80%" stopColor="#c98b28" />
              <stop offset="100%" stopColor="#8a5a12" />
            </linearGradient>
            <radialGradient id="node-gold">
              <stop offset="0%" stopColor="#fff8ea" />
              <stop offset="52%" stopColor="#e0a63c" />
              <stop offset="100%" stopColor="#a1690f" />
            </radialGradient>
          </defs>

          {years.map(({ y, x }) => (
            <text key={y} x={x} y={CY - 246} className="year-mark" textAnchor="middle">
              {y}
            </text>
          ))}

          {/* filamentos: los futuros que no fueron */}
          <g className="filaments">
            {filaments.map((f, i) => (
              <path
                key={i}
                d={f.d}
                stroke="#b47a1e"
                strokeWidth={f.w}
                fill="none"
                opacity={f.o}
                style={{ animationDelay: `${f.delay}s` }}
              />
            ))}
          </g>

          {/* hilo principal */}
          <g filter="url(#glow-soft)">
            <path d={strandPath(width, CY)} className="strand-halo" />
          </g>
          <path d={strandPath(width, CY)} className="strand-core" stroke="url(#gold)" />
          <path d={strandPath(width, CY)} className="strand-flow" />

          {/* rama alterna */}
          {branch && simulation && (
            <g className="branch">
              <path
                d={branch.d}
                stroke={branch.color.soft}
                strokeWidth={16}
                fill="none"
                filter="url(#glow-soft)"
              />
              <path
                ref={branchRef}
                d={branch.d}
                stroke={branch.color.core}
                strokeWidth={2.6}
                fill="none"
                className="branch-core"
              />
              <path d={branch.d} className="branch-flow" stroke={branch.color.glow} />

              {branch.frays.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  stroke={branch.color.core}
                  strokeWidth={1.1}
                  fill="none"
                  className="fray"
                />
              ))}

              {!branch.rejoins && (
                <g className="branch-end" transform={`translate(${branch.end.x},${branch.end.y})`}>
                  <circle r={20} fill="none" stroke={branch.color.core} strokeWidth={1.2} opacity={0.5} />
                  <path d="M -7,-7 L 7,7 M 7,-7 L -7,7" stroke={branch.color.core} strokeWidth={2.4} />
                  <text y={74} textAnchor="middle" className="branch-end-label">
                    la línea se apaga
                  </text>
                </g>
              )}

              {branch.rejoins && (
                <g transform={`translate(${branch.end.x},${branch.end.y})`}>
                  <circle r={9} fill={branch.color.core} />
                  <circle
                    r={22}
                    fill="none"
                    stroke={branch.color.core}
                    strokeWidth={1.2}
                    className="pulse-ring"
                  />
                  <text y={-58} textAnchor="middle" className="branch-end-label">
                    se conocen igual
                  </text>
                  {simulation.alternateMeetDate && (
                    <text y={-40} textAnchor="middle" className="branch-end-date">
                      {fechaCorta(simulation.alternateMeetDate)}
                    </text>
                  )}
                </g>
              )}

              {branchPoints.map((p, i) => {
                const ev = simulation.branchEvents[i];
                const arriba = p.y < CY;
                // Dos alturas alternas: con 4 o 5 eventos en un arco corto,
                // todas las etiquetas a la misma altura se pisarían.
                const salto = (i % 2) * 34;
                return (
                  <g key={i} transform={`translate(${p.x},${p.y})`} className="branch-node">
                    <circle r={5.5} fill={branch.color.core} />
                    <circle r={13} fill="none" stroke={branch.color.core} strokeWidth={1} opacity={0.4} />
                    <text
                      y={arriba ? -34 - salto : 40 + salto}
                      textAnchor="middle"
                      className="branch-node-title"
                      fill={branch.color.core}
                    >
                      {ev.title.length > 24 ? `${ev.title.slice(0, 23)}…` : ev.title}
                    </text>
                    <text
                      y={arriba ? -17 - salto : 57 + salto}
                      textAnchor="middle"
                      className="branch-node-date"
                    >
                      {fechaCorta(ev.date)}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* nodos reales */}
          {events.map((ev, i) => {
            const x = scale.dateToX(ev.date);
            const y = strandY(x, CY);
            const r = 5 + ev.importance * 1.6;
            const arriba = i % 2 === 0;
            const sel = ev._id === selectedId;
            const lblY = arriba ? -1 : 1;

            return (
              <g
                key={ev._id}
                transform={`translate(${x},${y})`}
                className={`node kind-${ev.kind} ${sel ? 'is-selected' : ''}`}
                onClick={() => {
                  if (movedRef.current) return; // fue un arrastre, no un clic
                  onSelect(ev);
                }}
                role="button"
                aria-label={`${ev.title}, ${fechaCorta(ev.date)}`}
              >
                <circle r={38} className="node-hit" />
                {ev.isPivot && (
                  <>
                    <circle r={r + 15} className="rune-ring" />
                    <circle r={r + 23} className="rune-ring rune-ring--slow" />
                  </>
                )}
                <circle r={r + 9} className="node-aura" />
                <circle r={r + 13} className="node-ring-selected" />
                <circle r={r} fill="url(#node-gold)" className="node-core" />

                <line y1={lblY * (r + 12)} y2={lblY * (r + 38)} className="node-stem" />
                <text
                  y={lblY * (r + 56)}
                  textAnchor="middle"
                  className="node-title"
                  dominantBaseline={arriba ? 'auto' : 'hanging'}
                >
                  {ev.emoji ? `${ev.emoji}  ` : ''}
                  {ev.title.length > 30 ? `${ev.title.slice(0, 29)}…` : ev.title}
                </text>
                <text
                  y={lblY * (r + 56) + (arriba ? -19 : 21)}
                  textAnchor="middle"
                  className="node-date"
                  dominantBaseline={arriba ? 'auto' : 'hanging'}
                >
                  {fechaCorta(ev.date)} · {new Date(ev.date).getFullYear()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className={`edge-hint edge-hint--left${edges.left ? ' is-on' : ''}`}>
        <button onClick={() => nudge(-1)} aria-label="Ver momentos anteriores">
          ‹
        </button>
      </div>
      <div className={`edge-hint edge-hint--right${edges.right ? ' is-on' : ''}`}>
        <button onClick={() => nudge(1)} aria-label="Ver momentos siguientes">
          ›
        </button>
      </div>
    </div>
  );
}
