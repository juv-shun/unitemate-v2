import { QueueSection } from "../queue/components/QueueSection";

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
			<header className="w-full max-w-md mb-8">
				<h1
					className="text-xl font-bold tracking-wider"
					style={{
						fontFamily: "var(--font-display)",
						color: "var(--color-text-primary)",
					}}
				>
					MATCHMAKING
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
				{/* キューセクション */}
				<section className="p-6">
					<QueueSection />
				</section>
			</main>
		</div>
	);
}
