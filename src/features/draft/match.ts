import {
	type Unsubscribe,
	collection,
	doc,
	setDoc,
	updateDoc,
	deleteDoc,
	getDoc,
	getDocs,
	onSnapshot,
	serverTimestamp,
	query,
	where,
	orderBy,
	runTransaction,
	Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import type { Match, Member, DraftSession, Turn, Team } from "./types";

// =====================================
// Match CRUD
// =====================================

/**
 * 新規ルーム作成
 * @returns matchId
 */
export async function createMatch(): Promise<string> {
	const matchRef = doc(collection(db, "matches"));
	await setDoc(matchRef, {
		phase: "phase1",
		source_type: "manual",
		status: "waiting",
		capacity: 10,
		auto_start: true,
		created_at: serverTimestamp(),
		updated_at: serverTimestamp(),
	});
	return matchRef.id;
}

/**
 * マッチ情報取得
 */
export async function getMatch(matchId: string): Promise<Match | null> {
	const matchRef = doc(db, "matches", matchId);
	const matchSnap = await getDoc(matchRef);

	if (!matchSnap.exists()) {
		return null;
	}

	const data = matchSnap.data();
	return {
		id: matchSnap.id,
		phase: data.phase,
		source_type: data.source_type,
		status: data.status,
		capacity: data.capacity,
		auto_start: data.auto_start,
		first_team: data.first_team,
		created_at: data.created_at?.toDate(),
		updated_at: data.updated_at?.toDate(),
	};
}

/**
 * マッチステータス更新
 */
export async function updateMatchStatus(
	matchId: string,
	status: Match["status"],
): Promise<void> {
	const matchRef = doc(db, "matches", matchId);
	await updateDoc(matchRef, {
		status,
		updated_at: serverTimestamp(),
	});
}

// =====================================
// Member CRUD
// =====================================

/**
 * 参加者としてルーム参加
 * @throws Error - 席が埋まっている場合
 */
export async function joinAsParticipant(
	matchId: string,
	userId: string,
	team: Team,
	seatNo: number,
): Promise<void> {
	// バリデーション
	if (!["first", "second"].includes(team)) {
		throw new Error("無効なチーム");
	}
	if (seatNo < 1 || seatNo > 5) {
		throw new Error("無効な席番号");
	}

	// 事前チェック（Transaction外で高速チェック）
	const membersRef = collection(db, "matches", matchId, "members");
	const membersSnapshot = await getDocs(membersRef);
	const existingMemberIds = new Set<string>();
	const occupiedSeats = new Map<string, boolean>();

	for (const memberDoc of membersSnapshot.docs) {
		existingMemberIds.add(memberDoc.id);
		const data = memberDoc.data();
		if (data.role === "participant") {
			const seatKey = `${data.team}_${data.seat_no}`;
			occupiedSeats.set(seatKey, true);
		}
	}

	if (existingMemberIds.has(userId)) {
		throw new Error("既にこのルームに参加しています");
	}

	const targetSeatKey = `${team}_${seatNo}`;
	if (occupiedSeats.has(targetSeatKey)) {
		throw new Error("この席は既に埋まっています");
	}

	// Transaction内で最終確認と書き込み
	await runTransaction(db, async (transaction) => {
		// 既に参加しているか最終確認
		const existingMemberRef = doc(db, "matches", matchId, "members", userId);
		const existingMember = await transaction.get(existingMemberRef);
		if (existingMember.exists()) {
			throw new Error("既にこのルームに参加しています");
		}

		// 席の占有を最終確認するため、全メンバーを再度読み取り
		// Transaction内ではqueryが使えないため、既知のIDから個別に取得
		for (const memberId of existingMemberIds) {
			const memberRef = doc(db, "matches", matchId, "members", memberId);
			const memberSnap = await transaction.get(memberRef);
			if (memberSnap.exists()) {
				const data = memberSnap.data();
				if (
					data.role === "participant" &&
					data.team === team &&
					data.seat_no === seatNo
				) {
					throw new Error("この席は既に埋まっています");
				}
			}
		}

		// 追加
		const memberRef = doc(db, "matches", matchId, "members", userId);
		transaction.set(memberRef, {
			user_id: userId,
			role: "participant",
			team,
			seat_no: seatNo,
			joined_at: serverTimestamp(),
		});
	});
}

/**
 * 観戦者として参加
 */
export async function joinAsSpectator(
	matchId: string,
	userId: string,
): Promise<void> {
	// 既に参加しているかチェック
	const memberRef = doc(db, "matches", matchId, "members", userId);
	const memberSnap = await getDoc(memberRef);
	if (memberSnap.exists()) {
		throw new Error("既にこのルームに参加しています");
	}

	await setDoc(memberRef, {
		user_id: userId,
		role: "spectator",
		joined_at: serverTimestamp(),
	});
}

/**
 * ルーム退出
 */
export async function leaveMatch(
	matchId: string,
	userId: string,
): Promise<void> {
	const memberRef = doc(db, "matches", matchId, "members", userId);
	await deleteDoc(memberRef);
}

/**
 * 参加者一覧取得
 */
export async function getMembers(matchId: string): Promise<Member[]> {
	const membersRef = collection(db, "matches", matchId, "members");
	const q = query(membersRef, orderBy("joined_at", "asc"));
	const snapshot = await getDocs(q);

	return snapshot.docs.map((doc) => ({
		id: doc.id,
		user_id: doc.data().user_id,
		role: doc.data().role,
		team: doc.data().team,
		seat_no: doc.data().seat_no,
		joined_at: doc.data().joined_at?.toDate(),
	}));
}

/**
 * 参加者数チェック（10人揃い判定）
 */
export async function getParticipantCount(matchId: string): Promise<number> {
	const members = await getMembers(matchId);
	return members.filter((m) => m.role === "participant").length;
}

// =====================================
// DraftSession & Turns
// =====================================

/**
 * ターン順序定義（BAN/PICK）
 */
const BAN_ORDER: Array<{ team: Team; slot_no: number }> = [
	{ team: "first", slot_no: 1 },
	{ team: "second", slot_no: 1 },
	{ team: "first", slot_no: 2 },
	{ team: "second", slot_no: 2 },
	{ team: "first", slot_no: 3 },
	{ team: "second", slot_no: 3 },
];

const PICK_ORDER: Array<{ team: Team; slot_no: number }> = [
	{ team: "first", slot_no: 1 },
	{ team: "second", slot_no: 1 },
	{ team: "second", slot_no: 2 },
	{ team: "first", slot_no: 2 },
	{ team: "first", slot_no: 3 },
	{ team: "second", slot_no: 3 },
	{ team: "second", slot_no: 4 },
	{ team: "first", slot_no: 4 },
	{ team: "first", slot_no: 5 },
	{ team: "second", slot_no: 5 },
];

/**
 * Fisher-Yatesシャッフル
 */
function shuffleArray<T>(array: T[]): T[] {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * ターン一覧生成ロジック
 * BAN順: 先攻→後攻→先攻→後攻→先攻→後攻（6ターン）
 * PICK順: 先攻1→後攻2→先攻2→後攻2→先攻2→後攻1（10ターン）
 */
export function generateTurns(
	members: Member[],
): Omit<Turn, "id">[] {
	// チームごとに参加者を分ける
	const firstTeam = members.filter(
		(m) => m.role === "participant" && m.team === "first",
	);
	const secondTeam = members.filter(
		(m) => m.role === "participant" && m.team === "second",
	);

	if (firstTeam.length !== 5 || secondTeam.length !== 5) {
		throw new Error("各チームは5人の参加者が必要です");
	}

	// 各チームのシャッフル（ランダム順）
	const shuffledFirst = shuffleArray([...firstTeam]);
	const shuffledSecond = shuffleArray([...secondTeam]);

	const turns: Omit<Turn, "id">[] = [];
	let turnNo = 1;

	// BANターン生成
	let firstIdx = 0;
	let secondIdx = 0;
	for (const { team, slot_no } of BAN_ORDER) {
		const assignee =
			team === "first"
				? shuffledFirst[firstIdx++ % shuffledFirst.length]
				: shuffledSecond[secondIdx++ % secondTeam.length];

		turns.push({
			turn_no: turnNo++,
			action_type: "ban",
			team,
			slot_no,
			assignee_user_id: assignee.user_id,
		});
	}

	// PICKターン生成
	firstIdx = 0;
	secondIdx = 0;
	for (const { team, slot_no } of PICK_ORDER) {
		const assignee =
			team === "first"
				? shuffledFirst[firstIdx++ % shuffledFirst.length]
				: shuffledSecond[secondIdx++ % secondTeam.length];

		turns.push({
			turn_no: turnNo++,
			action_type: "pick",
			team,
			slot_no,
			assignee_user_id: assignee.user_id,
		});
	}

	return turns;
}

/**
 * ドラフトセッション作成＋ターン一括生成
 * @returns draftSessionId
 */
export async function createDraftSession(matchId: string): Promise<void> {
	// 1. 事前チェック（Transaction外で高速チェック）
	const match = await getDoc(doc(db, "matches", matchId));
	if (!match.exists() || match.data().status !== "waiting") {
		return; // 既に生成済みまたはマッチが存在しない
	}

	// 2. draft_sessionsの事前チェック
	const existingSessions = await getDocs(
		query(collection(db, "draft_sessions"), where("match_id", "==", matchId)),
	);
	if (!existingSessions.empty) {
		return; // 既に生成済み
	}

	// 3. membersを取得（事前チェック用）
	const preCheckMembers = await getMembers(matchId);
	if (preCheckMembers.filter((m) => m.role === "participant").length !== 10) {
		return; // 10人揃っていない
	}

	// 既知のmemberIDsを保存（Transaction内で再取得するため）
	const memberIds = preCheckMembers.map((m) => m.id);

	// 4. Transactionで書き込み（楽観的ロック + 人数再検証）
	await runTransaction(db, async (transaction) => {
		const matchRef = doc(db, "matches", matchId);

		// 最終確認: matchのstatusを再度チェック
		const matchSnap = await transaction.get(matchRef);
		if (!matchSnap.exists()) {
			throw new Error("Match not found");
		}

		const currentStatus = matchSnap.data().status;
		if (currentStatus !== "waiting") {
			// 他のクライアントが先に更新済み → 処理中断
			return;
		}

		// Transaction内でmembersを再取得して人数とチーム構成を検証
		const members: Member[] = [];
		for (const memberId of memberIds) {
			const memberRef = doc(db, "matches", matchId, "members", memberId);
			const memberSnap = await transaction.get(memberRef);
			if (memberSnap.exists()) {
				const data = memberSnap.data();
				members.push({
					id: memberSnap.id,
					user_id: data.user_id,
					role: data.role,
					team: data.team,
					seat_no: data.seat_no,
					joined_at: data.joined_at?.toDate(),
				});
			}
		}

		// 参加者が10人揃っているか最終確認
		const participants = members.filter((m) => m.role === "participant");
		if (participants.length !== 10) {
			// 人数が変わっている場合は処理中断
			return;
		}

		// チーム構成の検証
		const firstTeam = participants.filter((m) => m.team === "first");
		const secondTeam = participants.filter((m) => m.team === "second");
		if (firstTeam.length !== 5 || secondTeam.length !== 5) {
			// チーム構成が不正な場合は処理中断
			return;
		}

		// ターン生成
		const turns = generateTurns(members);

		// draft_session作成
		const draftRef = doc(collection(db, "draft_sessions"));
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 20);

		transaction.set(draftRef, {
			source_type: "match",
			match_id: matchId,
			status: "waiting",
			expires_at: Timestamp.fromDate(expiresAt),
			created_at: serverTimestamp(),
		});

		// turns作成
		for (const turn of turns) {
			const turnRef = doc(
				collection(db, "draft_sessions", draftRef.id, "turns"),
			);
			transaction.set(turnRef, turn);
		}

		// matchのstatus更新（waiting → draft_pending）
		transaction.update(matchRef, {
			status: "draft_pending",
			updated_at: serverTimestamp(),
		});
	});
}

/**
 * ドラフトセッション取得
 */
export async function getDraftSession(
	matchId: string,
): Promise<DraftSession | null> {
	const sessionsRef = collection(db, "draft_sessions");
	const q = query(sessionsRef, where("match_id", "==", matchId));
	const snapshot = await getDocs(q);

	if (snapshot.empty) {
		return null;
	}

	const doc = snapshot.docs[0];
	const data = doc.data();
	return {
		id: doc.id,
		source_type: data.source_type,
		match_id: data.match_id,
		status: data.status,
		started_at: data.started_at?.toDate(),
		completed_at: data.completed_at?.toDate(),
		expires_at: data.expires_at?.toDate(),
		created_at: data.created_at?.toDate(),
	};
}

// =====================================
// リアルタイム購読
// =====================================

/**
 * Match情報のリアルタイム購読
 */
export function subscribeToMatch(
	matchId: string,
	callback: (match: Match | null) => void,
	onError?: (error: Error) => void,
): Unsubscribe {
	const matchRef = doc(db, "matches", matchId);
	return onSnapshot(
		matchRef,
		(snapshot) => {
			if (snapshot.exists()) {
				const data = snapshot.data();
				callback({
					id: snapshot.id,
					phase: data.phase,
					source_type: data.source_type,
					status: data.status,
					capacity: data.capacity,
					auto_start: data.auto_start,
					first_team: data.first_team,
					created_at: data.created_at?.toDate(),
					updated_at: data.updated_at?.toDate(),
				});
			} else {
				callback(null);
			}
		},
		(error) => {
			if (onError) {
				onError(error);
			} else {
				console.error("Match subscription error:", error);
			}
		},
	);
}

/**
 * Members一覧のリアルタイム購読
 */
export function subscribeToMembers(
	matchId: string,
	callback: (members: Member[]) => void,
	onError?: (error: Error) => void,
): Unsubscribe {
	const membersRef = collection(db, "matches", matchId, "members");
	const q = query(membersRef, orderBy("joined_at", "asc"));

	let latestSnapshotId = 0;

	return onSnapshot(
		q,
		async (snapshot) => {
			// 非同期順序問題を防ぐため、スナップショットIDを使用
			const currentSnapshotId = ++latestSnapshotId;

			try {
				const members: Member[] = await Promise.all(
					snapshot.docs.map(async (memberDoc) => {
						const memberData = memberDoc.data();

						// usersコレクションからユーザー情報を取得
						const userDoc = await getDoc(doc(db, "users", memberData.user_id));
						const userData = userDoc.exists() ? userDoc.data() : null;

						return {
							id: memberDoc.id,
							user_id: memberData.user_id,
							role: memberData.role,
							team: memberData.team,
							seat_no: memberData.seat_no,
							joined_at: memberData.joined_at?.toDate(),
							display_name: userData?.display_name,
							photo_url: userData?.photo_url,
						};
					}),
				);

				// 最新のスナップショットのみをコールバック
				if (currentSnapshotId === latestSnapshotId) {
					callback(members);
				}
			} catch (error) {
				if (onError) {
					onError(error as Error);
				} else {
					console.error("Members processing error:", error);
				}
			}
		},
		(error) => {
			if (onError) {
				onError(error);
			} else {
				console.error("Members subscription error:", error);
			}
		},
	);
}

/**
 * DraftSessionのリアルタイム購読
 */
export function subscribeToDraftSession(
	matchId: string,
	callback: (session: DraftSession | null) => void,
	onError?: (error: Error) => void,
): Unsubscribe {
	const sessionsRef = collection(db, "draft_sessions");
	const q = query(sessionsRef, where("match_id", "==", matchId));

	return onSnapshot(
		q,
		(snapshot) => {
			if (snapshot.empty) {
				callback(null);
			} else {
				const doc = snapshot.docs[0];
				const data = doc.data();
				callback({
					id: doc.id,
					source_type: data.source_type,
					match_id: data.match_id,
					status: data.status,
					started_at: data.started_at?.toDate(),
					completed_at: data.completed_at?.toDate(),
					expires_at: data.expires_at?.toDate(),
					created_at: data.created_at?.toDate(),
				});
			}
		},
		(error) => {
			if (onError) {
				onError(error);
			} else {
				console.error("Draft session subscription error:", error);
			}
		},
	);
}
