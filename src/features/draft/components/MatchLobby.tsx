import { useEffect, useRef, useState } from "react";
import { useMatch } from "../MatchContext";
import { TeamPanel } from "./TeamPanel";

export function MatchLobby() {
	const {
		currentMatch,
		firstTeamMembers,
		secondTeamMembers,
		participantCount,
		isDraftReady,
		leaveMatch,
		loading,
	} = useMatch();

	const [copied, setCopied] = useState(false);
	const timeoutRef = useRef<number | null>(null);

	// クリーンアップ: アンマウント時にsetTimeoutをクリア
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const handleCopyMatchId = async () => {
		if (!currentMatch?.id) return;
		try {
			await navigator.clipboard.writeText(currentMatch.id);
			setCopied(true);
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			timeoutRef.current = setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	const handleLeave = async () => {
		try {
			await leaveMatch();
		} catch (err) {
			console.error("Failed to leave:", err);
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

	return (
		<div className="space-y-6">
			{/* ヘッダー */}
			<div
				className="rounded-lg p-4 flex items-center justify-between"
				style={{
					backgroundColor: "var(--color-surface)",
					boxShadow:
						"0 0 20px rgba(6, 182, 212, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
				}}
			>
				<div className="space-y-2">
					<h2 className="text-xl font-semibold text-slate-100">
						ドラフトルーム
					</h2>
					<div className="flex items-center gap-2">
						<span className="text-sm text-slate-400">ルームID:</span>
						<code className="px-2 py-1 rounded bg-slate-800 text-cyan-400 text-sm font-mono">
							{currentMatch.id}
						</code>
						<button
							type="button"
							onClick={handleCopyMatchId}
							className="px-3 py-1 rounded text-xs font-medium transition-all"
							style={{
								backgroundColor: copied
									? "rgba(34, 197, 94, 0.2)"
									: "rgba(6, 182, 212, 0.2)",
								color: copied ? "#22c55e" : "#06b6d4",
							}}
						>
							{copied ? "コピー完了!" : "コピー"}
						</button>
					</div>
				</div>
				<button
					type="button"
					onClick={handleLeave}
					className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
				>
					退出
				</button>
			</div>

			{/* チームパネル */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<TeamPanel
					team="first"
					members={firstTeamMembers}
					title="先攻チーム"
				/>
				<TeamPanel
					team="second"
					members={secondTeamMembers}
					title="後攻チーム"
				/>
			</div>

			{/* ステータス表示 */}
			<div
				className="rounded-lg p-4 text-center space-y-2"
				style={{
					backgroundColor: "var(--color-surface)",
					boxShadow:
						"0 0 20px rgba(6, 182, 212, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
				}}
			>
				<div className="text-lg font-medium text-slate-100">
					参加者: {participantCount} / 10
				</div>
				{isDraftReady ? (
					<div className="text-cyan-400 font-medium">
						10人揃いました！ドラフトが開始されます...
					</div>
				) : (
					<div className="text-slate-400">
						参加者が揃うまでお待ちください...
					</div>
				)}
			</div>
		</div>
	);
}
