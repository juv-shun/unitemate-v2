import {
  type Unsubscribe,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import type { QueueStatus } from "./types";

export async function startQueue(uid: string): Promise<void> {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    queue_status: "waiting",
    queue_joined_at: serverTimestamp(),
    matched_match_id: null,
  });
}

export async function cancelQueue(uid: string): Promise<void> {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    queue_status: null,
    queue_joined_at: null,
    matched_match_id: null,
  });
}

export interface QueueData {
  status: QueueStatus;
  joinedAt: Date | null;
  matchedMatchId: string | null;
  bannedUntil: Date | null;
}

export function subscribeToQueueStatus(
  uid: string,
  callback: (data: QueueData) => void,
): Unsubscribe {
  const userRef = doc(db, "users", uid);
  return onSnapshot(userRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        status: data.queue_status ?? null,
        joinedAt: data.queue_joined_at?.toDate() ?? null,
        matchedMatchId: data.matched_match_id ?? null,
        bannedUntil: data.banned_until?.toDate() ?? null,
      });
    } else {
      callback({ status: null, joinedAt: null, matchedMatchId: null, bannedUntil: null });
    }
  });
}
