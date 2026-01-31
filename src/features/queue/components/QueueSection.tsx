import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { fetchActiveMatches } from "../../monitor/monitor";
import { useQueue } from "../QueueContext";
import { unlockMatchSound } from "../matchSound";
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
		queueCount,
		startQueue,
		cancelQueue,
	} = useQueue();
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isQueueClosed, setIsQueueClosed] = useState(() =>
		isQueueClosedAt(new Date()),
	);
	const [showStatsModal, setShowStatsModal] = useState(false);
	const [statsData, setStatsData] = useState<{
		queueCount: number;
		activeMatchCount: number;
		oldestMatchCreatedAt: Date | null;
		fetchedAt: Date;
	} | null>(null);
	const showStatsModalRef = useRef(showStatsModal);
	const lastStatsShownAtRef = useRef<number | null>(null);
	const navigate = useNavigate();

	// showStatsModalの最新値をrefで追跡
	useEffect(() => {
		showStatsModalRef.current = showStatsModal;
	}, [showStatsModal]);

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

	// 5分間隔で統計情報モーダルを表示
	const STATS_MODAL_INTERVAL_MS = 5 * 60 * 1000;

	useEffect(() => {
		// キュー待機中のみ動作
		if (queueStatus !== "waiting") {
			setShowStatsModal(false);
			setStatsData(null);
			lastStatsShownAtRef.current = null;
			return;
		}

		// 初回のタイムスタンプを設定
		if (lastStatsShownAtRef.current === null) {
			lastStatsShownAtRef.current = Date.now();
		}

		const showStats = async () => {
			// 既にモーダルが表示されている場合はスキップ
			if (showStatsModalRef.current) return;

			// 前回表示から5分経過しているかチェック
			const now = Date.now();
			const elapsed = now - (lastStatsShownAtRef.current ?? now);
			if (elapsed < STATS_MODAL_INTERVAL_MS) return;

			try {
				const activeMatches = await fetchActiveMatches();
				setStatsData({
					queueCount,
					activeMatchCount: activeMatches.length,
					oldestMatchCreatedAt:
						activeMatches.length > 0 ? activeMatches[0].createdAt : null,
					fetchedAt: new Date(),
				});
				setShowStatsModal(true);
				lastStatsShownAtRef.current = now;
			} catch (err) {
				console.error("Failed to fetch stats:", err);
			}
		};

		// 定期チェック（1分毎）
		const intervalId = setInterval(showStats, 60 * 1000);

		// タブがアクティブになったときにもチェック
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				showStats();
			}
		};
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			clearInterval(intervalId);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [queueStatus, queueCount]);

	const handleStartQueue = async () => {
		setIsProcessing(true);
		try {
			void unlockMatchSound();
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
			<>
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

						{(queueCount === 8 || queueCount === 9) && (
							<div
								className="rounded-lg px-4 py-3 text-center"
								style={{
									backgroundColor: "rgba(6, 182, 212, 0.15)",
									border: "1px solid var(--color-accent-cyan)",
								}}
							>
								<p
									className="text-sm font-semibold"
									style={{
										fontFamily: "var(--font-display)",
										color: "var(--color-accent-cyan)",
									}}
								>
									あと {10 - queueCount}人 でマッチが成立します
								</p>
								<p
									className="text-xs mt-1"
									style={{ color: "var(--color-text-secondary)" }}
								>
									もう少しお待ちください
								</p>
							</div>
						)}

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

				{/* 統計情報モーダル */}
				{showStatsModal && statsData && (
					<div className="fixed inset-0 z-50 flex items-center justify-center px-4">
						<button
							type="button"
							className="absolute inset-0 cursor-default"
							style={{ backgroundColor: "rgba(2, 6, 23, 0.78)" }}
							onClick={() => setShowStatsModal(false)}
							aria-label="モーダルを閉じる"
						/>
						<div
							className="relative w-full max-w-sm rounded-2xl p-6"
							style={{
								backgroundColor: "var(--color-surface)",
								boxShadow:
									"0 24px 60px rgba(2, 6, 23, 0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
								border: "1px solid rgba(148, 163, 184, 0.15)",
							}}
						>
							<h2
								className="text-lg font-bold tracking-wide text-center"
								style={{
									fontFamily: "var(--font-display)",
									color: "var(--color-text-primary)",
								}}
							>
								マッチング状況
							</h2>

							<div className="mt-5 space-y-4">
								{/* 待機ユーザー数 */}
								<div className="flex items-center justify-between">
									<span
										className="text-sm"
										style={{ color: "var(--color-text-secondary)" }}
									>
										待機中のユーザー
									</span>
									<span
										className="text-xl font-bold"
										style={{
											fontFamily: "var(--font-display)",
											color: "var(--color-accent-cyan)",
										}}
									>
										{statsData.queueCount >= 10
											? "10人以上"
											: `${statsData.queueCount}人`}
									</span>
								</div>

								{/* マッチング中の試合数 */}
								<div className="flex items-center justify-between">
									<span
										className="text-sm"
										style={{ color: "var(--color-text-secondary)" }}
									>
										進行中の試合
									</span>
									<span
										className="text-xl font-bold"
										style={{
											fontFamily: "var(--font-display)",
											color: "var(--color-accent-pink)",
										}}
									>
										{statsData.activeMatchCount}試合
									</span>
								</div>

								{/* 最古のマッチング中試合の時刻 */}
								{statsData.oldestMatchCreatedAt && (
									<div className="flex items-center justify-between">
										<span
											className="text-sm"
											style={{ color: "var(--color-text-secondary)" }}
										>
											最古の試合開始
										</span>
										<span
											className="text-sm font-medium"
											style={{ color: "var(--color-text-primary)" }}
										>
											{statsData.oldestMatchCreatedAt.toLocaleTimeString(
												"ja-JP",
												{
													hour: "2-digit",
													minute: "2-digit",
												},
											)}
										</span>
									</div>
								)}
							</div>

							{/* 表示日時 */}
							<p
								className="mt-4 text-xs text-right"
								style={{ color: "var(--color-text-secondary)" }}
							>
								{statsData.fetchedAt.toLocaleString("ja-JP")} 時点
							</p>

							{/* 閉じるボタン */}
							<div className="mt-5 flex justify-center">
								<button
									type="button"
									onClick={() => setShowStatsModal(false)}
									className="px-6 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all"
									style={{
										fontFamily: "var(--font-display)",
										backgroundColor: "rgba(100, 116, 139, 0.25)",
										color: "var(--color-text-primary)",
										border: "1px solid rgba(100, 116, 139, 0.4)",
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.backgroundColor =
											"rgba(100, 116, 139, 0.4)";
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.backgroundColor =
											"rgba(100, 116, 139, 0.25)";
									}}
								>
									閉じる
								</button>
							</div>
						</div>
					</div>
				)}
			</>
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
						現在閉鎖中
					</p>
				</div>
			)}
			{!isBanned && !isQueueClosed && (
				<div className="space-y-2">
					{(queueCount === 8 || queueCount === 9) && (
						<div
							className="rounded-lg p-4 text-center animate-pulse"
							style={{
								backgroundColor: "rgba(6, 182, 212, 0.1)",
								border: "1px solid var(--color-accent-cyan)",
							}}
						>
							<p
								className="text-sm font-semibold"
								style={{
									fontFamily: "var(--font-display)",
									color: "var(--color-accent-cyan)",
								}}
							>
								あと {10 - queueCount}人 でマッチが成立します
							</p>
							<p
								className="text-xs mt-1"
								style={{ color: "var(--color-text-secondary)" }}
							>
								ぜひ、ご参加ください！
							</p>
						</div>
					)}
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
						開催時間: 18:00〜翌2:00
					</p>
				</div>
			)}
		</div>
	);
}
