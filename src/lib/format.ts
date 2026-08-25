const LARGO = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' });
const CORTO = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });
const ANIO = new Intl.DateTimeFormat('es', { year: 'numeric' });

export const fechaLarga = (d: string | Date) => LARGO.format(new Date(d));
export const fechaCorta = (d: string | Date) => CORTO.format(new Date(d));
export const anio = (d: string | Date) => ANIO.format(new Date(d));

/** "Hace 1 mes y 7 dias" — para el contador de la relacion. */
export function tiempoDesde(desde: string | Date): string {
  const a = new Date(desde);
  const b = new Date();
  let meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  const marca = new Date(a);
  marca.setMonth(marca.getMonth() + meses);
  if (marca > b) {
    meses -= 1;
    marca.setMonth(marca.getMonth() - 1);
  }
  const dias = Math.floor((b.getTime() - marca.getTime()) / 86_400_000);

  const partes: string[] = [];
  if (meses > 0) partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);
  if (dias > 0 || partes.length === 0) partes.push(`${dias} ${dias === 1 ? 'día' : 'días'}`);
  return partes.join(' y ');
}

/** Para el <input type="date"> */
export const aInputDate = (d: string | Date) => new Date(d).toISOString().slice(0, 10);
