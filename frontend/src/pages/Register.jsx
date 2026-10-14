import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { BookOpen, Eye, EyeOff, ArrowRight } from "lucide-react";
import GoogleAuthButton from "../components/GoogleAuthButton";
import "./Auth.css";

const API_URL = "http://localhost:5000/api";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    if (form.password.length < 8 || form.password.length > 72) {
      setError("Your password must contain between 8 and 72 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/auth/register`, {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password
      });

      navigate("/login", {
        replace: true,
        state: {
          message: "Your account was created successfully. Please sign in."
        }
      });
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to create your account. Please try again."
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
          <span className="auth-eyebrow">
            A LITTLE SPACE THAT IS YOURS
          </span>

          <h1>Make room for every idea.</h1>

          <p>
            Start building your personal library of knowledge.
            Save what matters and find it whenever you need it.
          </p>

          <div className="auth-decoration">
            <div className="auth-decoration-card card-one">
              <BookOpen size={22} />
              <span>Your ideas, organized</span>
            </div>

            <div className="auth-decoration-card card-two">
              <span className="auth-decoration-star">✳</span>
              <span>Your own little corner</span>
            </div>
          </div>
        </div>

        <p className="auth-brand-footer">
          A home for everything worth remembering.
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
            <span className="auth-step">GET STARTED</span>
            <h2>Create your account.</h2>
            <p>A few details and your personal space is ready.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <label className="auth-label">
              Full name

              <input
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                value={form.fullName}
                onChange={handleChange}
                autoComplete="name"
                maxLength={100}
                required
              />
            </label>

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
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
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

            <label className="auth-label">
              Confirm password

              <div className="auth-password-field">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Enter your password again"
                  value={form.confirmPassword}
                  onChange={handleChange}
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
              disabled={loading}
            >
              {loading ? "Creating your account..." : "Create account"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <GoogleAuthButton label="Sign up with Google" />

          <p className="auth-switch">
            Already have an account?
            <Link to="/login">Sign in</Link>
          </p>

          <p className="auth-privacy">
            Your personal space. Your thoughts. Your control.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Register;