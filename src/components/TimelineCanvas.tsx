import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TimelineEvent } from '../types';
import { buildScale, strandPath, strandY } from '../lib/scale';
import { fechaCorta } from '../lib/format';
import { COLORES, colorDe, conAlfa } from '../lib/colores';

const HEIGHT = 720;
const CY = HEIGHT / 2;

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
  selectedId: string | null;
  onSelect: (e: TimelineEvent) => void;
  zoom: number;
  onZoom: (delta: number) => void;
}

export function TimelineCanvas({ events, selectedId, onSelect, zoom, onZoom }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const scale = useMemo(() => buildScale(events), [events]);

  const width = Math.max(scale.width, 1400);

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

  /* Al abrir, centramos el encuentro. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || events.length === 0) return;
    const foco = events.find((e) => e.kind === 'encuentro') ?? events[events.length - 1];
    const x = scale.dateToX(foco.date) * zoom;
    el.scrollTo({ left: Math.max(0, x - el.clientWidth / 2), behavior: 'smooth' });
  }, [events, scale, zoom]);

  /* Si eliges un momento con el teclado, lo traemos a la vista. */
  useEffect(() => {
    const el = scrollRef.current;
    const ev = events.find((e) => e.id === selectedId);
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
            {COLORES.map((c) => (
              <radialGradient key={c.id || 'oro'} id={`punto-${c.id || 'oro'}`} cx="36%" cy="32%">
                <stop offset="0%" stopColor={c.claro} />
                <stop offset="52%" stopColor={c.base} />
                <stop offset="100%" stopColor={c.oscuro} />
              </radialGradient>
            ))}
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

          {/* nodos reales */}
          {events.map((ev, i) => {
            const x = scale.dateToX(ev.date);
            const y = strandY(x, CY);
            const r = 5 + ev.importance * 1.6;
            const arriba = i % 2 === 0;
            const sel = ev.id === selectedId;
            const lblY = arriba ? -1 : 1;
            const c = colorDe(ev.color);
            const conFotos = ev.photos.length > 0;

            return (
              <g
                key={ev.id}
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
                    <circle r={r + 15} className="rune-ring" stroke={conAlfa(c.oscuro, 0.5)} />
                    <circle
                      r={r + 23}
                      className="rune-ring rune-ring--slow"
                      stroke={conAlfa(c.oscuro, 0.28)}
                    />
                  </>
                )}
                <circle r={r + 9} className="node-aura" fill={conAlfa(c.base, 0.28)} />
                <circle r={r + 13} className="node-ring-selected" stroke={c.oscuro} />
                <circle r={r} fill={`url(#punto-${c.id || 'oro'})`} className="node-core" />

                {conFotos && (
                  <g transform={`translate(${r * 0.82}, ${-r * 0.82})`} className="node-fotos">
                    <circle r={7.5} fill={c.oscuro} stroke="var(--paper)" strokeWidth={1.6} />
                    <text y={2.8} textAnchor="middle" className="node-fotos-num">
                      {ev.photos.length}
                    </text>
                  </g>
                )}

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
