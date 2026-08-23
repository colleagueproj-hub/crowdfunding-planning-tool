import React, { useState, useEffect } from "react";
import "./styles.css";
import { ConfigModal } from "./ConfigModal";
import { 
  extractSheetId, 
  fetchCampaignsFromSheet, 
  getStoredSheetUrl, 
  storeSheetUrl,
  getCachedCampaigns,
  openSheetInGoogle
} from "./googleSheetsUtils";

function App() {
  const [sheetUrl, setSheetUrl] = useState(getStoredSheetUrl() || '');
  const [showConfigModal, setShowConfigModal] = useState(!sheetUrl);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [activeTab, setActiveTab] = useState("plan");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [planningItems, setPlanningItems] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemForm, setNewItemForm] = useState({ name: "", owners: [], participants: [], startDate: "", endDate: "", reminderEnabled: false, reminderDays: 1 });
  const [settingsData, setSettingsData] = useState({ owners: [], participants: [], newOwner: "", newParticipant: "" });
  const [loading, setLoading] = useState(false);

  // Load campaigns on mount or when sheet URL changes
  useEffect(() => {
    if (sheetUrl) {
      fetchCampaigns();
    }
  }, [sheetUrl]);

  // Initialize campaign settings when campaign is selected
  useEffect(() => {
    if (selectedCampaignId) {
      const campaign = campaigns.find(c => c.id === selectedCampaignId);
      if (campaign) {
        setSettingsData({
          owners: campaign.owners || [],
          participants: campaign.participants || [],
          newOwner: "",
          newParticipant: ""
        });
        // Load planning and budget items from campaign
        setPlanningItems(campaign.planningItems || []);
        setBudgetItems(campaign.budgetItems || []);
      }
    }
  }, [selectedCampaignId, campaigns]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const sheetId = extractSheetId(sheetUrl);
      if (!sheetId) {
        throw new Error("Invalid sheet URL");
      }
      const data = await fetchCampaignsFromSheet(sheetId);
      setCampaigns(data);
      if (data.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(data[0].id);
      }
      setMessageType("success");
      setMessage("✅ Campaigns synced from Google Sheets");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
      // Try to use cached data
      const cached = getCachedCampaigns();
      if (cached.length > 0) {
        setCampaigns(cached);
        setMessageType("warning");
        setMessage("⚠️ Using cached data (offline mode)");
      } else {
        setMessageType("error");
        setMessage("❌ Failed to sync campaigns");
      }
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSheetUrl = async (url) => {
    storeSheetUrl(url);
    setSheetUrl(url);
    setShowConfigModal(false);
  };

  const getCurrentCampaign = () => campaigns.find(c => c.id === selectedCampaignId);

  const handleCreateCampaign = async () => {
    const name = prompt("Enter campaign name:");
    if (!name) return;

    try {
      const newCampaign = {
        id: `campaign_${Date.now()}`,
        name: name.trim(),
        currency: "ILS",
        owners: [],
        participants: [],
        planningItems: [],
        budgetItems: [],
        created_at: new Date().toISOString()
      };

      const updatedCampaigns = [...campaigns, newCampaign];
      setCampaigns(updatedCampaigns);
      setSelectedCampaignId(newCampaign.id);
      
      setMessageType("success");
      setMessage(`✅ Campaign "${name}" created! (Local - refresh to sync to sheet)`);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessageType("error");
      setMessage("❌ Error creating campaign");
    }
  };

  const handleAddOwner = () => {
    if (!settingsData.newOwner.trim()) return;
    
    const updatedOwners = [...settingsData.owners, settingsData.newOwner.trim()];
    setSettingsData({ ...settingsData, owners: updatedOwners, newOwner: "" });
    
    const campaign = getCurrentCampaign();
    setCampaigns(campaigns.map(c => 
      c.id === campaign.id ? { ...c, owners: updatedOwners } : c
    ));
    
    setMessageType("success");
    setMessage("✅ Owner added!");
    setTimeout(() => setMessage(""), 2000);
  };

  const handleRemoveOwner = (owner) => {
    const updatedOwners = settingsData.owners.filter(o => o !== owner);
    setSettingsData({ ...settingsData, owners: updatedOwners });
    
    const campaign = getCurrentCampaign();
    setCampaigns(campaigns.map(c => 
      c.id === campaign.id ? { ...c, owners: updatedOwners } : c
    ));
  };

  const handleAddParticipant = () => {
    if (!settingsData.newParticipant.trim()) return;
    
    const updatedParticipants = [...settingsData.participants, settingsData.newParticipant.trim()];
    setSettingsData({ ...settingsData, participants: updatedParticipants, newParticipant: "" });
    
    const campaign = getCurrentCampaign();
    setCampaigns(campaigns.map(c => 
      c.id === campaign.id ? { ...c, participants: updatedParticipants } : c
    ));
    
    setMessageType("success");
    setMessage("✅ Participant added!");
    setTimeout(() => setMessage(""), 2000);
  };

  const handleRemoveParticipant = (participant) => {
    const updatedParticipants = settingsData.participants.filter(p => p !== participant);
    setSettingsData({ ...settingsData, participants: updatedParticipants });
    
    const campaign = getCurrentCampaign();
    setCampaigns(campaigns.map(c => 
      c.id === campaign.id ? { ...c, participants: updatedParticipants } : c
    ));
  };

  const handleOpenAddItemModal = () => {
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7*24*60*60*1000).toISOString().split("T")[0];
    setNewItemForm({ name: "", owners: [], participants: [], startDate: today, endDate: nextWeek, reminderEnabled: false, reminderDays: 1 });
    setShowAddItemModal(true);
  };

  const handleToggleOwner = (owner, isAdding) => {
    let updatedOwners;
    if (isAdding) {
      updatedOwners = [...newItemForm.owners, owner];
    } else {
      updatedOwners = newItemForm.owners.filter(o => o !== owner);
    }
    setNewItemForm({ ...newItemForm, owners: updatedOwners });
  };

  const handleToggleParticipant = (participant, isAdding) => {
    let updatedParticipants;
    if (isAdding) {
      updatedParticipants = [...newItemForm.participants, participant];
    } else {
      updatedParticipants = newItemForm.participants.filter(p => p !== participant);
    }
    setNewItemForm({ ...newItemForm, participants: updatedParticipants });
  };

  const handleToggleEditOwner = (owner, isAdding) => {
    let updatedOwners;
    if (isAdding) {
      updatedOwners = [...(editFormData.owners || []), owner];
    } else {
      updatedOwners = (editFormData.owners || []).filter(o => o !== owner);
    }
    setEditFormData({ ...editFormData, owners: updatedOwners });
  };

  const handleToggleEditParticipant = (participant, isAdding) => {
    let updatedParticipants;
    if (isAdding) {
      updatedParticipants = [...(editFormData.participants || []), participant];
    } else {
      updatedParticipants = (editFormData.participants || []).filter(p => p !== participant);
    }
    setEditFormData({ ...editFormData, participants: updatedParticipants });
  };

  const handleSaveNewItem = () => {
    if (!newItemForm.name.trim()) {
      setMessageType("error");
      setMessage("❌ Please enter an item name");
      return;
    }

    if (newItemForm.owners.length === 0) {
      setMessageType("error");
      setMessage("❌ Please select at least one owner");
      return;
    }

    const item = {
      id: Math.random(),
      name: newItemForm.name.trim(),
      startDate: newItemForm.startDate,
      endDate: newItemForm.endDate,
      owners: newItemForm.owners,
      participants: newItemForm.participants.length > 0 ? newItemForm.participants : newItemForm.owners,
      type: "Task",
      status: "not_started",
      reminderEnabled: newItemForm.reminderEnabled,
      reminderDays: newItemForm.reminderDays
    };

    const updatedItems = [...planningItems, item];
    setPlanningItems(updatedItems);
    
    // Update campaign with new items
    const campaign = getCurrentCampaign();
    setCampaigns(campaigns.map(c => 
      c.id === campaign.id ? { ...c, planningItems: updatedItems } : c
    ));

    setShowAddItemModal(false);
    setMessageType("success");
    setMessage(`✅ Planning item "${item.name}" added!`);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleEditItem = (item) => {
    setEditingItemId(item.id);
    setEditFormData({ ...item });
  };

  const handleSaveEdit = () => {
    if (new Date(editFormData.endDate) < new Date(editFormData.startDate)) {
      setMessageType("error");
      setMessage("❌ End date cannot be before start date!");
      return;
    }

    const updatedItems = planningItems.map(item => 
      item.id === editingItemId ? editFormData : item
    );
    setPlanningItems(updatedItems);
    
    // Update campaign
    const campaign = getCurrentCampaign();
    setCampaigns(campaigns.map(c => 
      c.id === campaign.id ? { ...c, planningItems: updatedItems } : c
    ));
    
    setEditingItemId(null);
    setEditFormData({});
    setMessageType("success");
    setMessage("✅ Planning item updated!");
    setTimeout(() => setMessage(""), 3000);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditFormData({});
  };

  const handleAddBudgetItem = () => {
    const item = prompt("Enter item name:");
    if (!item) return;

    const budget = parseFloat(prompt("Enter budget amount:") || "0");

    const budgetItem = {
      id: Math.random(),
      item,
      budget,
      details: prompt("Enter details (optional):") || ""
    };

    const updatedBudgetItems = [...budgetItems, budgetItem];
    setBudgetItems(updatedBudgetItems);

    // Update campaign
    const campaign = getCurrentCampaign();
    setCampaigns(campaigns.map(c => 
      c.id === campaign.id ? { ...c, budgetItems: updatedBudgetItems } : c
    ));

    setMessageType("success");
    setMessage(`✅ Budget item "${item}" added!`);
    setTimeout(() => setMessage(""), 3000);
  };

  const deletePlanningItem = (id) => {
    const updatedItems = planningItems.filter(item => item.id !== id);
    setPlanningItems(updatedItems);

    // Update campaign
    const campaign = getCurrentCampaign();
    setCampaigns(campaigns.map(c => 
      c.id === campaign.id ? { ...c, planningItems: updatedItems } : c
    ));

    setMessageType("success");
    setMessage("✅ Planning item deleted!");
    setTimeout(() => setMessage(""), 3000);
  };

  const deleteBudgetItem = (id) => {
    const updatedItems = budgetItems.filter(item => item.id !== id);
    setBudgetItems(updatedItems);

    // Update campaign
    const campaign = getCurrentCampaign();
    setCampaigns(campaigns.map(c => 
      c.id === campaign.id ? { ...c, budgetItems: updatedItems } : c
    ));

    setMessageType("success");
    setMessage("✅ Budget item deleted!");
    setTimeout(() => setMessage(""), 3000);
  };

  const totalBudget = budgetItems.reduce((sum, item) => sum + (item.budget || 0), 0);
  const campaign = getCurrentCampaign();

  // Show config modal if no sheet URL
  if (!sheetUrl) {
    return (
      <div className="app-container">
        <ConfigModal 
          isOpen={true}
          onClose={() => {}}
          onSheetUrlSubmit={handleConfigSheetUrl}
          currentSheetUrl={sheetUrl}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1>🚀 Crowdfunding Planning Tool</h1>
        <div className="header-controls">
          {campaigns.length > 0 && (
            <select 
              value={selectedCampaignId || ""}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="campaign-selector"
            >
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {campaign && (
            <button className="btn btn-secondary" onClick={() => setShowSettingsModal(true)}>
              ⚙️ Campaign Settings
            </button>
          )}
          <button className="btn btn-primary" onClick={handleCreateCampaign}>
            + New Campaign
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowConfigModal(true)}
            style={{ background: "#2980b9" }}
          >
            🔗 Sheet Settings
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => fetchCampaigns()}
            disabled={loading}
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            🔄 Sync
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${messageType}`}>
          {message}
        </div>
      )}

      <ConfigModal 
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSheetUrlSubmit={handleConfigSheetUrl}
        currentSheetUrl={sheetUrl}
      />

      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: "600px"}}>
            <div className="modal-header">
              <h2>Campaign Settings</h2>
              <button className="modal-close" onClick={() => setShowSettingsModal(false)}>×</button>
            </div>

            <h3 style={{marginTop: "20px", marginBottom: "15px"}}>👥 Campaign Owners</h3>
            <p style={{fontSize: "13px", color: "#666", marginBottom: "10px"}}>
              Add team members who can own planning items and receive notifications
            </p>
            
            <div style={{display: "flex", gap: "8px", marginBottom: "15px"}}>
              <input 
                type="text"
                placeholder="Enter owner name"
                value={settingsData.newOwner}
                onChange={(e) => setSettingsData({...settingsData, newOwner: e.target.value})}
                onKeyPress={(e) => e.key === "Enter" && handleAddOwner()}
                style={{flex: 1, padding: "8px", border: "1px solid #ddd", borderRadius: "4px"}}
              />
              <button className="btn btn-primary" onClick={handleAddOwner}>Add Owner</button>
            </div>

            {settingsData.owners.length > 0 && (
              <div style={{marginBottom: "20px"}}>
                {settingsData.owners.map(owner => (
                  <div 
                    key={owner}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px",
                      background: "#eef5ff",
                      marginBottom: "8px",
                      borderRadius: "4px"
                    }}
                  >
                    <span>{owner}</span>
                    <button 
                      className="btn btn-danger btn-small"
                      onClick={() => handleRemoveOwner(owner)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <h3 style={{marginTop: "30px", marginBottom: "15px"}}>👫 Team Participants</h3>
            <p style={{fontSize: "13px", color: "#666", marginBottom: "10px"}}>
              Add team members for tracking and collaboration
            </p>

            <div style={{display: "flex", gap: "8px", marginBottom: "15px"}}>
              <input 
                type="text"
                placeholder="Enter participant name"
                value={settingsData.newParticipant}
                onChange={(e) => setSettingsData({...settingsData, newParticipant: e.target.value})}
                onKeyPress={(e) => e.key === "Enter" && handleAddParticipant()}
                style={{flex: 1, padding: "8px", border: "1px solid #ddd", borderRadius: "4px"}}
              />
              <button className="btn btn-primary" onClick={handleAddParticipant}>Add Participant</button>
            </div>

            {settingsData.participants.length > 0 && (
              <div style={{marginBottom: "20px"}}>
                {settingsData.participants.map(participant => (
                  <div 
                    key={participant}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px",
                      background: "#eefce7",
                      marginBottom: "8px",
                      borderRadius: "4px"
                    }}
                  >
                    <span>{participant}</span>
                    <button 
                      className="btn btn-danger btn-small"
                      onClick={() => handleRemoveParticipant(participant)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowSettingsModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddItemModal && (
        <div className="modal-overlay" onClick={() => setShowAddItemModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxHeight: "90vh", overflowY: "auto"}}>
            <div className="modal-header">
              <h2>Add Planning Item</h2>
              <button className="modal-close" onClick={() => setShowAddItemModal(false)}>×</button>
            </div>

            <div className="form-group">
              <label>Item Name <span className="required">*</span></label>
              <input 
                type="text"
                placeholder="Enter planning item name"
                value={newItemForm.name}
                onChange={(e) => setNewItemForm({...newItemForm, name: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Owners <span className="required">*</span></label>
              <p style={{fontSize: "13px", color: "#666", marginBottom: "10px"}}>
                Select one or more owners:
              </p>
              <div style={{background: "#f9f9f9", padding: "10px", borderRadius: "4px", border: "1px solid #ddd"}}>
                {settingsData.owners.length === 0 ? (
                  <p style={{color: "#999", fontSize: "13px"}}>No owners added. Go to Campaign Settings first.</p>
                ) : (
                  settingsData.owners.map(owner => (
                    <div key={owner} style={{marginBottom: "8px", display: "flex", alignItems: "center"}}>
                      <input 
                        type="checkbox"
                        id={`owner-${owner}`}
                        checked={newItemForm.owners.includes(owner)}
                        onChange={(e) => handleToggleOwner(owner, e.target.checked)}
                        style={{marginRight: "8px", cursor: "pointer"}}
                      />
                      <label htmlFor={`owner-${owner}`} style={{cursor: "pointer"}}>
                        {owner}
                      </label>
                    </div>
                  ))
                )}
              </div>
              {newItemForm.owners.length > 0 && (
                <p style={{fontSize: "12px", color: "#27ae60", marginTop: "8px"}}>
                  ✓ Selected: {newItemForm.owners.join(", ")}
                </p>
              )}
            </div>

            <div className="form-group">
              <label>Participants</label>
              <p style={{fontSize: "13px", color: "#666", marginBottom: "10px"}}>
                Select participants involved (optional):
              </p>
              <div style={{background: "#f9f9f9", padding: "10px", borderRadius: "4px", border: "1px solid #ddd"}}>
                {settingsData.participants.length === 0 ? (
                  <p style={{color: "#999", fontSize: "13px"}}>No participants added.</p>
                ) : (
                  settingsData.participants.map(participant => (
                    <div key={participant} style={{marginBottom: "8px", display: "flex", alignItems: "center"}}>
                      <input 
                        type="checkbox"
                        id={`participant-${participant}`}
                        checked={newItemForm.participants.includes(participant)}
                        onChange={(e) => handleToggleParticipant(participant, e.target.checked)}
                        style={{marginRight: "8px", cursor: "pointer"}}
                      />
                      <label htmlFor={`participant-${participant}`} style={{cursor: "pointer"}}>
                        {participant}
                      </label>
                    </div>
                  ))
                )}
              </div>
              {newItemForm.participants.length > 0 && (
                <p style={{fontSize: "12px", color: "#27ae60", marginTop: "8px"}}>
                  ✓ Selected: {newItemForm.participants.join(", ")}
                </p>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input 
                  type="date"
                  value={newItemForm.startDate}
                  onChange={(e) => setNewItemForm({...newItemForm, startDate: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>End Date</label>
                <input 
                  type="date"
                  value={newItemForm.endDate}
                  onChange={(e) => setNewItemForm({...newItemForm, endDate: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group" style={{marginTop: "20px", padding: "15px", background: "#f5f5f5", borderRadius: "4px"}}>
              <label style={{display: "flex", alignItems: "center", cursor: "pointer", marginBottom: "10px"}}>
                <input 
                  type="checkbox"
                  checked={newItemForm.reminderEnabled}
                  onChange={(e) => setNewItemForm({...newItemForm, reminderEnabled: e.target.checked})}
                  style={{marginRight: "8px", cursor: "pointer", width: "16px", height: "16px"}}
                />
                <span style={{fontWeight: "bold"}}>🔔 Enable Reminder</span>
              </label>
              
              {newItemForm.reminderEnabled && (
                <div style={{marginTop: "12px"}}>
                  <p style={{fontSize: "13px", color: "#666", marginBottom: "10px"}}>
                    Send reminder this many days before start date:
                  </p>
                  <div style={{display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px"}}>
                    {[1, 3, 5, 10].map(days => (
                      <button
                        key={days}
                        onClick={() => setNewItemForm({...newItemForm, reminderDays: days})}
                        style={{
                          padding: "10px",
                          border: newItemForm.reminderDays === days ? "2px solid #2980b9" : "1px solid #ddd",
                          background: newItemForm.reminderDays === days ? "#eef5ff" : "#fff",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontWeight: newItemForm.reminderDays === days ? "bold" : "normal",
                          color: newItemForm.reminderDays === days ? "#2980b9" : "#333",
                          transition: "all 0.2s"
                        }}
                      >
                        {days} {days === 1 ? "day" : "days"}
                      </button>
                    ))}
                  </div>
                  <p style={{fontSize: "12px", color: "#27ae60", marginTop: "10px"}}>
                    ✓ Reminder set for {newItemForm.reminderDays} day{newItemForm.reminderDays !== 1 ? "s" : ""} before
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddItemModal(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handleSaveNewItem}>Create Item</button>
            </div>
          </div>
        </div>
      )}

      {selectedCampaignId && (
        <>
          <div className="dashboard">
            <div className="dashboard-card">
              <h3>Planning Items</h3>
              <div className="value">{planningItems.length}</div>
            </div>
            <div className="dashboard-card">
              <h3>Budget Items</h3>
              <div className="value">{budgetItems.length}</div>
            </div>
            <div className="dashboard-card">
              <h3>Owners</h3>
              <div className="value">{settingsData.owners.length}</div>
            </div>
            <div className="dashboard-card">
              <h3>Total Budget</h3>
              <div className="value">₪{totalBudget.toFixed(2)}</div>
            </div>
          </div>

          <nav className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === "plan" ? "active" : ""}`}
              onClick={() => setActiveTab("plan")}
            >
              📋 Plan
            </button>
            <button 
              className={`tab-button ${activeTab === "calendar" ? "active" : ""}`}
              onClick={() => setActiveTab("calendar")}
            >
              📅 Calendar & Gantt
            </button>
            <button 
              className={`tab-button ${activeTab === "budget" ? "active" : ""}`}
              onClick={() => setActiveTab("budget")}
            >
              💰 Budget
            </button>
          </nav>

          <div className="tab-content">
            {activeTab === "plan" && (
              <div>
                <h2>Planning Items</h2>
                <button className="btn btn-primary" onClick={handleOpenAddItemModal} style={{marginBottom: "20px"}}>
                  + Add Planning Item
                </button>

                {editingItemId && (
                  <div className="modal-overlay" onClick={handleCancelEdit}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxHeight: "90vh", overflowY: "auto"}}>
                      <div className="modal-header">
                        <h2>Edit Planning Item</h2>
                        <button className="modal-close" onClick={handleCancelEdit}>×</button>
                      </div>
                      
                      <div className="form-group">
                        <label>Item Name</label>
                        <input 
                          type="text"
                          value={editFormData.name || ""}
                          onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                        />
                      </div>

                      <div className="form-group">
                        <label>Owners</label>
                        <p style={{fontSize: "13px", color: "#666", marginBottom: "10px"}}>
                          Select one or more owners:
                        </p>
                        <div style={{background: "#f9f9f9", padding: "10px", borderRadius: "4px", border: "1px solid #ddd"}}>
                          {settingsData.owners.map(owner => (
                            <div key={owner} style={{marginBottom: "8px", display: "flex", alignItems: "center"}}>
                              <input 
                                type="checkbox"
                                id={`edit-owner-${owner}`}
                                checked={(editFormData.owners || []).includes(owner)}
                                onChange={(e) => handleToggleEditOwner(owner, e.target.checked)}
                                style={{marginRight: "8px", cursor: "pointer"}}
                              />
                              <label htmlFor={`edit-owner-${owner}`} style={{cursor: "pointer"}}>
                                {owner}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Participants</label>
                        <p style={{fontSize: "13px", color: "#666", marginBottom: "10px"}}>
                          Select participants (optional):
                        </p>
                        <div style={{background: "#f9f9f9", padding: "10px", borderRadius: "4px", border: "1px solid #ddd"}}>
                          {settingsData.participants.map(participant => (
                            <div key={participant} style={{marginBottom: "8px", display: "flex", alignItems: "center"}}>
                              <input 
                                type="checkbox"
                                id={`edit-participant-${participant}`}
                                checked={(editFormData.participants || []).includes(participant)}
                                onChange={(e) => handleToggleEditParticipant(participant, e.target.checked)}
                                style={{marginRight: "8px", cursor: "pointer"}}
                              />
                              <label htmlFor={`edit-participant-${participant}`} style={{cursor: "pointer"}}>
                                {participant}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Start Date</label>
                          <input 
                            type="date"
                            value={editFormData.startDate || ""}
                            onChange={(e) => setEditFormData({...editFormData, startDate: e.target.value})}
                          />
                        </div>

                        <div className="form-group">
                          <label>End Date</label>
                          <input 
                            type="date"
                            value={editFormData.endDate || ""}
                            onChange={(e) => setEditFormData({...editFormData, endDate: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Status</label>
                        <select 
                          value={editFormData.status || "not_started"}
                          onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div className="form-group" style={{marginTop: "20px", padding: "15px", background: "#f5f5f5", borderRadius: "4px"}}>
                        <label style={{display: "flex", alignItems: "center", cursor: "pointer", marginBottom: "10px"}}>
                          <input 
                            type="checkbox"
                            checked={editFormData.reminderEnabled || false}
                            onChange={(e) => setEditFormData({...editFormData, reminderEnabled: e.target.checked})}
                            style={{marginRight: "8px", cursor: "pointer", width: "16px", height: "16px"}}
                          />
                          <span style={{fontWeight: "bold"}}>🔔 Enable Reminder</span>
                        </label>
                        
                        {(editFormData.reminderEnabled || false) && (
                          <div style={{marginTop: "12px"}}>
                            <p style={{fontSize: "13px", color: "#666", marginBottom: "10px"}}>
                              Send reminder this many days before start date:
                            </p>
                            <div style={{display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px"}}>
                              {[1, 3, 5, 10].map(days => (
                                <button
                                  key={days}
                                  onClick={() => setEditFormData({...editFormData, reminderDays: days})}
                                  style={{
                                    padding: "10px",
                                    border: (editFormData.reminderDays || 1) === days ? "2px solid #2980b9" : "1px solid #ddd",
                                    background: (editFormData.reminderDays || 1) === days ? "#eef5ff" : "#fff",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontWeight: (editFormData.reminderDays || 1) === days ? "bold" : "normal",
                                    color: (editFormData.reminderDays || 1) === days ? "#2980b9" : "#333",
                                    transition: "all 0.2s"
                                  }}
                                >
                                  {days} {days === 1 ? "day" : "days"}
                                </button>
                              ))}
                            </div>
                            <p style={{fontSize: "12px", color: "#27ae60", marginTop: "10px"}}>
                              ✓ Reminder set for {editFormData.reminderDays || 1} day{(editFormData.reminderDays || 1) !== 1 ? "s" : ""} before
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={handleCancelEdit}>Cancel</button>
                        <button className="btn btn-success" onClick={handleSaveEdit}>Save Changes</button>
                      </div>
                    </div>
                  </div>
                )}

                {planningItems.length === 0 ? (
                  <p style={{color: "#999"}}>No planning items yet. Click the button above to add one!</p>
                ) : (
                  <table style={{width: "100%", marginTop: "20px"}}>
                    <thead>
                      <tr style={{borderBottom: "2px solid #ddd"}}>
                        <th style={{padding: "10px", textAlign: "left"}}>Name</th>
                        <th style={{padding: "10px", textAlign: "left"}}>Owners</th>
                        <th style={{padding: "10px", textAlign: "left"}}>Participants</th>
                        <th style={{padding: "10px", textAlign: "left"}}>Start Date</th>
                        <th style={{padding: "10px", textAlign: "left"}}>End Date</th>
                        <th style={{padding: "10px", textAlign: "left"}}>Reminder</th>
                        <th style={{padding: "10px", textAlign: "left"}}>Status</th>
                        <th style={{padding: "10px", textAlign: "left"}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planningItems.map(item => (
                        <tr key={item.id} style={{borderBottom: "1px solid #eee"}}>
                          <td style={{padding: "10px"}}>{item.name}</td>
                          <td style={{padding: "10px"}}>
                            <div style={{display: "flex", flexWrap: "wrap", gap: "4px"}}>
                              {(item.owners || []).map(owner => (
                                <span key={owner} style={{background: "#eef5ff", color: "#2980b9", padding: "3px 6px", borderRadius: "3px", fontSize: "12px"}}>
                                  {owner}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{padding: "10px"}}>
                            <div style={{display: "flex", flexWrap: "wrap", gap: "4px"}}>
                              {(item.participants || []).map(participant => (
                                <span key={participant} style={{background: "#eefce7", color: "#229954", padding: "3px 6px", borderRadius: "3px", fontSize: "12px"}}>
                                  {participant}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{padding: "10px"}}>{item.startDate}</td>
                          <td style={{padding: "10px"}}>{item.endDate}</td>
                          <td style={{padding: "10px"}}>
                            {item.reminderEnabled ? (
                              <span style={{background: "#fff3cd", color: "#856404", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold"}}>
                                🔔 {item.reminderDays}d before
                              </span>
                            ) : (
                              <span style={{background: "#e2e3e5", color: "#666", padding: "4px 8px", borderRadius: "4px", fontSize: "12px"}}>
                                No reminder
                              </span>
                            )}
                          </td>
                          <td style={{padding: "10px"}}>
                            <span style={{background: "#eef5ff", color: "#2980b9", padding: "4px 8px", borderRadius: "4px"}}>
                              {item.status}
                            </span>
                          </td>
                          <td style={{padding: "10px", display: "flex", gap: "5px"}}>
                            <button 
                              className="btn btn-secondary btn-small"
                              onClick={() => handleEditItem(item)}
                              style={{marginTop: "0"}}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-danger btn-small"
                              onClick={() => deletePlanningItem(item.id)}
                              style={{marginTop: "0"}}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === "calendar" && (
              <div>
                <h2>📅 Calendar & Gantt View</h2>
                
                {planningItems.length === 0 ? (
                  <div style={{textAlign: "center", padding: "40px", background: "#f5f5f5", borderRadius: "8px"}}>
                    <p style={{color: "#999", fontSize: "16px"}}>No planning items to display</p>
                    <p style={{color: "#ccc", fontSize: "14px"}}>Add items from the Plan tab first</p>
                  </div>
                ) : (
                  <>
                    <div style={{display: "grid", gridTemplateColumns: "1fr 2fr", gap: "30px"}}>
                      <div>
                        <h3 style={{marginBottom: "20px"}}>📅 Calendar View</h3>
                        <div style={{background: "#fff", border: "1px solid #ddd", borderRadius: "8px", padding: "20px"}}>
                          {planningItems.map(item => {
                            const startDate = new Date(item.startDate);
                            const endDate = new Date(item.endDate);
                            const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                            
                            return (
                              <div 
                                key={item.id} 
                                style={{
                                  marginBottom: "15px",
                                  padding: "12px",
                                  background: "#f0f7ff",
                                  borderLeft: "4px solid #2980b9",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "#e3f2fd"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "#f0f7ff"}
                              >
                                <div style={{fontWeight: "bold", color: "#2980b9", marginBottom: "4px"}}>
                                  {item.name}
                                </div>
                                <div style={{fontSize: "12px", color: "#666", marginBottom: "4px"}}>
                                  📅 {item.startDate} to {item.endDate}
                                </div>
                                <div style={{fontSize: "12px", color: "#666", marginBottom: "4px"}}>
                                  ⏱️ {duration} days
                                </div>
                                <div style={{fontSize: "11px", color: "#999"}}>
                                  👤 {(item.owners || []).join(", ") || "No owner"}
                                </div>
                                <div style={{fontSize: "10px", color: "#27ae60", marginTop: "4px"}}>
                                  ✓ {item.status.replace(/_/g, " ")}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <h3 style={{marginBottom: "20px"}}>📊 Gantt Chart</h3>
                        <div style={{background: "#fff", border: "1px solid #ddd", borderRadius: "8px", padding: "20px", overflowX: "auto"}}>
                          {(() => {
                            const allDates = [];
                            planningItems.forEach(item => {
                              allDates.push(new Date(item.startDate));
                              allDates.push(new Date(item.endDate));
                            });
                            
                            const minDate = new Date(Math.min(...allDates));
                            const maxDate = new Date(Math.max(...allDates));
                            const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
                            
                            return (
                              <div style={{minWidth: "100%"}}>
                                <div style={{display: "flex", marginBottom: "10px"}}>
                                  <div style={{width: "180px", fontWeight: "bold", fontSize: "12px"}}>Task</div>
                                  <div style={{flex: 1, display: "flex", fontSize: "10px", color: "#999"}}>
                                    {Array.from({length: Math.min(totalDays, 30)}).map((_, i) => {
                                      const date = new Date(minDate);
                                      date.setDate(date.getDate() + i);
                                      return (
                                        <div key={i} style={{width: `${(100 / Math.min(totalDays, 30))}%`, textAlign: "center", borderRight: "1px solid #eee", paddingRight: "2px"}}>
                                          {date.getDate()}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {planningItems.map((item, idx) => {
                                  const itemStartDate = new Date(item.startDate);
                                  const itemEndDate = new Date(item.endDate);
                                  const startOffset = Math.ceil((itemStartDate - minDate) / (1000 * 60 * 60 * 24));
                                  const duration = Math.ceil((itemEndDate - itemStartDate) / (1000 * 60 * 60 * 24)) + 1;
                                  const barWidth = (duration / Math.min(totalDays, 30)) * 100;
                                  const barOffset = (startOffset / Math.min(totalDays, 30)) * 100;
                                  
                                  const statusColors = {
                                    "not_started": "#95a5a6",
                                    "in_progress": "#f39c12",
                                    "completed": "#27ae60",
                                    "cancelled": "#e74c3c"
                                  };
                                  
                                  return (
                                    <div key={item.id} style={{display: "flex", marginBottom: "12px", alignItems: "center"}}>
                                      <div style={{width: "180px", fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>
                                        {item.name}
                                      </div>
                                      <div style={{flex: 1, height: "30px", background: "#f5f5f5", borderRadius: "4px", position: "relative", display: "flex", alignItems: "center"}}>
                                        <div 
                                          style={{
                                            position: "absolute",
                                            left: `${barOffset}%`,
                                            width: `${barWidth}%`,
                                            height: "24px",
                                            background: statusColors[item.status] || "#2980b9",
                                            borderRadius: "3px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "white",
                                            fontSize: "10px",
                                            fontWeight: "bold",
                                            minWidth: "40px"
                                          }}
                                        >
                                          {duration}d
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}

                                <div style={{marginTop: "20px", padding: "15px", background: "#f0f7ff", borderRadius: "4px", fontSize: "12px"}}>
                                  <div style={{marginBottom: "8px", fontWeight: "bold"}}>Legend:</div>
                                  <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px"}}>
                                    <div><span style={{display: "inline-block", width: "12px", height: "12px", background: "#95a5a6", borderRadius: "2px", marginRight: "6px"}}></span>Not Started</div>
                                    <div><span style={{display: "inline-block", width: "12px", height: "12px", background: "#f39c12", borderRadius: "2px", marginRight: "6px"}}></span>In Progress</div>
                                    <div><span style={{display: "inline-block", width: "12px", height: "12px", background: "#27ae60", borderRadius: "2px", marginRight: "6px"}}></span>Completed</div>
                                    <div><span style={{display: "inline-block", width: "12px", height: "12px", background: "#e74c3c", borderRadius: "2px", marginRight: "6px"}}></span>Cancelled</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "budget" && (
              <div>
                <h2>💰 Budget Management</h2>
                <button className="btn btn-primary" onClick={handleAddBudgetItem} style={{marginBottom: "20px"}}>
                  + Add Budget Item
                </button>

                {budgetItems.length === 0 ? (
                  <p style={{color: "#999"}}>No budget items yet. Click the button above to add one!</p>
                ) : (
                  <>
                    <table style={{width: "100%", marginTop: "20px"}}>
                      <thead>
                        <tr style={{borderBottom: "2px solid #ddd"}}>
                          <th style={{padding: "10px", textAlign: "left"}}>Item</th>
                          <th style={{padding: "10px", textAlign: "left"}}>Budget (₪)</th>
                          <th style={{padding: "10px", textAlign: "left"}}>Details</th>
                          <th style={{padding: "10px", textAlign: "left"}}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {budgetItems.map(item => (
                          <tr key={item.id} style={{borderBottom: "1px solid #eee"}}>
                            <td style={{padding: "10px"}}>{item.item}</td>
                            <td style={{padding: "10px"}}>{item.budget.toFixed(2)}</td>
                            <td style={{padding: "10px"}}>{item.details || "-"}</td>
                            <td style={{padding: "10px"}}>
                              <button 
                                className="btn btn-danger btn-small"
                                onClick={() => deleteBudgetItem(item.id)}
                                style={{marginTop: "0"}}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr style={{borderTop: "2px solid #ddd", background: "#f5f5f5", fontWeight: "bold"}}>
                          <td style={{padding: "10px"}}>TOTAL</td>
                          <td style={{padding: "10px"}}>₪{totalBudget.toFixed(2)}</td>
                          <td colSpan="2" style={{padding: "10px"}}></td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {campaigns.length === 0 && (
        <div style={{textAlign: "center", padding: "40px", color: "#999"}}>
          <p style={{fontSize: "18px"}}>No campaigns yet</p>
          <button className="btn btn-primary" onClick={handleCreateCampaign} style={{marginTop: "20px"}}>
            Create Your First Campaign
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
