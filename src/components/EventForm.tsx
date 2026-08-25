import { useRef, useState } from 'react';
import type { EventInput, EventKind, TimelineEvent } from '../types';
import { aInputDate } from '../lib/format';
import { fotos } from '../lib/supabase';
import { COLORES } from '../lib/colores';

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
  const [color, setColor] = useState(initial?.color ?? '');
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);

  const [subiendo, setSubiendo] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const inputFile = useRef<HTMLInputElement>(null);
  /** Fotos subidas en esta sesión: si cancelas, se limpian del bucket. */
  const nuevas = useRef<string[]>([]);
  const originales = useRef<string[]>(initial?.photos ?? []);

  async function agregarFotos(files: FileList | File[]) {
    const lista = Array.from(files);
    if (lista.length === 0) return;
    setError('');
    setSubiendo(lista.length);
    try {
      for (const file of lista) {
        const url = await fotos.subir(file);
        nuevas.current.push(url);
        setPhotos((prev) => [...prev, url]);
        setSubiendo((n) => n - 1);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubiendo(0);
      if (inputFile.current) inputFile.current.value = '';
    }
  }

  function quitarFoto(url: string) {
    setPhotos((prev) => prev.filter((u) => u !== url));
  }

  async function cancelar() {
    // Lo que se subió y no se guardó no debe quedar ocupando espacio.
    const huerfanas = nuevas.current.filter((u) => !originales.current.includes(u));
    await Promise.allSettled(huerfanas.map((u) => fotos.borrar(u)));
    onCancel();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError('Ponle un título a este momento.');
    if (subiendo > 0) return setError('Espera a que terminen de subir las fotos.');

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
        color,
        photos,
        people: people.split(',').map((p) => p.trim()).filter(Boolean),
      });
      // Las que quitaste sí se borran del bucket, ya guardado el cambio.
      const quitadas = originales.current.filter((u) => !photos.includes(u));
      Promise.allSettled(quitadas.map((u) => fotos.borrar(u)));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={cancelar}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="modal-title">{initial ? 'Editar momento' : 'Agregar un momento'}</h2>

        <div className="field-row">
          <label className="field field--grow">
            <span>Título</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nuestra primera vez en el cine"
              autoFocus
            />
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

        <div className="field">
          <span>
            Color del punto <span className="field-hint">— para agrupar o destacar momentos</span>
          </span>
          <div className="swatches">
            {COLORES.map((c) => (
              <button
                key={c.id || 'oro'}
                type="button"
                title={c.nombre}
                aria-label={c.nombre}
                aria-pressed={color === c.id}
                className={`swatch ${color === c.id ? 'swatch--on' : ''}`}
                style={{
                  background: `radial-gradient(circle at 34% 30%, ${c.claro}, ${c.base} 58%, ${c.oscuro})`,
                }}
                onClick={() => setColor(c.id)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <span>
            Fotos <span className="field-hint">— hasta 10 MB cada una</span>
          </span>

          <div
            className={`dropzone ${arrastrando ? 'dropzone--activa' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastrando(false);
              agregarFotos(e.dataTransfer.files);
            }}
            onClick={() => inputFile.current?.click()}
          >
            <input
              ref={inputFile}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => e.target.files && agregarFotos(e.target.files)}
            />
            {subiendo > 0 ? (
              <span className="dropzone-texto">
                Subiendo {subiendo} {subiendo === 1 ? 'foto' : 'fotos'}…
              </span>
            ) : (
              <span className="dropzone-texto">
                Arrastra fotos aquí o <u>búscalas en tu computadora</u>
              </span>
            )}
          </div>

          {photos.length > 0 && (
            <div className="miniaturas">
              {photos.map((url) => (
                <div key={url} className="miniatura">
                  <img src={url} alt="" loading="lazy" />
                  <button
                    type="button"
                    className="miniatura-quitar"
                    title="Quitar esta foto"
                    aria-label="Quitar esta foto"
                    onClick={() => quitarFoto(url)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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
          <button type="button" className="btn btn--ghost" onClick={cancelar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--gold" disabled={busy || subiendo > 0}>
            {busy ? 'Guardando…' : initial ? 'Guardar cambios' : 'Agregar a la línea'}
          </button>
        </div>
      </form>
    </div>
  );
}
