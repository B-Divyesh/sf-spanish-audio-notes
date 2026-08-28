export type Segment = { id: string; start: number; end: number; text: string };
export type Pin = { id: string; segmentId: string; note: string; createdAt: string; reviewedAt?: string };
export type Session = {
  id: string;
  title: string;
  createdAt: string;
  audioPath?: string;
  audioName: string;
  variant: string;
  model: string;
  duration?: number;
  segments: Segment[];
  pins: Pin[];
};

export type AppState = { sessions: Session[]; activeId?: string };
