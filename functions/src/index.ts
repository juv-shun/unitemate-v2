// db.tsで初期化されるため、最初にインポート
import "./lib/db.js";

import { setGlobalOptions } from "firebase-functions/v2/options";

setGlobalOptions({ region: "asia-northeast1" });

// 全関数をre-export
export {
  runMatchmaking,
  runMatchmakingManual,
  resetQueueAtClose,
} from "./matchmaking/index.js";
export { setMatchLobbyId, setSeated, unsetSeated } from "./lobby/index.js";
export { submitMatchResult, finalizeMatchesByTimeout } from "./result/index.js";
export { onReportCreated } from "./report/index.js";
