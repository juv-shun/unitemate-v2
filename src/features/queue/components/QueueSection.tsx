import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useQueue } from "../QueueContext";
import { isQueueClosedAt } from "../queue";
import { SearchingIndicator } from "./SearchingIndicator";

function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatBanTime(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  }
  return `${minutes}分`;
}

export function QueueSection() {
  const { user } = useAuth();
  const {
    queueStatus,
    queueJoinedAt,
    matchedMatchId,
    queueLoading,
    isBanned,
    remainingBanTime,
    startQueue,
    cancelQueue,
  } = useQueue();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isQueueClosed, setIsQueueClosed] = useState(() =>
    isQueueClosedAt(new Date()),
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (queueStatus !== "waiting" || !queueJoinedAt) {
      setElapsedSeconds(0);
      return;
    }

    const calculateElapsed = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - queueJoinedAt.getTime()) / 1000);
      setElapsedSeconds(Math.max(0, diff));
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [queueStatus, queueJoinedAt]);

  useEffect(() => {
    const updateClosedState = () => {
      setIsQueueClosed(isQueueClosedAt(new Date()));
    };
    updateClosedState();
    const interval = setInterval(updateClosedState, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStartQueue = async () => {
    setIsProcessing(true);
    try {
      await startQueue();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelQueue = async () => {
    setIsProcessing(true);
    try {
      await cancelQueue();
    } finally {
      setIsProcessing(false);
    }
  };

  if (queueLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (queueStatus === "waiting") {
    return (
      <div
        className="relative rounded-lg p-6 text-center overflow-hidden"
        style={{
          backgroundColor: "var(--color-surface)",
          boxShadow:
            "0 0 20px rgba(6, 182, 212, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Pulsing border effect */}
        <div
          className="absolute inset-0 rounded-lg animate-pulse"
          style={{
            border: "1px solid var(--color-accent-cyan)",
            opacity: 0.6,
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-4">
          <SearchingIndicator size={56} />

          <div>
            <p
              className="text-lg font-semibold tracking-wider"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-accent-cyan)",
              }}
            >
              SEARCHING FOR MATCH
            </p>
            <p
              className="text-2xl font-bold mt-1 tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-text-primary)",
              }}
            >
              {formatElapsedTime(elapsedSeconds)}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCancelQueue}
            disabled={isProcessing}
            className="mt-2 px-6 py-2.5 rounded font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-danger)",
              backgroundColor: "transparent",
              border: "1px solid var(--color-danger)",
            }}
            onMouseEnter={(e) => {
              if (!isProcessing) {
                e.currentTarget.style.backgroundColor =
                  "rgba(239, 68, 68, 0.1)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {isProcessing ? "CANCELING..." : "CANCEL"}
          </button>
        </div>
      </div>
    );
  }

  if (queueStatus === "matched") {
    return (
      <div
        className="relative rounded-lg p-6 text-center overflow-hidden"
        style={{
          backgroundColor: "var(--color-surface)",
          boxShadow:
            "0 0 20px rgba(34, 197, 94, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div
            className="text-xs font-semibold tracking-wider"
            style={{
              fontFamily: "var(--font-display)",
              color: "rgba(34, 197, 94, 0.8)",
            }}
          >
            MATCH FOUND
          </div>
          <div
            className="text-2xl font-bold"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-primary)",
            }}
          >
            マッチ成立
          </div>
          <p
            className="text-sm"
            style={{
              color: "var(--color-text-secondary)",
            }}
          >
            次へ進むために確認ボタンを押してください
          </p>
          {matchedMatchId && (
            <div
              className="px-4 py-2 rounded-lg"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
              }}
            >
              <div
                className="text-xs tracking-wider"
                style={{
                  color: "var(--color-text-secondary)",
                }}
              >
                マッチID
              </div>
              <code
                className="text-sm font-mono tracking-wide"
                style={{
                  color: "var(--color-accent-cyan)",
                }}
              >
                {matchedMatchId}
              </code>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (matchedMatchId) {
                navigate(`/lobby/${matchedMatchId}`);
              }
            }}
            disabled={!matchedMatchId}
            className="px-8 py-3 rounded-lg font-bold text-sm tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-base)",
              backgroundColor: "rgba(34, 197, 94, 0.9)",
              boxShadow: "0 4px 20px rgba(34, 197, 94, 0.3)",
            }}
          >
            確認
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isBanned && remainingBanTime && (
        <div
          className="rounded-lg p-4 text-center"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid var(--color-danger)",
          }}
        >
          <p
            className="text-sm font-semibold tracking-wider mb-1"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-danger)",
            }}
          >
            ペナルティ中
          </p>
          <p
            className="text-xs"
            style={{
              color: "var(--color-text-secondary)",
            }}
          >
            残り時間: {formatBanTime(remainingBanTime)}
          </p>
        </div>
      )}
      {!isBanned && isQueueClosed && (
        <div
          className="rounded-lg p-4 text-center"
          style={{
            backgroundColor: "rgba(148, 163, 184, 0.08)",
            border: "1px solid rgba(148, 163, 184, 0.3)",
          }}
        >
          <p
            className="text-sm font-semibold tracking-wider mb-1"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-primary)",
            }}
          >
            受付時間外
          </p>
          <p
            className="text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            平日 02:00〜17:00 はマッチングを受け付けていません
          </p>
        </div>
      )}
      {!isBanned && !isQueueClosed && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleStartQueue}
            disabled={isProcessing || !user}
            className="group relative w-full py-4 rounded-lg font-bold text-lg tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-primary)",
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-accent-cyan)",
            }}
          >
            {/* Hover glow effect */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(6, 182, 212, 0.15) 0%, transparent 70%)",
              }}
            />

            {/* Bottom accent line */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 group-hover:w-3/4 transition-all duration-300"
              style={{ backgroundColor: "var(--color-accent-cyan)" }}
            />

            <span className="relative z-10 flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              {isProcessing
                ? "STARTING..."
                : user
                  ? "FIND MATCH"
                  : "LOGIN REQUIRED"}
            </span>
          </button>
          <p className="text-xs text-slate-400 text-center">
            平日 02:00〜17:00 は受付時間外
          </p>
        </div>
      )}
    </div>
  );
}
