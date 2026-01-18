export type QueueStatus = "waiting" | "matched" | null;

export interface QueueState {
  status: QueueStatus;
  joinedAt: Date | null;
  matchedMatchId?: string | null;
}
