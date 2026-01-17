export type QueueStatus = "waiting" | null;

export interface QueueState {
  status: QueueStatus;
  joinedAt: Date | null;
}
