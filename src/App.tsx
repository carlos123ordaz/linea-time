import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, fotos, configurado } from './lib/supabase';
import type { EventInput, TimelineEvent } from './types';
import { tiempoDesde } from './lib/format';
import { Starfield } from './components/Starfield';
import { TimelineCanvas } from './components/TimelineCanvas';
import { EventDetail } from './components/EventDetail';
import { EventForm } from './components/EventForm';
import { ToastStack, type ToastData } from './components/Toast';

const porFecha = (a: TimelineEvent, b: TimelineEvent) => +new Date(a.date) - +new Date(b.date);

export default function App() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TimelineEvent | null | undefined>(undefined);
  const [zoom, setZoom] = useState(1);
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
    () => events.find((e) => e.id === selectedId) ?? null,
    [events, selectedId]
  );
  const selectedIndex = useMemo(
    () => events.findIndex((e) => e.id === selectedId),
    [events, selectedId]
  );

  useEffect(() => {
    if (!configurado) {
      setFatal('Faltan las variables VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.');
      setLoading(false);
      return;
    }
    api
      .listEvents()
      .then(setEvents)
      .catch((err) => setFatal(err.message))
      .finally(() => setLoading(false));
  }, []);

  /* ── Teclado: ← → recorren la línea, Esc cierra, N agrega ───── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const enCampo = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (e.target as HTMLElement)?.tagName ?? ''
      );

      if (e.key === 'Escape') {
        if (editing !== undefined) setEditing(undefined);
        else if (selectedId) setSelectedId(null);
        return;
      }

      if (enCampo || editing !== undefined || events.length === 0) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const paso = e.key === 'ArrowRight' ? 1 : -1;
        const actual = events.findIndex((ev) => ev.id === selectedId);
        const siguiente =
          actual === -1
            ? paso === 1
              ? 0
              : events.length - 1
            : Math.min(events.length - 1, Math.max(0, actual + paso));
        setSelectedId(events[siguiente].id);
      }

      if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setEditing(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, selectedId, events]);

  const encuentro = useMemo(() => events.find((e) => e.kind === 'encuentro'), [events]);
  const noviazgo = useMemo(
    () => events.find((e) => e.kind === 'hito' && /novi/i.test(e.title)),
    [events]
  );

  async function saveEvent(data: Partial<EventInput>) {
    if (editing) {
      const updated = await api.updateEvent(editing.id, data);
      setEvents((prev) => [...prev.filter((e) => e.id !== updated.id), updated].sort(porFecha));
      setSelectedId(updated.id);
      pushToast({ text: 'Momento actualizado' });
    } else {
      const created = await api.createEvent(data);
      setEvents((prev) => [...prev, created].sort(porFecha));
      setSelectedId(created.id);
      pushToast({ text: `“${created.title}” quedó en la línea` });
    }
    setEditing(undefined);
  }

  /** Borrar duele en una app de recuerdos: siempre ofrecemos deshacer. */
  async function deleteEvent(ev: TimelineEvent) {
    setSelectedId(null);
    setEvents((prev) => prev.filter((e) => e.id !== ev.id));
    try {
      await api.deleteEvent(ev.id);
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
            const { id: _viejo, ...contenido } = ev;
            const restored = await api.createEvent(contenido);
            setEvents((prev) => [...prev, restored].sort(porFecha));
            setSelectedId(restored.id);
          } catch (err) {
            pushToast({ text: (err as Error).message, tone: 'error' });
          }
        },
      },
      // Solo cuando ya no se puede deshacer soltamos las fotos del bucket:
      // hasta ese momento hacen falta para poder restaurar el recuerdo.
      onExpire: () => {
        ev.photos.forEach((url) => fotos.borrar(url).catch(() => {}));
      },
    });
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
        <p className="form-error">{fatal}</p>
        <p>
          Revisa el archivo <code>.env</code> y que <code>supabase/schema.sql</code> ya se haya
          corrido en el SQL Editor de Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <Starfield />

      <header className="topbar">
        <div className="brand">
          <h1>Carlos &amp; Diesslly</h1>
          <p className="brand-sub">
            {encuentro && (
              <>
                Nos conocimos hace <strong>{tiempoDesde(encuentro.date)}</strong>
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
          <button className="btn btn--gold" onClick={() => setEditing(null)}>
            + Momento
          </button>
        </div>
      </header>

      {events.length === 0 ? (
        <div className="empty">
          <h2>Todavía no hay nada escrito</h2>
          <p>
            Corre <code>supabase/schema.sql</code> en el SQL Editor de Supabase para escribir su
            historia, o agrega el primer momento a mano.
          </p>
          <button className="btn btn--gold" onClick={() => setEditing(null)}>
            Escribir el primer momento
          </button>
        </div>
      ) : (
        <TimelineCanvas
          events={events}
          selectedId={selectedId}
          onSelect={(e) => setSelectedId(e.id)}
          zoom={zoom}
          onZoom={(d) => setZoom((z) => Math.min(1.8, Math.max(0.45, +(z + d).toFixed(2))))}
        />
      )}

      {selected && (
        <button
          className="drawer-scrim"
          aria-label="Cerrar panel"
          onClick={() => setSelectedId(null)}
        />
      )}

      {selected && (
        <EventDetail
          event={selected}
          posicion={{ i: selectedIndex, total: events.length }}
          onClose={() => setSelectedId(null)}
          onPrev={() => setSelectedId(events[Math.max(0, selectedIndex - 1)].id)}
          onNext={() => setSelectedId(events[Math.min(events.length - 1, selectedIndex + 1)].id)}
          onEdit={() => setEditing(selected)}
          onDelete={() => deleteEvent(selected)}
        />
      )}

      {editing !== undefined && (
        <EventForm initial={editing} onCancel={() => setEditing(undefined)} onSave={saveEvent} />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {!selected && editing === undefined && (
        <div className="shortcuts">
          <kbd>←</kbd>
          <kbd>→</kbd> recorrer · <kbd>N</kbd> nuevo momento · arrastra para mover
        </div>
      )}
    </div>
  );
}
