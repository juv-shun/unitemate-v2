import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../../firebase";

type RankedPlayer = {
	id: string;
	display_name: string;
	photo_url: string | null;
	rating: number;
	total_matches: number;
};

// 上位3名のアクセントカラー
const RANK_COLORS: Record<number, { primary: string; glow: string }> = {
	1: { primary: "#ffd700", glow: "rgba(255, 215, 0, 0.4)" }, // 金
	2: { primary: "#c0c0c0", glow: "rgba(192, 192, 192, 0.4)" }, // 銀
	3: { primary: "#cd7f32", glow: "rgba(205, 127, 50, 0.4)" }, // 銅
};

export function RankingPage() {
	const [players, setPlayers] = useState<RankedPlayer[]>([]);
	const [loading, setLoading] = useState(true);
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const fetchRanking = async () => {
			const q = query(
				collection(db, "users"),
				orderBy("rating", "desc"),
				orderBy("total_matches", "desc"),
				limit(50),
			);

			const snapshot = await getDocs(q);
			const rankedPlayers: RankedPlayer[] = snapshot.docs.map((doc) => {
				const data = doc.data();
				return {
					id: doc.id,
					display_name: data.display_name || "Unknown",
					photo_url: data.photo_url || null,
					rating:
						typeof data.rating === "number" ? Math.round(data.rating) : 1600,
					total_matches:
						typeof data.total_matches === "number" ? data.total_matches : 0,
				};
			});

			setPlayers(rankedPlayers);
			setLoading(false);
		};

		fetchRanking();
	}, []);

	useEffect(() => {
		if (!loading) {
			const timer = setTimeout(() => setIsVisible(true), 100);
			return () => clearTimeout(timer);
		}
	}, [loading]);

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
				className="w-full max-w-2xl mb-8 relative"
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
						Ranking
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
				className="max-w-2xl w-full rounded-xl overflow-hidden relative"
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

				{/* ランキングリスト */}
				<section className="p-6 relative">
					<h2
						className="text-xs font-semibold tracking-[0.2em] mb-4 uppercase"
						style={{
							fontFamily: "var(--font-display)",
							color: "var(--color-accent-cyan)",
							textShadow: "0 0 10px rgba(6, 182, 212, 0.3)",
						}}
					>
						Top 50 Players
					</h2>

					{players.length === 0 ? (
						<div
							className="text-center py-12"
							style={{ color: "var(--color-text-secondary)" }}
						>
							<div
								className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
								style={{
									backgroundColor: "rgba(15, 23, 42, 0.45)",
									border: "1px solid rgba(6, 182, 212, 0.2)",
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="w-8 h-8"
									style={{ color: "var(--color-text-secondary)" }}
								>
									<title>ランキング</title>
									<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
									<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
									<path d="M4 22h16" />
									<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
									<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
									<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
								</svg>
							</div>
							<p className="text-sm">ランキングデータがありません</p>
						</div>
					) : (
						<ul className="space-y-2">
							{players.map((player, index) => {
								const rank = index + 1;
								const rankColor = RANK_COLORS[rank];
								const isTopThree = rank <= 3;

								return (
									<li
										key={player.id}
										className="group relative flex items-center gap-4 rounded-lg px-4 py-3 transition-all duration-300 hover:scale-[1.02]"
										style={{
											backgroundColor: "rgba(15, 23, 42, 0.45)",
											border: isTopThree
												? `1px solid ${rankColor.primary}40`
												: "1px solid rgba(6, 182, 212, 0.15)",
											clipPath:
												"polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
											animation: isVisible
												? `slideInFromLeft 0.4s ease-out ${0.1 + index * 0.02}s both`
												: "none",
										}}
									>
										{/* Hover glow effect */}
										<div
											className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
											style={{
												background: isTopThree
													? `radial-gradient(circle at left, ${rankColor.glow} 0%, transparent 70%)`
													: "radial-gradient(circle at left, rgba(6, 182, 212, 0.1) 0%, transparent 70%)",
												boxShadow: isTopThree
													? `inset 0 0 15px ${rankColor.glow}`
													: "inset 0 0 15px rgba(6, 182, 212, 0.1)",
											}}
										/>

										{/* 順位 */}
										<div
											className="w-8 text-center font-bold text-lg relative z-10 transition-all duration-300 group-hover:scale-110"
											style={{
												fontFamily: "var(--font-display)",
												color: isTopThree
													? rankColor.primary
													: "var(--color-text-secondary)",
												textShadow: isTopThree
													? `0 0 10px ${rankColor.glow}`
													: "none",
											}}
										>
											{rank}
										</div>

										{/* アバター - 八角形スタイル */}
										<div
											className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
											style={{
												background: isTopThree
													? `linear-gradient(135deg, ${rankColor.primary}40 0%, ${rankColor.primary}20 100%)`
													: "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%)",
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
												{player.photo_url ? (
													<img
														src={player.photo_url}
														alt={player.display_name}
														className="w-full h-full object-cover"
													/>
												) : (
													<span
														className="text-sm font-bold"
														style={{
															fontFamily: "var(--font-display)",
															color: isTopThree
																? rankColor.primary
																: "var(--color-accent-amber)",
														}}
													>
														{player.display_name.charAt(0).toUpperCase()}
													</span>
												)}
											</div>
										</div>

										{/* ユーザー名 */}
										<div className="flex-1 min-w-0 relative z-10">
											<span
												className="text-sm font-semibold truncate block"
												style={{
													fontFamily: "var(--font-display)",
													color: "var(--color-text-primary)",
												}}
											>
												{player.display_name}
											</span>
										</div>

										{/* レーティング */}
										<div
											className="text-lg font-bold tabular-nums relative z-10 transition-all duration-300 group-hover:scale-105"
											style={{
												fontFamily: "var(--font-display)",
												color: isTopThree
													? rankColor.primary
													: "var(--color-text-primary)",
												textShadow: isTopThree
													? `0 0 10px ${rankColor.glow}`
													: "0 0 10px rgba(6, 182, 212, 0.2)",
											}}
										>
											{player.rating}
										</div>

										{/* 試合数 */}
										<div
											className="text-xs relative z-10 w-16 text-right"
											style={{ color: "var(--color-text-secondary)" }}
										>
											{player.total_matches}試合
										</div>
									</li>
								);
							})}
						</ul>
					)}
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
			`}</style>
		</div>
	);
}
