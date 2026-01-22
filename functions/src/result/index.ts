import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "../lib/db.js";
import type {
  FinalResult,
  FinalizeReason,
  MatchMember,
  MatchResult,
} from "../lib/types.js";

const DEFAULT_RATING = 1600;
const K_FACTOR = 32;

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
          total_matches: totalMatches + (outcome !== "invalid" ? 1 : 0),
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

/**
 * 試合結果の報告（即時確定を試行）
 */
export const submitMatchResult = onCall(
  { region: "asia-northeast1", invoker: "public" },
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
  { schedule: "every 1 minutes", region: "asia-northeast1" },
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
