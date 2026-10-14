import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { firebaseAuth } from "../firebase";

const API_URL = "http://localhost:5000/api";

function GoogleAuthButton({ label = "Continue with Google" }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setError("");

    if (!firebaseAuth) {
      setError(
        "Google sign-in is not configured. Check your frontend/.env settings."
      );
      return;
    }

    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account"
      });

      const result = await signInWithPopup(firebaseAuth, provider);
      const idToken = await result.user.getIdToken();

      const response = await axios.post(
        `${API_URL}/auth/google`,
        { idToken }
      );

      if (
        response.data.requiresEmailOtp &&
        response.data.challengeToken
      ) {
        sessionStorage.setItem(
          "pkb-login-otp-challenge",
          response.data.challengeToken
        );

        navigate("/verify-login-otp", { replace: true });
        return;
      }

      setError(
        "The server returned an unexpected login response. Please try again."
      );
    } catch (error) {
      if (error.code === "auth/popup-closed-by-user") {
        return;
      }

      if (error.code === "auth/unauthorized-domain") {
        setError(
          "This domain is not authorized in Firebase Authentication."
        );
        return;
      }

      if (error.code === "auth/popup-blocked") {
        setError(
          "Your browser blocked the Google sign-in popup. Allow popups and try again."
        );
        return;
      }

      setError(
        error.response?.data?.message ||
          error.message ||
          "Google sign-in failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-google-wrap">
      <div className="auth-google-separator">
        <span>OR</span>
      </div>

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}

      <button
        type="button"
        className="auth-google-button"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <svg
          className="auth-google-icon"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
            transform="translate(2 2) scale(.9167)"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.73 6C44.43 38.04 46.98 31.93 46.98 24.55Z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.93 7.56 2.56 10.78l7.97-6.19Z"
            transform="translate(2 2) scale(.9167)"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
            transform="translate(2 2) scale(.9167)"
          />
        </svg>

        <span>
          {loading ? "Connecting to Google..." : label}
        </span>
      </button>
    </div>
  );
}

export default GoogleAuthButton;