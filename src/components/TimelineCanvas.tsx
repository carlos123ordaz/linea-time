import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TimelineEvent } from '../types';
import { buildScale, strandPath, strandX } from '../lib/scale';
import { fechaCorta } from '../lib/format';
import { COLORES, colorDe, conAlfa } from '../lib/colores';

const MIN_WIDTH = 340;

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
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const [containerW, setContainerW] = useState(MIN_WIDTH);

  /* Medir el ancho real del contenedor. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(Math.max(MIN_WIDTH, Math.floor(entry.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const WIDTH = containerW;
  const CX = WIDTH / 2;
  const labelW = Math.min(190, CX - 60);

  const scale = useMemo(() => buildScale(events), [events]);

  const height = Math.max(scale.width, 1400);

  const filaments = useMemo(() => {
    const rand = rng(Math.round(height));
    return Array.from({ length: Math.max(12, Math.floor(height / 150)) }, () => {
      const y = rand() * height;
      const dir = rand() > 0.5 ? -1 : 1;
      const len = 90 + rand() * 260;
      const lift = (50 + rand() * 190) * dir;
      const x = strandX(y, CX);
      return {
        d: `M ${x},${y} C ${x + lift * 0.55},${y + len * 0.3} ${x + lift},${y + len * 0.6} ${
          x + lift * 1.12
        },${y + len}`,
        o: 0.1 + rand() * 0.22,
        w: 0.6 + rand() * 0.9,
        delay: rand() * 9,
      };
    });
  }, [height, CX]);

  const years = useMemo(() => {
    if (events.length === 0) return [];
    const first = new Date(events[0].date).getFullYear();
    const last = new Date(events[events.length - 1].date).getFullYear();
    const out: Array<{ year: number; pos: number }> = [];
    for (let y = first; y <= last; y++) out.push({ year: y, pos: scale.dateToX(new Date(y, 0, 1)) });
    return out;
  }, [events, scale]);

  /* ── Bordes: pistas de que hay más línea arriba/abajo ───────── */
  const syncEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setEdges({
      top: el.scrollTop > 24,
      bottom: el.scrollTop < el.scrollHeight - el.clientHeight - 24,
    });
  }, []);

  useEffect(() => {
    syncEdges();
    window.addEventListener('resize', syncEdges);
    return () => window.removeEventListener('resize', syncEdges);
  }, [syncEdges, height, zoom]);

  const nudge = (dir: -1 | 1) =>
    scrollRef.current?.scrollBy({ top: dir * 420, behavior: 'smooth' });

  /* ── Arrastrar para recorrer la línea ───────────────────────── */
  const drag = useRef({ active: false, startY: 0, startScroll: 0 });
  const movedRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    drag.current = { active: true, startY: e.clientY, startScroll: el.scrollTop };
    movedRef.current = false;
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.active) return;
    const el = scrollRef.current;
    if (!el) return;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dy) > 4) movedRef.current = true;
    el.scrollTop = drag.current.startScroll - dy;
  }

  const endDrag = () => {
    drag.current.active = false;
    setDragging(false);
  };

  /* Rueda: con Cmd/Ctrl hace zoom. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        onZoom(e.deltaY > 0 ? -0.1 : 0.1);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onZoom]);

  /* Al abrir, centramos el momento más cercano a hoy. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || events.length === 0) return;
    const ahora = Date.now();
    const foco = events.reduce((mejor, ev) =>
      Math.abs(new Date(ev.date).getTime() - ahora) < Math.abs(new Date(mejor.date).getTime() - ahora)
        ? ev
        : mejor
    );
    const y = scale.dateToX(foco.date) * zoom;
    const x = (el.scrollWidth - el.clientWidth) / 2;
    el.scrollTo({ left: Math.max(0, x), top: Math.max(0, y - el.clientHeight / 2), behavior: 'smooth' });
  }, [events, scale, zoom]);

  /* Cuando cambia el zoom, centrar horizontalmente. */
  const prevZoom = useRef(zoom);
  useEffect(() => {
    if (prevZoom.current === zoom) return;
    prevZoom.current = zoom;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    });
  }, [zoom]);

  /* Si eliges un momento con el teclado, lo traemos a la vista. */
  useEffect(() => {
    const el = scrollRef.current;
    const ev = events.find((e) => e.id === selectedId);
    if (!el || !ev) return;
    const y = scale.dateToX(ev.date) * zoom;
    const margen = 180;
    if (y < el.scrollTop + margen || y > el.scrollTop + el.clientHeight - margen) {
      el.scrollTo({ top: Math.max(0, y - el.clientHeight / 2), behavior: 'smooth' });
    }
  }, [selectedId, events, scale, zoom]);

  const svgW = WIDTH * zoom;
  const svgH = height * zoom;

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
        <svg width={svgW} height={svgH} viewBox={`0 0 ${WIDTH} ${height}`} className="canvas-svg">
          <defs>
            <filter id="glow-soft" x="-200%" y="-30%" width="500%" height="160%">
              <feGaussianBlur stdDeviation="9" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-hard" x="-200%" y="-30%" width="500%" height="160%">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
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

          {years.map(({ year, pos }) => (
            <text key={year} x={CX} y={pos} className="year-mark" textAnchor="middle">
              {year}
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
            <path d={strandPath(height, CX)} className="strand-halo" />
          </g>
          <path d={strandPath(height, CX)} className="strand-core" stroke="url(#gold)" />
          <path d={strandPath(height, CX)} className="strand-flow" />

          {/* nodos reales */}
          {events.map((ev, i) => {
            const posY = scale.dateToX(ev.date);
            const posX = strandX(posY, CX);
            const r = 5 + ev.importance * 1.6;
            const izq = i % 2 === 0;
            const sel = ev.id === selectedId;
            const lblDir = izq ? -1 : 1;
            const c = colorDe(ev.color);
            const conFotos = ev.photos.length > 0;

            return (
              <g
                key={ev.id}
                transform={`translate(${posX},${posY})`}
                className={`node kind-${ev.kind} ${sel ? 'is-selected' : ''}`}
                onClick={() => {
                  if (movedRef.current) return;
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

                <line x1={lblDir * (r + 12)} x2={lblDir * (r + 38)} className="node-stem" />
                {(() => {
                  const foX = izq ? -(r + 44) - labelW : r + 44;
                  return (
                    <foreignObject x={foX} y={-14} width={labelW} height={120} className="node-label-fo">
                      <div className={`node-label ${izq ? 'node-label--izq' : ''}`}>
                        <div className="node-title">
                          {ev.emoji ? `${ev.emoji}  ` : ''}
                          {ev.title}
                        </div>
                        <div className="node-date">
                          {fechaCorta(ev.date)} · {new Date(ev.date).getFullYear()}
                        </div>
                      </div>
                    </foreignObject>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      </div>

      <div className={`edge-hint edge-hint--top${edges.top ? ' is-on' : ''}`}>
        <button onClick={() => nudge(-1)} aria-label="Ver momentos anteriores">
          ▲
        </button>
      </div>
      <div className={`edge-hint edge-hint--bottom${edges.bottom ? ' is-on' : ''}`}>
        <button onClick={() => nudge(1)} aria-label="Ver momentos siguientes">
          ▼
        </button>
      </div>
    </div>
  );
}
