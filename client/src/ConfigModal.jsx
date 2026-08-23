import React, { useState } from "react";
import { getDefaultSheetId } from "./googleSheetsUtils";

export default function ConfigModal({ onConfig }) {
  const [showChangeSheet, setShowChangeSheet] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [error, setError] = useState("");

  const handleChangeSheet = () => {
    if (!newUrl.trim()) {
      setError("Please enter a Google Sheets URL");
      return;
    }
    onConfig(newUrl);
    setShowChangeSheet(false);
  };

  const defaultSheetId = getDefaultSheetId();
  const defaultUrl = `https://docs.google.com/spreadsheets/d/${defaultSheetId}/edit`;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: "500px" }}>
        <h2>App Configuration</h2>
        
        <div style={{ background: "#f0f0f0", padding: "15px", borderRadius: "6px", marginBottom: "20px" }}>
          <p style={{ fontSize: "14px", margin: "0 0 10px 0" }}>
            <strong>Default Google Sheet:</strong>
          </p>
          <p style={{ fontSize: "12px", color: "#666", margin: "0" }}>
            This app is configured to use a shared Google Sheet for all campaign data.
          </p>
          <p style={{ fontSize: "12px", color: "#667eea", margin: "10px 0 0 0" }}>
            📊 <a href={defaultUrl} target="_blank" rel="noopener noreferrer">View Sheet</a>
          </p>
        </div>

        {!showChangeSheet ? (
          <div>
            <p style={{ fontSize: "14px", marginBottom: "20px" }}>
              All changes you make in the app will be automatically saved to the Google Sheet and synced across all devices.
            </p>
            <button 
              onClick={() => setShowChangeSheet(true)} 
              className="btn-secondary"
              style={{ width: "100%" }}
            >
              Change Google Sheet (Advanced)
            </button>
            <div className="modal-buttons">
              <button onClick={() => onConfig(defaultUrl)} className="btn-primary">Start Using App</button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "14px", marginBottom: "10px" }}>
              Enter a different Google Sheets URL:
            </p>
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
              value={newUrl}
              onChange={e => {
                setNewUrl(e.target.value);
                setError("");
              }}
              className="input-field"
            />
            {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
            <div className="modal-buttons">
              <button onClick={handleChangeSheet} className="btn-primary">Switch</button>
              <button onClick={() => setShowChangeSheet(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}