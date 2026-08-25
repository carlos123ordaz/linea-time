import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './lib/api';
import type { EventInput, Simulation, TimelineEvent } from './types';
import { tiempoDesde } from './lib/format';
import { Starfield } from './components/Starfield';
import { TimelineCanvas } from './components/TimelineCanvas';
import { EventDetail } from './components/EventDetail';
import { EventForm } from './components/EventForm';
import { SimulationPanel } from './components/SimulationPanel';
import { ToastStack, type ToastData } from './components/Toast';

const porFecha = (a: TimelineEvent, b: TimelineEvent) => +new Date(a.date) - +new Date(b.date);

export default function App() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [active, setActive] = useState<Simulation | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TimelineEvent | null | undefined>(undefined);
  const [panelOpen, setPanelOpen] = useState(false);
  const [presetPivot, setPresetPivot] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [gemini, setGemini] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState('');
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const toastId = useRef(0);
  const pushToast = useCallback((t: Omit<ToastData, 'id'>) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { ...t, id }]);
  }, []);
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const selected = useMemo(
    () => events.find((e) => e._id === selectedId) ?? null,
    [events, selectedId]
  );
  const selectedIndex = useMemo(
    () => events.findIndex((e) => e._id === selectedId),
    [events, selectedId]
  );

  const refresh = useCallback(async () => {
    const [ev, sims, health] = await Promise.all([
      api.listEvents(),
      api.listSimulations().catch(() => [] as Simulation[]),
      api.health().catch(() => ({ ok: false, gemini: false })),
    ]);
    setEvents(ev);
    setSimulations(sims);
    setGemini(health.gemini);
  }, []);

  useEffect(() => {
    refresh()
      .catch((err) => setFatal(err.message))
      .finally(() => setLoading(false));
  }, [refresh]);

  /* ── Teclado: ← → recorren la línea, Esc cierra, N agrega ───── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const enCampo = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (e.target as HTMLElement)?.tagName ?? ''
      );

      if (e.key === 'Escape') {
        if (editing !== undefined) setEditing(undefined);
        else if (selectedId) setSelectedId(null);
        else if (panelOpen) setPanelOpen(false);
        else if (active) setActive(null);
        return;
      }

      if (enCampo || editing !== undefined || events.length === 0) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const paso = e.key === 'ArrowRight' ? 1 : -1;
        const actual = events.findIndex((ev) => ev._id === selectedId);
        const siguiente =
          actual === -1
            ? paso === 1
              ? 0
              : events.length - 1
            : Math.min(events.length - 1, Math.max(0, actual + paso));
        setSelectedId(events[siguiente]._id);
      }

      if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setEditing(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, selectedId, panelOpen, active, events]);

  const encuentro = useMemo(() => events.find((e) => e.kind === 'encuentro'), [events]);
  const noviazgo = useMemo(
    () => events.find((e) => e.kind === 'hito' && /novi/i.test(e.title)),
    [events]
  );

  async function saveEvent(data: Partial<EventInput>) {
    if (editing) {
      const updated = await api.updateEvent(editing._id, data);
      setEvents((prev) => [...prev.filter((e) => e._id !== updated._id), updated].sort(porFecha));
      setSelectedId(updated._id);
      pushToast({ text: 'Momento actualizado' });
    } else {
      const created = await api.createEvent(data);
      setEvents((prev) => [...prev, created].sort(porFecha));
      setSelectedId(created._id);
      pushToast({ text: `“${created.title}” quedó en la línea` });
    }
    setEditing(undefined);
  }

  /** Borrar duele en una app de recuerdos: siempre ofrecemos deshacer. */
  async function deleteEvent(ev: TimelineEvent) {
    setSelectedId(null);
    setEvents((prev) => prev.filter((e) => e._id !== ev._id));
    try {
      await api.deleteEvent(ev._id);
    } catch (err) {
      setEvents((prev) => [...prev, ev].sort(porFecha));
      pushToast({ text: (err as Error).message, tone: 'error' });
      return;
    }
    pushToast({
      text: `Eliminaste “${ev.title}”`,
      action: {
        label: 'Deshacer',
        run: async () => {
          try {
            const restored = await api.createEvent({
              title: ev.title,
              description: ev.description,
              date: ev.date,
              kind: ev.kind,
              place: ev.place,
              people: ev.people,
              isPivot: ev.isPivot,
              importance: ev.importance,
              emoji: ev.emoji,
              photoUrl: ev.photoUrl,
            });
            setEvents((prev) => [...prev, restored].sort(porFecha));
            setSelectedId(restored._id);
          } catch (err) {
            pushToast({ text: (err as Error).message, tone: 'error' });
          }
        },
      },
    });
  }

  async function runSimulation(premise: string, pivotEventId: string | null) {
    const sim = await api.createSimulation(premise, pivotEventId);
    setSimulations((prev) => [sim, ...prev]);
    setActive(sim);
    setSelectedId(null);
  }

  async function deleteSimulation(id: string) {
    const sim = simulations.find((s) => s._id === id);
    setSimulations((prev) => prev.filter((s) => s._id !== id));
    setActive((cur) => (cur?._id === id ? null : cur));
    try {
      await api.deleteSimulation(id);
      pushToast({ text: 'Realidad eliminada' });
    } catch (err) {
      if (sim) setSimulations((prev) => [sim, ...prev]);
      pushToast({ text: (err as Error).message, tone: 'error' });
    }
  }

  if (loading) {
    return (
      <div className="boot">
        <div className="boot-ring" />
        <p>Abriendo la línea del tiempo…</p>
      </div>
    );
  }

  if (fatal) {
    return (
      <div className="boot">
        <p className="form-error">No pude hablar con el servidor: {fatal}</p>
        <p>
          Revisa que <code>npm run dev</code> esté corriendo.
        </p>
      </div>
    );
  }

  return (
    <div className={`app ${active ? 'has-branch' : ''}`}>
      <Starfield />

      <header className="topbar">
        <div className="brand">
          <h1>Carlos &amp; Diesslly</h1>
          <p className="brand-sub">
            {encuentro && (
              <>
                Se conocieron hace <strong>{tiempoDesde(encuentro.date)}</strong>
              </>
            )}
            {encuentro && noviazgo && ' · '}
            {noviazgo && (
              <>
                Juntos desde hace <strong>{tiempoDesde(noviazgo.date)}</strong>
              </>
            )}
          </p>
        </div>

        <div className="controls">
          <div className="zoom">
            <button
              onClick={() => setZoom((z) => Math.max(0.45, +(z - 0.15).toFixed(2)))}
              aria-label="Alejar"
            >
              −
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.15).toFixed(2)))}
              aria-label="Acercar"
            >
              +
            </button>
          </div>
          <button className="btn btn--ghost" onClick={() => setEditing(null)}>
            + Momento
          </button>
          <button
            className={`btn btn--cyan ${panelOpen ? 'is-on' : ''}`}
            onClick={() => setPanelOpen((v) => !v)}
          >
            ¿Qué hubiera pasado si…?
          </button>
        </div>
      </header>

      {events.length === 0 ? (
        <div className="empty">
          <h2>Todavía no hay nada escrito</h2>
          <p>
            Corre <code>npm run seed</code> en la carpeta <code>server</code> para escribir su
            historia, o agrega el primer momento a mano.
          </p>
          <button className="btn btn--gold" onClick={() => setEditing(null)}>
            Escribir el primer momento
          </button>
        </div>
      ) : (
        <TimelineCanvas
          events={events}
          simulation={active}
          selectedId={selectedId}
          onSelect={(e) => setSelectedId(e._id)}
          zoom={zoom}
          onZoom={(d) => setZoom((z) => Math.min(1.8, Math.max(0.45, +(z + d).toFixed(2))))}
        />
      )}

      {active && (
        <div className="branch-banner">
          <span className={`dot dot--${active.verdict}`} />
          <span className="branch-banner-text">Realidad alterna: “{active.premise}”</span>
          <button onClick={() => setActive(null)}>Volver a la real</button>
        </div>
      )}

      {(panelOpen || selected) && (
        <button
          className="drawer-scrim"
          aria-label="Cerrar panel"
          onClick={() => {
            if (selected) setSelectedId(null);
            else setPanelOpen(false);
          }}
        />
      )}

      {panelOpen && (
        <SimulationPanel
          events={events}
          simulations={simulations}
          active={active}
          geminiReady={gemini}
          presetPivotId={presetPivot}
          onRun={runSimulation}
          onActivate={setActive}
          onDelete={deleteSimulation}
          onClose={() => setPanelOpen(false)}
        />
      )}

      {selected && (
        <EventDetail
          event={selected}
          posicion={{ i: selectedIndex, total: events.length }}
          onClose={() => setSelectedId(null)}
          onPrev={() => setSelectedId(events[Math.max(0, selectedIndex - 1)]._id)}
          onNext={() =>
            setSelectedId(events[Math.min(events.length - 1, selectedIndex + 1)]._id)
          }
          onEdit={() => setEditing(selected)}
          onDelete={() => deleteEvent(selected)}
          onSimulateFrom={() => {
            setPresetPivot(selected._id);
            setPanelOpen(true);
            setSelectedId(null);
          }}
        />
      )}

      {editing !== undefined && (
        <EventForm initial={editing} onCancel={() => setEditing(undefined)} onSave={saveEvent} />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {!panelOpen && !selected && editing === undefined && (
        <div className="shortcuts">
          <kbd>←</kbd>
          <kbd>→</kbd> recorrer · <kbd>N</kbd> nuevo momento · arrastra para mover
        </div>
      )}
    </div>
  );
}
