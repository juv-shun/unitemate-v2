import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { CreateMatchButton } from "./components/CreateMatchButton";
import { JoinMatchForm } from "./components/JoinMatchForm";
import { MatchLobby } from "./components/MatchLobby";
import { useMatch } from "./MatchContext";

export function DraftSimulationPage() {
	const { matchId } = useParams<{ matchId?: string }>();
	const { setCurrentMatchId } = useMatch();

	// matchIdがある場合はContextに設定
	useEffect(() => {
		if (matchId && matchId !== "undefined") {
			setCurrentMatchId(matchId);
		} else {
			setCurrentMatchId(null);
		}
	}, [matchId, setCurrentMatchId]);

	return (
		<div
			className="min-h-full flex flex-col p-8"
			style={{
				backgroundColor: "var(--color-base)",
				backgroundImage: `
					linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
					linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
				`,
				backgroundSize: "32px 32px",
			}}
		>
			<div className="max-w-5xl w-full mx-auto space-y-6">
				{/* タイトル */}
				<h1
					className="text-3xl font-bold text-center"
					style={{
						fontFamily: "var(--font-display)",
						color: "var(--color-text-primary)",
					}}
				>
					Lobby
				</h1>

				{matchId ? (
					<MatchLobby />
				) : (
					<div className="max-w-md mx-auto space-y-8">
						{/* ルーム作成 */}
						<div className="space-y-3">
							<CreateMatchButton />
						</div>

						{/* 区切り線 */}
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-slate-700" />
							</div>
							<div className="relative flex justify-center text-sm">
								<span
									className="px-4 text-slate-400"
									style={{ backgroundColor: "var(--color-base)" }}
								>
									または
								</span>
							</div>
						</div>

						{/* ルーム参加 */}
						<div className="space-y-3">
							<JoinMatchForm />
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
