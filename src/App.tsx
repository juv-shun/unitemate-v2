import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./features/auth/AuthContext";
import { LoginPage } from "./features/auth/LoginPage";
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
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
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
