import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
	children: React.ReactNode;
}

// ハンバーガーアイコン
function MenuIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="w-6 h-6"
		>
			<line x1="3" y1="12" x2="21" y2="12" />
			<line x1="3" y1="6" x2="21" y2="6" />
			<line x1="3" y1="18" x2="21" y2="18" />
		</svg>
	);
}

// 閉じるアイコン
function CloseIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="w-6 h-6"
		>
			<line x1="18" y1="6" x2="6" y2="18" />
			<line x1="6" y1="6" x2="18" y2="18" />
		</svg>
	);
}

export function Layout({ children }: LayoutProps) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	// Escキーでメニューを閉じる
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isMenuOpen) {
				setIsMenuOpen(false);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isMenuOpen]);

	// メニュー展開時にスクロールをロック
	useEffect(() => {
		if (isMenuOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}

		return () => {
			document.body.style.overflow = "";
		};
	}, [isMenuOpen]);

	const closeMenu = () => setIsMenuOpen(false);

	return (
		<div
			className="flex h-screen"
			style={{ backgroundColor: "var(--color-base)" }}
		>
			{/* デスクトップ用サイドバー */}
			<div className="hidden lg:block">
				<Sidebar />
			</div>

			{/* モバイル用オーバーレイ */}
			{isMenuOpen && (
				<div
					className="fixed inset-0 bg-black/50 z-40 lg:hidden"
					onClick={closeMenu}
					onKeyDown={(e) => e.key === "Enter" && closeMenu()}
				/>
			)}

			{/* モバイル用スライドインメニュー */}
			<div
				className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
					isMenuOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				{/* 閉じるボタン */}
				<button
					type="button"
					onClick={closeMenu}
					className="absolute top-4 right-4 p-2 rounded-lg transition-colors hover:bg-slate-700/50"
					style={{ color: "var(--color-text-secondary)" }}
				>
					<CloseIcon />
				</button>
				<Sidebar onNavigate={closeMenu} />
			</div>

			{/* メインコンテンツエリア */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* モバイル用ヘッダー */}
				<header
					className="lg:hidden flex items-center gap-4 px-4 py-3"
					style={{
						backgroundColor: "var(--color-surface)",
						borderBottom: "1px solid rgba(100, 116, 139, 0.3)",
					}}
				>
					<button
						type="button"
						onClick={() => setIsMenuOpen(true)}
						className="p-2 rounded-lg transition-colors hover:bg-slate-700/50"
						style={{ color: "var(--color-text-secondary)" }}
					>
						<MenuIcon />
					</button>
					<h1
						className="text-lg font-bold tracking-widest"
						style={{
							fontFamily: "var(--font-display)",
							color: "var(--color-accent-cyan)",
						}}
					>
						UNITEMATE
					</h1>
				</header>

				{/* ページコンテンツ */}
				<main className="flex-1 overflow-auto">{children}</main>
			</div>
		</div>
	);
}
