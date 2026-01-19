import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useQueue } from "../../queue/QueueContext";
import { useMatch } from "../MatchContext";
import type { Member } from "../types";

export function MatchLobby() {
  const { user } = useAuth();
  const { cancelQueue } = useQueue();
  const navigate = useNavigate();
  const {
    currentMatch,
    firstTeamMembers,
    secondTeamMembers,
    myMember,
    setLobbyId,
    setSeated,
    setLobbyIssue,
    unsetLobbyIssue,
    createReport,
    leaveMatch,
    loading,
  } = useMatch();

  const [lobbyIdInput, setLobbyIdInput] = useState("");
  const [lobbyIdError, setLobbyIdError] = useState("");
  const [submittingLobbyId, setSubmittingLobbyId] = useState(false);
  const [seatingInProgress, setSeatingInProgress] = useState(false);
  const [showLobbyScreen, setShowLobbyScreen] = useState(false);
  const [entryError, setEntryError] = useState("");

  useEffect(() => {
    setShowLobbyScreen(false);
    setEntryError("");
  }, [currentMatch?.id]);

  // ロビーID設定
  const handleSetLobbyId = async () => {
    if (!lobbyIdInput.trim()) {
      setLobbyIdError("ロビーIDを入力してください");
      return;
    }
    if (!/^\d{8}$/.test(lobbyIdInput.trim())) {
      setLobbyIdError("8桁の数字を入力してください");
      return;
    }

    setSubmittingLobbyId(true);
    setLobbyIdError("");

    try {
      await setLobbyId(lobbyIdInput.trim());
      setLobbyIdInput("");
    } catch (err) {
      setLobbyIdError(
        err instanceof Error ? err.message : "ロビーIDの設定に失敗しました",
      );
    } finally {
      setSubmittingLobbyId(false);
    }
  };

  // 着席設定
  const handleSetSeated = async () => {
    setSeatingInProgress(true);
    try {
      await setSeated();
      setEntryError("");
      setShowLobbyScreen(true);
    } catch (err) {
      console.error("Failed to set seated:", err);
      setEntryError("着席に失敗しました。もう一度お試しください。");
    } finally {
      setSeatingInProgress(false);
    }
  };

  // 困り中設定
  const handleSetLobbyIssue = async () => {
    try {
      await setLobbyIssue();
    } catch (err) {
      console.error("Failed to set lobby issue:", err);
    }
  };

  // 困り中解除
  const handleUnsetLobbyIssue = async () => {
    try {
      await unsetLobbyIssue();
    } catch (err) {
      console.error("Failed to unset lobby issue:", err);
    }
  };

  // 通報
  const handleReport = async (reportedUserId: string) => {
    if (!window.confirm("このユーザーを通報しますか？")) return;
    try {
      await createReport(reportedUserId);
      alert("通報を送信しました");
    } catch (err) {
      console.error("Failed to create report:", err);
      alert("通報の送信に失敗しました");
    }
  };

  const handleEndMatch = async () => {
    if (!window.confirm("試合を終了して退出しますか？")) return;
    try {
      await leaveMatch();
      await cancelQueue();
      navigate("/");
    } catch (err) {
      console.error("Failed to end match:", err);
      alert("退出に失敗しました。時間をおいて再試行してください。");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentMatch) {
    return (
      <div className="text-center text-slate-400 py-8">
        マッチが見つかりませんでした
      </div>
    );
  }

  const isSeated = myMember?.seated_at != null;
  const hasLobbyIssue = myMember?.lobby_issue === true;
  const shouldShowModal = !showLobbyScreen && !isSeated;

  return (
    <div className="space-y-6 animate-fade-in">
      {shouldShowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(2, 6, 23, 0.78)" }}
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
            <h2
              className="text-2xl font-bold tracking-wide"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-text-primary)",
              }}
            >
              マッチ成立
            </h2>
            {entryError && (
              <p className="mt-4 text-sm font-bold text-red-400">
                {entryError}
              </p>
            )}
            <button
              type="button"
              onClick={handleSetSeated}
              disabled={seatingInProgress}
              className="mt-6 w-full py-3 rounded-lg text-sm font-semibold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-base)",
                backgroundColor: "var(--color-accent-cyan)",
                boxShadow: "0 4px 20px rgba(6, 182, 212, 0.4)",
              }}
            >
              {seatingInProgress ? "処理中..." : "ロビーへ進む"}
            </button>
          </div>
        </div>
      )}

      {!shouldShowModal && (
        <>
          {/* ロビーID入力セクション */}
          <div
            className="rounded-xl p-6 space-y-4 relative overflow-hidden"
            style={{
              backgroundColor: "var(--color-surface)",
              boxShadow:
                "0 4px 24px rgba(6, 182, 212, 0.1), 0 0 0 1px rgba(6, 182, 212, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {/* 背景装飾 */}
            <div
              className="absolute top-0 right-0 w-32 h-32 opacity-20"
              style={{
                background:
                  "radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%)",
              }}
            />

            <h3
              className="text-xl font-bold uppercase tracking-wide relative z-10"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-text-primary)",
              }}
            >
              Lobby ID
            </h3>
            <div
              className="rounded-lg px-3 py-2 text-xs font-semibold tracking-wide uppercase relative z-10"
              style={{
                backgroundColor: "rgba(6, 182, 212, 0.12)",
                color: "var(--color-accent-cyan)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
              }}
            >
              ロビーIDは誰でも入力でき、上書きされます。
            </div>
            {currentMatch.lobby_id ? (
              <div className="space-y-3 relative z-10">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                    Current
                  </span>
                  <code
                    className="px-4 py-2 rounded-lg font-mono text-2xl font-bold tracking-widest"
                    style={{
                      backgroundColor: "rgba(6, 182, 212, 0.15)",
                      color: "var(--color-accent-cyan)",
                      border: "2px solid rgba(6, 182, 212, 0.3)",
                      boxShadow: "0 0 20px rgba(6, 182, 212, 0.3)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {currentMatch.lobby_id}
                  </code>
                </div>
                <div
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--color-text-secondary)" }}
                ></div>
              </div>
            ) : (
              <div
                className="text-sm font-medium uppercase tracking-wide relative z-10"
                style={{ color: "var(--color-text-secondary)" }}
              >
                ゲーム内でロビーを作成し、8桁のロビーIDを入力してください
              </div>
            )}
            <div className="flex gap-3 relative z-10">
              <input
                type="text"
                value={lobbyIdInput}
                onChange={(e) => {
                  setLobbyIdInput(e.target.value);
                  setLobbyIdError("");
                }}
                placeholder="12345678"
                maxLength={8}
                className="flex-1 px-4 py-3 rounded-lg font-mono text-lg font-bold tracking-widest transition-all duration-300 focus:scale-[1.02]"
                style={{
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  border: "2px solid rgba(6, 182, 212, 0.3)",
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-display)",
                  boxShadow: "0 0 0 0 rgba(6, 182, 212, 0.4)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-accent-cyan)";
                  e.target.style.boxShadow = "0 0 20px rgba(6, 182, 212, 0.4)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(6, 182, 212, 0.3)";
                  e.target.style.boxShadow = "0 0 0 0 rgba(6, 182, 212, 0.4)";
                }}
              />
              <button
                type="button"
                onClick={handleSetLobbyId}
                disabled={submittingLobbyId}
                className="px-6 py-3 rounded-lg font-bold uppercase tracking-wide transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  backgroundColor: "var(--color-accent-cyan)",
                  color: "var(--color-base)",
                  fontFamily: "var(--font-display)",
                  boxShadow: "0 4px 20px rgba(6, 182, 212, 0.4)",
                }}
              >
                {submittingLobbyId ? "..." : "SET"}
              </button>
            </div>
            {lobbyIdError && (
              <div
                className="text-sm font-bold uppercase tracking-wide animate-shake relative z-10"
                style={{
                  color: "var(--color-danger)",
                  textShadow: "0 0 10px rgba(239, 68, 68, 0.5)",
                }}
              >
                ⚠ {lobbyIdError}
              </div>
            )}
            <div className="flex flex-wrap gap-3 relative z-10">
              {hasLobbyIssue ? (
                <button
                  type="button"
                  onClick={handleUnsetLobbyIssue}
                  className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-300 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: "rgba(100, 116, 139, 0.3)",
                    color: "var(--color-text-primary)",
                    border: "1px solid rgba(100, 116, 139, 0.5)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  困り中を解除
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSetLobbyIssue}
                  className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-300 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: "rgba(234, 179, 8, 0.2)",
                    color: "#eab308",
                    border: "1px solid rgba(234, 179, 8, 0.4)",
                    fontFamily: "var(--font-display)",
                    boxShadow: "0 0 16px rgba(234, 179, 8, 0.25)",
                  }}
                >
                  ロビーに入れない
                </button>
              )}
            </div>
          </div>

          {/* チームパネル（2列） */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TeamDisplay
              title="FIRST (先攻)"
              members={firstTeamMembers}
              currentUserId={user?.uid}
              onReport={handleReport}
              accentColor="var(--color-accent-cyan)"
              index={0}
            />
            <TeamDisplay
              title="SECOND (後攻)"
              members={secondTeamMembers}
              currentUserId={user?.uid}
              onReport={handleReport}
              accentColor="var(--color-accent-pink)"
              index={1}
            />
          </div>
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleEndMatch}
              className="px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                color: "var(--color-danger)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                fontFamily: "var(--font-display)",
              }}
            >
              試合終了
            </button>
          </div>
        </>
      )}

      <style>{`
				@keyframes fade-in {
					from {
						opacity: 0;
						transform: translateY(10px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				@keyframes shake {
					0%, 100% { transform: translateX(0); }
					25% { transform: translateX(-4px); }
					75% { transform: translateX(4px); }
				}

				.animate-fade-in {
					animation: fade-in 0.6s ease-out;
				}

				.animate-shake {
					animation: shake 0.5s ease-out;
				}
			`}</style>
    </div>
  );
}

