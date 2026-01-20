import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { onSchedule } from "firebase-functions/v2/scheduler";

initializeApp();
const db = getFirestore();

setGlobalOptions({ region: "asia-northeast1" });

type QueueUser = {
  id: string;
  queueJoinedAt: Timestamp | null;
  rating: number;
};

type Assignment = {
  userId: string;
  team: "first" | "second";
  seatNo: number;
};

type MatchResult = "win" | "loss" | "invalid";
type FinalResult = "first_win" | "second_win" | "invalid";
type FinalizeReason = "threshold" | "timeout";

type MatchMember = {
  user_id: string;
  role: "participant" | "spectator";
  team?: "first" | "second";
  match_result?: MatchResult;
};

const DEFAULT_RATING = 1600;
const K_FACTOR = 32;

const getEnvInt = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isNaN(value) ? fallback : value;
};

const normalizeRating = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  return DEFAULT_RATING;
};

const computeRatingDeltas = (
  members: MatchMember[],
  ratings: Record<string, number>,
  finalResult: FinalResult,
): Record<string, number> => {
  const participants = members.filter(
    (member) => member.role === "participant" && member.team,
  );

  if (finalResult === "invalid") {
    return Object.fromEntries(
      participants.map((member) => [member.user_id, 0]),
    );
  }

  const firstTeam = participants
    .filter((member) => member.team === "first")
    .sort(
      (a, b) =>
        (ratings[b.user_id] ?? DEFAULT_RATING) -
        (ratings[a.user_id] ?? DEFAULT_RATING),
    );
  const secondTeam = participants
    .filter((member) => member.team === "second")
    .sort(
      (a, b) =>
        (ratings[b.user_id] ?? DEFAULT_RATING) -
        (ratings[a.user_id] ?? DEFAULT_RATING),
    );

  const pairCount = Math.min(firstTeam.length, secondTeam.length);
  const firstScore = finalResult === "first_win" ? 1 : 0;
  const secondScore = 1 - firstScore;
  const deltas: Record<string, number> = {};

  for (let i = 0; i < pairCount; i += 1) {
    const first = firstTeam[i];
    const second = secondTeam[i];
    const firstRating = ratings[first.user_id] ?? DEFAULT_RATING;
    const secondRating = ratings[second.user_id] ?? DEFAULT_RATING;
    const expectedFirst = 1 / (1 + 10 ** ((secondRating - firstRating) / 400));
    const expectedSecond = 1 - expectedFirst;
    const deltaFirst = Math.round(K_FACTOR * (firstScore - expectedFirst));
    const deltaSecond = Math.round(K_FACTOR * (secondScore - expectedSecond));

    deltas[first.user_id] = deltaFirst;
    deltas[second.user_id] = deltaSecond;
  }

  for (const member of participants) {
    if (!(member.user_id in deltas)) {
      deltas[member.user_id] = 0;
    }
  }

  return deltas;
};

const shouldRunMatching = (
  candidates: QueueUser[],
  minQueue: number,
  maxWaitSec: number,
): boolean => {
  if (candidates.length < 10) return false;
  if (candidates.length >= minQueue) return true;

  const oldest = candidates.find((user) => user.queueJoinedAt)?.queueJoinedAt;
  if (!oldest) return false;

  const elapsedMs = Date.now() - oldest.toMillis();
  return elapsedMs >= maxWaitSec * 1000;
};

const buildAssignments = (selected: QueueUser[]): Assignment[] => {
  const ordered = [...selected].sort((a, b) => b.rating - a.rating);
  const pickOrder: Array<"first" | "second"> = [
    "first",
    "second",
    "second",
    "first",
    "first",
    "second",
    "second",
    "first",
    "first",
    "second",
  ];
  const seatCounters = { first: 0, second: 0 };

  return ordered.map((user, index) => {
    const team = pickOrder[index] ?? (index % 2 === 0 ? "first" : "second");
    seatCounters[team] += 1;
    return { userId: user.id, team, seatNo: seatCounters[team] };
  });
};

