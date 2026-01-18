import type { Member, Team } from "../types";
import { useMatch } from "../MatchContext";

interface MemberSlotProps {
	team: Team;
	seatNo: number;
	member: Member | null;
}

export function MemberSlot({ team, seatNo, member }: MemberSlotProps) {
	const { joinAsParticipant, myMember, currentMatch } = useMatch();

	const handleJoin = async () => {
		if (!currentMatch || myMember || !currentMatch.id) return;
		try {
			await joinAsParticipant(currentMatch.id, team, seatNo);
		} catch (err) {
			console.error("Failed to join:", err);
		}
	};

	const canJoin =
		!member &&
		!myMember &&
		currentMatch?.status === "waiting";

	if (member) {
		return (
			<div
				className="rounded-lg p-3 text-sm"
				style={{
					backgroundColor: "var(--color-surface)",
					border: "1px solid rgba(148, 163, 184, 0.2)",
				}}
			>
				<div className="flex items-center gap-2">
					{member.photo_url ? (
						<img
							src={member.photo_url}
							alt={member.display_name || "User"}
							className="w-8 h-8 rounded-full"
						/>
					) : (
						<div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs">
							{member.display_name?.charAt(0) || "?"}
						</div>
					)}
					<span className="text-slate-100 font-medium">
						{member.display_name || "匿名ユーザー"}
					</span>
				</div>
			</div>
		);
	}

	if (canJoin) {
		return (
			<button
				type="button"
				onClick={handleJoin}
				className="w-full rounded-lg p-3 text-sm text-slate-400 border border-dashed border-slate-600 hover:border-cyan-500 hover:text-cyan-400 transition-all"
			>
				[空席] - クリックして参加
			</button>
		);
	}

	return (
		<div
			className="rounded-lg p-3 text-sm text-slate-500"
			style={{
				backgroundColor: "var(--color-surface)",
				border: "1px solid rgba(148, 163, 184, 0.1)",
			}}
		>
			[空席]
		</div>
	);
}
