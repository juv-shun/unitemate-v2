import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useAuth } from "../auth/AuthContext";
import {
	changeSeat as changeSeatFn,
	createDraftSession,
	createMatch as createMatchFn,
	createReport as createReportFn,
	joinAsParticipant as joinAsParticipantFn,
	joinAsSpectator as joinAsSpectatorFn,
	leaveMatch as leaveMatchFn,
	setLobbyId as setLobbyIdFn,
	setLobbyIssue as setLobbyIssueFn,
	setSeated as setSeatedFn,
	subscribeToDraftSession,
	subscribeToMatch,
	subscribeToMembers,
	unsetLobbyIssue as unsetLobbyIssueFn,
	unsetSeated as unsetSeatedFn,
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
	changeSeat: (newTeam: Team, newSeatNo: number) => Promise<void>;
	setCurrentMatchId: (matchId: string | null) => void;
	
	// ロビー共有アクション（フェーズ1）
	setLobbyId: (lobbyId: string) => Promise<{ transitionedToInGame: boolean }>;
	setSeated: () => Promise<{ transitionedToInGame: boolean }>;
	unsetSeated: () => Promise<void>;
	setLobbyIssue: () => Promise<void>;
	unsetLobbyIssue: () => Promise<void>;
	createReport: (reportedUserId: string) => Promise<void>;

	// 計算プロパティ
	participantCount: number;
	isParticipant: boolean;
	isSpectator: boolean;
	myMember: Member | null;
	firstTeamMembers: Member[];
	secondTeamMembers: Member[];
	isDraftReady: boolean; // 10人揃い
	isAllSeated: boolean; // 全員着席
	isLobbyReady: boolean; // ロビーID設定済み & 全員着席
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

	const changeSeat = useCallback(
		async (newTeam: Team, newSeatNo: number): Promise<void> => {
			if (!user || !currentMatchId)
				throw new Error("User not authenticated or no match");
			try {
				await changeSeatFn(currentMatchId, user.uid, newTeam, newSeatNo);
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to change seat";
				setError(errorMessage);
				throw err;
			}
		},
		[user, currentMatchId],
	);

	// ロビー共有アクション（フェーズ1）
	const setLobbyId = useCallback(
		async (lobbyId: string): Promise<{ transitionedToInGame: boolean }> => {
			if (!currentMatchId) throw new Error("No match selected");
			try {
				const result = await setLobbyIdFn(currentMatchId, lobbyId);
				return { transitionedToInGame: result.transitionedToInGame };
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to set lobby ID";
				setError(errorMessage);
				throw err;
			}
		},
		[currentMatchId],
	);

	const setSeated = useCallback(
		async (): Promise<{ transitionedToInGame: boolean }> => {
			if (!currentMatchId) throw new Error("No match selected");
			try {
				const result = await setSeatedFn(currentMatchId);
				return { transitionedToInGame: result.transitionedToInGame };
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to set seated";
				setError(errorMessage);
				throw err;
			}
		},
		[currentMatchId],
	);

	const unsetSeated = useCallback(async (): Promise<void> => {
		if (!currentMatchId) throw new Error("No match selected");
		try {
			await unsetSeatedFn(currentMatchId);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to unset seated";
			setError(errorMessage);
			throw err;
		}
	}, [currentMatchId]);

	const setLobbyIssue = useCallback(async (): Promise<void> => {
		if (!user || !currentMatchId) throw new Error("User not authenticated");
		try {
			await setLobbyIssueFn(currentMatchId, user.uid);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to set lobby issue";
			setError(errorMessage);
			throw err;
		}
	}, [user, currentMatchId]);

	const unsetLobbyIssue = useCallback(async (): Promise<void> => {
		if (!user || !currentMatchId) throw new Error("User not authenticated");
		try {
			await unsetLobbyIssueFn(currentMatchId, user.uid);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to unset lobby issue";
			setError(errorMessage);
			throw err;
		}
	}, [user, currentMatchId]);

	const createReport = useCallback(
		async (reportedUserId: string): Promise<void> => {
			if (!user || !currentMatchId || !currentMatch)
				throw new Error("Invalid state");
			try {
				await createReportFn(
					currentMatchId,
					user.uid,
					reportedUserId,
					currentMatch.created_at,
				);
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to create report";
				setError(errorMessage);
				throw err;
			}
		},
		[user, currentMatchId, currentMatch],
	);

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

	const isSpectator = useMemo(() => myMember?.role === "spectator", [myMember]);

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

	const isAllSeated = useMemo(() => {
		const participants = members.filter((m) => m.role === "participant");
		return (
			participants.length === 10 &&
			participants.every((m) => m.seated_at != null)
		);
	}, [members]);

	const isLobbyReady = useMemo(() => {
		return currentMatch?.lobby_id != null && isAllSeated;
	}, [currentMatch, isAllSeated]);

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
				changeSeat,
				setCurrentMatchId,
				setLobbyId,
				setSeated,
				unsetSeated,
				setLobbyIssue,
				unsetLobbyIssue,
				createReport,
				participantCount,
				isParticipant,
				isSpectator,
				myMember,
				firstTeamMembers,
				secondTeamMembers,
				isDraftReady,
				isAllSeated,
				isLobbyReady,
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