const commitMatch = async (
  assignments: Assignment[],
  firstTeam: "first" | "second",
): Promise<string | null> => {
  const matchRef = db.collection("matches").doc();
  const userRefs = assignments.map((item) =>
    db.collection("users").doc(item.userId),
  );

  return db.runTransaction(async (transaction) => {
    const userSnaps = await Promise.all(
      userRefs.map((userRef) => transaction.get(userRef)),
    );

    for (const snap of userSnaps) {
      if (!snap.exists) return null;
      if (snap.get("queue_status") !== "waiting") return null;
    }

    transaction.set(matchRef, {
      phase: "phase3",
      source_type: "auto",
      status: "lobby_pending",
      capacity: 10,
      auto_start: true,
      first_team: firstTeam,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    for (const assignment of assignments) {
      const memberRef = matchRef.collection("members").doc(assignment.userId);
      transaction.set(memberRef, {
        user_id: assignment.userId,
        role: "participant",
        team: assignment.team,
        seat_no: assignment.seatNo,
        joined_at: FieldValue.serverTimestamp(),
      });
    }

    for (const assignment of assignments) {
      const userRef = db.collection("users").doc(assignment.userId);
      transaction.update(userRef, {
        queue_status: "matched",
        queue_joined_at: null,
        matched_match_id: matchRef.id,
        updated_at: FieldValue.serverTimestamp(),
      });
    }

    return matchRef.id;
  });
};

const tallyMatchResults = (
  members: MatchMember[],
): { counts: Record<FinalResult, number>; totalVotes: number } => {
  const counts: Record<FinalResult, number> = {
    first_win: 0,
    second_win: 0,
    invalid: 0,
  };

  for (const member of members) {
    if (member.role !== "participant") continue;
    if (!member.match_result) continue;
    if (member.match_result === "invalid") {
      counts.invalid += 1;
      continue;
    }
    const team = member.team;
    if (!team) continue;
    if (team === "first") {
      counts[member.match_result === "win" ? "first_win" : "second_win"] += 1;
    } else {
      counts[member.match_result === "win" ? "second_win" : "first_win"] += 1;
    }
  }

  const totalVotes = counts.first_win + counts.second_win + counts.invalid;
  return { counts, totalVotes };
};

const decideFinalResult = (
  counts: Record<FinalResult, number>,
): FinalResult => {
  const maxValue = Math.max(
    counts.first_win,
    counts.second_win,
    counts.invalid,
  );
  const winners = (Object.keys(counts) as FinalResult[]).filter(
    (key) => counts[key] === maxValue,
  );
  return winners.length === 1 ? winners[0] : "invalid";
};

const toMemberOutcome = (
  team: "first" | "second" | undefined,
  finalResult: FinalResult,
): MatchResult => {
  if (finalResult === "invalid") return "invalid";
  if (!team) return "invalid";
  if (team === "first") {
    return finalResult === "first_win" ? "win" : "loss";
  }
  return finalResult === "second_win" ? "win" : "loss";
};

const updateUserStats = async ({
  members,
  matchId,
  finalResult,
  decidedAt,
}: {
  members: MatchMember[];
  matchId: string;
  finalResult: FinalResult;
  decidedAt: Timestamp;
}): Promise<void> => {
  const participants = members.filter(
    (member) => member.role === "participant",
  );
  if (participants.length === 0) return;

  const userRefs = participants.map((member) =>
    db.collection("users").doc(member.user_id),
  );

  await db.runTransaction(async (transaction) => {
    const userSnaps = await Promise.all(
      userRefs.map((userRef) => transaction.get(userRef)),
    );
    const userData = userSnaps.map((snap) => (snap.exists ? snap.data() : {}));
    const alreadyRecorded = userData.some((data) => {
      const recentResults = Array.isArray(data?.recent_results)
        ? data.recent_results
        : [];
      return recentResults.some(
        (item: { match_id?: string }) => item?.match_id === matchId,
      );
    });
    if (alreadyRecorded) return;

    const ratingMap = Object.fromEntries(
      participants.map((member, index) => [
        member.user_id,
        normalizeRating(userData[index]?.rating),
      ]),
    );
    const ratingDeltas = computeRatingDeltas(
      participants,
      ratingMap,
      finalResult,
    );

    userSnaps.forEach((snap, index) => {
      const member = participants[index];
      const data = snap.exists ? snap.data() : {};
      const totalMatches =
        typeof data?.total_matches === "number" ? data.total_matches : 0;
      const totalWins =
        typeof data?.total_wins === "number" ? data.total_wins : 0;
      const recentResults = Array.isArray(data?.recent_results)
        ? data.recent_results
        : [];
      const outcome = toMemberOutcome(member.team, finalResult);
      const ratingDelta = ratingDeltas[member.user_id] ?? 0;
      const currentRating = normalizeRating(data?.rating);
      const nextResults = [
        {
          match_id: matchId,
          result: outcome,
          matched_at: decidedAt,
          rating_delta: ratingDelta,
        },
        ...recentResults,
      ].slice(0, 20);

      transaction.set(
        userRefs[index],
        {
          total_matches: totalMatches + 1,
          total_wins: totalWins + (outcome === "win" ? 1 : 0),
          rating: currentRating + ratingDelta,
          recent_results: nextResults,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });
  });
};

const finalizeMatch = async ({
  matchId,
  reason,
  minVotes,
  forceFinalize,
}: {
  matchId: string;
  reason: FinalizeReason;
  minVotes: number;
  forceFinalize: boolean;
}): Promise<{ finalized: boolean; finalResult?: FinalResult }> => {
  const matchRef = db.collection("matches").doc(matchId);
  const matchSnap = await matchRef.get();
  if (!matchSnap.exists) return { finalized: false };
  const matchData = matchSnap.data();
  if (matchData?.status !== "lobby_pending") {
    return { finalized: false };
  }

  const membersSnap = await matchRef
    .collection("members")
    .where("role", "==", "participant")
    .get();
  const members = membersSnap.docs.map((doc) => doc.data() as MatchMember);
  const { counts, totalVotes } = tallyMatchResults(members);

  if (!forceFinalize && totalVotes < minVotes) {
    return { finalized: false };
  }

  const finalResult = decideFinalResult(counts);
  const decidedAt = matchData?.created_at ?? Timestamp.now();
  const finalizedAt = Timestamp.now();

  const finalized = await db.runTransaction(async (transaction) => {
    const freshSnap = await transaction.get(matchRef);
    if (!freshSnap.exists) return false;
    const freshData = freshSnap.data();
    if (freshData?.status !== "lobby_pending") return false;

    transaction.update(matchRef, {
      status: "completed",
      final_result: finalResult,
      finalized_at: finalizedAt,
      finalized_reason: reason,
      updated_at: FieldValue.serverTimestamp(),
    });
    return true;
  });

  if (finalized) {
    await updateUserStats({
      members,
      matchId,
      finalResult,
      decidedAt,
    });
  }

  return { finalized, finalResult };
};

export const runMatchmaking = onSchedule("every 1 minutes", async () => {
  const minQueue = getEnvInt("MATCHING_MIN_QUEUE", 30);
  const maxWaitSec = getEnvInt("MATCHING_MAX_WAIT_SEC", 60);
  const candidateLimit = getEnvInt("MATCHING_CANDIDATE_LIMIT", 200);

  const snapshot = await db
    .collection("users")
    .where("queue_status", "==", "waiting")
    .orderBy("queue_joined_at")
    .limit(candidateLimit)
    .get();

  const candidates: QueueUser[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    queueJoinedAt: doc.get("queue_joined_at") ?? null,
    rating: normalizeRating(doc.get("rating")),
  }));

  if (!shouldRunMatching(candidates, minQueue, maxWaitSec)) {
    return;
  }

  let remaining = [...candidates].sort((a, b) => b.rating - a.rating);
  let created = 0;

  while (remaining.length >= 10) {
    const selected = remaining.slice(0, 10);
    remaining = remaining.slice(10);

    const assignments = buildAssignments(selected);
    const firstTeam = Math.random() < 0.5 ? "first" : "second";
    const matchId = await commitMatch(assignments, firstTeam);

    if (!matchId) {
      console.log("match skipped: queue status changed");
      break;
    }

    created += 1;
    console.log(`match created: ${matchId}`);
  }

  if (created === 0) {
    console.log("no matches created");
  }
});

export const runMatchmakingManual = onRequest(async (req, res) => {
  const minQueue = getEnvInt("MATCHING_MIN_QUEUE", 30);
  const maxWaitSec = getEnvInt("MATCHING_MAX_WAIT_SEC", 60);
  const candidateLimit = getEnvInt("MATCHING_CANDIDATE_LIMIT", 200);

  const snapshot = await db
    .collection("users")
    .where("queue_status", "==", "waiting")
    .orderBy("queue_joined_at")
    .limit(candidateLimit)
    .get();

  const candidates: QueueUser[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    queueJoinedAt: doc.get("queue_joined_at") ?? null,
    rating: normalizeRating(doc.get("rating")),
  }));

  if (!shouldRunMatching(candidates, minQueue, maxWaitSec)) {
    res.status(200).json({ created: 0, reason: "conditions not met" });
    return;
  }

  let remaining = [...candidates].sort((a, b) => b.rating - a.rating);
  let created = 0;

  while (remaining.length >= 10) {
    const selected = remaining.slice(0, 10);
    remaining = remaining.slice(10);

    const assignments = buildAssignments(selected);
    const firstTeam = Math.random() < 0.5 ? "first" : "second";
    const matchId = await commitMatch(assignments, firstTeam);

    if (!matchId) {
      console.log("match skipped: queue status changed");
      break;
    }

    created += 1;
  }

  res.status(200).json({ created });
});

