import { QueueSection } from "../queue/components/QueueSection";
import { GameRules } from "./components/GameRules";

function XIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="currentColor"
			className="w-5 h-5"
			aria-hidden="true"
		>
			<title>X</title>
			<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
		</svg>
	);
}

function ShareToXButton() {
	const handleShare = () => {
		const shareText = "V-ARENAでマッチング待機中。一緒にやりましょう！ #Ｖアリ";
		const shareUrl = "https://v-arena.com";
		const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

		window.open(
			intentUrl,
			"_blank",
			"width=550,height=420,noopener,noreferrer",
		);
	};

	return (
		<button
			type="button"
			onClick={handleShare}
			className="group relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 overflow-hidden"
			style={{
				fontFamily: "var(--font-display)",
				color: "var(--color-text-secondary)",
				backgroundColor: "transparent",
				border: "1px solid rgba(100, 116, 139, 0.3)",
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.color = "var(--color-text-primary)";
				e.currentTarget.style.borderColor = "var(--color-accent-cyan)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.color = "var(--color-text-secondary)";
				e.currentTarget.style.borderColor = "rgba(100, 116, 139, 0.3)";
			}}
			aria-label="Xでシェア"
		>
			{/* Hover glow effect */}
			<div
				className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
				style={{
					background:
						"radial-gradient(ellipse at center, rgba(6, 182, 212, 0.1) 0%, transparent 70%)",
				}}
			/>
			<span className="relative z-10">
				<XIcon />
			</span>
			<span className="relative z-10 text-xs font-medium tracking-wide hidden sm:inline">
				シェア
			</span>
		</button>
	);
}

export function HomePage() {
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
			<header className="w-full max-w-md mb-8 relative flex items-center justify-between">
				<div className="relative">
					<div
						className="inline-block relative px-4 py-2"
						style={{
							background:
								"linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(236, 72, 153, 0.1) 100%)",
							clipPath:
								"polygon(0 0, calc(100% - 12px) 0, 100% 100%, 12px 100%)",
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
							Matchmaking
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
				</div>
				<ShareToXButton />
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
				{/* キューセクション */}
				<section className="p-6">
					<QueueSection />
				</section>

				{/* ゲームルールセクション */}
				<GameRules />
			</main>
		</div>
	);
}
