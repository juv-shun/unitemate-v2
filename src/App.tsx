import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./features/auth/AuthContext";
import { LoginPage } from "./features/auth/LoginPage";
import { DraftSimulationPage } from "./features/draft/DraftSimulationPage";
import { MatchProvider } from "./features/draft/MatchContext";
import { MatchResultPage } from "./features/match/MatchResultPage";
import { MyPage } from "./features/mypage/MyPage";
import { OnboardingPage } from "./features/onboarding/OnboardingPage";
import { HomePage } from "./features/profile/HomePage";
import { QueueProvider } from "./features/queue/QueueContext";
import { RankingPage } from "./features/ranking/RankingPage";
import { StatsPage } from "./features/stats/StatsPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <QueueProvider>
          <MatchProvider>
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
                  <Layout>
                    <HomePage />
                  </Layout>
                }
              />
              <Route
                path="/lobby/:matchId?"
                element={
                  <Layout>
                    <DraftSimulationPage />
                  </Layout>
                }
              />
              <Route
                path="/match/:matchId?"
                element={
                  <Layout>
                    <MatchResultPage />
                  </Layout>
                }
              />
              <Route
                path="/mypage"
                element={
                  <Layout>
                    <MyPage />
                  </Layout>
                }
              />
              <Route
                path="/ranking"
                element={
                  <Layout>
                    <RankingPage />
                  </Layout>
                }
              />
              <Route
                path="/stats"
                element={
                  <Layout>
                    <StatsPage />
                  </Layout>
                }
              />
            </Routes>
          </MatchProvider>
        </QueueProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
