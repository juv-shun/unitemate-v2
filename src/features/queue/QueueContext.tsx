import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  type QueueData,
  cancelQueue as cancelQueueFn,
  startQueue as startQueueFn,
  subscribeToQueueStatus,
} from "./queue";
import type { QueueStatus } from "./types";

interface QueueContextType {
  queueStatus: QueueStatus;
  queueJoinedAt: Date | null;
  matchedMatchId: string | null;
  queueLoading: boolean;
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
  const [queueLoading, setQueueLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setQueueStatus(null);
      setQueueJoinedAt(null);
      setMatchedMatchId(null);
      setQueueLoading(false);
      return;
    }

    setQueueLoading(true);
    const unsubscribe = subscribeToQueueStatus(user.uid, (data: QueueData) => {
      setQueueStatus(data.status);
      setQueueJoinedAt(data.joinedAt);
      setMatchedMatchId(data.matchedMatchId);
      setQueueLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (queueStatus !== "matched" || !matchedMatchId) return;

    const targetPath = `/draft/${matchedMatchId}`;
    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace: true });
    }
  }, [queueStatus, matchedMatchId, location.pathname, navigate]);

  const startQueue = useCallback(async () => {
    if (!user) return;
    await startQueueFn(user.uid);
  }, [user]);

  const cancelQueue = useCallback(async () => {
    if (!user) return;
    await cancelQueueFn(user.uid);
  }, [user]);

  return (
    <QueueContext.Provider
      value={{
        queueStatus,
        queueJoinedAt,
        matchedMatchId,
        queueLoading,
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
