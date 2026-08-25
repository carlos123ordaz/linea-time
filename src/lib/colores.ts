/**
 * Colores para los puntos de la línea. Pensados sobre papel claro: el centro
 * es casi blanco, el borde oscuro, para que el punto se lea como una cuenta
 * de vidrio y no como un círculo plano.
 */
export interface ColorPunto {
  id: string;
  nombre: string;
  claro: string;
  base: string;
  oscuro: string;
}

export const COLORES: ColorPunto[] = [
  { id: '',         nombre: 'Oro',      claro: '#fff8ea', base: '#e0a63c', oscuro: '#a1690f' },
  { id: 'rosa',     nombre: 'Rosa',     claro: '#fff0f5', base: '#e0759a', oscuro: '#a83b60' },
  { id: 'rojo',     nombre: 'Rojo',     claro: '#ffefec', base: '#e0685c', oscuro: '#a32c1f' },
  { id: 'naranja',  nombre: 'Naranja',  claro: '#fff3e2', base: '#e8933f', oscuro: '#a85c12' },
  { id: 'verde',    nombre: 'Verde',    claro: '#eafaf1', base: '#4fb583', oscuro: '#17724d' },
  { id: 'turquesa', nombre: 'Turquesa', claro: '#e8f7fb', base: '#46a9c0', oscuro: '#0e6a7d' },
  { id: 'azul',     nombre: 'Azul',     claro: '#edf3fc', base: '#6a92cf', oscuro: '#2f5691' },
  { id: 'violeta',  nombre: 'Violeta',  claro: '#f4eefc', base: '#9d80cc', oscuro: '#5f4090' },
];

const PORDEFECTO = COLORES[0];

export const colorDe = (id: string): ColorPunto =>
  COLORES.find((c) => c.id === id) ?? PORDEFECTO;

/** '#e0a63c' + 0.3 → 'rgba(224, 166, 60, 0.3)' */
export function conAlfa(hex: string, alfa: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
}
