import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { getUserProfile } from "../features/auth/user";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const { user, loading } = useAuth();
	const location = useLocation();
	const [profileLoading, setProfileLoading] = useState(true);
	const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);

	useEffect(() => {
		if (user) {
			getUserProfile(user.uid).then((profile) => {
				// 既存ユーザー（is_onboardedがundefined）はオンボーディング済みとみなす
				setIsOnboarded(profile?.is_onboarded ?? true);
				setProfileLoading(false);
			});
		} else {
			setProfileLoading(false);
		}
	}, [user]);

	if (loading || profileLoading) {
		return (
			<div
				className="min-h-screen flex items-center justify-center"
				style={{ backgroundColor: "var(--color-base)" }}
			>
				<div className="w-8 h-8 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin" />
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	// オンボーディング未完了かつオンボーディングページ以外にいる場合
	if (!isOnboarded && location.pathname !== "/onboarding") {
		return <Navigate to="/onboarding" replace />;
	}

	// オンボーディング完了済みかつオンボーディングページにいる場合
	if (isOnboarded && location.pathname === "/onboarding") {
		return <Navigate to="/" replace />;
	}

	return <>{children}</>;
}
