import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { storage } from "../../../firebase";
import { useAuth } from "../../auth/AuthContext";
import { useQueue } from "../../queue/QueueContext";
import { useMatch } from "../MatchContext";
import type { MatchResult, Member } from "../types";

export function MatchLobby() {
	const { user } = useAuth();
	const { resetQueueState } = useQueue();
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
	const [reportTarget, setReportTarget] = useState<Member | null>(null);
	const [reportFile, setReportFile] = useState<File | null>(null);
	const [reportSubmitting, setReportSubmitting] = useState(false);
	const [reportError, setReportError] = useState("");
	const [showEndMatchModal, setShowEndMatchModal] = useState(false);
	const [showLobbyOverwriteModal, setShowLobbyOverwriteModal] = useState(false);
	const [endMatchResult, setEndMatchResult] = useState<MatchResult | "">("");
	const [endMatchSubmitting, setEndMatchSubmitting] = useState(false);
	const [endMatchError, setEndMatchError] = useState("");
	const [bannedPokemons, setBannedPokemons] = useState<
		Array<{ id: string; name: string; type: string; imageUrl: string }>
	>([]);
	const [loadingBanned, setLoadingBanned] = useState(false);

	useEffect(() => {
		setShowLobbyScreen(false);
		setEntryError("");
		setShowEndMatchModal(false);
		setShowLobbyOverwriteModal(false);
		setEndMatchResult("");
		setEndMatchError("");
	}, [currentMatch?.id]);

	useEffect(() => {
		const shouldLoad = !showLobbyScreen && myMember?.seated_at == null;
		if (shouldLoad) {
			setLoadingBanned(true);
			fetch("/banned_pokemons.json")
				.then((res) => res.json())
				.then((data) => setBannedPokemons(data))
				.catch((err) => {
					console.error("Failed to load banned pokemons:", err);
					setBannedPokemons([]);
				})
				.finally(() => setLoadingBanned(false));
		}
	}, [showLobbyScreen, myMember?.seated_at]);

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

		// 既存ロビーIDがある場合は確認ダイアログを表示
		if (currentMatch.lobby_id) {
			setShowLobbyOverwriteModal(true);
			return;
		}

		// 既存ロビーIDがない場合は直接実行
		await executeSetLobbyId();
	};

	// ロビーID設定の実行
	const executeSetLobbyId = async () => {
		setSubmittingLobbyId(true);
		setLobbyIdError("");

		try {
			await setLobbyId(lobbyIdInput.trim());
			setLobbyIdInput("");
			setShowLobbyOverwriteModal(false);
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
	const handleReport = (member: Member) => {
		setReportTarget(member);
		setReportFile(null);
		setReportError("");
	};

	const handleSubmitReport = async () => {
		if (!reportTarget || !currentMatch || !user) return;
		setReportSubmitting(true);
		setReportError("");
		try {
			let screenshotUrl: string | undefined;
			if (reportFile) {
				const safeName = reportFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
				const filePath = `reports/${currentMatch.id}/${user.uid}/${Date.now()}_${safeName}`;
				const storageRef = ref(storage, filePath);
				await uploadBytes(storageRef, reportFile);
				screenshotUrl = await getDownloadURL(storageRef);
			}
			await createReport(reportTarget.user_id, screenshotUrl);
			setReportTarget(null);
			setReportFile(null);
			alert("通報を送信しました");
		} catch (err) {
			console.error("Failed to create report:", err);
			setReportError(
				"通報の送信に失敗しました。時間をおいて再試行してください。",
			);
		} finally {
			setReportSubmitting(false);
		}
	};

	const handleOpenEndMatchModal = () => {
		setEndMatchError("");
		setShowEndMatchModal(true);
	};

	const handleConfirmEndMatch = async () => {
		if (!endMatchResult) {
			setEndMatchError("試合結果を選択してください。");
			return;
		}
		setEndMatchSubmitting(true);
		try {
			await leaveMatch(endMatchResult as MatchResult);
			await resetQueueState();
			navigate("/");
		} catch (err) {
			console.error("Failed to end match:", err);
			setEndMatchError("退出に失敗しました。時間をおいて再試行してください。");
		} finally {
			setEndMatchSubmitting(false);
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
						style={{ backgroundColor: "rgba(2, 6, 23, 0.88)" }}
					/>
					<div
						className="relative w-full max-w-md rounded-2xl p-8 text-center overflow-hidden"
						style={{
							backgroundColor: "var(--color-surface)",
							boxShadow:
								"0 0 80px rgba(6, 182, 212, 0.3), 0 24px 60px rgba(2, 6, 23, 0.9), inset 0 1px 0 rgba(255,255,255,0.05)",
							border: "1px solid rgba(6, 182, 212, 0.3)",
						}}
					>
						{/* Animated corner accents */}
						<div
							className="absolute top-0 left-0 w-16 h-16 pointer-events-none"
							style={{
								background:
									"linear-gradient(135deg, var(--color-accent-cyan) 0%, transparent 70%)",
								opacity: 0.4,
							}}
						/>
						<div
							className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none"
							style={{
								background:
									"linear-gradient(-45deg, var(--color-accent-pink) 0%, transparent 70%)",
								opacity: 0.4,
							}}
						/>

						{/* Pulsing border glow */}
						<div
							className="absolute inset-0 rounded-2xl pointer-events-none animate-pulse-slow"
							style={{
								boxShadow: "inset 0 0 30px rgba(6, 182, 212, 0.15)",
							}}
						/>

						{/* Status badge */}
						<div
							className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-4 animate-pulse-glow"
							style={{
								fontFamily: "var(--font-display)",
								background:
									"linear-gradient(90deg, var(--color-accent-cyan), var(--color-accent-pink))",
								color: "var(--color-base)",
								boxShadow:
									"0 0 20px rgba(6, 182, 212, 0.6), 0 0 40px rgba(236, 72, 153, 0.4)",
							}}
						>
							MATCH FOUND
						</div>

						{/* Main title with gradient */}
						<h2
							className="text-4xl font-black tracking-wider mb-2 animate-slide-in-up"
							style={{
								fontFamily: "var(--font-display)",
								background:
									"linear-gradient(135deg, var(--color-accent-cyan) 0%, var(--color-accent-pink) 100%)",
								WebkitBackgroundClip: "text",
								WebkitTextFillColor: "transparent",
								backgroundClip: "text",
								textShadow: "0 0 40px rgba(6, 182, 212, 0.3)",
								letterSpacing: "0.1em",
							}}
						>
							READY
						</h2>

						{/* Subtitle */}
						<p
							className="text-xs tracking-widest mb-6 opacity-70"
							style={{
								fontFamily: "var(--font-display)",
								color: "var(--color-text-primary)",
							}}
						>
							PREPARE FOR BATTLE
						</p>

						{/* 使用禁止ポケモン表示 */}
						{!loadingBanned && (
							<div className="mt-6 w-full">
								{bannedPokemons.length === 0 ? (
									<div
										className="text-xs font-bold tracking-widest text-center py-3 px-4 rounded-lg"
										style={{
											fontFamily: "var(--font-display)",
											color: "var(--color-text-secondary)",
											backgroundColor: "rgba(15, 23, 42, 0.4)",
											border: "1px solid rgba(203, 213, 225, 0.1)",
										}}
									>
										使用禁止ポケモンなし
									</div>
								) : (
									<div className="space-y-3">
										<div
											className="text-xs font-bold tracking-widest text-center"
											style={{
												fontFamily: "var(--font-display)",
												color: "var(--color-danger)",
												textShadow: "0 0 10px rgba(239, 68, 68, 0.5)",
											}}
										>
											⚠ 使用禁止ポケモン
										</div>
										<div className="flex flex-wrap justify-center gap-2">
											{bannedPokemons.map((pokemon) => (
												<div
													key={pokemon.id}
													className="relative group cursor-pointer"
													title={pokemon.name}
												>
													<div
														className="absolute inset-0 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
														style={{
															backgroundColor: "var(--color-danger)",
															filter: "blur(8px)",
														}}
													/>
													<img
														src={pokemon.imageUrl}
														alt="使用禁止ポケモン"
														className="relative w-16 h-16 rounded-lg border-2 shadow-lg transition-all duration-200 group-hover:scale-110 group-hover:shadow-2xl"
														style={{
															borderColor: "var(--color-danger)",
															boxShadow:
																"0 4px 12px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
														}}
													/>
													<div
														className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
														style={{
															backgroundColor: "var(--color-danger)",
															color: "var(--color-base)",
															boxShadow: "0 2px 8px rgba(239, 68, 68, 0.6)",
														}}
													>
														✕
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						)}

						{entryError && (
							<p className="mt-4 text-sm font-bold text-red-400">
								{entryError}
							</p>
						)}
						<button
							type="button"
							onClick={handleSetSeated}
							disabled={seatingInProgress}
							className="group relative mt-6 w-full py-4 rounded-lg text-sm font-bold tracking-widest transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden hover:scale-105 active:scale-95"
							style={{
								fontFamily: "var(--font-display)",
								color: "var(--color-base)",
								background:
									"linear-gradient(135deg, var(--color-accent-cyan) 0%, var(--color-accent-pink) 100%)",
								boxShadow:
									"0 8px 32px rgba(6, 182, 212, 0.5), 0 0 20px rgba(236, 72, 153, 0.3)",
							}}
						>
							{/* Shimmer effect */}
							<div
								className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
								style={{
									background:
										"linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
									transform: "translateX(-100%)",
									animation: "shimmer 2s infinite",
								}}
							/>
							<span className="relative z-10 flex items-center justify-center gap-2">
								{seatingInProgress ? (
									<>
										<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
										LOADING...
									</>
								) : (
									<>
										<svg
											className="w-5 h-5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2.5}
												d="M13 7l5 5m0 0l-5 5m5-5H6"
											/>
										</svg>
										ENTER LOBBY
									</>
								)}
							</span>
						</button>
					</div>
				</div>
			)}

			{reportTarget && (
				<div className="fixed inset-0 z-50 flex items-center justify-center px-4">
					<div
						className="absolute inset-0"
						style={{ backgroundColor: "rgba(2, 6, 23, 0.78)" }}
					/>
					<div
						className="relative w-full max-w-lg rounded-2xl p-6 text-left"
						style={{
							backgroundColor: "var(--color-surface)",
							boxShadow:
								"0 24px 60px rgba(2, 6, 23, 0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
							border: "1px solid rgba(148, 163, 184, 0.15)",
						}}
					>
						<h2
							className="text-xl font-bold tracking-wide"
							style={{
								fontFamily: "var(--font-display)",
								color: "var(--color-text-primary)",
							}}
						>
							通報（ゲームに来なかった）
						</h2>
						<p className="mt-2 text-sm text-slate-300">
							対象: {reportTarget.display_name || "名無し"}
						</p>
						<div
							className="mt-4 rounded-lg px-3 py-2 text-sm font-semibold"
							style={{
								backgroundColor: "rgba(239, 68, 68, 0.12)",
								color: "#f87171",
								border: "1px solid rgba(239, 68, 68, 0.35)",
							}}
						>
							この通報は「ゲームに来なかった」場合のみ受け付けます。
							トロールなどゲーム内行動への対応は一切行いません。
						</div>
						<div className="mt-4 space-y-2">
							<label className="block text-sm font-semibold text-slate-200">
								スクリーンショット（任意）
							</label>
							<input
								type="file"
								accept="image/*"
								onChange={(e) => {
									const file = e.target.files?.[0] ?? null;
									setReportFile(file);
									setReportError("");
								}}
								className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-slate-600"
							/>
							{reportFile && (
								<div className="text-xs text-slate-400">{reportFile.name}</div>
							)}
						</div>
						{reportError && (
							<div className="mt-3 text-sm font-bold text-red-400">
								{reportError}
							</div>
						)}
						<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
							<button
								type="button"
								onClick={() => setReportTarget(null)}
								className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
								style={{
									backgroundColor: "rgba(100, 116, 139, 0.25)",
									color: "var(--color-text-primary)",
									border: "1px solid rgba(100, 116, 139, 0.4)",
									fontFamily: "var(--font-display)",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor =
										"rgba(100, 116, 139, 0.45)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor =
										"rgba(100, 116, 139, 0.25)";
								}}
							>
								キャンセル
							</button>
							<button
								type="button"
								onClick={handleSubmitReport}
								disabled={reportSubmitting}
								className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
								style={{
									backgroundColor: "rgba(239, 68, 68, 0.2)",
									color: "#f87171",
									border: "1px solid rgba(239, 68, 68, 0.4)",
									fontFamily: "var(--font-display)",
								}}
								onMouseEnter={(e) => {
									if (reportSubmitting) return;
									e.currentTarget.style.backgroundColor =
										"rgba(239, 68, 68, 0.35)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor =
										"rgba(239, 68, 68, 0.2)";
								}}
							>
								{reportSubmitting ? "送信中..." : "通報する"}
							</button>
						</div>
					</div>
				</div>
			)}

			{showEndMatchModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center px-4">
					<div
						className="absolute inset-0"
						style={{ backgroundColor: "rgba(2, 6, 23, 0.78)" }}
					/>
					<div
						className="relative w-full max-w-lg rounded-2xl p-6 text-left"
						style={{
							backgroundColor: "var(--color-surface)",
							boxShadow:
								"0 24px 60px rgba(2, 6, 23, 0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
							border: "1px solid rgba(148, 163, 184, 0.15)",
						}}
					>
						<h2
							className="text-xl font-bold tracking-wide"
							style={{
								fontFamily: "var(--font-display)",
								color: "var(--color-text-primary)",
							}}
						>
							試合結果の入力
						</h2>
						<p className="mt-2 text-sm text-slate-300">
							試合終了前に結果を選択してください（必須）。
						</p>
						<div className="mt-4 grid gap-3">
							{[
								{ value: "win", label: "勝利" },
								{ value: "loss", label: "敗北" },
								{ value: "invalid", label: "無効" },
							].map((option) => (
								<label
									key={option.value}
									className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm font-semibold"
									style={{
										borderColor: "rgba(148, 163, 184, 0.2)",
										color: "var(--color-text-primary)",
										backgroundColor:
											endMatchResult === option.value
												? "rgba(6, 182, 212, 0.12)"
												: "rgba(15, 23, 42, 0.35)",
									}}
								>
									<input
										type="radio"
										name="match-result"
										value={option.value}
										checked={endMatchResult === option.value}
										onChange={() => {
											setEndMatchResult(option.value as MatchResult);
											setEndMatchError("");
										}}
										className="h-4 w-4 accent-cyan-400"
									/>
									{option.label}
								</label>
							))}
						</div>
						{endMatchError && (
							<div className="mt-3 text-sm font-bold text-red-400">
								{endMatchError}
							</div>
						)}
						<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
							<button
								type="button"
								onClick={() => {
									setShowEndMatchModal(false);
									setEndMatchError("");
								}}
								className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
								style={{
									backgroundColor: "rgba(100, 116, 139, 0.25)",
									color: "var(--color-text-primary)",
									border: "1px solid rgba(100, 116, 139, 0.4)",
									fontFamily: "var(--font-display)",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor =
										"rgba(100, 116, 139, 0.45)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor =
										"rgba(100, 116, 139, 0.25)";
								}}
							>
								キャンセル
							</button>
							<button
								type="button"
								onClick={handleConfirmEndMatch}
								disabled={endMatchSubmitting}
								className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
								style={{
									backgroundColor: "rgba(239, 68, 68, 0.2)",
									color: "#f87171",
									border: "1px solid rgba(239, 68, 68, 0.4)",
									fontFamily: "var(--font-display)",
								}}
								onMouseEnter={(e) => {
									if (endMatchSubmitting) return;
									e.currentTarget.style.backgroundColor =
										"rgba(239, 68, 68, 0.35)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor =
										"rgba(239, 68, 68, 0.2)";
								}}
							>
								{endMatchSubmitting ? "処理中..." : "試合終了"}
							</button>
						</div>
					</div>
				</div>
			)}

			{showLobbyOverwriteModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center px-4">
					<div
						className="absolute inset-0"
						style={{ backgroundColor: "rgba(2, 6, 23, 0.78)" }}
					/>
					<div
						className="relative w-full max-w-md rounded-2xl p-6 text-left"
						style={{
							backgroundColor: "var(--color-surface)",
							boxShadow:
								"0 24px 60px rgba(2, 6, 23, 0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
							border: "1px solid rgba(148, 163, 184, 0.15)",
						}}
					>
						<h2
							className="text-xl font-bold tracking-wide"
							style={{
								fontFamily: "var(--font-display)",
								color: "var(--color-text-primary)",
							}}
						>
							ロビーIDの上書き確認
						</h2>
						<p
							className="mt-3 text-sm"
							style={{ color: "var(--color-text-secondary)" }}
						>
							既にロビーIDが設定されています。上書きしますか？
						</p>
						<div className="mt-4 flex items-center gap-3">
							<span className="text-sm font-medium text-slate-400">
								現在のID:
							</span>
							<code
								className="px-3 py-1 rounded-lg font-mono text-lg font-bold tracking-widest"
								style={{
									backgroundColor: "rgba(6, 182, 212, 0.15)",
									color: "var(--color-accent-cyan)",
									border: "1px solid rgba(6, 182, 212, 0.3)",
									fontFamily: "var(--font-display)",
								}}
							>
								{currentMatch.lobby_id}
							</code>
						</div>
						<div className="mt-2 flex items-center gap-3">
							<span className="text-sm font-medium text-slate-400">
								新しいID:
							</span>
							<code
								className="px-3 py-1 rounded-lg font-mono text-lg font-bold tracking-widest"
								style={{
									backgroundColor: "rgba(236, 72, 153, 0.15)",
									color: "var(--color-accent-pink)",
									border: "1px solid rgba(236, 72, 153, 0.3)",
									fontFamily: "var(--font-display)",
								}}
							>
								{lobbyIdInput.trim()}
							</code>
						</div>
						<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
							<button
								type="button"
								onClick={() => setShowLobbyOverwriteModal(false)}
								className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
								style={{
									backgroundColor: "rgba(100, 116, 139, 0.25)",
									color: "var(--color-text-primary)",
									border: "1px solid rgba(100, 116, 139, 0.4)",
									fontFamily: "var(--font-display)",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor =
										"rgba(100, 116, 139, 0.45)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor =
										"rgba(100, 116, 139, 0.25)";
								}}
							>
								キャンセル
							</button>
							<button
								type="button"
								onClick={executeSetLobbyId}
								disabled={submittingLobbyId}
								className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
								style={{
									backgroundColor: "rgba(6, 182, 212, 0.2)",
									color: "var(--color-accent-cyan)",
									border: "1px solid rgba(6, 182, 212, 0.4)",
									fontFamily: "var(--font-display)",
								}}
								onMouseEnter={(e) => {
									if (submittingLobbyId) return;
									e.currentTarget.style.backgroundColor =
										"rgba(6, 182, 212, 0.35)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor =
										"rgba(6, 182, 212, 0.2)";
								}}
							>
								{submittingLobbyId ? "処理中..." : "上書きする"}
							</button>
						</div>
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
								ゲーム内でロビーを作成し、8桁のロビーIDを入力してください。ロビーIDは誰でも入力でき、上書きされます。
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
					<div className="pt-2">
						<button
							type="button"
							onClick={handleOpenEndMatchModal}
							className="w-full px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
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

				@keyframes pulse-slow {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.6; }
				}

				@keyframes pulse-glow {
					0%, 100% {
						opacity: 1;
						transform: scale(1);
					}
					50% {
						opacity: 0.85;
						transform: scale(1.02);
					}
				}

				@keyframes slide-in-up {
					from {
						opacity: 0;
						transform: translateY(20px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				@keyframes shimmer {
					0% { transform: translateX(-100%); }
					100% { transform: translateX(200%); }
				}

				.animate-fade-in {
					animation: fade-in 0.6s ease-out;
				}

				.animate-shake {
					animation: shake 0.5s ease-out;
				}

				.animate-pulse-slow {
					animation: pulse-slow 3s ease-in-out infinite;
				}

				.animate-pulse-glow {
					animation: pulse-glow 2s ease-in-out infinite;
				}

				.animate-slide-in-up {
					animation: slide-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1);
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
	onReport: (member: Member) => void;
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
									onClick={() => onReport(member)}
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
