import React, { useState } from "react";
import { extractSheetId } from "./googleSheetsUtils";

export default function ConfigModal({ onConfig }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!url.trim()) {
      setError("Please enter a Google Sheets URL");
      return;
    }

    const sheetId = extractSheetId(url);
    if (!sheetId) {
      setError("Invalid Google Sheets URL. Please use a shareable link.");
      return;
    }

    onConfig(url);
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: "500px" }}>
        <h2>Configure Google Sheet</h2>
        <p>Enter your Google Sheets URL to sync campaign data:</p>
        <input
          type="text"
          placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
          value={url}
          onChange={e => {
            setUrl(e.target.value);
            setError("");
          }}
          className="input-field"
        />
        {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
        <div className="modal-buttons">
          <button onClick={handleSubmit} className="btn-primary">Continue</button>
        </div>
        <p style={{ fontSize: "12px", color: "#666", marginTop: "20px" }}>
          Make sure the sheet is shared with "Anyone with the link" access.
        </p>
      </div>
    </div>
  );
}