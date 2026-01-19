import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getUserProfile, updateDisplayName } from "../auth/user";

type RecentResult = {
  match_id: string;
  result: "win" | "loss" | "invalid";
  matched_at: Date | null;
  rating_delta: number;
};

export function MyPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalMatches, setTotalMatches] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [rating, setRating] = useState(1600);
  const [recentResults, setRecentResults] = useState<RecentResult[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/", { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then((data) => {
        if (data?.display_name) {
          setDisplayName(data.display_name);
        }
        setPhotoUrl(data?.photo_url ?? null);
        setTotalMatches(
          typeof data?.total_matches === "number" ? data.total_matches : 0,
        );
        setTotalWins(
          typeof data?.total_wins === "number" ? data.total_wins : 0,
        );
        setRating(
          typeof data?.rating === "number" ? Math.round(data.rating) : 1600,
        );
        const normalizedResults = Array.isArray(data?.recent_results)
          ? data.recent_results
              .filter((item) => item?.match_id && item?.result)
              .map((item) => ({
                match_id: item.match_id as string,
                result: item.result as "win" | "loss" | "invalid",
                matched_at: item.matched_at?.toDate?.() ?? null,
                rating_delta:
                  typeof item.rating_delta === "number"
                    ? Math.round(item.rating_delta)
                    : 0,
              }))
          : [];
        setRecentResults(normalizedResults);
        setLoading(false);
      });
    }
  }, [user]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleUpdate = async () => {
    if (user && displayName.trim()) {
      await updateDisplayName(user.uid, displayName);
      setIsEditing(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div
        className="min-h-full flex items-center justify-center"
        style={{ backgroundColor: "var(--color-base)" }}
      >
        <div className="w-8 h-8 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-full flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative"
      style={{
        backgroundColor: "var(--color-base)",
        backgroundImage: `
					linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
					linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
				`,
        backgroundSize: "32px 32px",
      }}
    >
      {/* Hexagonal grid background pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='52' viewBox='0 0 60 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l15 8.66v17.32L30 34.64 15 25.98V8.66L30 0zm0 52l15-8.66V25.98L30 17.32l-15 8.66v17.36L30 52z' fill='%2306b6d4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 52px",
        }}
      />

      {/* ページタイトル */}
      <header
        className="w-full max-w-md mb-8 relative"
        style={{
          animation: isVisible ? "fadeInDown 0.5s ease-out both" : "none",
        }}
      >
        <div
          className="inline-block relative px-4 py-2"
          style={{
            background:
              "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(236, 72, 153, 0.1) 100%)",
            clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 100%, 12px 100%)",
          }}
        >
          <h1
            className="text-xl font-bold tracking-[0.15em] uppercase"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-accent-cyan)",
              textShadow: "0 0 20px rgba(6, 182, 212, 0.5)",
            }}
          >
            My Page
          </h1>
        </div>
        {/* Accent line */}
        <div
          className="absolute left-0 bottom-0 h-[1px] w-24"
          style={{
            background:
              "linear-gradient(90deg, var(--color-accent-cyan) 0%, transparent 100%)",
          }}
        />
      </header>

      {/* メインカード */}
      <main
        className="max-w-md w-full rounded-xl overflow-hidden relative"
        style={{
          backgroundColor: "var(--color-surface)",
          boxShadow:
            "0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          animation: isVisible ? "slideInFromLeft 0.6s ease-out both" : "none",
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, var(--color-accent-cyan) 50%, transparent 100%)",
          }}
        />

        {/* プロフィールセクション */}
        <section className="p-6 relative group">
          {/* Hover glow effect */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at center, rgba(6, 182, 212, 0.05) 0%, transparent 70%)",
            }}
          />

          <h2
            className="text-xs font-semibold tracking-[0.2em] mb-4 uppercase"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-accent-cyan)",
              textShadow: "0 0 10px rgba(6, 182, 212, 0.3)",
            }}
          >
            Profile
          </h2>

          <div className="flex items-center gap-4 relative z-10">
            {user ? (
              <>
                {/* アバター - 八角形スタイル */}
                <div
                  className="relative flex-shrink-0 w-16 h-16 flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%)",
                    clipPath:
                      "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                  }}
                >
                  <div
                    className="absolute inset-[2px] flex items-center justify-center overflow-hidden"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      clipPath:
                        "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                    }}
                  >
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={displayName || "User"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span
                        className="text-xl font-bold"
                        style={{
                          fontFamily: "var(--font-display)",
                          color: "var(--color-accent-amber)",
                        }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* ユーザー情報 */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-3 py-2 rounded text-sm focus:outline-none transition-all duration-300"
                        style={{
                          backgroundColor: "var(--color-surface-elevated)",
                          color: "var(--color-text-primary)",
                          border: "1px solid var(--color-accent-cyan)",
                          boxShadow: "0 0 10px rgba(6, 182, 212, 0.2)",
                        }}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-3 py-1.5 text-xs font-medium rounded transition-all duration-300 hover:bg-slate-700"
                          style={{
                            color: "var(--color-text-secondary)",
                            border: "1px solid var(--color-text-secondary)",
                          }}
                        >
                          キャンセル
                        </button>
                        <button
                          type="button"
                          onClick={handleUpdate}
                          className="px-3 py-1.5 text-xs font-medium rounded transition-all duration-300"
                          style={{
                            backgroundColor: "var(--color-accent-cyan)",
                            color: "var(--color-base)",
                            boxShadow: "0 0 15px rgba(6, 182, 212, 0.4)",
                          }}
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3
                        className="text-xl font-semibold truncate"
                        style={{
                          fontFamily: "var(--font-display)",
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {displayName}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="mt-1 text-xs font-medium transition-all duration-300 edit-link"
                        style={{
                          color: "var(--color-accent-cyan)",
                          textShadow: "0 0 10px rgba(6, 182, 212, 0.3)",
                        }}
                      >
                        <span className="relative">
                          表示名を編集
                          <span
                            className="absolute left-0 -bottom-0.5 w-0 h-[1px] transition-all duration-300 edit-link-underline"
                            style={{
                              background:
                                "linear-gradient(90deg, var(--color-accent-cyan), transparent)",
                            }}
                          />
                        </span>
                        <span className="ml-1 inline-block transition-transform duration-300 edit-link-arrow">
                          →
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : null}
          </div>

          {/* Corner accent */}
          <div
            className="absolute top-0 right-0 w-2 h-2 opacity-50 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: "var(--color-accent-cyan)",
              boxShadow: "0 0 8px var(--color-accent-cyan)",
            }}
          />
        </section>

        {/* レーティングセクション */}
        <section
          className="p-6 relative group"
          style={{
            borderTop: "1px solid rgba(6, 182, 212, 0.2)",
            animation: isVisible
              ? "slideInFromLeft 0.6s ease-out 0.1s both"
              : "none",
          }}
        >
          {/* Hover glow effect */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at center, rgba(6, 182, 212, 0.05) 0%, transparent 70%)",
            }}
          />

          <h2
            className="text-xs font-semibold tracking-[0.2em] mb-4 uppercase"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-accent-cyan)",
              textShadow: "0 0 10px rgba(6, 182, 212, 0.3)",
            }}
          >
            Rating
          </h2>
          <div
            className="rounded-lg px-4 py-4 text-center relative overflow-hidden transition-all duration-300 group-hover:scale-[1.02]"
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.45)",
              border: "1px solid rgba(6, 182, 212, 0.2)",
              clipPath:
                "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
            }}
          >
            <div
              className="text-4xl font-bold tracking-wide tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-text-primary)",
                textShadow: "0 0 20px rgba(6, 182, 212, 0.3)",
              }}
            >
              {rating}
            </div>
            {/* Inner glow on hover */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(6, 182, 212, 0.1) 0%, transparent 70%)",
                boxShadow: "inset 0 0 20px rgba(6, 182, 212, 0.1)",
              }}
            />
          </div>

          {/* Corner accent */}
          <div
            className="absolute top-0 right-0 w-2 h-2 opacity-50 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: "var(--color-accent-cyan)",
              boxShadow: "0 0 8px var(--color-accent-cyan)",
            }}
          />
        </section>

        {/* 結果セクション */}
        <section
          className="p-6 relative"
          style={{
            borderTop: "1px solid rgba(6, 182, 212, 0.2)",
            animation: isVisible
              ? "slideInFromLeft 0.6s ease-out 0.2s both"
              : "none",
          }}
        >
          <h2
            className="text-xs font-semibold tracking-[0.2em] mb-4 uppercase"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-accent-cyan)",
              textShadow: "0 0 10px rgba(6, 182, 212, 0.3)",
            }}
          >
            Results
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "MATCHES", value: totalMatches, delay: 0 },
              { label: "WINS", value: totalWins, delay: 0.05 },
              {
                label: "WIN RATE",
                value:
                  totalMatches > 0
                    ? `${((totalWins / totalMatches) * 100).toFixed(1)}%`
                    : "0.0%",
                delay: 0.1,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="group relative rounded-lg px-3 py-3 transition-all duration-300 hover:scale-105"
                style={{
                  backgroundColor: "rgba(15, 23, 42, 0.45)",
                  border: "1px solid rgba(6, 182, 212, 0.2)",
                  clipPath:
                    "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))",
                  animation: isVisible
                    ? `fadeInUp 0.5s ease-out ${0.3 + stat.delay}s both`
                    : "none",
                }}
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle at center, rgba(6, 182, 212, 0.15) 0%, transparent 70%)",
                    boxShadow: "inset 0 0 15px rgba(6, 182, 212, 0.2)",
                  }}
                />
                <div
                  className="text-xs font-semibold relative z-10"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {stat.label}
                </div>
                <div
                  className="text-lg font-bold relative z-10 tabular-nums"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Recent Matches */}
          <div className="mt-6 space-y-2">
            <div
              className="text-xs font-semibold tracking-[0.15em] uppercase"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-text-secondary)",
              }}
            >
              Recent 20 Matches
            </div>
            {recentResults.length === 0 ? (
              <div className="text-sm text-slate-400">
                結果確定済みの試合はまだありません。
              </div>
            ) : (
              <ul className="space-y-2">
                {recentResults.map((item, index) => {
                  const resultColor =
                    item.result === "win"
                      ? "#22c55e"
                      : item.result === "loss"
                        ? "#ef4444"
                        : "#f59e0b";

                  return (
                    <li
                      key={item.match_id}
                      className="group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-300 hover:scale-[1.02]"
                      style={{
                        backgroundColor: "rgba(15, 23, 42, 0.4)",
                        border: "1px solid rgba(6, 182, 212, 0.15)",
                        clipPath:
                          "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))",
                        animation: isVisible
                          ? `slideInFromLeft 0.4s ease-out ${0.4 + index * 0.03}s both`
                          : "none",
                      }}
                    >
                      {/* Hover glow effect */}
                      <div
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at left, ${resultColor}15 0%, transparent 70%)`,
                          boxShadow: `inset 0 0 15px ${resultColor}10`,
                        }}
                      />

                      {/* Result badge */}
                      <span
                        className="font-bold tracking-wider relative z-10 transition-all duration-300 group-hover:scale-110"
                        style={{
                          color: resultColor,
                          textShadow: `0 0 10px ${resultColor}50`,
                          fontFamily: "var(--font-display)",
                        }}
                      >
                        {item.result === "win"
                          ? "WIN"
                          : item.result === "loss"
                            ? "LOSE"
                            : "INVALID"}
                      </span>

                      <div className="ml-auto flex items-center gap-3 relative z-10">
                        <span className="text-xs text-slate-400">
                          {item.matched_at
                            ? item.matched_at.toLocaleString("ja-JP", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </span>
                        <span
                          className="text-sm font-bold tabular-nums transition-all duration-300 group-hover:scale-110"
                          style={{
                            color: resultColor,
                            textShadow: `0 0 8px ${resultColor}40`,
                            fontFamily: "var(--font-display)",
                          }}
                        >
                          {item.rating_delta > 0
                            ? `+${item.rating_delta}`
                            : `${item.rating_delta}`}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Bottom accent line */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2">
            <div
              className="h-[1px] flex-1"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.3) 50%, transparent 100%)",
              }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{
                backgroundColor: "var(--color-accent-cyan)",
                boxShadow: "0 0 8px var(--color-accent-cyan)",
              }}
            />
            <div
              className="h-[1px] flex-1"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.3) 50%, transparent 100%)",
              }}
            />
          </div>
        </div>
      </main>

      {/* Keyframes */}
      <style>{`
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .edit-link:hover {
          color: #ffffff;
          text-shadow: 0 0 15px rgba(6, 182, 212, 0.8);
        }

        .edit-link:hover .edit-link-underline {
          width: 100%;
        }

        .edit-link:hover .edit-link-arrow {
          transform: translateX(4px);
        }
      `}</style>
    </div>
  );
}
