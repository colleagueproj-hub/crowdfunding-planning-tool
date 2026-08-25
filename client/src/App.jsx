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
    category: "recordings",
    comment: "",
  });
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState("✓ Synced");
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const [newGiftItem, setNewGiftItem] = useState({
    name: "",
    price: "",
    cost: "",
    owners: [],
    comment: "",
    suggestedQuantity: "",
  });
  const [showAddGiftModal, setShowAddGiftModal] = useState(false);
  const [editingGiftId, setEditingGiftId] = useState(null);

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
    gifts: Array.isArray(campaign.gifts) ? campaign.gifts : [],
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

  useEffect(() => {
    if (selectedCampaign) {
      // Auto-sync when campaign changes
      const syncTimer = setTimeout(async () => {
        setSyncStatus("⏳ Auto-syncing...");
        const success = await saveCampaignToSheet(selectedCampaign);
        setSyncStatus(success ? "✓ Auto-synced" : "⚠️ Sync failed");
        setTimeout(() => setSyncStatus("✓ Synced"), 2000);
      }, 1000); // Sync 1 second after changes stop
      
      return () => clearTimeout(syncTimer);
    }
  }, [selectedCampaign]);

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
      // Automatically add to participants if not already there
      participants: selectedCampaign.participants.includes(newOwnerName) 
        ? selectedCampaign.participants 
        : [...selectedCampaign.participants, newOwnerName],
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
    
    // Validate: at least 1 owner
    if (newItemForm.owners.length === 0) {
      alert("Please select at least 1 owner");
      return;
    }
    
    // Determine participants: use selected or default to owners
    const participants = newItemForm.participants.length > 0 ? newItemForm.participants : newItemForm.owners;
    
    // Validate: at least 1 participant
    if (participants.length === 0) {
      alert("Please select at least 1 participant (or add owners first)");
      return;
    }

    const item = {
      id: `item_${Date.now()}`,
      name: newItemForm.name,
      startDate: newItemForm.startDate,
      endDate: newItemForm.endDate,
      status: newItemForm.status,
      owners: newItemForm.owners,
      participants: participants,
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
    
    // Validate: campaign must have at least 1 owner and 1 participant
    if (selectedCampaign.owners.length === 0) {
      alert("Please add at least 1 owner to the campaign first (go to Campaign Settings)");
      return;
    }
    
    if (selectedCampaign.participants.length === 0) {
      alert("Please add at least 1 participant to the campaign first (go to Campaign Settings)");
      return;
    }

    const budgetItem = {
      id: editingItemId || `budget_${Date.now()}`,
      description: newBudgetItem.description,
      amount: parseFloat(newBudgetItem.amount),
      category: newBudgetItem.category,
      comment: newBudgetItem.comment,
    };

    const updatedCampaign = {
      ...selectedCampaign,
      budgetItems: editingItemId
        ? selectedCampaign.budgetItems.map(b => b.id === editingItemId ? budgetItem : b)
        : [...selectedCampaign.budgetItems, budgetItem],
    };

    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
    setNewBudgetItem({ description: "", amount: "", category: "recordings", comment: "" });
    setEditingItemId(null);
    setShowAddBudgetModal(false);
  };

  const handleEditBudgetItem = (item) => {
    setNewBudgetItem({ description: item.description, amount: item.amount.toString(), category: item.category, comment: item.comment || "" });
    setEditingItemId(item.id);
    setShowAddBudgetModal(true);
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

  const handleAddGift = () => {
    if (!selectedCampaign || !newGiftItem.name.trim() || !newGiftItem.price || !newGiftItem.cost || newGiftItem.owners.length === 0 || !canEdit) {
      alert("Please fill in all fields and select at least 1 owner");
      return;
    }

    const gift = {
      id: editingGiftId || `gift_${Date.now()}`,
      name: newGiftItem.name,
      price: parseFloat(newGiftItem.price),
      cost: parseFloat(newGiftItem.cost),
      owners: newGiftItem.owners,
      comment: newGiftItem.comment,
      suggestedQuantity: newGiftItem.suggestedQuantity ? parseInt(newGiftItem.suggestedQuantity) : null,
    };

    const updatedCampaign = {
      ...selectedCampaign,
      gifts: editingGiftId
        ? selectedCampaign.gifts.map(g => g.id === editingGiftId ? gift : g)
        : [...selectedCampaign.gifts, gift],
    };

    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
    setNewGiftItem({ name: "", price: "", cost: "", owners: [], comment: "", suggestedQuantity: "" });
    setEditingGiftId(null);
    setShowAddGiftModal(false);
  };

  const handleEditGift = (gift) => {
    setNewGiftItem({ name: gift.name, price: gift.price.toString(), cost: gift.cost.toString(), owners: gift.owners, comment: gift.comment || "", suggestedQuantity: gift.suggestedQuantity ? gift.suggestedQuantity.toString() : "" });
    setEditingGiftId(gift.id);
    setShowAddGiftModal(true);
  };

  const handleDeleteGift = (giftId) => {
    if (!selectedCampaign || !canEdit) return;
    const updatedCampaign = {
      ...selectedCampaign,
      gifts: selectedCampaign.gifts.filter(g => g.id !== giftId),
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
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Weeping Willow Tree" style={{ width: "120px", height: "120px", borderRadius: "8px", marginBottom: "15px" }} onError={(e) => { e.target.style.display = 'none'; }} />
            <h1 style={{ marginBottom: "5px", color: "#d4af37" }}>Weeping Willow Tree</h1>
            <p style={{ marginBottom: "15px", fontSize: "14px", color: "#d4af37" }}>Crowd sourcing campaign</p>
          </div>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", flex: 1 }}>
            <span style={{ fontSize: "14px", color: "#d4af37" }}>{user.name} ({user.is_admin ? "Admin" : "User"})</span>
            <button onClick={handleLogout} className="btn-small">Logout</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", flex: 1, justifyContent: "center", flexDirection: "column" }}>
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" style={{ width: "150px", height: "150px", borderRadius: "6px" }} onError={(e) => { e.target.style.display = 'none'; }} />
            <div style={{ textAlign: "center" }}>
              <h1 style={{ marginBottom: "5px", whiteSpace: "nowrap" }}>Weeping Willow Tree</h1>
              <p style={{ marginBottom: "0", fontSize: "16px", color: "#d4af37" }}>Crowd sourcing campaign</p>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            <span className="sync-status">{syncStatus}</span>
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
          <button onClick={async () => { setSyncStatus("⏳ Syncing..."); const success = await saveCampaignToSheet(selectedCampaign); setSyncStatus(success ? "✓ Synced!" : "❌ Sync failed"); setTimeout(() => setSyncStatus("✓ Synced"), 3000); }} className="btn-small">🔄 Sync Now</button>
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
        <button className={`tab ${activeTab === "gifts" ? "active" : ""}`} onClick={() => setActiveTab("gifts")}>
          🎁 Gifts
        </button>
      </div>

      {activeTab === "plan" && (
        <div className="tab-content">
          {canEdit && (
            <>
              {selectedCampaign?.owners.length === 0 || selectedCampaign?.participants.length === 0 ? (
                <div style={{ background: "#4a4a4a", padding: "15px", borderRadius: "6px", marginBottom: "20px", border: "2px solid #d4af37" }}>
                  <p style={{ color: "#d4af37", fontWeight: "600", marginBottom: "10px" }}>⚠️ Before adding planning items, please:</p>
                  <ul style={{ color: "#ffffff", marginLeft: "20px", marginBottom: "10px" }}>
                    {selectedCampaign?.owners.length === 0 && <li>Add at least 1 owner in Campaign Settings</li>}
                    {selectedCampaign?.participants.length === 0 && <li>Add at least 1 participant in Campaign Settings</li>}
                  </ul>
                  <button onClick={() => setShowCampaignSettings(true)} className="btn-primary">
                    ⚙️ Go to Campaign Settings
                  </button>
                </div>
              ) : (
                <button onClick={() => {
                  setNewItemForm({ name: "", startDate: "", endDate: "", status: "not-started", owners: [], participants: [], reminderEnabled: false, reminderDays: 1 });
                  setEditingItemId(null);
                  setShowAddItemModal(true);
                }} className="btn-primary">
                  + Add Planning Item
                </button>
              )}
            </>
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
                
                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>📅 Start Date</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input 
                    type="text" 
                    readOnly 
                    value={newItemForm.startDate ? new Date(newItemForm.startDate).toLocaleDateString() : "Select date..."} 
                    className="input-field" 
                    style={{ flex: 1, cursor: "pointer", background: "#2a2a2a" }}
                    onClick={() => { setShowStartDatePicker(!showStartDatePicker); setPickerMonth(newItemForm.startDate ? new Date(newItemForm.startDate) : new Date()); }}
                  />
                </div>
                {showStartDatePicker && (
                  <div style={{ background: "#4a4a4a", padding: "15px", borderRadius: "6px", marginBottom: "15px", border: "1px solid #606060" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", color: "#ffffff" }}>
                      <button onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1))} className="btn-small" style={{ padding: "5px 10px" }}>←</button>
                      <span style={{ fontWeight: "600" }}>{pickerMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                      <button onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1))} className="btn-small" style={{ padding: "5px 10px" }}>→</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "5px", marginBottom: "10px" }}>
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                        <div key={day} style={{ textAlign: "center", color: "#d4af37", fontSize: "12px", fontWeight: "600" }}>{day}</div>
                      ))}
                      {Array.from({ length: new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1).getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {Array.from({ length: new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                        const date = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), i + 1);
                        // Format as YYYY-MM-DD in local timezone (no UTC conversion)
                        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        const today = new Date();
                        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                        const isSelected = newItemForm.startDate === dateStr;
                        const isToday = dateStr === todayStr;
                        return (
                          <button
                            key={i}
                            onClick={() => { setNewItemForm({...newItemForm, startDate: dateStr}); setShowStartDatePicker(false); }}
                            style={{
                              padding: "8px",
                              background: isSelected ? "#d4af37" : isToday ? "#5a6a7a" : "#3a3a3a",
                              color: isSelected ? "#1a1a1a" : "#ffffff",
                              border: isToday ? "2px solid #d4af37" : "1px solid #505050",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontWeight: isSelected || isToday ? "600" : "400"
                            }}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => setShowStartDatePicker(false)} className="btn-secondary" style={{ width: "100%" }}>Done</button>
                  </div>
                )}
                
                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>📅 End Date</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input 
                    type="text" 
                    readOnly 
                    value={newItemForm.endDate ? new Date(newItemForm.endDate).toLocaleDateString() : "Select date..."} 
                    className="input-field" 
                    style={{ flex: 1, cursor: "pointer", background: "#2a2a2a" }}
                    onClick={() => { setShowEndDatePicker(!showEndDatePicker); setPickerMonth(newItemForm.endDate ? new Date(newItemForm.endDate) : new Date()); }}
                  />
                </div>
                {showEndDatePicker && (
                  <div style={{ background: "#4a4a4a", padding: "15px", borderRadius: "6px", marginBottom: "15px", border: "1px solid #606060" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", color: "#ffffff" }}>
                      <button onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1))} className="btn-small" style={{ padding: "5px 10px" }}>←</button>
                      <span style={{ fontWeight: "600" }}>{pickerMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                      <button onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1))} className="btn-small" style={{ padding: "5px 10px" }}>→</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "5px", marginBottom: "10px" }}>
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                        <div key={day} style={{ textAlign: "center", color: "#d4af37", fontSize: "12px", fontWeight: "600" }}>{day}</div>
                      ))}
                      {Array.from({ length: new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1).getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {Array.from({ length: new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                        const date = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), i + 1);
                        // Format as YYYY-MM-DD in local timezone (no UTC conversion)
                        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        const today = new Date();
                        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                        const isSelected = newItemForm.endDate === dateStr;
                        const isToday = dateStr === todayStr;
                        return (
                          <button
                            key={i}
                            onClick={() => { setNewItemForm({...newItemForm, endDate: dateStr}); setShowEndDatePicker(false); }}
                            style={{
                              padding: "8px",
                              background: isSelected ? "#d4af37" : isToday ? "#5a6a7a" : "#3a3a3a",
                              color: isSelected ? "#1a1a1a" : "#ffffff",
                              border: isToday ? "2px solid #d4af37" : "1px solid #505050",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontWeight: isSelected || isToday ? "600" : "400"
                            }}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => setShowEndDatePicker(false)} className="btn-secondary" style={{ width: "100%" }}>Done</button>
                  </div>
                )}
                
                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Status</label>
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

                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>🔔 Reminder</label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={newItemForm.reminderEnabled} onChange={e => setNewItemForm({...newItemForm, reminderEnabled: e.target.checked})} />
                  Enable Reminder
                </label>

                {newItemForm.reminderEnabled && (
                  <div className="reminder-options">
                    {[1, 3, 5, 10].map(days => {
                      // Calculate reminder date
                      const startDate = new Date(newItemForm.startDate);
                      const reminderDate = new Date(startDate);
                      reminderDate.setDate(reminderDate.getDate() - days);
                      
                      // Get today's date
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      reminderDate.setHours(0, 0, 0, 0);
                      
                      // Disable if reminder date is today or before
                      const isDisabled = reminderDate <= today;
                      
                      return (
                        <label key={days} className="radio-label" style={{ opacity: isDisabled ? 0.5 : 1, cursor: isDisabled ? "not-allowed" : "pointer" }}>
                          <input 
                            type="radio" 
                            name="reminderDays" 
                            value={days} 
                            checked={newItemForm.reminderDays === days} 
                            onChange={e => setNewItemForm({...newItemForm, reminderDays: parseInt(e.target.value)})}
                            disabled={isDisabled}
                          />
                          {days} days before {isDisabled && <span style={{ fontSize: "12px", color: "#999" }}>(too late)</span>}
                        </label>
                      );
                    })}
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
          <h2>📅 Project Timeline & Gantt Chart</h2>
          {selectedCampaign?.planningItems.length === 0 ? (
            <p style={{ textAlign: "center", padding: "20px", color: "#ffffff" }}>No planning items yet</p>
          ) : (
            <div>
              {/* Calendar View */}
              <div style={{ marginBottom: "40px" }}>
                <h3 style={{ marginBottom: "15px", color: "#ffffff" }}>📆 Events by Month</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
                  {selectedCampaign.planningItems.map((item) => {
                    const startDate = new Date(item.startDate);
                    const endDate = new Date(item.endDate);
                    return (
                      <div key={item.id} style={{ background: "#4a4a4a", padding: "15px", borderRadius: "8px", border: "1px solid #606060" }}>
                        <div style={{ color: "#ffffff", fontWeight: "600", marginBottom: "8px" }}>{item.name}</div>
                        <div style={{ fontSize: "13px", color: "#ffffff", marginBottom: "5px" }}>
                          📅 {startDate.toLocaleDateString()} → {endDate.toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: "13px", color: "#ffffff", marginBottom: "5px" }}>
                          👥 {item.owners?.length || 0} owner(s), {item.participants?.length || 0} participant(s)
                        </div>
                        <div>
                          <span className={`badge status-${item.status}`}>{item.status}</span>
                          {item.reminderEnabled && <span style={{ marginLeft: "8px", fontSize: "12px", color: "#ffffff" }}>🔔 {item.reminderDays}d reminder</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gantt Chart */}
              <div>
                <h3 style={{ marginBottom: "15px", color: "#ffffff" }}>📊 Gantt Chart Timeline</h3>
                <div style={{ overflowX: "auto", paddingBottom: "20px" }}>
                  {selectedCampaign.planningItems.length === 0 ? (
                    <div style={{ color: "#d4af37", textAlign: "center", padding: "20px" }}>No planning items to display</div>
                  ) : (
                    <div>
                      {(() => {
                        // Calculate the date range from all planning items
                        const dates = selectedCampaign.planningItems.flatMap(item => [
                          new Date(item.startDate),
                          new Date(item.endDate)
                        ]);
                        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
                        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
                        
                        // Add padding: start 5 days before earliest, end 5 days after latest
                        minDate.setDate(minDate.getDate() - 5);
                        maxDate.setDate(maxDate.getDate() + 5);
                        
                        // Calculate total days to display
                        const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

                        return (
                          <>
                            {/* Timeline Header */}
                            <div style={{ display: "flex", marginBottom: "20px", fontSize: "11px", color: "#ffffff", paddingLeft: "200px" }}>
                              {Array.from({ length: totalDays }).map((_, i) => {
                                const dateObj = new Date(minDate);
                                dateObj.setDate(dateObj.getDate() + i);
                                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                const isFirstOfMonth = dateObj.getDate() === 1;
                                return (
                                  <div 
                                    key={i} 
                                    style={{ 
                                      flex: 1, 
                                      textAlign: "center", 
                                      borderRight: "1px solid #505050", 
                                      paddingRight: "5px",
                                      background: isFirstOfMonth ? "#3a4a3a" : "transparent",
                                      padding: "4px 0"
                                    }}
                                  >
                                    {dateStr}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Gantt Bars */}
                            {selectedCampaign.planningItems.map((item) => {
                              const startDate = new Date(item.startDate);
                              const endDate = new Date(item.endDate);
                              
                              // Calculate position and width relative to the displayed timeline
                              const daysFromStart = Math.floor((startDate - minDate) / (1000 * 60 * 60 * 24));
                              const durationDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
                              
                              const barStartPercent = (daysFromStart / totalDays) * 100;
                              const barWidthPercent = (durationDays / totalDays) * 100;

                              return (
                                <div key={item.id} style={{ display: "flex", alignItems: "center", marginBottom: "15px", fontSize: "13px" }}>
                                  <div style={{ width: "200px", color: "#ffffff", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", fontSize: "13px" }}>
                                    {item.name}
                                  </div>
                                  <div style={{ flex: 1, display: "flex", position: "relative", height: "40px", alignItems: "center" }}>
                                    {/* Background grid */}
                                    {Array.from({ length: totalDays }).map((_, i) => (
                                      <div key={i} style={{ flex: 1, borderRight: "1px solid #505050", height: "100%" }} />
                                    ))}
                                    
                                    {/* Bar */}
                                    {barStartPercent < 100 && (
                                      <div
                                        style={{
                                          position: "absolute",
                                          left: `${barStartPercent}%`,
                                          width: `${barWidthPercent}%`,
                                          height: "30px",
                                          background: item.status === "completed" ? "#3a5a3a" : item.status === "in-progress" ? "#d4af37" : "#6a6a6a",
                                          borderRadius: "4px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          color: item.status === "in-progress" ? "#1a1a1a" : "#ffffff",
                                          fontSize: "11px",
                                          fontWeight: "600",
                                          border: "1px solid #707070",
                                          minWidth: "40px",
                                          overflow: "hidden"
                                        }}
                                      >
                                        {durationDays}d
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div style={{ marginTop: "20px", padding: "15px", background: "#4a4a4a", borderRadius: "6px", display: "flex", gap: "20px", flexWrap: "wrap", fontSize: "13px", color: "#ffffff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "20px", height: "20px", background: "#6a6a6a", borderRadius: "3px" }}></div>
                    Not Started
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "20px", height: "20px", background: "#d4af37", borderRadius: "3px" }}></div>
                    In Progress
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "20px", height: "20px", background: "#3a5a3a", borderRadius: "3px" }}></div>
                    Completed
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "budget" && (
        <div className="tab-content">
          {canEdit && (
            <>
              {selectedCampaign?.owners.length === 0 || selectedCampaign?.participants.length === 0 ? (
                <div style={{ background: "#4a4a4a", padding: "15px", borderRadius: "6px", marginBottom: "20px", border: "2px solid #d4af37" }}>
                  <p style={{ color: "#d4af37", fontWeight: "600", marginBottom: "10px" }}>⚠️ Before adding budget items, please:</p>
                  <ul style={{ color: "#ffffff", marginLeft: "20px", marginBottom: "10px" }}>
                    {selectedCampaign?.owners.length === 0 && <li>Add at least 1 owner in Campaign Settings</li>}
                    {selectedCampaign?.participants.length === 0 && <li>Add at least 1 participant in Campaign Settings</li>}
                  </ul>
                  <button onClick={() => setShowCampaignSettings(true)} className="btn-primary">
                    ⚙️ Go to Campaign Settings
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowAddBudgetModal(true)} className="btn-primary">
                  + Add Budget Item
                </button>
              )}
            </>
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
                <th>Comment</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {selectedCampaign?.budgetItems.map(item => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{item.category}</td>
                  <td>{selectedCampaign.currency} {item.amount.toFixed(2)}</td>
                  <td>{item.comment || "-"}</td>
                  {canEdit && (
                    <td>
                      <button onClick={() => handleEditBudgetItem(item)} className="btn-small">Edit</button>
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
                <h2>{editingItemId ? "Edit Budget Item" : "Add Budget Item"}</h2>
                <input type="text" placeholder="Description" value={newBudgetItem.description} onChange={e => setNewBudgetItem({...newBudgetItem, description: e.target.value})} className="input-field" />
                <input type="number" placeholder="Amount" value={newBudgetItem.amount} onChange={e => setNewBudgetItem({...newBudgetItem, amount: e.target.value})} className="input-field" />
                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Category</label>
                <select value={newBudgetItem.category} onChange={e => setNewBudgetItem({...newBudgetItem, category: e.target.value})} className="input-field">
                  <option value="recordings">Recordings</option>
                  <option value="visual">Visual</option>
                  <option value="live">Live</option>
                  <option value="merchandise">Merchandise</option>
                  <option value="other">Other</option>
                </select>
                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Comment</label>
                <textarea placeholder="Add a comment (optional)" value={newBudgetItem.comment} onChange={e => setNewBudgetItem({...newBudgetItem, comment: e.target.value})} className="input-field" style={{ minHeight: "80px", fontFamily: "inherit", resize: "vertical" }} />
                <div className="modal-buttons">
                  <button onClick={handleAddBudgetItem} className="btn-primary">Save</button>
                  <button onClick={() => setShowAddBudgetModal(false)} className="btn-secondary">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "gifts" && (
        <div className="tab-content">
          {canEdit && (
            <>
              {selectedCampaign?.participants.length === 0 ? (
                <div style={{ background: "#4a4a4a", padding: "15px", borderRadius: "6px", marginBottom: "20px", border: "2px solid #d4af37" }}>
                  <p style={{ color: "#d4af37", fontWeight: "600", marginBottom: "10px" }}>⚠️ Before adding gifts, please:</p>
                  <ul style={{ color: "#ffffff", marginLeft: "20px", marginBottom: "10px" }}>
                    <li>Add at least 1 participant in Campaign Settings</li>
                  </ul>
                  <button onClick={() => setShowCampaignSettings(true)} className="btn-primary">
                    ⚙️ Go to Campaign Settings
                  </button>
                </div>
              ) : (
                <button onClick={() => { setNewGiftItem({ name: "", price: "", cost: "", owners: [], comment: "" }); setEditingGiftId(null); setShowAddGiftModal(true); }} className="btn-primary">
                  + Add Gift
                </button>
              )}
            </>
          )}

          <table className="items-table">
            <thead>
              <tr>
                <th>Gift Name</th>
                <th>Price</th>
                <th>Cost</th>
                <th>Suggested Quantity</th>
                <th>Estimated Profit</th>
                <th>Owners</th>
                <th>Comment</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {selectedCampaign?.gifts && selectedCampaign.gifts.length > 0 ? (
                selectedCampaign.gifts.map(gift => {
                  const estimatedProfit = gift.suggestedQuantity ? (gift.price * gift.suggestedQuantity) : 0;
                  return (
                  <tr key={gift.id}>
                    <td>{gift.name}</td>
                    <td>{selectedCampaign.currency} {gift.price.toFixed(2)}</td>
                    <td>{selectedCampaign.currency} {gift.cost.toFixed(2)}</td>
                    <td>{gift.suggestedQuantity || "-"}</td>
                    <td>{selectedCampaign.currency} {estimatedProfit.toFixed(2)}</td>
                    <td>{gift.owners.join(", ")}</td>
                    <td>{gift.comment || "-"}</td>
                    {canEdit && (
                      <td>
                        <button onClick={() => handleEditGift(gift)} className="btn-small">Edit</button>
                        <button onClick={() => handleDeleteGift(gift.id)} className="btn-small btn-danger">Delete</button>
                      </td>
                    )}
                  </tr>
                );
                })
              ) : (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} style={{ textAlign: "center", color: "#d4af37" }}>No gifts added yet</td>
                </tr>
              )}
            </tbody>
          </table>

          {showAddGiftModal && selectedCampaign && (
            <div className="modal-overlay" onClick={() => setShowAddGiftModal(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <h2>{editingGiftId ? "Edit Gift" : "Add Gift"}</h2>
                <input type="text" placeholder="Gift name" value={newGiftItem.name} onChange={e => setNewGiftItem({...newGiftItem, name: e.target.value})} className="input-field" />
                <input type="number" placeholder="Price" value={newGiftItem.price} onChange={e => setNewGiftItem({...newGiftItem, price: e.target.value})} className="input-field" />
                <input type="number" placeholder="Cost" value={newGiftItem.cost} onChange={e => setNewGiftItem({...newGiftItem, cost: e.target.value})} className="input-field" />
                <input type="number" placeholder="Suggested Quantity (optional)" value={newGiftItem.suggestedQuantity} onChange={e => setNewGiftItem({...newGiftItem, suggestedQuantity: e.target.value})} className="input-field" />

                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Gift Owner(s):</label>
                <div className="checkbox-group">
                  {selectedCampaign.participants.map(p => (
                    <label key={p} className="checkbox-label">
                      <input type="checkbox" checked={newGiftItem.owners.includes(p)} onChange={e => { if (e.target.checked) { setNewGiftItem({...newGiftItem, owners: [...newGiftItem.owners, p]}); } else { setNewGiftItem({...newGiftItem, owners: newGiftItem.owners.filter(x => x !== p)}); } }} />
                      {p}
                    </label>
                  ))}
                </div>

                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Comment</label>
                <textarea placeholder="Add a comment (optional)" value={newGiftItem.comment} onChange={e => setNewGiftItem({...newGiftItem, comment: e.target.value})} className="input-field" style={{ minHeight: "80px", fontFamily: "inherit", resize: "vertical" }} />

                <div className="modal-buttons">
                  <button onClick={handleAddGift} className="btn-primary">Save</button>
                  <button onClick={() => setShowAddGiftModal(false)} className="btn-secondary">Cancel</button>
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