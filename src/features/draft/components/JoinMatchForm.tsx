import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function JoinMatchForm() {
	const [matchId, setMatchId] = useState("");
	const navigate = useNavigate();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (matchId.trim()) {
			navigate(`/lobby/${matchId.trim()}`);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-3">
			<label htmlFor="matchId" className="block text-sm font-medium text-slate-300">
				ルームIDを入力して参加
			</label>
			<div className="flex gap-2">
				<input
					type="text"
					id="matchId"
					value={matchId}
					onChange={(e) => setMatchId(e.target.value)}
					placeholder="ルームIDを入力"
					className="flex-1 rounded-lg px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
					style={{
						backgroundColor: "var(--color-surface)",
						border: "1px solid rgba(148, 163, 184, 0.2)",
					}}
				/>
				<button
					type="submit"
					disabled={!matchId.trim()}
					className="rounded-lg px-6 py-2 font-medium text-slate-100 transition-all disabled:cursor-not-allowed disabled:opacity-50"
					style={{
						backgroundColor: "var(--color-accent-cyan)",
						boxShadow: "0 0 10px rgba(6, 182, 212, 0.3)",
					}}
				>
					参加
				</button>
			</div>
		</form>
	);
}
