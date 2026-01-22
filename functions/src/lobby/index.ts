import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { db } from "../lib/db.js";

/**
 * ロビーID設定（参加者チェック付き）
 */
export const setMatchLobbyId = onCall(
  { region: "asia-northeast1", invoker: "public" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "認証が必要です");
    }
    const { matchId, lobbyId } = request.data;
    const userId = request.auth.uid;

    // バリデーション: lobbyId (8桁数字)
    if (!/^\d{8}$/.test(lobbyId)) {
      throw new HttpsError("invalid-argument", "ロビーIDは8桁の数字");
    }

    const matchRef = db.collection("matches").doc(matchId);

    // トランザクション外: 参加者チェック + メンバー一覧取得
    const callerMemberSnap = await matchRef
      .collection("members")
      .doc(userId)
      .get();
    if (!callerMemberSnap.exists) {
      throw new HttpsError(
        "permission-denied",
        "このマッチの参加者ではありません",
      );
    }

    const membersSnap = await matchRef
      .collection("members")
      .where("role", "==", "participant")
      .get();
    const allSeated = membersSnap.docs.every(
      (doc) => doc.data().seated_at != null,
    );

    // トランザクション: match更新のみ
    return db.runTransaction(async (transaction) => {
      const matchSnap = await transaction.get(matchRef);
      if (!matchSnap.exists) {
        throw new HttpsError("not-found", "マッチが見つかりません");
      }
      const matchData = matchSnap.data()!;

      if (matchData.status !== "lobby_pending") {
        throw new HttpsError("failed-precondition", "変更不可ステータス");
      }

      transaction.update(matchRef, {
        lobby_id: lobbyId,
        lobby_updated_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        status: matchData.status,
      };
    });
  },
);

/**
 * 着席設定
 */
export const setSeated = onCall(
  { region: "asia-northeast1", invoker: "public" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "認証が必要です");
    }
    const { matchId } = request.data;
    const userId = request.auth.uid;

    const matchRef = db.collection("matches").doc(matchId);
    const memberRef = matchRef.collection("members").doc(userId);

    // 参加者チェック
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      throw new HttpsError(
        "permission-denied",
        "このマッチの参加者ではありません",
      );
    }

    // 着席更新
    await memberRef.update({
      seated_at: FieldValue.serverTimestamp(),
    });

    return { success: true };
  },
);

/**
 * 着席解除
 */
export const unsetSeated = onCall(
  { region: "asia-northeast1", invoker: "public" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "認証が必要です");
    }
    const { matchId } = request.data;
    const userId = request.auth.uid;

    const matchRef = db.collection("matches").doc(matchId);
    const memberRef = matchRef.collection("members").doc(userId);

    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      throw new HttpsError(
        "permission-denied",
        "このマッチの参加者ではありません",
      );
    }

    await memberRef.update({
      seated_at: null,
    });

    return { success: true };
  },
);
