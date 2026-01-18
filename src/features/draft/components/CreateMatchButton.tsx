import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMatch } from "../MatchContext";

export function CreateMatchButton() {
	const { createMatch } = useMatch();
	const navigate = useNavigate();
	const [isCreating, setIsCreating] = useState(false);

	const handleCreateMatch = async () => {
		setIsCreating(true);
		try {
			const matchId = await createMatch();
			navigate(`/draft/${matchId}`);
		} catch (err) {
			console.error("Failed to create match:", err);
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<button
			type="button"
			onClick={handleCreateMatch}
			disabled={isCreating}
			className="relative w-full rounded-lg px-6 py-4 font-medium text-slate-100 transition-all disabled:cursor-not-allowed disabled:opacity-50"
			style={{
				backgroundColor: "var(--color-surface)",
				boxShadow:
					"0 0 20px rgba(6, 182, 212, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
			}}
		>
			{isCreating ? (
				<div className="flex items-center justify-center gap-2">
					<div className="w-5 h-5 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin" />
					<span>作成中...</span>
				</div>
			) : (
				"ルームを作成"
			)}
		</button>
	);
}
