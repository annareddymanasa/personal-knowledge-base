import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ArrowRight, BookOpen, Mail } from "lucide-react";
import "./Auth.css";

const API_URL = "http://localhost:5000/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/forgot-password`,
        {
          email: email.trim()
        }
      );

      setSuccess(response.data.message);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to request a password reset. Please try again."
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
          <span className="auth-eyebrow">YOUR PERSONAL KNOWLEDGE SPACE</span>
          <h1>Your knowledge is worth keeping safe.</h1>
          <p>
            Recover access to your notes, ideas, and personal library
            with a secure password-reset link.
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
            <span className="auth-step">ACCOUNT RECOVERY</span>
            <h2>Forgot your password?</h2>
            <p>
              Enter the email associated with your account.
              We'll send you a link to choose a new password.
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
              Email address
              <div className="auth-recovery-input">
                <Mail size={18} />
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  maxLength={255}
                  required
                />
              </div>
            </label>

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Sending reset link..." : "Send reset link"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <Link to="/login" className="auth-back-link">
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

export default ForgotPassword;