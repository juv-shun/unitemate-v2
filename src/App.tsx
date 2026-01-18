import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./features/auth/AuthContext";
import { LoginPage } from "./features/auth/LoginPage";
import { DraftSimulationPage } from "./features/draft/DraftSimulationPage";
import { MyPage } from "./features/mypage/MyPage";
import { OnboardingPage } from "./features/onboarding/OnboardingPage";
import { HomePage } from "./features/profile/HomePage";
import { QueueProvider } from "./features/queue/QueueContext";

function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<QueueProvider>
					<Routes>
						<Route path="/login" element={<LoginPage />} />
						<Route
							path="/onboarding"
							element={
								<ProtectedRoute>
									<OnboardingPage />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/"
							element={
								<ProtectedRoute>
									<Layout>
										<HomePage />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/draft"
							element={
								<ProtectedRoute>
									<Layout>
										<DraftSimulationPage />
									</Layout>
								</ProtectedRoute>
							}
						/>
						<Route
							path="/mypage"
							element={
								<ProtectedRoute>
									<Layout>
										<MyPage />
									</Layout>
								</ProtectedRoute>
							}
						/>
					</Routes>
				</QueueProvider>
			</AuthProvider>
		</BrowserRouter>
	);
}

export default App;