// チーム表示コンポーネント
function TeamDisplay({
  title,
  members,
  currentUserId,
  onReport,
  accentColor,
  index,
}: {
  title: string;
  members: Member[];
  currentUserId?: string;
  onReport: (userId: string) => void;
  accentColor: string;
  index: number;
}) {
  return (
    <div
      className="rounded-xl p-6 space-y-4 relative overflow-hidden animate-slide-in"
      style={{
        backgroundColor: "var(--color-surface)",
        boxShadow: `0 4px 24px ${accentColor}20, 0 0 0 1px ${accentColor}20, inset 0 1px 0 rgba(255,255,255,0.05)`,
        animationDelay: `${index * 0.1}s`,
      }}
    >
      {/* 背景装飾 */}
      <div
        className="absolute top-0 right-0 w-32 h-32 opacity-10"
        style={{
          background: `radial-gradient(circle, ${accentColor}40 0%, transparent 70%)`,
        }}
      />

      <h3
        className="text-xl font-bold uppercase tracking-wide relative z-10"
        style={{
          fontFamily: "var(--font-display)",
          color: accentColor,
          textShadow: `0 0 15px ${accentColor}50`,
        }}
      >
        {title}
      </h3>
      <div className="space-y-2 relative z-10">
        {members.map((member, i) => {
          const isSeated = member.seated_at != null;
          const hasIssue = member.lobby_issue === true;
          const isCurrentUser = member.user_id === currentUserId;

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg transition-all duration-300 animate-fade-in"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.5)",
                border: `1px solid ${accentColor}20`,
                animationDelay: `${index * 0.1 + i * 0.05}s`,
              }}
            >
              <div className="flex items-center gap-3">
                {/* 座席番号 */}
                <div
                  className="w-8 h-8 flex items-center justify-center rounded font-bold text-sm"
                  style={{
                    backgroundColor: `${accentColor}20`,
                    color: accentColor,
                    fontFamily: "var(--font-display)",
                    border: `1px solid ${accentColor}40`,
                  }}
                >
                  {member.seat_no}
                </div>
                <div className="text-sm font-bold tracking-wide text-slate-100">
                  {member.display_name || "名無し"}
                </div>
                {isSeated && (
                  <span
                    className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: "rgba(34, 197, 94, 0.2)",
                      color: "#22c55e",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                    }}
                  >
                    ✓
                  </span>
                )}
                {hasIssue && (
                  <span
                    className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded animate-pulse"
                    style={{
                      backgroundColor: "rgba(234, 179, 8, 0.2)",
                      color: "#eab308",
                      border: "1px solid rgba(234, 179, 8, 0.3)",
                    }}
                  >
                    ロビーに入れない
                  </span>
                )}
                {isCurrentUser && (
                  <span
                    className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${accentColor}20`,
                      color: accentColor,
                      border: `1px solid ${accentColor}40`,
                    }}
                  >
                    YOU
                  </span>
                )}
              </div>
              {!isCurrentUser && (
                <button
                  type="button"
                  onClick={() => onReport(member.user_id)}
                  className="px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    color: "var(--color-danger)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  REPORT
                </button>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
				@keyframes slide-in {
					from {
						opacity: 0;
						transform: translateX(-20px);
					}
					to {
						opacity: 1;
						transform: translateX(0);
					}
				}

				.animate-slide-in {
					animation: slide-in 0.6s ease-out;
				}
			`}</style>
    </div>
  );
}
