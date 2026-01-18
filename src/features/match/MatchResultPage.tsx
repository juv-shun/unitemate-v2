import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMatch } from "../draft/MatchContext";
import { useQueue } from "../queue/QueueContext";

export function MatchResultPage() {
  const { matchId: matchIdParam } = useParams<{ matchId?: string }>();
  const { matchedMatchId } = useQueue();
  const navigate = useNavigate();
  const { setCurrentMatchId, currentMatch, loading } = useMatch();

  const matchId = matchIdParam ?? matchedMatchId ?? null;

  useEffect(() => {
    setCurrentMatchId(matchId ?? null);
    return () => {
      setCurrentMatchId(null);
    };
  }, [matchId, setCurrentMatchId]);

  if (!matchId) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="text-lg font-semibold text-slate-100 mb-2">
          マッチ情報が見つかりません
        </div>
        <p className="text-sm text-slate-400 mb-6">
          もう一度ホームからマッチングを開始してください
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid rgba(6, 182, 212, 0.4)",
            color: "var(--color-text-primary)",
          }}
        >
          ホームへ戻る
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentMatch) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="text-lg font-semibold text-slate-100 mb-2">
          マッチ情報の取得に失敗しました
        </div>
        <p className="text-sm text-slate-400 mb-6">
          時間をおいて再試行してください。
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            color: "var(--color-text-primary)",
          }}
        >
          ホームへ戻る
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10">
      <div
        className="fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at top, rgba(6, 182, 212, 0.08), transparent 55%)",
        }}
      />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 text-center"
        style={{
          backgroundColor: "var(--color-surface)",
          boxShadow:
            "0 24px 60px rgba(2, 6, 23, 0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
          border: "1px solid rgba(148, 163, 184, 0.15)",
        }}
      >
        <p
          className="text-xs font-semibold tracking-widest text-slate-400 mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          MATCH FOUND
        </p>
        <h1
          className="text-2xl font-bold tracking-wide text-slate-100"
          style={{ fontFamily: "var(--font-display)" }}
        >
          マッチ成立
        </h1>
        <p className="text-sm text-slate-300 mt-3">
          次へ進むために確認ボタンを押してください
        </p>
        <div
          className="mt-6 rounded-lg px-4 py-3 text-sm text-slate-300"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(148, 163, 184, 0.2)",
          }}
        >
          マッチID: <span className="font-mono text-cyan-300">{matchId}</span>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/draft/${matchId}`)}
          className="mt-6 w-full py-3 rounded-lg text-sm font-semibold tracking-wide transition-all"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-text-primary)",
            backgroundColor: "rgba(6, 182, 212, 0.2)",
            border: "1px solid rgba(6, 182, 212, 0.45)",
          }}
        >
          確認
        </button>
      </div>
    </div>
  );
}
