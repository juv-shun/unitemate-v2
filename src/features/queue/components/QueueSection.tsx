import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueue } from "../QueueContext";
import { SearchingIndicator } from "./SearchingIndicator";

function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function QueueSection() {
  const {
    queueStatus,
    queueJoinedAt,
    matchedMatchId,
    queueLoading,
    startQueue,
    cancelQueue,
  } = useQueue();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (queueStatus !== "waiting" || !queueJoinedAt) {
      setElapsedSeconds(0);
      return;
    }

    const calculateElapsed = () => {
      const now = new Date();
      const diff = Math.floor(
        (now.getTime() - queueJoinedAt.getTime()) / 1000,
      );
      setElapsedSeconds(Math.max(0, diff));
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [queueStatus, queueJoinedAt]);

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
          <div className="text-lg font-semibold text-emerald-300">
            マッチ成立！
          </div>
          <p className="text-sm text-slate-300">
            チーム分けと先攻/後攻を表示します
          </p>
          <button
            type="button"
            onClick={() => {
              if (matchedMatchId) {
                navigate(`/match/${matchedMatchId}`);
              }
            }}
            disabled={!matchedMatchId}
            className="px-6 py-2.5 rounded font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-primary)",
              backgroundColor: "rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.4)",
            }}
          >
            結果画面へ
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleStartQueue}
      disabled={isProcessing}
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
        {isProcessing ? "STARTING..." : "FIND MATCH"}
      </span>
    </button>
  );
}
