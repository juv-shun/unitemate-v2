import type { Timestamp } from "firebase-admin/firestore";

export type QueueUser = {
  id: string;
  queueJoinedAt: Timestamp | null;
  rating: number;
};

export type Assignment = {
  userId: string;
  team: "first" | "second";
  seatNo: number;
};

export type MatchResult = "win" | "loss" | "invalid";
export type FinalResult = "first_win" | "second_win" | "invalid";
export type FinalizeReason = "threshold" | "timeout";

export type MatchMember = {
  user_id: string;
  role: "participant" | "spectator";
  team?: "first" | "second";
  match_result?: MatchResult;
};
