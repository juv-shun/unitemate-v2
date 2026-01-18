import type { Member, Team } from "../types";
import { MemberSlot } from "./MemberSlot";

interface TeamPanelProps {
	team: Team;
	members: Member[];
	title: string;
}

export function TeamPanel({ team, members, title }: TeamPanelProps) {
	const getMemberBySeatNo = (seatNo: number): Member | null => {
		return members.find((m) => m.seat_no === seatNo) || null;
	};

	return (
		<div
			className="rounded-lg p-4 space-y-3"
			style={{
				backgroundColor: "var(--color-surface)",
				boxShadow:
					"0 0 20px rgba(6, 182, 212, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
			}}
		>
			<h3 className="text-lg font-semibold text-slate-100 text-center">
				{title}
			</h3>
			<div className="space-y-2">
				{[1, 2, 3, 4, 5].map((seatNo) => (
					<div key={seatNo} className="flex items-center gap-2">
						<span className="text-sm text-slate-400 w-6">{seatNo}.</span>
						<div className="flex-1">
							<MemberSlot
								team={team}
								seatNo={seatNo}
								member={getMemberBySeatNo(seatNo)}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