// --- Callable Functions ---

/**
 * ロビーID設定（参加者チェック付き）
 */
export const setMatchLobbyId = onCall(
  { region: "asia-northeast1" },
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
  { region: "asia-northeast1" },
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
  { region: "asia-northeast1" },
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

/**
 * 試合結果の報告（即時確定を試行）
 */
export const submitMatchResult = onCall(
  { region: "asia-northeast1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "認証が必要です");
    }
    const { matchId, matchResult } = request.data;
    const userId = request.auth.uid;

    if (!["win", "loss", "invalid"].includes(matchResult)) {
      throw new HttpsError("invalid-argument", "試合結果が不正です");
    }

    const matchRef = db.collection("matches").doc(matchId);
    const memberRef = matchRef.collection("members").doc(userId);

    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      throw new HttpsError(
        "permission-denied",
        "このマッチの参加者ではありません",
      );
    }
    const memberData = memberSnap.data() as MatchMember;
    if (memberData.role !== "participant") {
      throw new HttpsError("permission-denied", "参加者のみ報告できます");
    }

    await memberRef.update({
      match_result: matchResult,
      match_left_at: FieldValue.serverTimestamp(),
    });

    const result = await finalizeMatch({
      matchId,
      reason: "threshold",
      minVotes: 7,
      forceFinalize: false,
    });

    return {
      success: true,
      finalized: result.finalized,
      result: result.finalResult,
    };
  },
);

/**
 * 結果確定タイムアウト処理（40分）
 */
export const finalizeMatchesByTimeout = onSchedule(
  "every 1 minutes",
  async () => {
    const cutoff = Timestamp.fromMillis(Date.now() - 40 * 60 * 1000);
    const matchesSnap = await db
      .collection("matches")
      .where("status", "==", "lobby_pending")
      .where("created_at", "<=", cutoff)
      .get();

    if (matchesSnap.empty) {
      console.log("no matches to finalize");
      return;
    }

    for (const matchDoc of matchesSnap.docs) {
      const matchId = matchDoc.id;
      const result = await finalizeMatch({
        matchId,
        reason: "timeout",
        minVotes: 0,
        forceFinalize: true,
      });
      if (result.finalized) {
        console.log(`match finalized by timeout: ${matchId}`);
      }
    }
  },
);

// --- Report & Penalty Functions ---

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

  const penaltyDurationHours = 1;
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
  "matches/{matchId}/reports/{reportId}",
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
