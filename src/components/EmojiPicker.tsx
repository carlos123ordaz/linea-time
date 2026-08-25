import { useEffect, useRef, useState } from 'react';
import { GRUPOS_EMOJI } from '../lib/emojis';

interface Props {
  value: string;
  onChange: (emoji: string) => void;
}

/**
 * Se abre hacia abajo empujando el formulario, en vez de flotar encima: dentro
 * de un modal que ya tiene scroll, un panel flotante se corta por los bordes.
 */
export function EmojiPicker({ value, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation(); // que no cierre también el formulario
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape, true);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escape, true);
    };
  }, [abierto]);

  function elegir(emoji: string) {
    onChange(emoji);
    setAbierto(false);
  }

  return (
    <div className="emoji-caja" ref={caja}>
      <button
        type="button"
        className={`emoji-trigger ${abierto ? 'emoji-trigger--on' : ''}`}
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={value ? `Emoji actual: ${value}. Cambiar` : 'Elegir un emoji'}
      >
        {value ? (
          <span className="emoji-actual">{value}</span>
        ) : (
          <span className="emoji-vacio">Elegir</span>
        )}
        <span className="emoji-flecha" aria-hidden>
          ▾
        </span>
      </button>

      {abierto && (
        <div className="emoji-panel">
          <div className="emoji-panel-cab">
            <span>Elige un emoji</span>
            <button type="button" className="emoji-limpiar" onClick={() => elegir('')}>
              Sin emoji
            </button>
          </div>

          <div className="emoji-scroll">
            {GRUPOS_EMOJI.map((g) => (
              <div key={g.nombre} className="emoji-grupo">
                <h4>{g.nombre}</h4>
                <div className="emoji-grid">
                  {g.emojis.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className={`emoji-opcion ${e === value ? 'emoji-opcion--on' : ''}`}
                      onClick={() => elegir(e)}
                      aria-label={e}
                      aria-pressed={e === value}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
