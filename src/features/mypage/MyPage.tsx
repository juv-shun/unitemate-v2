import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getUserProfile, updateDisplayName } from "../auth/user";

type RecentResult = {
  match_id: string;
  result: "win" | "loss" | "invalid";
  matched_at: Date | null;
};

export function MyPage() {
  const { user, login } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalMatches, setTotalMatches] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [recentResults, setRecentResults] = useState<RecentResult[]>([]);

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
        const normalizedResults = Array.isArray(data?.recent_results)
          ? data.recent_results
              .filter((item) => item?.match_id && item?.result)
              .map((item) => ({
                match_id: item.match_id as string,
                result: item.result as "win" | "loss" | "invalid",
                matched_at: item.matched_at?.toDate?.() ?? null,
              }))
          : [];
        setRecentResults(normalizedResults);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleUpdate = async () => {
    if (user && displayName.trim()) {
      await updateDisplayName(user.uid, displayName);
      setIsEditing(false);
    }
  };

  if (loading) {
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
      className="min-h-full flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundColor: "var(--color-base)",
        backgroundImage: `
					linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
					linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
				`,
        backgroundSize: "32px 32px",
      }}
    >
      {/* ページタイトル */}
      <header className="w-full max-w-md mb-8">
        <h1
          className="text-xl font-bold tracking-wider"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--color-text-primary)",
          }}
        >
          マイページ
        </h1>
      </header>

      {/* メインカード */}
      <main
        className="max-w-md w-full rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--color-surface)",
          boxShadow:
            "0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* プロフィールセクション */}
        <section className="p-6">
          <h2
            className="text-xs font-semibold tracking-wider mb-4"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-secondary)",
            }}
          >
            PROFILE
          </h2>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* アバター */}
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={displayName || "User"}
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                    style={{
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                    }}
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-lg flex items-center justify-center text-xl font-bold shrink-0"
                    style={{
                      backgroundColor: "var(--color-surface-elevated)",
                      fontFamily: "var(--font-display)",
                      color: "var(--color-accent-amber)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* ユーザー情報 */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-1"
                        style={{
                          backgroundColor: "var(--color-surface-elevated)",
                          color: "var(--color-text-primary)",
                          border: "1px solid var(--color-accent-cyan)",
                        }}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
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
                          className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
                          style={{
                            backgroundColor: "var(--color-accent-cyan)",
                            color: "var(--color-base)",
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
                        className="mt-1 text-xs font-medium transition-colors hover:underline"
                        style={{ color: "var(--color-accent-cyan)" }}
                      >
                        表示名を編集
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full text-center py-4">
                <p
                  className="text-sm mb-4"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  プロフィールを表示するにはログインが必要です
                </p>
                <button
                  type="button"
                  onClick={login}
                  className="px-6 py-2 rounded font-medium text-sm transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: "var(--color-accent-cyan)",
                    color: "var(--color-base)",
                  }}
                >
                  ログイン
                </button>
              </div>
            )}
          </div>
        </section>

        <section
          className="p-6 border-t"
          style={{ borderColor: "rgba(148, 163, 184, 0.12)" }}
        >
          <h2
            className="text-xs font-semibold tracking-wider mb-4"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-secondary)",
            }}
          >
            RESULTS
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div
              className="rounded-lg px-3 py-3"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.45)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
              }}
            >
              <div
                className="text-xs font-semibold"
                style={{ color: "var(--color-text-secondary)" }}
              >
                MATCHES
              </div>
              <div
                className="text-lg font-bold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-text-primary)",
                }}
              >
                {totalMatches}
              </div>
            </div>
            <div
              className="rounded-lg px-3 py-3"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.45)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
              }}
            >
              <div
                className="text-xs font-semibold"
                style={{ color: "var(--color-text-secondary)" }}
              >
                WINS
              </div>
              <div
                className="text-lg font-bold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-text-primary)",
                }}
              >
                {totalWins}
              </div>
            </div>
            <div
              className="rounded-lg px-3 py-3"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.45)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
              }}
            >
              <div
                className="text-xs font-semibold"
                style={{ color: "var(--color-text-secondary)" }}
              >
                WIN RATE
              </div>
              <div
                className="text-lg font-bold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-text-primary)",
                }}
              >
                {totalMatches > 0
                  ? `${((totalWins / totalMatches) * 100).toFixed(1)}%`
                  : "0.0%"}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div
              className="text-xs font-semibold tracking-wider"
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
                {recentResults.map((item) => (
                  <li
                    key={item.match_id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                    style={{
                      backgroundColor: "rgba(15, 23, 42, 0.4)",
                      border: "1px solid rgba(148, 163, 184, 0.15)",
                    }}
                  >
                    <span
                      className="font-semibold"
                      style={{
                        color:
                          item.result === "win"
                            ? "#22c55e"
                            : item.result === "loss"
                              ? "#ef4444"
                              : "#f59e0b",
                      }}
                    >
                      {item.result === "win"
                        ? "WIN"
                        : item.result === "loss"
                          ? "LOSE"
                          : "INVALID"}
                    </span>
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
