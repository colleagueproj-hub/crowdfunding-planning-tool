import React, { useState } from "react";
import { loginUser } from "./googleSheetsUtils";

export default function LoginModal({ onLoginSuccess }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");
    
    const result = await loginUser(email, password, name, true);
    setLoading(false);

    if (result.success) {
      onLoginSuccess(result);
    } else {
      setError(result.error || "Sign up failed");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal login-modal">
        <h1>🚀 Crowdfunding Planning Tool</h1>
        
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button
            onClick={() => setMode("login")}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              borderRadius: "6px",
              background: mode === "login" ? "#667eea" : "#e9ecef",
              color: mode === "login" ? "white" : "#333",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("signup")}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              borderRadius: "6px",
              background: mode === "signup" ? "#667eea" : "#e9ecef",
              color: mode === "signup" ? "white" : "#333",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={mode === "login" ? handleLogin : handleSignUp}>
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              disabled={loading}
            />
          )}
          
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
            {loading ? "Loading..." : (mode === "login" ? "Sign In" : "Create Account")}
          </button>
        </form>

        <p style={{ fontSize: "12px", color: "#999", marginTop: "20px", textAlign: "center" }}>
          {mode === "login"
            ? "Demo: any email/password works"
            : "New account will be created automatically"}
        </p>
      </div>
    </div>
  );
}