import { QueueSection } from "../queue/components/QueueSection";
import { GameRules } from "./components/GameRules";

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
			<header className="w-full max-w-md mb-8 relative">
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
