import { initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2/options";

initializeApp();
const db = getFirestore();

setGlobalOptions({ region: "asia-northeast1" });

type QueueUser = {
  id: string;
  queueJoinedAt: Timestamp | null;
};

type Assignment = {
  userId: string;
  team: "first" | "second";
  seatNo: number;
};

const getEnvInt = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isNaN(value) ? fallback : value;
};

const shuffle = <T>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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
  const shuffled = shuffle(selected);
  return shuffled.map((user, index) => {
    const team = index < 5 ? "first" : "second";
    const seatNo = index < 5 ? index + 1 : index - 4;
    return { userId: user.id, team, seatNo };
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
      phase: "phase1",
      source_type: "auto",
      status: "lobby_pending",
      capacity: 10,
      auto_start: true,
      first_team: firstTeam,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    for (const assignment of assignments) {
      const memberRef = matchRef
        .collection("members")
        .doc(assignment.userId);
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

export const runMatchmaking = onSchedule("every 1 minutes", async () => {
  const minQueue = getEnvInt("MATCHING_MIN_QUEUE", 30);
  const maxWaitSec = getEnvInt("MATCHING_MAX_WAIT_SEC", 180);
  const candidateLimit = getEnvInt("MATCHING_CANDIDATE_LIMIT", 50);

  const snapshot = await db
    .collection("users")
    .where("queue_status", "==", "waiting")
    .orderBy("queue_joined_at")
    .limit(candidateLimit)
    .get();

  const candidates: QueueUser[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    queueJoinedAt: doc.get("queue_joined_at") ?? null,
  }));

  if (!shouldRunMatching(candidates, minQueue, maxWaitSec)) {
    return;
  }

  let remaining = shuffle(candidates);
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
  const maxWaitSec = getEnvInt("MATCHING_MAX_WAIT_SEC", 180);
  const candidateLimit = getEnvInt("MATCHING_CANDIDATE_LIMIT", 50);

  const snapshot = await db
    .collection("users")
    .where("queue_status", "==", "waiting")
    .orderBy("queue_joined_at")
    .limit(candidateLimit)
    .get();

  const candidates: QueueUser[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    queueJoinedAt: doc.get("queue_joined_at") ?? null,
  }));

  if (!shouldRunMatching(candidates, minQueue, maxWaitSec)) {
    res.status(200).json({ created: 0, reason: "conditions not met" });
    return;
  }

  let remaining = shuffle(candidates);
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
