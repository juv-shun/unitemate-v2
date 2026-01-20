// ドラフトマッチ機能の型定義

// ステータス型
export type MatchStatus =
	| "waiting" // 参加者募集中
	| "draft_pending" // 10人揃い、ドラフト待機
	| "drafting" // ドラフト中
	| "lobby_pending" // ロビー入力待ち
	| "completed" // 完了
	| "invalid"; // 無効

export type DraftSessionStatus = "waiting" | "in_progress" | "completed";

export type MemberRole = "participant" | "spectator";

export type Team = "first" | "second";

export type ActionType = "ban" | "pick";

export type MatchResult = "win" | "loss" | "invalid";

// Match型（試合/ルーム）
export interface Match {
	id: string;
	phase: "phase1" | "phase2";
	source_type: "manual" | "auto";
	status: MatchStatus;
	capacity: 10;
	auto_start: true;
	first_team?: Team;
	lobby_id?: string; // 8桁数字（先頭0許可）
	lobby_updated_at?: Date; // ロビーID更新時刻
	final_result?: "first_win" | "second_win" | "invalid"; // 結果確定
	finalized_at?: Date; // 結果確定時刻
	finalized_reason?: "threshold" | "timeout"; // 確定理由
	created_at: Date;
	updated_at: Date;
}

// Member型（サブコレクション: matches/{matchId}/members）
export interface Member {
	id: string;
	user_id: string;
	role: MemberRole;
	team?: Team; // participantのみ
	seat_no?: number; // 1-5、participantのみ
	joined_at: Date;
	seated_at?: Date | null; // 着席時刻（nullは未着席）
	lobby_issue?: boolean; // 困り中フラグ
	lobby_issue_at?: Date | null; // 困り中設定時刻
	match_result?: MatchResult | null; // 試合結果（未入力はnull）
	match_left_at?: Date | null; // 退席時刻（未入力はnull）
	// 表示用（usersコレクションからjoin）
	display_name?: string;
	photo_url?: string;
}

// DraftSession型
export interface DraftSession {
	id: string;
	source_type: "match";
	match_id: string;
	status: DraftSessionStatus;
	started_at?: Date;
	completed_at?: Date;
	expires_at: Date; // 20日
	created_at: Date;
}

// Turn型（サブコレクション: draft_sessions/{draftId}/turns）
export interface Turn {
	id: string;
	turn_no: number;
	action_type: ActionType;
	team: Team;
	slot_no: number;
	assignee_user_id: string;
	deadline_at?: Date;
	started_at?: Date;
	completed_at?: Date;
}

// Context用の状態型
export interface MatchState {
	currentMatch: Match | null;
	members: Member[];
	draftSession: DraftSession | null;
	loading: boolean;
	error: string | null;
}

// ルーム作成用入力（将来拡張用に型定義）
export interface CreateMatchInput {
	// phase1固定、source_type=manual固定
	// 将来的に拡張可能
}

// Report型（通報）

// 通報理由の型
export type ReportReason = "no_show" | "troll" | "other";

export interface Report {
	id: string;
	match_id: string;
	reporter_user_id: string;
	reported_user_id: string;
	reason: ReportReason;
	reason_detail?: string;
	match_created_at: Date;
	reported_at: Date;
	screenshot_url?: string;
}
