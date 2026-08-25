import type { EventInput, Simulation, TimelineEvent } from '../types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean; gemini: boolean }>('/api/health'),

  listEvents: () => request<TimelineEvent[]>('/api/events'),
  createEvent: (data: Partial<EventInput>) =>
    request<TimelineEvent>('/api/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id: string, data: Partial<EventInput>) =>
    request<TimelineEvent>(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEvent: (id: string) =>
    request<{ ok: true }>(`/api/events/${id}`, { method: 'DELETE' }),

  listSimulations: () => request<Simulation[]>('/api/simulations'),
  createSimulation: (premise: string, pivotEventId: string | null) =>
    request<Simulation>('/api/simulations', {
      method: 'POST',
      body: JSON.stringify({ premise, pivotEventId }),
    }),
  deleteSimulation: (id: string) =>
    request<{ ok: true }>(`/api/simulations/${id}`, { method: 'DELETE' }),
};
