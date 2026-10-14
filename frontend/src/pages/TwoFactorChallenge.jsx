import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ArrowRight, BookOpen, ShieldCheck } from "lucide-react";
import "./Auth.css";

const API_URL = "http://localhost:5000/api";

function TwoFactorChallenge() {
  const navigate = useNavigate();

  const [challengeToken] = useState(() =>
    sessionStorage.getItem("pkb-2fa-challenge")
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

    if (!code.trim()) {
      setError("Enter your authenticator code or a recovery code.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/2fa/challenge`,
        {
          challengeToken,
          code: code.trim()
        }
      );

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      sessionStorage.removeItem("pkb-2fa-challenge");

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const cancelVerification = () => {
    sessionStorage.removeItem("pkb-2fa-challenge");
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
          <span className="auth-eyebrow">AN EXTRA LAYER OF SECURITY</span>
          <h1>Your knowledge deserves protection.</h1>
          <p>
            Confirm your identity before returning to your personal
            library of notes, resources, and ideas.
          </p>
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
            <span className="auth-step">TWO-STEP VERIFICATION</span>
            <h2>Verify it's you.</h2>
            <p>
              Enter the six-digit code from your authenticator app.
              You can also use an unused recovery code.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <label className="auth-label">
              Verification or recovery code
              <input
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                placeholder="Enter your code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                maxLength={29}
                autoFocus
                required
              />
            </label>

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify and continue"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <Link
            to="/login"
            className="auth-back-link"
            onClick={cancelVerification}
          >
            <ArrowLeft size={16} />
            Return to login
          </Link>

          <p className="auth-privacy">
            <ShieldCheck size={14} />
            Your verification code is never stored in your browser after submission.
          </p>
        </div>
      </section>
    </main>
  );
}

export default TwoFactorChallenge;