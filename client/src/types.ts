export type EventKind = 'origen' | 'conexion' | 'encuentro' | 'hito' | 'recuerdo';

export interface TimelineEvent {
  _id: string;
  title: string;
  description: string;
  date: string;
  kind: EventKind;
  place: string;
  people: string[];
  isPivot: boolean;
  importance: number;
  emoji: string;
  photoUrl: string;
  createdAt?: string;
  updatedAt?: string;
}

export type EventInput = Omit<TimelineEvent, '_id' | 'createdAt' | 'updatedAt'>;

export type Verdict = 'nunca' | 'reconstruida' | 'inevitable';

export interface BranchEvent {
  date: string;
  title: string;
  description: string;
  nature: 'igual' | 'nuevo' | 'roto';
}

export interface Simulation {
  _id: string;
  premise: string;
  pivotEventId: string | null;
  pivotDate: string | null;
  verdict: Verdict;
  probability: number;
  headline: string;
  summary: string;
  collapseReason: string;
  divergenceDate: string;
  alternateMeetDate: string;
  closingLine: string;
  branchEvents: BranchEvent[];
  model: string;
  createdAt: string;
}
