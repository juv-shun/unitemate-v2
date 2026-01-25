import {
	collection,
	doc,
	limit,
	onSnapshot,
	query,
	runTransaction,
	serverTimestamp,
	type Unsubscribe,
	updateDoc,
	where,
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

export function isQueueClosedAt(date: Date): boolean {
	const minutes = date.getHours() * 60 + date.getMinutes();
	// 18時〜翌2時のみ開催、それ以外（2時〜18時）は閉鎖
	// 2時 = 120分、18時 = 1080分
	return minutes >= 120 && minutes < 1080;
}

export async function cancelQueue(uid: string): Promise<void> {
	const userRef = doc(db, "users", uid);

	// マッチング待機中の場合のみキャンセルする
	// マッチ成立済み（matched）の場合は、ログアウトしても状態を維持する
	await runTransaction(db, async (transaction) => {
		const userDoc = await transaction.get(userRef);
		if (!userDoc.exists()) return;

		const data = userDoc.data();
		if (data.queue_status === "waiting") {
			transaction.update(userRef, {
				queue_status: null,
				queue_joined_at: null,
				matched_match_id: null,
			});
		}
	});
}

/**
 * 強制的にキュー状態をリセットする（マッチ終了時など）
 */
export async function resetQueueState(uid: string): Promise<void> {
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
			callback({
				status: null,
				joinedAt: null,
				matchedMatchId: null,
				bannedUntil: null,
			});
		}
	});
}

/**
 * キュー内の人数をリアルタイム監視する
 * コスト効率のため、最大10人までのみカウント
 */
export function subscribeToQueueCount(
	callback: (count: number) => void,
): Unsubscribe {
	const q = query(
		collection(db, "users"),
		where("queue_status", "==", "waiting"),
		limit(10),
	);
	return onSnapshot(q, (snapshot) => {
		callback(snapshot.size);
	});
}
