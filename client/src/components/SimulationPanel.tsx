import { useState } from 'react';
import type { Simulation, TimelineEvent, Verdict } from '../types';
import { fechaLarga } from '../lib/format';

const VERDICT_LABEL: Record<Verdict, string> = {
  nunca: 'Nunca se conocen',
  reconstruida: 'La línea se reconstruye',
  inevitable: 'Era inevitable',
};

const SUGERENCIAS = [
  'Si Víctor nunca me hubiera presentado a mi amigo…',
  'Si su amiga no la hubiera invitado a la fiesta…',
  'Si esa noche yo me hubiera quedado en casa…',
  'Si nunca la hubiera sacado a bailar…',
  'Si la fiesta se hubiera cancelado por lluvia…',
  'Si ella hubiera llegado una hora después…',
];

interface Props {
  events: TimelineEvent[];
  simulations: Simulation[];
  active: Simulation | null;
  geminiReady: boolean;
  presetPivotId: string | null;
  onRun: (premise: string, pivotEventId: string | null) => Promise<void>;
  onActivate: (s: Simulation | null) => void;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export function SimulationPanel({
  events,
  simulations,
  active,
  geminiReady,
  presetPivotId,
  onRun,
  onActivate,
  onDelete,
  onClose,
}: Props) {
  const [premise, setPremise] = useState('');
  const [pivotId, setPivotId] = useState<string>(presetPivotId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    if (premise.trim().length < 4) return setError('Escribe qué habría cambiado.');
    setBusy(true);
    setError('');
    try {
      await onRun(premise.trim(), pivotId || null);
      setPremise('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="drawer drawer--left">
      <div className="drawer-topbar">
        <span />
        <button className="icon-btn" onClick={onClose} aria-label="Cerrar" title="Cerrar (Esc)">
          ✕
        </button>
      </div>

      <h2 className="panel-title">El Ojo de Agamotto</h2>
      <p className="panel-sub">
        Cambia una sola cosa del pasado y mira cómo se reordena todo lo demás.
      </p>

      {!geminiReady && (
        <p className="warn">
          Falta la <code>GEMINI_API_KEY</code> en <code>server/.env</code>. Sin ella no se pueden
          abrir realidades alternas.
        </p>
      )}

      <label className="field">
        <span>¿Qué hubiera pasado si…?</span>
        <textarea
          rows={3}
          value={premise}
          onChange={(e) => setPremise(e.target.value)}
          placeholder="Si su amiga no la hubiera invitado a la fiesta…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run();
          }}
        />
      </label>

      <div className="chips chips--wrap">
        {SUGERENCIAS.map((s) => (
          <button key={s} type="button" className="chip chip--sm" onClick={() => setPremise(s)}>
            {s}
          </button>
        ))}
      </div>

      <label className="field">
        <span>
          Abrir la rama desde{' '}
          <span className="field-hint">— si la causa real está más atrás, la rama nace ahí</span>
        </span>
        <select value={pivotId} onChange={(e) => setPivotId(e.target.value)}>
          <option value="">El principio de todo</option>
          {events.map((e) => (
            <option key={e._id} value={e._id}>
              {new Date(e.date).getFullYear()} · {e.title}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="form-error">{error}</p>}

      <button className="btn btn--cyan btn--block" onClick={run} disabled={busy || !geminiReady}>
        {busy ? 'Abriendo…' : 'Abrir esta realidad'}
      </button>

      {busy && (
        <div className="scrying">
          <i />
          <i />
          <i />
          Recorriendo los futuros posibles…
        </div>
      )}

      {active && (
        <div className={`result result--${active.verdict}`}>
          <div className="result-head">
            <span className="verdict">{VERDICT_LABEL[active.verdict]}</span>
            <span className="prob" title="Probabilidad de que aun así terminen juntos">
              {active.probability}%
              <small>de terminar juntos</small>
            </span>
          </div>
          <h3 className="result-headline">{active.headline}</h3>
          <p className="result-premise">“{active.premise}”</p>
          <p className="result-summary">{active.summary}</p>

          {active.collapseReason && (
            <p className="result-collapse">
              <strong>El eslabón que se rompe:</strong> {active.collapseReason}
            </p>
          )}
          {active.divergenceDate && (
            <p className="result-alt">
              La realidad se parte el <strong>{fechaLarga(active.divergenceDate)}</strong>.
            </p>
          )}
          {active.verdict !== 'nunca' && active.alternateMeetDate && (
            <p className="result-alt">
              En esa realidad se conocen el <strong>{fechaLarga(active.alternateMeetDate)}</strong>.
            </p>
          )}
          {active.closingLine && <p className="result-closing">{active.closingLine}</p>}

          <button className="btn btn--ghost btn--block" onClick={() => onActivate(null)}>
            Volver a nuestra línea real
          </button>
        </div>
      )}

      {simulations.length > 0 && (
        <div className="history">
          <h4>Realidades guardadas</h4>
          {simulations.map((s) => (
            <div key={s._id} className={`history-item ${active?._id === s._id ? 'is-active' : ''}`}>
              <button className="history-main" onClick={() => onActivate(s)}>
                <span className={`dot dot--${s.verdict}`} />
                <span className="history-text">{s.headline || s.premise}</span>
              </button>
              <button
                className="history-del"
                title="Eliminar esta realidad"
                onClick={() => onDelete(s._id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
