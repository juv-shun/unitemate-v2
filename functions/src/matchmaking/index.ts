import { FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "../lib/db.js";
import type { Assignment, QueueUser } from "../lib/types.js";
import { getEnvInt } from "../lib/utils.js";

const DEFAULT_RATING = 1600;

const normalizeRating = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  return DEFAULT_RATING;
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

export const runMatchmaking = onSchedule(
  { schedule: "every 1 minutes", region: "asia-northeast1" },
  async () => {
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

  // 最古の10人を保護（絶対に除外されない）
  const protectedCount = Math.min(10, candidates.length);
  const protectedUsers = candidates.slice(0, protectedCount);
  const rest = candidates.slice(protectedCount);

  // 残りをシャッフル（Fisher-Yates）
  const shuffled = [...rest];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  // 保護 + シャッフル済みを結合
  const combined = [...protectedUsers, ...shuffled];

  // 余りは末尾から除外（= 新しいユーザーから除外）
  const remainder = combined.length % 10;
  let remaining = remainder > 0 ? combined.slice(0, -remainder) : combined;
  remaining = remaining.sort((a, b) => b.rating - a.rating);

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

export const runMatchmakingManual = onRequest(
  { region: "asia-northeast1" },
  async (req, res) => {
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

/**
 * キュー受付終了時のリセット（毎日翌2時JST）
 * waiting 状態のユーザーを全員リセットして、システムをクリーンな状態に保つ
 */
export const resetQueueAtClose = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "Asia/Tokyo",
    region: "asia-northeast1",
    memory: "256MiB",
  },
  async () => {
    try {
      const snapshot = await db
        .collection("users")
        .where("queue_status", "==", "waiting")
        .get();

      if (snapshot.empty) {
        console.log("queue reset at close: no users in queue");
        return;
      }

      const BATCH_SIZE = 500;
      const docs = snapshot.docs;
      let resetCount = 0;

      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = docs.slice(i, i + BATCH_SIZE);

        for (const doc of chunk) {
          batch.update(doc.ref, {
            queue_status: null,
            queue_joined_at: null,
            matched_match_id: null,
            updated_at: FieldValue.serverTimestamp(),
          });
        }

        await batch.commit();
        resetCount += chunk.length;
      }

      console.log(`queue reset at close: ${resetCount} users reset`);
    } catch (error) {
      console.error("queue reset at close failed:", error);
      throw error;
    }
  },
);
