/**
 * 通知の型定義
 */
export interface Notification {
  id: string;
  type: "penalty_applied";
  matchId: string;
  reportedUserId: string;
  reportedUserName: string;
  message: string;
  read: boolean;
  createdAt: Date | null;
}
