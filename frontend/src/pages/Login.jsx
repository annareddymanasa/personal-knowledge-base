import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  Home
} from "lucide-react";
import GoogleAuthButton from "../components/GoogleAuthButton";
import ThemeSwitcher from "../components/ThemeSwitcher";
import "./Auth.css";
import "./AuthPageControls.css";

const API_URL = "http://localhost:5000/api";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: form.email.trim(),
        password: form.password
      });

      if (
        response.data.requiresEmailOtp &&
        response.data.challengeToken
      ) {
        sessionStorage.setItem(
          "pkb-login-otp-challenge",
          response.data.challengeToken
        );

        navigate("/verify-login-otp", {
          replace: true
        });

        return;
      }

      setError(
        "The server returned an unexpected login response. Please try again."
      );
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Link
          to="/"
          className="auth-brand"
          aria-label="Knowledgebase home"
        >
          <div className="auth-brand-icon">
            <BookOpen size={24} />
          </div>

          <span>
            Knowledge<span className="auth-brand-highlight">base</span>
          </span>
        </Link>

        <div className="auth-hero">
          <span className="auth-eyebrow">
            YOUR PERSONAL KNOWLEDGE SPACE
          </span>

          <h1>
            Your thoughts deserve a place of their own.
          </h1>

          <p>
            Keep your ideas, learning, notes, and favorite resources
            organized in one peaceful space.
          </p>

          <div className="auth-decoration">
            <div className="auth-decoration-card card-one">
              <BookOpen size={22} />
              <span>Ideas worth keeping</span>
            </div>

            <div className="auth-decoration-card card-two">
              <span className="auth-decoration-star">✳</span>
              <span>A little space to think</span>
            </div>
          </div>
        </div>

        <p className="auth-brand-footer">
          Made for your thoughts, big and small.
        </p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-page-actions">
          <ThemeSwitcher compact />

          <Link to="/" className="auth-home-button">
            <Home size={16} />
            <span>Home</span>
          </Link>
        </div>

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
            <span className="auth-step">
              WELCOME BACK
            </span>

            <h2>Good to see you again.</h2>

            <p>
              Sign in to return to your personal knowledge space.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {location.state?.message && (
              <div className="auth-success" role="status">
                {location.state.message}
              </div>
            )}

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <label className="auth-label">
              Email address

              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                maxLength={255}
                required
              />
            </label>

            <label className="auth-label">
              Password

              <div className="auth-password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </label>

            <div className="auth-forgot-row">
              <Link to="/forgot-password">
                Forgot password?
              </Link>
            </div>

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Checking your credentials..." : "Sign in"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <GoogleAuthButton label="Continue with Google" />

          <p className="auth-switch">
            New to Knowledgebase?
            <Link to="/register">Create an account</Link>
          </p>

          <p className="auth-privacy">
            Your personal space. Your thoughts. Your control.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;