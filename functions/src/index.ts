// db.tsで初期化されるため、最初にインポート
import "./lib/db";

import { setGlobalOptions } from "firebase-functions/v2/options";

setGlobalOptions({ region: "asia-northeast1" });

// 全関数をre-export
export {
  runMatchmaking,
  runMatchmakingManual,
  resetQueueAtClose,
} from "./matchmaking";
export { setMatchLobbyId, setSeated, unsetSeated } from "./lobby";
export { submitMatchResult, finalizeMatchesByTimeout } from "./result";
export { onReportCreated } from "./report";
