Phase2 results finalization + MyPage stats implemented.

Backend (functions/src/index.ts):
- Added shared result finalization flow: tallyMatchResults, decideFinalResult, finalizeMatch.
- submitMatchResult Callable: validates, updates member.match_result/match_left_at, then attempts finalizeMatch (threshold=7).
- finalizeMatchesByTimeout scheduled every 1 minute: finds matches status=lobby_pending with created_at<=now-40m and finalizes (reason=timeout).
- finalization writes matches.status=completed + final_result (first_win/second_win/invalid) + finalized_at + finalized_reason.
- user stats update on finalize: users.total_matches, total_wins, recent_results (limit 20). recent_results now stores {match_id, result, matched_at} where matched_at = matches.created_at; prevents duplicate by match_id.

Frontend:
- submitMatchResult used in src/features/draft/match.ts leaveMatch (Callable) and MatchContext leaveMatch signature updated.
- MyPage now shows MATCHES / WINS / WIN RATE plus recent results list (WIN/LOSE/INVALID), colored, and matched_at formatted to minute precision.
- email display removed; users email no longer stored.

Types/docs:
- users schema: add total_matches, total_wins, recent_results; is_onboarded description updated; email removed.
- matches schema: status only waiting/lobby_pending/completed with transition timing; added final_result/finalized_at/finalized_reason.
- members: match_result + match_left_at.
- requirements_phase2.md has 7-vote threshold + 40-min timeout + tie->invalid.

Notes:
- Status flow: waiting -> lobby_pending -> completed.
- recent_results field name is matched_at (not decided_at).
- storage of member records on leave remains (no delete).