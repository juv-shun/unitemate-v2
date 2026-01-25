import { useNotifications } from "../NotificationContext";
import type { Notification } from "../types";

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
}

function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
  };

  // 相対時間を計算
  const getRelativeTime = (date: Date | null): string => {
    if (!date) return "";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "たった今";
    if (diffMinutes < 60) return `${diffMinutes}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;

    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left px-4 py-3 transition-colors hover:bg-slate-700/30"
      style={{
        opacity: notification.read ? 0.6 : 1,
        borderBottom: "1px solid rgba(100, 116, 139, 0.2)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-2 h-2 rounded-full mt-2 shrink-0"
          style={{
            backgroundColor: notification.read
              ? "transparent"
              : "var(--color-accent-cyan)",
          }}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--color-text-primary)" }}
          >
            {notification.message}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {getRelativeTime(notification.createdAt)}
          </p>
        </div>
      </div>
    </button>
  );
}

export function NotificationList() {
  const { notifications, markAsRead, isLoading } = useNotifications();

  const handleRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  return (
    <div className="max-h-96 overflow-y-auto">
      <div
        className="px-4 py-3 font-medium text-sm"
        style={{
          color: "var(--color-text-primary)",
          borderBottom: "1px solid rgba(100, 116, 139, 0.3)",
        }}
      >
        通知
      </div>

      {isLoading ? (
        <div
          className="px-4 py-8 text-center text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          読み込み中...
        </div>
      ) : notifications.length === 0 ? (
        <div
          className="px-4 py-8 text-center text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          通知はありません
        </div>
      ) : (
        <div>
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={handleRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
