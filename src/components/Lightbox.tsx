import { useCallback, useEffect } from 'react';

interface Props {
  fotos: string[];
  indice: number;
  titulo: string;
  fecha: string;
  onCerrar: () => void;
  onIr: (i: number) => void;
}

/** Visor a pantalla completa. Las flechas y Esc funcionan sin tocar el ratón. */
export function Lightbox({ fotos, indice, titulo, fecha, onCerrar, onIr }: Props) {
  const anterior = useCallback(
    () => onIr((indice - 1 + fotos.length) % fotos.length),
    [indice, fotos.length, onIr]
  );
  const siguiente = useCallback(
    () => onIr((indice + 1) % fotos.length),
    [indice, fotos.length, onIr]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      // Mientras el visor está abierto, estas teclas son suyas y de nadie más.
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') onCerrar();
      else if (e.key === 'ArrowLeft') anterior();
      else siguiente();
    };
    // Captura: le ganamos al atajo global que recorre la línea de tiempo.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCerrar, anterior, siguiente]);

  return (
    <div className="visor" role="dialog" aria-label={`Fotos de ${titulo}`} onClick={onCerrar}>
      <button className="visor-cerrar" onClick={onCerrar} aria-label="Cerrar" title="Cerrar (Esc)">
        ✕
      </button>

      {fotos.length > 1 && (
        <button
          className="visor-flecha visor-flecha--izq"
          aria-label="Foto anterior"
          onClick={(e) => {
            e.stopPropagation();
            anterior();
          }}
        >
          ‹
        </button>
      )}

      <figure className="visor-marco" onClick={(e) => e.stopPropagation()}>
        <img src={fotos[indice]} alt={`${titulo} — foto ${indice + 1}`} />
        <figcaption>
          <strong>{titulo}</strong>
          <span>{fecha}</span>
          {fotos.length > 1 && (
            <span className="visor-conteo">
              {indice + 1} de {fotos.length}
            </span>
          )}
        </figcaption>
      </figure>

      {fotos.length > 1 && (
        <button
          className="visor-flecha visor-flecha--der"
          aria-label="Foto siguiente"
          onClick={(e) => {
            e.stopPropagation();
            siguiente();
          }}
        >
          ›
        </button>
      )}
    </div>
  );
}
