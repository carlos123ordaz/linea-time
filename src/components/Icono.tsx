type Nombre = 'editar' | 'eliminar' | 'cerrar' | 'izquierda' | 'derecha';

const TRAZOS: Record<Nombre, string[]> = {
  editar: ['M12 20h9', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5Z'],
  eliminar: [
    'M3 6h18',
    'M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6',
    'M18.5 6l-.9 13a2 2 0 0 1-2 1.9H8.4a2 2 0 0 1-2-1.9L5.5 6',
    'M10 11v6',
    'M14 11v6',
  ],
  cerrar: ['M18 6 6 18', 'M6 6l12 12'],
  izquierda: ['M15 18l-6-6 6-6'],
  derecha: ['M9 18l6-6-6-6'],
};

/** Iconos de trazo, dibujados a mano: sin librería y sin peso extra. */
export function Icono({ nombre, size = 17 }: { nombre: Nombre; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {TRAZOS[nombre].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
