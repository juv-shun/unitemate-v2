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
  });
}

export async function cancelQueue(uid: string): Promise<void> {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    queue_status: null,
    queue_joined_at: null,
  });
}

export interface QueueData {
  status: QueueStatus;
  joinedAt: Date | null;
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
      });
    } else {
      callback({ status: null, joinedAt: null });
    }
  });
}
