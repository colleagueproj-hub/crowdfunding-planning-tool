import React, { useState, useEffect } from "react";
import "./styles.css";
import LoginModal from "./LoginModal";
import ConfigModal from "./ConfigModal";
import { fetchCampaignsFromSheet, saveCampaignToSheet, getLoggedInUser, logoutUser, getDefaultSheetId } from "./googleSheetsUtils";

export default function App() {
  const [user, setUser] = useState(getLoggedInUser());
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [activeTab, setActiveTab] = useState("plan");
  const [newCampaignName, setNewCampaignName] = useState("");
  const [showNewCampaignForm, setShowNewCampaignForm] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newParticipantName, setNewParticipantName] = useState("");
  const [showCampaignSettings, setShowCampaignSettings] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    status: "not-started",
    owners: [],
    participants: [],
    reminderEnabled: false,
    reminderDays: 1,
  });
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [newBudgetItem, setNewBudgetItem] = useState({
    description: "",
    amount: "",
    category: "marketing",
  });
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState("✓ Synced");

  useEffect(() => {
    if (user) {
      loadCampaigns();
    }
  }, [user]);

  const loadCampaigns = async () => {
    const loaded = await fetchCampaignsFromSheet(getDefaultSheetId());
    const normalized = (Array.isArray(loaded) ? loaded : []).map(normalizeCampaign);
    setCampaigns(normalized);
    if (normalized.length > 0 && !selectedCampaign) {
      setSelectedCampaign(normalized[0]);
    }
  };

  const normalizeCampaign = (campaign) => ({
    id: campaign.id || `campaign_${Date.now()}`,
    name: campaign.name || "Untitled Campaign",
    currency: campaign.currency || "ILS",
    owners: Array.isArray(campaign.owners) ? campaign.owners : [],
    participants: Array.isArray(campaign.participants) ? campaign.participants : [],
    planningItems: Array.isArray(campaign.planningItems) ? campaign.planningItems : [],
    budgetItems: Array.isArray(campaign.budgetItems) ? campaign.budgetItems : [],
    created_at: campaign.created_at || new Date().toISOString(),
  });

  const isOwner = selectedCampaign && selectedCampaign.owners.includes(user?.email);
  const canEdit = isOwner || user?.is_admin;
  const canCreateCampaign = user?.is_admin;

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleDeleteCampaign = async () => {
    if (!user?.is_admin || !selectedCampaign) return;
    if (!window.confirm(`Delete campaign "${selectedCampaign.name}"? This cannot be undone.`)) return;
    
    const updated = campaigns.filter(c => c.id !== selectedCampaign.id);
    setCampaigns(updated);
    setSelectedCampaign(updated.length > 0 ? updated[0] : null);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setCampaigns([]);
    setSelectedCampaign(null);
  };

  const handleSyncToSheet = async () => {
    if (!selectedCampaign) return;
    setSyncStatus("⏳ Syncing...");
    const success = await saveCampaignToSheet(selectedCampaign);
    setSyncStatus(success ? "✓ Synced!" : "❌ Sync failed");
    setTimeout(() => setSyncStatus("✓ Synced"), 3000);
  };

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return;
    const newCampaign = {
      id: `campaign_${Date.now()}`,
      name: newCampaignName,
      currency: "ILS",
      owners: [user.email],
      participants: [],
      planningItems: [],
      budgetItems: [],
      created_at: new Date().toISOString(),
    };
    
    await saveCampaignToSheet(newCampaign);
    const updated = [...campaigns, newCampaign];
    setCampaigns(updated);
    setSelectedCampaign(newCampaign);
    setNewCampaignName("");
    setShowNewCampaignForm(false);
  };

  const handleAddOwner = () => {
    if (!selectedCampaign || !newOwnerName.trim() || !canEdit) return;
    const updatedCampaign = {
      ...selectedCampaign,
      owners: [...selectedCampaign.owners, newOwnerName],
    };
    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
    setNewOwnerName("");
  };

  const handleRemoveOwner = (index) => {
    if (!selectedCampaign || !canEdit) return;
    const updatedCampaign = {
      ...selectedCampaign,
      owners: selectedCampaign.owners.filter((_, i) => i !== index),
    };
    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
  };

  const handleAddParticipant = () => {
    if (!selectedCampaign || !newParticipantName.trim() || !canEdit) return;
    const updatedCampaign = {
      ...selectedCampaign,
      participants: [...selectedCampaign.participants, newParticipantName],
    };
    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
    setNewParticipantName("");
  };

  const handleRemoveParticipant = (index) => {
    if (!selectedCampaign || !canEdit) return;
    const updatedCampaign = {
      ...selectedCampaign,
      participants: selectedCampaign.participants.filter((_, i) => i !== index),
    };
    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
  };

  const handleSaveNewItem = () => {
    if (!selectedCampaign || !newItemForm.name.trim() || !newItemForm.startDate || !newItemForm.endDate || !canEdit) return;

    const item = {
      id: `item_${Date.now()}`,
      name: newItemForm.name,
      startDate: newItemForm.startDate,
      endDate: newItemForm.endDate,
      status: newItemForm.status,
      owners: newItemForm.owners,
      participants: newItemForm.participants.length > 0 ? newItemForm.participants : newItemForm.owners,
      reminderEnabled: newItemForm.reminderEnabled,
      reminderDays: newItemForm.reminderDays,
    };

    const updatedCampaign = {
      ...selectedCampaign,
      planningItems: editingItemId
        ? selectedCampaign.planningItems.map(i => i.id === editingItemId ? item : i)
        : [...selectedCampaign.planningItems, item],
    };

    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
    setNewItemForm({
      name: "",
      startDate: "",
      endDate: "",
      status: "not-started",
      owners: [],
      participants: [],
      reminderEnabled: false,
      reminderDays: 1,
    });
    setShowAddItemModal(false);
    setEditingItemId(null);
  };

  const handleEditItem = (item) => {
    if (!canEdit) return;
    setNewItemForm(item);
    setEditingItemId(item.id);
    setShowAddItemModal(true);
  };

  const handleDeleteItem = (itemId) => {
    if (!selectedCampaign || !canEdit) return;
    const updatedCampaign = {
      ...selectedCampaign,
      planningItems: selectedCampaign.planningItems.filter(i => i.id !== itemId),
    };
    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
  };

  const handleAddBudgetItem = () => {
    if (!selectedCampaign || !newBudgetItem.description.trim() || !newBudgetItem.amount || !canEdit) return;

    const budgetItem = {
      id: `budget_${Date.now()}`,
      description: newBudgetItem.description,
      amount: parseFloat(newBudgetItem.amount),
      category: newBudgetItem.category,
    };

    const updatedCampaign = {
      ...selectedCampaign,
      budgetItems: [...selectedCampaign.budgetItems, budgetItem],
    };

    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
    setNewBudgetItem({ description: "", amount: "", category: "marketing" });
    setShowAddBudgetModal(false);
  };

  const handleDeleteBudgetItem = (budgetId) => {
    if (!selectedCampaign || !canEdit) return;
    const updatedCampaign = {
      ...selectedCampaign,
      budgetItems: selectedCampaign.budgetItems.filter(b => b.id !== budgetId),
    };
    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
  };

  if (!user) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  if (!selectedCampaign && campaigns.length === 0) {
    return (
      <div className="container">
        <div className="header">
          <h1>Crowdfunding Planning Tool</h1>
          <div style={{ textAlign: "right" }}>
            <button onClick={handleLogout} className="btn-small">Logout</button>
          </div>
        </div>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>No campaigns yet.{canCreateCampaign ? " Create one to get started!" : " Wait for admin to create campaigns."}</p>
          {canCreateCampaign && (
            <button onClick={() => setShowNewCampaignForm(true)} className="btn-primary">
              + New Campaign
            </button>
          )}
        </div>

        {showNewCampaignForm && (
          <div className="modal-overlay" onClick={() => setShowNewCampaignForm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2>Create New Campaign</h2>
              <input
                type="text"
                placeholder="Campaign name"
                value={newCampaignName}
                onChange={e => setNewCampaignName(e.target.value)}
                className="input-field"
              />
              <div className="modal-buttons">
                <button onClick={handleCreateCampaign} className="btn-primary">Save</button>
                <button onClick={() => setShowNewCampaignForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const totalBudget = (selectedCampaign?.budgetItems || []).reduce((sum, item) => sum + (item?.amount || 0), 0);

  return (
    <div className="container">
      <div className="header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>🚀 Crowdfunding Planning Tool</h1>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "14px", color: "#666" }}>{user.name} ({user.is_admin ? "Admin" : "User"})</span>
            <button onClick={handleLogout} className="btn-small">Logout</button>
          </div>
        </div>
        <div className="header-controls">
          <select
            value={selectedCampaign?.id || ""}
            onChange={e => {
              const campaign = (campaigns || []).find(c => c.id === e.target.value);
              setSelectedCampaign(campaign);
            }}
            className="campaign-select"
          >
            {(campaigns || []).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {canCreateCampaign && (
            <button onClick={() => setShowNewCampaignForm(true)} className="btn-small">+ Campaign</button>
          )}
          {canCreateCampaign && selectedCampaign && (
            <button onClick={handleDeleteCampaign} className="btn-small btn-danger">🗑️ Delete</button>
          )}
          {canEdit && (
            <button onClick={() => setShowCampaignSettings(true)} className="btn-small">⚙️ Settings</button>
          )}
          <button onClick={handleSyncToSheet} className="btn-small">🔄 Sync</button>
          <span className="sync-status">{syncStatus}</span>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === "plan" ? "active" : ""}`} onClick={() => setActiveTab("plan")}>
          📋 Plan
        </button>
        <button className={`tab ${activeTab === "calendar" ? "active" : ""}`} onClick={() => setActiveTab("calendar")}>
          📅 Calendar
        </button>
        <button className={`tab ${activeTab === "budget" ? "active" : ""}`} onClick={() => setActiveTab("budget")}>
          💰 Budget
        </button>
      </div>

      {activeTab === "plan" && (
        <div className="tab-content">
          {canEdit && (
            <button onClick={() => {
              setNewItemForm({ name: "", startDate: "", endDate: "", status: "not-started", owners: [], participants: [], reminderEnabled: false, reminderDays: 1 });
              setEditingItemId(null);
              setShowAddItemModal(true);
            }} className="btn-primary">
              + Add Planning Item
            </button>
          )}

          <table className="items-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Owners</th>
                <th>Participants</th>
                <th>Reminder</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {selectedCampaign?.planningItems.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.startDate}</td>
                  <td>{item.endDate}</td>
                  <td><span className={`badge status-${item.status}`}>{item.status}</span></td>
                  <td>{item.owners.join(", ") || "-"}</td>
                  <td>{item.participants.join(", ") || "-"}</td>
                  <td>
                    {item.reminderEnabled ? (
                      <span className="badge reminder-enabled">🔔 {item.reminderDays}d</span>
                    ) : (
                      <span className="badge reminder-disabled">No reminder</span>
                    )}
                  </td>
                  {canEdit && (
                    <td>
                      <button onClick={() => handleEditItem(item)} className="btn-small">Edit</button>
                      <button onClick={() => handleDeleteItem(item.id)} className="btn-small btn-danger">Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {showAddItemModal && selectedCampaign && (
            <div className="modal-overlay" onClick={() => setShowAddItemModal(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <h2>{editingItemId ? "Edit Planning Item" : "Add Planning Item"}</h2>
                <input type="text" placeholder="Task name" value={newItemForm.name} onChange={e => setNewItemForm({...newItemForm, name: e.target.value})} className="input-field" />
                <input type="date" value={newItemForm.startDate} onChange={e => setNewItemForm({...newItemForm, startDate: e.target.value})} className="input-field" />
                <input type="date" value={newItemForm.endDate} onChange={e => setNewItemForm({...newItemForm, endDate: e.target.value})} className="input-field" />
                <select value={newItemForm.status} onChange={e => setNewItemForm({...newItemForm, status: e.target.value})} className="input-field">
                  <option value="not-started">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>

                <label>Owners:</label>
                <div className="checkbox-group">
                  {selectedCampaign.owners.map(owner => (
                    <label key={owner} className="checkbox-label">
                      <input type="checkbox" checked={newItemForm.owners.includes(owner)} onChange={e => { if (e.target.checked) { setNewItemForm({...newItemForm, owners: [...newItemForm.owners, owner]}); } else { setNewItemForm({...newItemForm, owners: newItemForm.owners.filter(o => o !== owner)}); } }} />
                      {owner}
                    </label>
                  ))}
                </div>

                <label>Participants:</label>
                <div className="checkbox-group">
                  {selectedCampaign.participants.map(p => (
                    <label key={p} className="checkbox-label">
                      <input type="checkbox" checked={newItemForm.participants.includes(p)} onChange={e => { if (e.target.checked) { setNewItemForm({...newItemForm, participants: [...newItemForm.participants, p]}); } else { setNewItemForm({...newItemForm, participants: newItemForm.participants.filter(x => x !== p)}); } }} />
                      {p}
                    </label>
                  ))}
                </div>

                <label className="checkbox-label">
                  <input type="checkbox" checked={newItemForm.reminderEnabled} onChange={e => setNewItemForm({...newItemForm, reminderEnabled: e.target.checked})} />
                  Enable Reminder
                </label>

                {newItemForm.reminderEnabled && (
                  <div className="reminder-options">
                    {[1, 3, 5, 10].map(days => (
                      <label key={days} className="radio-label">
                        <input type="radio" name="reminderDays" value={days} checked={newItemForm.reminderDays === days} onChange={e => setNewItemForm({...newItemForm, reminderDays: parseInt(e.target.value)})} />
                        {days} days before
                      </label>
                    ))}
                  </div>
                )}

                <div className="modal-buttons">
                  <button onClick={handleSaveNewItem} className="btn-primary">Save</button>
                  <button onClick={() => setShowAddItemModal(false)} className="btn-secondary">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "calendar" && (
        <div className="tab-content">
          <h2>📅 Planning Timeline</h2>
          {selectedCampaign?.planningItems.length === 0 ? (
            <p style={{ textAlign: "center", padding: "20px" }}>No planning items yet</p>
          ) : (
            <table className="gantt-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Start</th>
                  <th>End</th>
                  <th style={{ minWidth: "200px" }}>Timeline</th>
                </tr>
              </thead>
              <tbody>
                {selectedCampaign.planningItems.map(item => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.startDate}</td>
                    <td>{item.endDate}</td>
                    <td><div className={`gantt-bar status-${item.status}`}></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "budget" && (
        <div className="tab-content">
          {canEdit && (
            <button onClick={() => setShowAddBudgetModal(true)} className="btn-primary">
              + Add Budget Item
            </button>
          )}

          <div className="budget-summary">
            <h3>Total Budget: {selectedCampaign?.currency} {totalBudget.toFixed(2)}</h3>
          </div>

          <table className="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {selectedCampaign?.budgetItems.map(item => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{item.category}</td>
                  <td>{selectedCampaign.currency} {item.amount.toFixed(2)}</td>
                  {canEdit && (
                    <td>
                      <button onClick={() => handleDeleteBudgetItem(item.id)} className="btn-small btn-danger">Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {showAddBudgetModal && (
            <div className="modal-overlay" onClick={() => setShowAddBudgetModal(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <h2>Add Budget Item</h2>
                <input type="text" placeholder="Description" value={newBudgetItem.description} onChange={e => setNewBudgetItem({...newBudgetItem, description: e.target.value})} className="input-field" />
                <input type="number" placeholder="Amount" value={newBudgetItem.amount} onChange={e => setNewBudgetItem({...newBudgetItem, amount: e.target.value})} className="input-field" />
                <select value={newBudgetItem.category} onChange={e => setNewBudgetItem({...newBudgetItem, category: e.target.value})} className="input-field">
                  <option value="marketing">Marketing</option>
                  <option value="development">Development</option>
                  <option value="operations">Operations</option>
                  <option value="other">Other</option>
                </select>
                <div className="modal-buttons">
                  <button onClick={handleAddBudgetItem} className="btn-primary">Save</button>
                  <button onClick={() => setShowAddBudgetModal(false)} className="btn-secondary">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showCampaignSettings && selectedCampaign && (
        <div className="modal-overlay" onClick={() => setShowCampaignSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Campaign Settings</h2>
            
            <h3>Owners</h3>
            <div className="settings-list">
              {selectedCampaign.owners.map((owner, idx) => (
                <div key={idx} className="list-item">
                  {owner} {owner === user.email && <span style={{ fontSize: "12px", color: "#999" }}>(you)</span>}
                  <button onClick={() => handleRemoveOwner(idx)} className="btn-small btn-danger">Remove</button>
                </div>
              ))}
            </div>
            <input type="text" placeholder="Add new owner" value={newOwnerName} onChange={e => setNewOwnerName(e.target.value)} className="input-field" />
            <button onClick={handleAddOwner} className="btn-primary">Add Owner</button>

            <h3 style={{ marginTop: "20px" }}>Participants</h3>
            <div className="settings-list">
              {selectedCampaign.participants.map((p, idx) => (
                <div key={idx} className="list-item">
                  {p}
                  <button onClick={() => handleRemoveParticipant(idx)} className="btn-small btn-danger">Remove</button>
                </div>
              ))}
            </div>
            <input type="text" placeholder="Add new participant" value={newParticipantName} onChange={e => setNewParticipantName(e.target.value)} className="input-field" />
            <button onClick={handleAddParticipant} className="btn-primary">Add Participant</button>

            <div className="modal-buttons" style={{ marginTop: "20px" }}>
              <button onClick={() => setShowCampaignSettings(false)} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {showNewCampaignForm && canCreateCampaign && (
        <div className="modal-overlay" onClick={() => setShowNewCampaignForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Campaign</h2>
            <input type="text" placeholder="Campaign name" value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} className="input-field" />
            <div className="modal-buttons">
              <button onClick={handleCreateCampaign} className="btn-primary">Save</button>
              <button onClick={() => setShowNewCampaignForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}