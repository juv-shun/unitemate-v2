export function StatsPage() {
	return (
		<div
			className="min-h-full flex flex-col items-center justify-center p-8"
			style={{
				backgroundColor: "var(--color-base)",
				backgroundImage: `
					linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
					linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
				`,
				backgroundSize: "32px 32px",
			}}
		>
			<div
				className="max-w-md w-full rounded-xl p-8 text-center"
				style={{
					backgroundColor: "var(--color-surface)",
					boxShadow:
						"0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
				}}
			>
				{/* アイコン */}
				<div
					className="w-16 h-16 mx-auto mb-6 rounded-xl flex items-center justify-center"
					style={{
						backgroundColor: "var(--color-surface-elevated)",
						border: "1px solid rgba(6, 182, 212, 0.3)",
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
						style={{ color: "var(--color-accent-cyan)" }}
					>
						<title>統計</title>
						<line x1="18" y1="20" x2="18" y2="10" />
						<line x1="12" y1="20" x2="12" y2="4" />
						<line x1="6" y1="20" x2="6" y2="14" />
					</svg>
				</div>

				{/* タイトル */}
				<h1
					className="text-2xl font-bold mb-3"
					style={{
						fontFamily: "var(--font-display)",
						color: "var(--color-text-primary)",
					}}
				>
					統計
				</h1>

				{/* 説明 */}
				<p
					className="text-sm mb-6"
					style={{ color: "var(--color-text-secondary)" }}
				>
					試合統計・分析機能は現在開発中です。
				</p>

				{/* ステータスバッジ */}
				<div
					className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
					style={{
						backgroundColor: "var(--color-surface-elevated)",
						color: "var(--color-accent-amber)",
						border: "1px solid rgba(245, 158, 11, 0.3)",
						fontFamily: "var(--font-display)",
					}}
				>
					<span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
					COMING SOON
				</div>
			</div>
		</div>
	);
}
