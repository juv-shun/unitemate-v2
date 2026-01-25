import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { db } from "../lib/db.js";

/**
 * 通報者への通知作成
 * @param reporterUserIds 通報者のユーザーIDリスト
 * @param matchId 通報元マッチID
 * @param penalizedUserId ペナルティを受けたユーザーID
 */
const notifyReporters = async (
  reporterUserIds: string[],
  matchId: string,
  penalizedUserId: string,
): Promise<void> => {
  if (reporterUserIds.length === 0) {
    return;
  }

  // ペナルティを受けたユーザーの名前を取得（フォールバック: 該当ユーザー）
  const penalizedUserSnap = await db
    .collection("users")
    .doc(penalizedUserId)
    .get();
  const penalizedUserName =
    (penalizedUserSnap.data()?.display_name as string) || "該当ユーザー";

  // 通報者は最大9人（10人マッチ - 自分）のためバッチ分割は不要
  const notificationId = `${matchId}_${penalizedUserId}`;

  // 冪等性確保: 事前に存在チェックし、未作成の通報者のみ通知を作成
  const notificationRefs = reporterUserIds.map((reporterId) =>
    db
      .collection("users")
      .doc(reporterId)
      .collection("notifications")
      .doc(notificationId),
  );
  const existingDocs = await db.getAll(...notificationRefs);

  const batch = db.batch();
  let createCount = 0;
  existingDocs.forEach((doc, index) => {
    if (!doc.exists) {
      batch.create(notificationRefs[index], {
        type: "penalty_applied",
        match_id: matchId,
        reported_user_id: penalizedUserId,
        reported_user_name: penalizedUserName,
        message: `あなたが通報した「${penalizedUserName}」さんにペナルティが付与されました。`,
        read: false,
        created_at: FieldValue.serverTimestamp(),
      });
      createCount++;
    }
  });

  // 作成対象がある場合のみコミット
  if (createCount > 0) {
    await batch.commit();
    console.log(
      `notifications sent to ${createCount} reporters for match ${matchId}`,
    );
  }
};

/**
 * ペナルティ付与処理
 * @param userId 対象ユーザーID
 * @param matchId 通報元マッチID
 * @param matchCreatedAt マッチ作成日時
 * @param reporterUserIds 通報者のユーザーIDリスト
 */
const applyPenalty = async (
  userId: string,
  matchId: string,
  matchCreatedAt: Timestamp,
  reporterUserIds: string[],
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

  // 通報者に通知を送信
  await notifyReporters(reporterUserIds, matchId, userId);
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
      const reporterUserIds = Array.from(uniqueReporters);
      await applyPenalty(reportedUserId, matchId, matchCreatedAt, reporterUserIds);
    }
  },
);
