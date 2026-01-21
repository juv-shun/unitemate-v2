import { useCallback, useEffect, useState } from "react";
import {
  fetchQueuedUsers,
  fetchActiveMatches,
  type QueuedUser,
  type ActiveMatch,
} from "./monitor";

function formatWaitingTime(joinedAt: Date | null): string {
  if (!joinedAt) return "-";
  const diffMs = Date.now() - joinedAt.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffSec = Math.floor((diffMs % 60000) / 1000);
  return `${diffMin}分${diffSec}秒`;
}

function formatDateTime(date: Date | null): string {
  if (!date) return "-";
  return date.toLocaleString("ja-JP");
}

export function MonitorPage() {
  const [queuedUsers, setQueuedUsers] = useState<QueuedUser[]>([]);
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // データ取得
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [users, matches] = await Promise.all([
        fetchQueuedUsers(),
        fetchActiveMatches(),
      ]);
      setQueuedUsers(users);
      setActiveMatches(matches);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初回読み込み
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 読み込み中
  if (loading && !lastUpdated) {
    return (
      <div className="min-h-screen bg-[var(--color-base)] flex items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-base)] p-6">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
            監視ダッシュボード
          </h1>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-sm text-[var(--color-text-secondary)]">
                最終更新: {formatDateTime(lastUpdated)}
              </span>
            )}
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-[var(--color-accent-cyan)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? "更新中..." : "更新"}
            </button>
          </div>
        </div>

        {/* キュー中ユーザー */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 font-[var(--font-display)]">
            キュー中のユーザー ({queuedUsers.length}人)
          </h2>
          <div className="bg-[var(--color-surface)] rounded-lg overflow-hidden">
            {queuedUsers.length === 0 ? (
              <div className="p-6 text-center text-[var(--color-text-secondary)]">
                キュー中のユーザーはいません
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-[var(--color-base)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                      No.
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                      ユーザー名
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                      参加時刻
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                      待機時間
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {queuedUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      className="border-t border-[var(--color-base)]"
                    >
                      <td className="px-4 py-3 text-[var(--color-text-primary)]">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-primary)]">
                        {user.displayName}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {formatDateTime(user.queueJoinedAt)}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-accent-cyan)]">
                        {formatWaitingTime(user.queueJoinedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* マッチ中の試合 */}
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 font-[var(--font-display)]">
            マッチ中の試合 ({activeMatches.length}件)
          </h2>
          {activeMatches.length === 0 ? (
            <div className="bg-[var(--color-surface)] rounded-lg p-6 text-center text-[var(--color-text-secondary)]">
              マッチ中の試合はありません
            </div>
          ) : (
            <div className="space-y-4">
              {activeMatches.map((match) => {
                const firstTeam = match.members.filter(
                  (m) => m.team === "first"
                );
                const secondTeam = match.members.filter(
                  (m) => m.team === "second"
                );

                return (
                  <div
                    key={match.id}
                    className="bg-[var(--color-surface)] rounded-lg p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        マッチID: {match.id.slice(0, 8)}...
                      </span>
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        作成: {formatDateTime(match.createdAt)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* First Team */}
                      <div>
                        <h4 className="text-sm font-medium text-[var(--color-accent-cyan)] mb-2">
                          First Team
                        </h4>
                        <ul className="space-y-1">
                          {firstTeam.map((member) => (
                            <li
                              key={member.userId}
                              className="text-[var(--color-text-primary)]"
                            >
                              {member.seatNo}. {member.displayName}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Second Team */}
                      <div>
                        <h4 className="text-sm font-medium text-[var(--color-accent-pink)] mb-2">
                          Second Team
                        </h4>
                        <ul className="space-y-1">
                          {secondTeam.map((member) => (
                            <li
                              key={member.userId}
                              className="text-[var(--color-text-primary)]"
                            >
                              {member.seatNo}. {member.displayName}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
