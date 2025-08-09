export interface SessionResponse {
  status: 'already-started' | 'initializing';
  sessionId: string;
}
