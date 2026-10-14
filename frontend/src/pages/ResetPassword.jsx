import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  LockKeyhole
} from "lucide-react";
import "./Auth.css";

const API_URL = "http://localhost:5000/api";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError(
        "This reset link is missing its token. Request a new password-reset email."
      );
      return;
    }

    if (password.length < 8 || password.length > 72) {
      setError("Your password must contain between 8 and 72 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/reset-password`,
        {
          token,
          password
        }
      );

      setSuccess(response.data.message);
      setPassword("");
      setConfirmPassword("");

      window.setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: {
            message: "Your password was reset successfully. Please sign in."
          }
        });
      }, 1800);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to reset your password. Request a new link and try again."
      );
    } finally {
      setLoading(false);
    }
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
          <span className="auth-eyebrow">A FRESH START</span>
          <h1>A secure password for your personal library.</h1>
          <p>
            Choose a new password to return to your notes,
            resources, and growing collection of ideas.
          </p>
        </div>

        <p className="auth-brand-footer">
          Made for your thoughts, big and small.
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
            <span className="auth-step">RESET PASSWORD</span>
            <h2>Choose a new password.</h2>
            <p>
              Use at least 8 characters and keep your new password private.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="auth-success" role="status">
                {success}
              </div>
            )}

            <label className="auth-label">
              New password
              <div className="auth-password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>

            <label className="auth-label">
              Confirm new password
              <div className="auth-password-field">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Enter your password again"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() =>
                    setShowConfirmPassword((current) => !current)
                  }
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </label>

            <button
              className="auth-submit"
              type="submit"
              disabled={loading || Boolean(success)}
            >
              {loading ? "Updating password..." : "Reset password"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="auth-switch">
            Remember your password?
            <Link to="/login">Sign in</Link>
          </p>

          <p className="auth-privacy">
            <LockKeyhole size={13} />
            Your account security matters.
          </p>
        </div>
      </section>
    </main>
  );
}

export default ResetPassword;