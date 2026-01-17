import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
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
  const [queueStatus, setQueueStatus] = useState<QueueStatus>(null);
  const [queueJoinedAt, setQueueJoinedAt] = useState<Date | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setQueueStatus(null);
      setQueueJoinedAt(null);
      setQueueLoading(false);
      return;
    }

    setQueueLoading(true);
    const unsubscribe = subscribeToQueueStatus(user.uid, (data: QueueData) => {
      setQueueStatus(data.status);
      setQueueJoinedAt(data.joinedAt);
      setQueueLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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
