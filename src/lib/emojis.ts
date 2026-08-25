/**
 * Emojis para marcar cada momento, agrupados por lo que suele pasar en una
 * relación. Es una lista cerrada a propósito: elegir de una cuadrícula es más
 * rápido y evita que se cuele texto que no es un emoji.
 */
export interface GrupoEmoji {
  nombre: string;
  emojis: string[];
}

export const GRUPOS_EMOJI: GrupoEmoji[] = [
  {
    nombre: 'Amor',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '❤️‍🔥', '💕', '💞', '💓', '💗', '💘', '💝', '💌', '💋'],
  },
  {
    nombre: 'Nosotros',
    emojis: ['🥰', '😍', '😘', '🤗', '🫂', '👫', '💑', '💏', '💍', '🌹', '🥺', '😊', '😻', '🫶', '🤞', '👀'],
  },
  {
    nombre: 'Momentos',
    emojis: ['✨', '🌟', '⭐', '🎉', '🎊', '🥂', '🍾', '🎁', '🎂', '🎈', '🕯️', '🎀', '🔮', '🪄', '🧵', '📌'],
  },
  {
    nombre: 'Salidas',
    emojis: ['💃', '🕺', '🎵', '🎶', '🎤', '🎧', '🎬', '🍿', '🎮', '🎡', '🎢', '🎳', '🎯', '🎨', '📚', '⚽'],
  },
  {
    nombre: 'Comida',
    emojis: ['🍕', '🍔', '🍗', '🍟', '🌮', '🍣', '🍜', '🍰', '🧁', '🍦', '🍫', '🍓', '☕', '🧋', '🍺', '🥤'],
  },
  {
    nombre: 'Lugares',
    emojis: ['✈️', '🚗', '🚌', '🏖️', '🏝️', '🏔️', '⛺', '🌆', '🌃', '🗺️', '🧳', '🏠', '📍', '🌉', '🎪', '⛲'],
  },
  {
    nombre: 'Cielo y tiempo',
    emojis: ['🌙', '☀️', '🌈', '⛅', '🌧️', '❄️', '🔥', '🌊', '🌸', '🌻', '🍂', '🌵', '🕰️', '📅', '⏳', '🌅'],
  },
  {
    nombre: 'Recuerdos',
    emojis: ['📷', '📸', '🖼️', '✉️', '📝', '🔗', '🗝️', '🎞️', '💿', '📖', '🧸', '🪙', '🏆', '🥇', '💎', '🫧'],
  },
];

/** Todos, sin agrupar: sirve para saber si un valor guardado está en la lista. */
export const TODOS_EMOJI = GRUPOS_EMOJI.flatMap((g) => g.emojis);
