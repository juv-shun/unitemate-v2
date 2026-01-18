import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useAuth } from "../auth/AuthContext";
import {
	createDraftSession,
	createMatch as createMatchFn,
	joinAsParticipant as joinAsParticipantFn,
	joinAsSpectator as joinAsSpectatorFn,
	leaveMatch as leaveMatchFn,
	subscribeToMatch,
	subscribeToMembers,
	subscribeToDraftSession,
} from "./match";
import type { DraftSession, Match, Member, Team } from "./types";

interface MatchContextType {
	// 状態
	currentMatch: Match | null;
	members: Member[];
	draftSession: DraftSession | null;
	loading: boolean;
	error: string | null;

	// アクション
	createMatch: () => Promise<string>;
	joinAsParticipant: (
		matchId: string,
		team: Team,
		seatNo: number,
	) => Promise<void>;
	joinAsSpectator: (matchId: string) => Promise<void>;
	leaveMatch: () => Promise<void>;
	setCurrentMatchId: (matchId: string | null) => void;

	// 計算プロパティ
	participantCount: number;
	isParticipant: boolean;
	isSpectator: boolean;
	myMember: Member | null;
	firstTeamMembers: Member[];
	secondTeamMembers: Member[];
	isDraftReady: boolean; // 10人揃い
}

const MatchContext = createContext<MatchContextType | null>(null);

interface MatchProviderProps {
	children: ReactNode;
}

export function MatchProvider({ children }: MatchProviderProps) {
	const { user } = useAuth();
	const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
	const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
	const [members, setMembers] = useState<Member[]>([]);
	const [draftSession, setDraftSession] = useState<DraftSession | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// リアルタイム購読
	useEffect(() => {
		if (!currentMatchId) {
			setCurrentMatch(null);
			setMembers([]);
			setDraftSession(null);
			setLoading(false);
			return;
		}

		setLoading(true);
		setError(null);

		const unsubMatch = subscribeToMatch(
			currentMatchId,
			(match) => {
				setCurrentMatch(match);
				setLoading(false);
			},
			(err) => {
				console.error("Match subscription error:", err);
				setError("マッチ情報の取得に失敗しました");
				setLoading(false);
			},
		);

		const unsubMembers = subscribeToMembers(
			currentMatchId,
			(newMembers) => {
				setMembers(newMembers);
			},
			(err) => {
				console.error("Members subscription error:", err);
				setError("参加者情報の取得に失敗しました");
			},
		);

		const unsubDraft = subscribeToDraftSession(
			currentMatchId,
			(session) => {
				setDraftSession(session);
			},
			(err) => {
				console.error("Draft session subscription error:", err);
				setError("ドラフトセッション情報の取得に失敗しました");
			},
		);

		return () => {
			unsubMatch();
			unsubMembers();
			unsubDraft();
		};
	}, [currentMatchId]);

	// 10人揃い判定とdraft_sessions自動生成
	useEffect(() => {
		if (!currentMatch || currentMatch.status !== "waiting") return;

		const participantCount = members.filter(
			(m) => m.role === "participant",
		).length;

		if (participantCount === 10) {
			// 自動でdraft_sessions生成
			createDraftSession(currentMatch.id).catch((err) => {
				console.error("Failed to create draft session:", err);
			});
		}
	}, [members, currentMatch]);

	// アクション
	const createMatch = useCallback(async (): Promise<string> => {
		if (!user) throw new Error("User not authenticated");
		try {
			const matchId = await createMatchFn();
			setCurrentMatchId(matchId);
			return matchId;
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to create match";
			setError(errorMessage);
			throw err;
		}
	}, [user]);

	const joinAsParticipant = useCallback(
		async (matchId: string, team: Team, seatNo: number): Promise<void> => {
			if (!user) throw new Error("User not authenticated");
			try {
				await joinAsParticipantFn(matchId, user.uid, team, seatNo);
				setCurrentMatchId(matchId);
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to join match";
				setError(errorMessage);
				throw err;
			}
		},
		[user],
	);

	const joinAsSpectator = useCallback(
		async (matchId: string): Promise<void> => {
			if (!user) throw new Error("User not authenticated");
			try {
				await joinAsSpectatorFn(matchId, user.uid);
				setCurrentMatchId(matchId);
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to join as spectator";
				setError(errorMessage);
				throw err;
			}
		},
		[user],
	);

	const leaveMatch = useCallback(async (): Promise<void> => {
		if (!user || !currentMatchId) return;
		try {
			await leaveMatchFn(currentMatchId, user.uid);
			setCurrentMatchId(null);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to leave match";
			setError(errorMessage);
			throw err;
		}
	}, [user, currentMatchId]);

	// 計算プロパティ
	const participantCount = useMemo(
		() => members.filter((m) => m.role === "participant").length,
		[members],
	);

	const myMember = useMemo(
		() => members.find((m) => m.user_id === user?.uid) ?? null,
		[members, user],
	);

	const isParticipant = useMemo(
		() => myMember?.role === "participant",
		[myMember],
	);

	const isSpectator = useMemo(
		() => myMember?.role === "spectator",
		[myMember],
	);

	const firstTeamMembers = useMemo(
		() =>
			members
				.filter((m) => m.role === "participant" && m.team === "first")
				.sort((a, b) => (a.seat_no ?? 0) - (b.seat_no ?? 0)),
		[members],
	);

	const secondTeamMembers = useMemo(
		() =>
			members
				.filter((m) => m.role === "participant" && m.team === "second")
				.sort((a, b) => (a.seat_no ?? 0) - (b.seat_no ?? 0)),
		[members],
	);

	const isDraftReady = useMemo(
		() => currentMatch?.status === "draft_pending",
		[currentMatch],
	);

	return (
		<MatchContext.Provider
			value={{
				currentMatch,
				members,
				draftSession,
				loading,
				error,
				createMatch,
				joinAsParticipant,
				joinAsSpectator,
				leaveMatch,
				setCurrentMatchId,
				participantCount,
				isParticipant,
				isSpectator,
				myMember,
				firstTeamMembers,
				secondTeamMembers,
				isDraftReady,
			}}
		>
			{children}
		</MatchContext.Provider>
	);
}

export function useMatch(): MatchContextType {
	const context = useContext(MatchContext);
	if (!context) {
		throw new Error("useMatch must be used within a MatchProvider");
	}
	return context;
}
