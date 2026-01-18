import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { completeOnboarding } from "../auth/user";

export function OnboardingPage() {
	const { user } = useAuth();
	const [displayName, setDisplayName] = useState("");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		const trimmedName = displayName.trim();
		if (!trimmedName) {
			setError("ユーザー名を入力してください");
			return;
		}
		if (trimmedName.length < 2) {
			setError("ユーザー名は2文字以上で入力してください");
			return;
		}
		if (trimmedName.length > 20) {
			setError("ユーザー名は20文字以内で入力してください");
			return;
		}

		if (!user) return;

		setIsSubmitting(true);
		try {
			await completeOnboarding(user.uid, trimmedName);
			// ProtectedRouteのキャッシュをバイパスするため、ページをリロード
			window.location.href = "/";
		} catch {
			setError("エラーが発生しました。もう一度お試しください。");
			setIsSubmitting(false);
		}
	};

	return (
		<div
			className="min-h-screen flex flex-col items-center justify-center py-12 px-4"
			style={{
				backgroundColor: "var(--color-base)",
				backgroundImage: `
          linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
        `,
				backgroundSize: "32px 32px",
			}}
		>
			{/* Header */}
			<header className="mb-8">
				<h1
					className="text-2xl font-bold tracking-widest text-center"
					style={{
						fontFamily: "var(--font-display)",
						color: "var(--color-accent-cyan)",
					}}
				>
					UNITEMATE
				</h1>
			</header>

			{/* Main Card */}
			<main
				className="max-w-md w-full rounded-xl overflow-hidden p-8"
				style={{
					backgroundColor: "var(--color-surface)",
					boxShadow:
						"0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
				}}
			>
				<h2
					className="text-xl font-semibold mb-2 text-center"
					style={{
						fontFamily: "var(--font-display)",
						color: "var(--color-text-primary)",
					}}
				>
					ようこそ！
				</h2>

				<p
					className="text-sm mb-6 text-center"
					style={{ color: "var(--color-text-secondary)" }}
				>
					ゲーム内のユーザー名を入力してください
				</p>

				{/* Warning Box */}
				<div
					className="mb-6 p-4 rounded-lg text-sm flex items-start gap-3"
					style={{
						backgroundColor: "rgba(245, 158, 11, 0.1)",
						border: "1px solid rgba(245, 158, 11, 0.3)",
					}}
				>
					<span
						className="text-lg shrink-0"
						style={{ color: "var(--color-accent-amber)" }}
					>
						⚠️
					</span>
					<p style={{ color: "var(--color-text-secondary)" }}>
						ポケモンユナイトで使用している名前と一致させてください
					</p>
				</div>

				<form onSubmit={handleSubmit}>
					<input
						type="text"
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
						placeholder="ユーザー名"
						className="w-full px-4 py-3 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 transition-all"
						style={{
							backgroundColor: "var(--color-surface-elevated)",
							color: "var(--color-text-primary)",
							border: "1px solid transparent",
							// @ts-expect-error CSS variable for focus ring
							"--tw-ring-color": "var(--color-accent-cyan)",
						}}
						disabled={isSubmitting}
					/>

					{error && (
						<p
							className="text-sm mb-4"
							style={{ color: "var(--color-danger)" }}
						>
							{error}
						</p>
					)}

					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full py-3 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 hover:brightness-110"
						style={{
							fontFamily: "var(--font-display)",
							backgroundColor: "var(--color-accent-cyan)",
							color: "var(--color-base)",
						}}
					>
						{isSubmitting ? "処理中..." : "始める"}
					</button>
				</form>
			</main>
		</div>
	);
}
