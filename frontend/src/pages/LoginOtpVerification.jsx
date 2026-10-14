import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ArrowRight, BookOpen, Mail } from "lucide-react";
import "./Auth.css";

const API_URL = "http://localhost:5000/api";

function LoginOtpVerification() {
  const navigate = useNavigate();

  const [challengeToken] = useState(() =>
    sessionStorage.getItem("pkb-login-otp-challenge")
  );

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!challengeToken) {
      navigate("/login", { replace: true });
    }
  }, [challengeToken, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!challengeToken) {
      setError("Your verification session has expired. Please sign in again.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code sent to your email.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/verify-login-otp`,
        {
          challengeToken,
          code
        }
      );

      if (!response.data.token || !response.data.user) {
        setError("The server returned an unexpected response. Please try again.");
        return;
      }

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      sessionStorage.removeItem("pkb-login-otp-challenge");

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to verify your code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    sessionStorage.removeItem("pkb-login-otp-challenge");
  };

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <BookOpen size={24} />
          </div>

          <span>
            Knowledge<span className="auth-brand-highlight">base</span>
          </span>
        </div>

        <div className="auth-hero">
          <span className="auth-eyebrow">
            YOUR PERSONAL KNOWLEDGE SPACE
          </span>

          <h1>A little extra security for everything you keep.</h1>

          <p>
            Verify your email to finish signing in to your personal
            library of notes, ideas, and resources.
          </p>

          <div className="auth-decoration">
            <div className="auth-decoration-card card-one">
              <Mail size={22} />
              <span>Your code, delivered securely</span>
            </div>

            <div className="auth-decoration-card card-two">
              <span className="auth-decoration-star">✳</span>
              <span>A little space to think</span>
            </div>
          </div>
        </div>

        <p className="auth-brand-footer">
          Your personal space. Your thoughts. Your control.
        </p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-mobile-brand">
            <div className="auth-brand-icon">
              <BookOpen size={22} />
            </div>

            <span>
              Knowledge<span className="auth-brand-highlight">base</span>
            </span>
          </div>

          <div className="auth-heading">
            <span className="auth-step">EMAIL VERIFICATION</span>
            <h2>Check your inbox.</h2>

            <p>
              We've sent a six-digit sign-in code to your registered email.
              Enter it below to continue.
            </p>
          </div>

          <div className="auth-otp-notice">
            <Mail size={18} />
            <span>
              Your verification code expires in 10 minutes.
            </span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <label className="auth-label">
              Six-digit verification code

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={(event) =>
                  setCode(
                    event.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                maxLength={6}
                autoFocus
                required
              />
            </label>

            <p className="auth-otp-hint">
              Never share this code with anyone.
            </p>

            <button
              className="auth-submit"
              type="submit"
              disabled={loading || code.length !== 6}
            >
              {loading ? "Verifying..." : "Verify and sign in"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <Link
            to="/login"
            className="auth-back-link"
            onClick={handleBackToLogin}
          >
            <ArrowLeft size={16} />
            Back to login
          </Link>

          <p className="auth-privacy">
            Your personal space. Your thoughts. Your control.
          </p>
        </div>
      </section>
    </main>
  );
}

export default LoginOtpVerification;