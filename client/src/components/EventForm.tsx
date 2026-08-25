import { useState } from 'react';
import type { EventInput, EventKind, TimelineEvent } from '../types';
import { aInputDate } from '../lib/format';

const KINDS: Array<{ value: EventKind; label: string; hint: string }> = [
  { value: 'origen', label: 'Origen', hint: 'Causas lejanas, gente que sin saberlo los acercó' },
  { value: 'conexion', label: 'Conexión', hint: 'El hilo social que unió las dos líneas' },
  { value: 'encuentro', label: 'Encuentro', hint: 'El punto donde las líneas se tocan' },
  { value: 'hito', label: 'Hito', hint: 'Momentos grandes de la relación' },
  { value: 'recuerdo', label: 'Recuerdo', hint: 'Momentos pequeños que valen igual' },
];

interface Props {
  initial?: TimelineEvent | null;
  onCancel: () => void;
  onSave: (data: Partial<EventInput>) => Promise<void>;
}

export function EventForm({ initial, onCancel, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial ? aInputDate(initial.date) : aInputDate(new Date()));
  const [kind, setKind] = useState<EventKind>(initial?.kind ?? 'recuerdo');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [place, setPlace] = useState(initial?.place ?? '');
  const [people, setPeople] = useState((initial?.people ?? []).join(', '));
  const [emoji, setEmoji] = useState(initial?.emoji ?? '');
  const [importance, setImportance] = useState(initial?.importance ?? 3);
  const [isPivot, setIsPivot] = useState(initial?.isPivot ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError('Ponle un título a este momento.');
    setBusy(true);
    setError('');
    try {
      await onSave({
        title: title.trim(),
        date: new Date(`${date}T12:00:00`).toISOString(),
        kind,
        description,
        place,
        emoji,
        importance,
        isPivot,
        people: people.split(',').map((p) => p.trim()).filter(Boolean),
      });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="modal-title">{initial ? 'Editar momento' : 'Agregar un momento'}</h2>

        <div className="field-row">
          <label className="field field--grow">
            <span>Título</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nuestra primera vez en el cine" autoFocus />
          </label>
          <label className="field field--emoji">
            <span>Emoji</span>
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🎬" maxLength={4} />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Fecha</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field field--grow">
            <span>Lugar</span>
            <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Opcional" />
          </label>
        </div>

        <label className="field">
          <span>Tipo</span>
          <div className="chips">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                title={k.hint}
                className={`chip ${kind === k.value ? 'chip--on' : ''}`}
                onClick={() => setKind(k.value)}
              >
                {k.label}
              </button>
            ))}
          </div>
        </label>

        <label className="field">
          <span>
            Qué pasó <span className="field-hint">— los saltos de línea se respetan</span>
          </span>
          <textarea
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cuéntalo como se lo contarías a ella dentro de veinte años…"
          />
        </label>

        <label className="field">
          <span>
            Personas <span className="field-hint">— separadas por coma</span>
          </span>
          <input value={people} onChange={(e) => setPeople(e.target.value)} placeholder="Carlos, Diesslly" />
        </label>

        <div className="field-row field-row--end">
          <label className="field field--grow">
            <span>
              Peso en la línea{' '}
              <span className="field-hint">— qué tan grande se ve el punto: {importance}/5</span>
            </span>
            <input
              type="range"
              min={1}
              max={5}
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value))}
            />
          </label>
          <label className="switch" title="Un punto nexo es un momento del que depende todo lo demás">
            <input type="checkbox" checked={isPivot} onChange={(e) => setIsPivot(e.target.checked)} />
            <span>Punto nexo</span>
          </label>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--gold" disabled={busy}>
            {busy ? 'Guardando…' : initial ? 'Guardar cambios' : 'Agregar a la línea'}
          </button>
        </div>
      </form>
    </div>
  );
}
