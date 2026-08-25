import { useState } from 'react';
import type { TimelineEvent } from '../types';
import { fechaLarga } from '../lib/format';
import { colorDe } from '../lib/colores';
import { Lightbox } from './Lightbox';
import { Icono } from './Icono';

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
}

export function EventDetail({
  event,
  posicion,
  onClose,
  onPrev,
  onNext,
  onEdit,
  onDelete,
}: Props) {
  const [confirmar, setConfirmar] = useState(false);
  const [verFoto, setVerFoto] = useState<number | null>(null);
  const color = colorDe(event.color);

  const primero = posicion.i === 0;
  const ultimo = posicion.i === posicion.total - 1;

  return (
    <div className="ficha-fondo" onClick={onClose}>
      <article
        className="ficha"
        role="dialog"
        aria-label={event.title}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="ficha-franja"
          style={{ background: `linear-gradient(90deg, ${color.oscuro}, ${color.base})` }}
        />

        <header className="ficha-cab">
          <div className="ficha-nav">
            <button
              className="ico"
              onClick={onPrev}
              disabled={primero}
              aria-label="Momento anterior"
              title="Momento anterior (←)"
            >
              <Icono nombre="izquierda" />
            </button>
            <span className="ficha-pos">
              {posicion.i + 1} <i>/</i> {posicion.total}
            </span>
            <button
              className="ico"
              onClick={onNext}
              disabled={ultimo}
              aria-label="Momento siguiente"
              title="Momento siguiente (→)"
            >
              <Icono nombre="derecha" />
            </button>
          </div>

          <div className="ficha-acciones">
            <button className="ico" onClick={onEdit} aria-label="Editar" title="Editar">
              <Icono nombre="editar" />
            </button>
            <button
              className={`ico ico--peligro ${confirmar ? 'ico--armado' : ''}`}
              onClick={() => setConfirmar(true)}
              aria-label="Eliminar"
              title="Eliminar"
            >
              <Icono nombre="eliminar" />
            </button>
            <button className="ico" onClick={onClose} aria-label="Cerrar" title="Cerrar (Esc)">
              <Icono nombre="cerrar" />
            </button>
          </div>
        </header>

        {confirmar && (
          <div className="ficha-confirmar">
            <span>¿Eliminar este momento?</span>
            <button className="mini mini--si" onClick={onDelete}>
              Sí, eliminar
            </button>
            <button className="mini" onClick={() => setConfirmar(false)}>
              Cancelar
            </button>
          </div>
        )}

        <div className="ficha-cuerpo">
          <p className="ficha-meta">
            <span className="ficha-fecha">{fechaLarga(event.date)}</span>
            <span>{KIND_LABEL[event.kind]}</span>
            {event.place && <span>{event.place}</span>}
            {event.isPivot && (
              <span className="ficha-nexo" style={{ color: color.oscuro, borderColor: color.base }}>
                Punto nexo
              </span>
            )}
          </p>

          <h2 className="ficha-titulo">
            {event.emoji && <span className="ficha-emoji">{event.emoji}</span>}
            {event.title}
          </h2>

          {event.description && (
            <div className="ficha-texto">
              {event.description.split('\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}

          {event.photos.length > 0 && (
            <div className={`galeria-grid galeria-grid--${Math.min(event.photos.length, 3)}`}>
              {event.photos.map((url, i) => (
                <button
                  key={url}
                  className="galeria-foto"
                  onClick={() => setVerFoto(i)}
                  aria-label={`Ver foto ${i + 1} en grande`}
                >
                  <img src={url} alt="" loading="lazy" />
                </button>
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
        </div>
      </article>

      {verFoto !== null && (
        <Lightbox
          fotos={event.photos}
          indice={verFoto}
          titulo={event.title}
          fecha={fechaLarga(event.date)}
          onCerrar={() => setVerFoto(null)}
          onIr={setVerFoto}
        />
      )}
    </div>
  );
}
