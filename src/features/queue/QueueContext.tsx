import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  cancelQueue as cancelQueueFn,
  isQueueClosedAt,
  type QueueData,
  startQueue as startQueueFn,
  subscribeToQueueStatus,
} from "./queue";
import type { QueueStatus } from "./types";

interface QueueContextType {
  queueStatus: QueueStatus;
  queueJoinedAt: Date | null;
  matchedMatchId: string | null;
  queueLoading: boolean;
  bannedUntil: Date | null;
  isBanned: boolean;
  remainingBanTime: number | null;
  startQueue: () => Promise<void>;
  cancelQueue: () => Promise<void>;
}

const QueueContext = createContext<QueueContextType | null>(null);

interface QueueProviderProps {
  children: ReactNode;
}

export function QueueProvider({ children }: QueueProviderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [queueStatus, setQueueStatus] = useState<QueueStatus>(null);
  const [queueJoinedAt, setQueueJoinedAt] = useState<Date | null>(null);
  const [matchedMatchId, setMatchedMatchId] = useState<string | null>(null);
  const [bannedUntil, setBannedUntil] = useState<Date | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setQueueStatus(null);
      setQueueJoinedAt(null);
      setMatchedMatchId(null);
      setBannedUntil(null);
      setQueueLoading(false);
      return;
    }

    setQueueLoading(true);
    const unsubscribe = subscribeToQueueStatus(user.uid, (data: QueueData) => {
      setQueueStatus(data.status);
      setQueueJoinedAt(data.joinedAt);
      setMatchedMatchId(data.matchedMatchId);
      setBannedUntil(data.bannedUntil);
      setQueueLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const prevQueueStatus = useRef(queueStatus);

  useEffect(() => {
    const justMatched =
      prevQueueStatus.current !== "matched" && queueStatus === "matched";
    const isHomePage = location.pathname === "/";

    // Update ref for next render
    prevQueueStatus.current = queueStatus;

    if (queueStatus !== "matched" || !matchedMatchId) return;

    if (justMatched || isHomePage) {
      const targetPath = `/lobby/${matchedMatchId}`;
      if (location.pathname !== targetPath) {
        navigate(targetPath, { replace: true });
      }
    }
  }, [queueStatus, matchedMatchId, location.pathname, navigate]);

  const isBanned = useMemo(() => {
    if (!bannedUntil) return false;

    return bannedUntil.getTime() > Date.now();
  }, [bannedUntil]);

  const remainingBanTime = useMemo(() => {
    if (!bannedUntil || !isBanned) return null;
    return bannedUntil.getTime() - Date.now();
  }, [bannedUntil, isBanned]);

  const startQueue = useCallback(async () => {
    if (!user) return;
    if (isQueueClosedAt(new Date())) {
      throw new Error("現在はマッチング受付時間外です");
    }
    if (isBanned) {
      throw new Error("ペナルティ中のため、マッチングに参加できません");
    }
    await startQueueFn(user.uid);
  }, [user, isBanned]);

  const cancelQueue = useCallback(async () => {
    if (!user) return;
    await cancelQueueFn(user.uid);
  }, [user]);

  // 最新のqueueStatusをRefで保持（cleanup関数内で参照するため）
  const latestQueueStatus = useRef(queueStatus);
  useEffect(() => {
    latestQueueStatus.current = queueStatus;
  }, [queueStatus]);

  // ページ離脱/アプリ終了時の処理
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (latestQueueStatus.current === "waiting") {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // アンマウント時（リロード、閉じる、ログアウト等）に待機中ならキャンセル試行
      // 注意: ブラウザ終了時の非同期処理は保証されない
      if (latestQueueStatus.current === "waiting") {
        cancelQueue().catch((err) => {
          console.error("Failed to auto-cancel queue on unmount:", err);
        });
      }
    };
  }, [cancelQueue]);

  return (
    <QueueContext.Provider
      value={{
        queueStatus,
        queueJoinedAt,
        matchedMatchId,
        queueLoading,
        bannedUntil,
        isBanned,
        remainingBanTime,
        startQueue,
        cancelQueue,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue(): QueueContextType {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error("useQueue must be used within a QueueProvider");
  }
  return context;
}
