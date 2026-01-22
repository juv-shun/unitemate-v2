import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { db } from "../lib/db.js";

/**
 * ペナルティ付与処理
 * @param userId 対象ユーザーID
 * @param matchId 通報元マッチID
 * @param matchCreatedAt マッチ作成日時
 */
const applyPenalty = async (
  userId: string,
  matchId: string,
  matchCreatedAt: Timestamp,
): Promise<void> => {
  const userRef = db.collection("users").doc(userId);
  const penaltiesRef = userRef.collection("penalties");

  // 既存ペナルティ確認（同一マッチに対する重複防止）
  const existingPenaltySnap = await penaltiesRef
    .where("match_id", "==", matchId)
    .limit(1)
    .get();

  if (!existingPenaltySnap.empty) {
    console.log(
      `penalty already exists for user ${userId} and match ${matchId}, skipping`,
    );
    return;
  }

  const penaltyDurationHours = 0.5;
  const penaltyEndTime = Timestamp.fromMillis(
    Date.now() + penaltyDurationHours * 60 * 60 * 1000,
  );

  // トランザクションでペナルティ追加 + users.banned_until更新
  await db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) {
      console.error(`user ${userId} not found, skipping penalty`);
      return;
    }

    const userData = userSnap.data()!;
    const currentBannedUntil = userData.banned_until as Timestamp | null;

    // banned_untilを更新（既存より後の場合のみ）
    const shouldUpdateBannedUntil =
      !currentBannedUntil ||
      penaltyEndTime.toMillis() > currentBannedUntil.toMillis();

    if (shouldUpdateBannedUntil) {
      transaction.update(userRef, {
        banned_until: penaltyEndTime,
        updated_at: FieldValue.serverTimestamp(),
      });
    }

    // penaltiesサブコレクションに履歴追加
    const penaltyRef = penaltiesRef.doc();
    transaction.set(penaltyRef, {
      match_id: matchId,
      match_created_at: matchCreatedAt,
      reason: "no_show",
      penalty_duration_hours: penaltyDurationHours,
      applied_at: FieldValue.serverTimestamp(),
      banned_until: penaltyEndTime,
    });

    console.log(
      `penalty applied to user ${userId} for match ${matchId}, banned until ${penaltyEndTime.toDate().toISOString()}`,
    );
  });
};

/**
 * 通報作成トリガー（3件で自動ペナルティ付与）
 */
export const onReportCreated = onDocumentCreated(
  { document: "matches/{matchId}/reports/{reportId}", region: "asia-northeast1" },
  async (event) => {
    const matchId = event.params.matchId;
    const reportData = event.data?.data();

    if (!reportData) {
      console.error("report data is missing");
      return;
    }

    const reportedUserId = reportData.reported_user_id as string;
    const matchCreatedAt = reportData.match_created_at as Timestamp;

    // 同一マッチ・同一被通報者の通報を取得
    const reportsSnap = await db
      .collection("matches")
      .doc(matchId)
      .collection("reports")
      .where("reported_user_id", "==", reportedUserId)
      .get();

    // 異なる通報者からの通報をカウント
    const uniqueReporters = new Set<string>();
    for (const doc of reportsSnap.docs) {
      const data = doc.data();
      uniqueReporters.add(data.reporter_user_id as string);
    }

    const reportCount = uniqueReporters.size;
    console.log(
      `match ${matchId}: user ${reportedUserId} has ${reportCount} unique reports`,
    );

    // 3件到達時にペナルティ付与
    if (reportCount >= 3) {
      await applyPenalty(reportedUserId, matchId, matchCreatedAt);
    }
  },
);
