import { useEffect } from 'react';

export interface ToastData {
  id: number;
  text: string;
  tone?: 'error';
  action?: { label: string; run: () => void };
}

function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: number) => void }) {
  useEffect(() => {
    // Un deshacer necesita mucho más tiempo que un simple aviso: es la última
    // oportunidad de recuperar un recuerdo borrado por accidente.
    const ms = toast.action ? 14000 : 3500;
    const t = setTimeout(() => onDismiss(toast.id), ms);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <div className={`toast${toast.tone === 'error' ? ' toast--error' : ''}`} role="status">
      <span>{toast.text}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.run();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
