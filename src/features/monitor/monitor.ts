import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

export interface QueuedUser {
  id: string;
  displayName: string;
  queueJoinedAt: Date | null;
}

export interface MatchMember {
  userId: string;
  displayName: string;
  team: "first" | "second";
  seatNo: number;
}

export interface ActiveMatch {
  id: string;
  status: string;
  createdAt: Date | null;
  members: MatchMember[];
}

/**
 * キュー中のユーザー一覧を取得
 */
export async function fetchQueuedUsers(): Promise<QueuedUser[]> {
  const q = query(
    collection(db, "users"),
    where("queue_status", "==", "waiting"),
    orderBy("queue_joined_at", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const queueJoinedAt = data.queue_joined_at as Timestamp | null;

    return {
      id: doc.id,
      displayName: data.display_name || "名前なし",
      queueJoinedAt: queueJoinedAt?.toDate() ?? null,
    };
  });
}

/**
 * ユーザーIDから表示名を取得
 */
async function fetchUserDisplayName(userId: string): Promise<string> {
  const userDoc = await getDoc(doc(db, "users", userId));
  if (userDoc.exists()) {
    return userDoc.data().display_name || "名前なし";
  }
  return "名前なし";
}

/**
 * マッチ中の試合一覧を取得（メンバー含む）
 */
export async function fetchActiveMatches(): Promise<ActiveMatch[]> {
  const matchesQuery = query(
    collection(db, "matches"),
    where("status", "==", "lobby_pending"),
    orderBy("created_at", "desc")
  );

  const matchesSnapshot = await getDocs(matchesQuery);

  const matches: ActiveMatch[] = await Promise.all(
    matchesSnapshot.docs.map(async (matchDoc) => {
      const matchData = matchDoc.data();
      const createdAt = matchData.created_at as Timestamp | null;

      // メンバーを取得
      const membersSnapshot = await getDocs(
        collection(db, "matches", matchDoc.id, "members")
      );

      // 各メンバーのユーザー情報を取得
      const members: MatchMember[] = await Promise.all(
        membersSnapshot.docs.map(async (memberDoc) => {
          const memberData = memberDoc.data();
          const displayName = await fetchUserDisplayName(memberData.user_id);
          return {
            userId: memberData.user_id,
            displayName,
            team: memberData.team,
            seatNo: memberData.seat_no,
          };
        })
      );

      // チーム・席順でソート
      members.sort((a, b) => {
        if (a.team !== b.team) {
          return a.team === "first" ? -1 : 1;
        }
        return a.seatNo - b.seatNo;
      });

      return {
        id: matchDoc.id,
        status: matchData.status,
        createdAt: createdAt?.toDate() ?? null,
        members,
      };
    })
  );

  return matches;
}
