import { useMatch } from "../MatchContext";
import type { Member, Team } from "../types";

interface MemberSlotProps {
	team: Team;
	seatNo: number;
	member: Member | null;
}

export function MemberSlot({ team, seatNo, member }: MemberSlotProps) {
	const { joinAsParticipant, changeSeat, myMember, currentMatch } = useMatch();

	const handleJoin = async () => {
		if (!currentMatch || myMember || !currentMatch.id) return;
		try {
			await joinAsParticipant(currentMatch.id, team, seatNo);
		} catch (err) {
			console.error("Failed to join:", err);
		}
	};

	const handleMove = async () => {
		if (!currentMatch || !myMember || currentMatch.status !== "waiting") return;
		try {
			await changeSeat(team, seatNo);
		} catch (err) {
			console.error("Failed to move seat:", err);
		}
	};

	// 自分の席かどうか
	const isMySlot =
		myMember?.role === "participant" &&
		myMember?.team === team &&
		myMember?.seat_no === seatNo;

	// 参加可能: 席が空き && 自分が未参加 && status=waiting
	const canJoin = !member && !myMember && currentMatch?.status === "waiting";

	// 移動可能: 席が空き && 自分が参加済み && status=waiting && 自分の席ではない
	const canMove =
		!member &&
		myMember?.role === "participant" &&
		currentMatch?.status === "waiting" &&
		!isMySlot;

	// 自分の席 → 枠線を強調 + "(自分)"ラベル
	if (member && isMySlot) {
		return (
			<div
				className="rounded-lg p-3 text-sm ring-2 ring-cyan-500"
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
					<span className="text-cyan-400 text-xs ml-auto">(自分)</span>
				</div>
			</div>
		);
	}

	// 他のメンバーの席 → 通常表示
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

	// 空席（参加可能）→ "クリックして参加"
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

	// 空席（移動可能）→ "クリックして移動"
	if (canMove) {
		return (
			<button
				type="button"
				onClick={handleMove}
				className="w-full rounded-lg p-3 text-sm text-slate-400 border border-dashed border-slate-600 hover:border-amber-500 hover:text-amber-400 transition-all"
			>
				[空席] - クリックして移動
			</button>
		);
	}

	// 空席（操作不可）→ グレーアウト
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
