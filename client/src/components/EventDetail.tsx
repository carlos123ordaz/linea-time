import { useState } from 'react';
import type { TimelineEvent } from '../types';
import { fechaLarga } from '../lib/format';

const KIND_LABEL: Record<TimelineEvent['kind'], string> = {
  origen: 'Origen',
  conexion: 'Conexión',
  encuentro: 'Encuentro',
  hito: 'Hito',
  recuerdo: 'Recuerdo',
};

interface Props {
  event: TimelineEvent;
  posicion: { i: number; total: number };
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSimulateFrom: () => void;
}

export function EventDetail({
  event,
  posicion,
  onClose,
  onPrev,
  onNext,
  onEdit,
  onDelete,
  onSimulateFrom,
}: Props) {
  const [confirm, setConfirm] = useState(false);

  return (
    <aside className="drawer drawer--right" role="dialog" aria-label={event.title}>
      <div className="drawer-topbar">
        <div className="drawer-nav">
          <button
            className="icon-btn"
            onClick={onPrev}
            disabled={posicion.i === 0}
            aria-label="Momento anterior"
            title="Momento anterior (←)"
          >
            ‹
          </button>
          <button
            className="icon-btn"
            onClick={onNext}
            disabled={posicion.i === posicion.total - 1}
            aria-label="Momento siguiente"
            title="Momento siguiente (→)"
          >
            ›
          </button>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Cerrar" title="Cerrar (Esc)">
          ✕
        </button>
      </div>

      <div>
        <span className={`badge badge--${event.kind}`}>{KIND_LABEL[event.kind]}</span>
        {event.isPivot && <span className="badge badge--pivot">Punto nexo</span>}
      </div>

      <h2 className="drawer-title">
        {event.emoji && <span className="drawer-emoji">{event.emoji}</span>}
        {event.title}
      </h2>
      <p className="drawer-date">{fechaLarga(event.date)}</p>
      {event.place && <p className="drawer-place">📍 {event.place}</p>}

      {event.description && (
        <div className="drawer-body">
          {event.description.split('\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      {event.people.length > 0 && (
        <div className="people">
          {event.people.map((p) => (
            <span key={p} className="person">
              {p}
            </span>
          ))}
        </div>
      )}

      <div className="drawer-actions">
        <button className="btn btn--ghost" onClick={onEdit}>
          Editar
        </button>
        <button className="btn btn--cyan" onClick={onSimulateFrom}>
          Simular desde aquí
        </button>
        {confirm ? (
          <button className="btn btn--danger" onClick={onDelete}>
            Sí, eliminar
          </button>
        ) : (
          <button className="btn btn--danger-ghost" onClick={() => setConfirm(true)}>
            Eliminar
          </button>
        )}
      </div>
    </aside>
  );
}
