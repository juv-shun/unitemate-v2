import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  limit,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../firebase";
import type { Notification } from "./types";

/**
 * 通知をリアルタイムで購読
 * @param userId ユーザーID
 * @param callback 通知リストを受け取るコールバック
 * @returns 購読解除関数
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
): Unsubscribe {
  const notificationsRef = collection(db, "users", userId, "notifications");
  const q = query(
    notificationsRef,
    orderBy("created_at", "desc"),
    limit(20),
  );

  return onSnapshot(q, (snapshot) => {
    const notifications: Notification[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        type: data.type as "penalty_applied",
        matchId: data.match_id as string,
        reportedUserId: data.reported_user_id as string,
        reportedUserName: data.reported_user_name as string,
        message: data.message as string,
        read: data.read as boolean,
        createdAt: data.created_at?.toDate() ?? null,
      };
    });
    callback(notifications);
  });
}

/**
 * 通知を既読にする
 * @param userId ユーザーID
 * @param notificationId 通知ID
 */
export async function markAsRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  const notificationRef = doc(
    db,
    "users",
    userId,
    "notifications",
    notificationId,
  );
  await updateDoc(notificationRef, { read: true });
}
