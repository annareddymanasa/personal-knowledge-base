import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import LoginOtpVerification from "./pages/LoginOtpVerification";
import Dashboard from "./Dashboard";
import LegalPage from "./pages/LegalPage";
import AIAssistant from "./AIAssistant";
import FloatingAIAssistant from "./components/FloatingAIAssistant";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function GuestRoute({ children }) {
  const token = localStorage.getItem("token");

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  useEffect(() => {
    const applyTheme = () => {
      const savedTheme = localStorage.getItem("pkb-theme");

      const selectedTheme = ["paper", "midnight", "forest"].includes(
        savedTheme
      )
        ? savedTheme
        : "paper";

      document.documentElement.dataset.theme = selectedTheme;
    };

    applyTheme();

    window.addEventListener("pkb-theme-change", applyTheme);

    return () => {
      window.removeEventListener("pkb-theme-change", applyTheme);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />

        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        <Route
          path="/verify-login-otp"
          element={<LoginOtpVerification />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai-assistant"
          element={
            <ProtectedRoute>
              <AIAssistant />
            </ProtectedRoute>
          }
        />

        <Route path="/privacy" element={<LegalPage />} />

        <Route path="/terms" element={<LegalPage />} />

        <Route path="/cookies" element={<LegalPage />} />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>

      <FloatingAIAssistant />
    </BrowserRouter>
  );
}

export default App;