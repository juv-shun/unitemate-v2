import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getUserProfile, updateDisplayName } from "../auth/user";

export function MyPage() {
	const { user } = useAuth();
	const [displayName, setDisplayName] = useState("");
	const [photoUrl, setPhotoUrl] = useState<string | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (user) {
			getUserProfile(user.uid).then((data) => {
				if (data?.display_name) {
					setDisplayName(data.display_name);
				}
				setPhotoUrl(data?.photo_url ?? null);
				setLoading(false);
			});
		}
	}, [user]);

	const handleUpdate = async () => {
		if (user && displayName.trim()) {
			await updateDisplayName(user.uid, displayName);
			setIsEditing(false);
		}
	};

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
					マイページ
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
				{/* プロフィールセクション */}
				<section className="p-6">
					<h2
						className="text-xs font-semibold tracking-wider mb-4"
						style={{
							fontFamily: "var(--font-display)",
							color: "var(--color-text-secondary)",
						}}
					>
						PROFILE
					</h2>

					<div className="flex items-center gap-4">
						{/* アバター */}
						{photoUrl ? (
							<img
								src={photoUrl}
								alt={displayName || "User"}
								className="w-14 h-14 rounded-lg object-cover shrink-0"
								style={{
									border: "1px solid rgba(245, 158, 11, 0.3)",
								}}
							/>
						) : (
							<div
								className="w-14 h-14 rounded-lg flex items-center justify-center text-xl font-bold shrink-0"
								style={{
									backgroundColor: "var(--color-surface-elevated)",
									fontFamily: "var(--font-display)",
									color: "var(--color-accent-amber)",
									border: "1px solid rgba(245, 158, 11, 0.3)",
								}}
							>
								{displayName.charAt(0).toUpperCase()}
							</div>
						)}

						{/* ユーザー情報 */}
						<div className="flex-1 min-w-0">
							{isEditing ? (
								<div className="flex flex-col gap-2">
									<input
										type="text"
										value={displayName}
										onChange={(e) => setDisplayName(e.target.value)}
										className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-1"
										style={{
											backgroundColor: "var(--color-surface-elevated)",
											color: "var(--color-text-primary)",
											border: "1px solid var(--color-accent-cyan)",
										}}
									/>
									<div className="flex gap-2 justify-end">
										<button
											type="button"
											onClick={() => setIsEditing(false)}
											className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
											style={{
												color: "var(--color-text-secondary)",
												border: "1px solid var(--color-text-secondary)",
											}}
										>
											キャンセル
										</button>
										<button
											type="button"
											onClick={handleUpdate}
											className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
											style={{
												backgroundColor: "var(--color-accent-cyan)",
												color: "var(--color-base)",
											}}
										>
											保存
										</button>
									</div>
								</div>
							) : (
								<>
									<h3
										className="text-xl font-semibold truncate"
										style={{
											fontFamily: "var(--font-display)",
											color: "var(--color-text-primary)",
										}}
									>
										{displayName}
									</h3>
									<p
										className="text-sm truncate"
										style={{ color: "var(--color-text-secondary)" }}
									>
										{user?.email}
									</p>
									<button
										type="button"
										onClick={() => setIsEditing(true)}
										className="mt-1 text-xs font-medium transition-colors hover:underline"
										style={{ color: "var(--color-accent-cyan)" }}
									>
										表示名を編集
									</button>
								</>
							)}
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
