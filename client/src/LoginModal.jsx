import React, { useState } from "react";
import { loginUser } from "./googleSheetsUtils";

export default function LoginModal({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    setError("");
    const result = await loginUser(email, password);
    setLoading(false);

    if (result.success) {
      onLoginSuccess(result);
    } else {
      setError(result.error || "Invalid credentials");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal login-modal">
        <h1>🚀 Crowdfunding Planning Tool</h1>
        <p style={{ color: "#666", marginBottom: "30px" }}>Sign in to your account</p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            disabled={loading}
          />

          {error && <p style={{ color: "red", marginBottom: "15px" }}>{error}</p>}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%" }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={{ fontSize: "12px", color: "#999", marginTop: "20px", textAlign: "center" }}>
          Demo credentials:<br/>
          Email: your_email@gmail.com<br/>
          Password: yourpassword
        </p>
      </div>
    </div>
  );
}