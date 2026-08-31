import React, { useState, useEffect } from "react";
import "./styles.css";
import LoginModal from "./LoginModal";
import ConfigModal from "./ConfigModal";
import { fetchCampaignsFromSheet, saveCampaignToSheet, getLoggedInUser, logoutUser, getDefaultSheetId, fetchNotifications, dismissNotification, APPS_SCRIPT_URL, fetchAllUsers, removeUser, addBudgetItems, setPlanningItems, upsertCampaignItem } from "./googleSheetsUtils";

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
    quantity: "1",
    category: "recordings",
    comment: "",
  });
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryLabel, setEditingCategoryLabel] = useState("");
  
  const [showManageGiftCategoriesModal, setShowManageGiftCategoriesModal] = useState(false);
  const [newGiftCategory, setNewGiftCategory] = useState("");
  const [editingGiftCategoryId, setEditingGiftCategoryId] = useState(null);
  const [editingGiftCategoryLabel, setEditingGiftCategoryLabel] = useState("");
  
  const defaultCategories = [
    { id: "recordings", label: "Recordings" },
    { id: "visual", label: "Visual" },
    { id: "live", label: "Live" },
    { id: "merchandise", label: "Merchandise" },
    { id: "other", label: "Other" },
    { id: "הקלטות סופיות", label: "הקלטות סופיות (Final Recordings)" },
    { id: "הקלטות ראשוניות", label: "הקלטות ראשוניות (Initial Recordings)" },
    { id: "מרצ'נדייז", label: "מרצ'נדייז (Merchandise)" },
    { id: "ויזואל", label: "ויזואל (Visual)" }
  ];

  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("budget_categories");
      return saved ? JSON.parse(saved) : defaultCategories;
    } catch (e) {
      return defaultCategories;
    }
  });

  const defaultGiftCategories = [
    { id: "music", label: "מוזיקה (Music)" },
    { id: "packs", label: "חבילות (Packs)" },
    { id: "other", label: "כל מיני (Other)" }
  ];

  const [giftCategories, setGiftCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("gift_categories");
      return saved ? JSON.parse(saved) : defaultGiftCategories;
    } catch (e) {
      return defaultGiftCategories;
    }
  });
  const [syncStatus, setSyncStatus] = useState("✓ Synced");
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const [newGiftItem, setNewGiftItem] = useState({
    name: "",
    price: "",
    costItems: [{ source: "manual", budgetItemId: "", cost: "" }],
    category: "",
    owners: [],
    comment: "",
    suggestedQuantity: "",
  });

  const emptyGiftForm = () => ({
    name: "",
    price: "",
    costItems: [{ source: "manual", budgetItemId: "", cost: "" }],
    category: "",
    owners: [],
    comment: "",
    suggestedQuantity: "",
  });

  const isMerchandiseBudgetCategory = (category) => {
    if (!category) return false;
    const raw = String(category).toLowerCase();
    const label = (categories.find(c => c.id === category)?.label || "").toLowerCase();
    return (
      raw.includes("מרצ") ||
      raw.includes("merchandise") ||
      label.includes("מרצ") ||
      label.includes("merchandise")
    );
  };

  const getMerchandiseBudgetItems = () => {
    return (selectedCampaign?.budgetItems || []).filter(item => isMerchandiseBudgetCategory(item.category));
  };

  const getGiftUnitCost = (gift) => {
    if (Array.isArray(gift?.costItems) && gift.costItems.length > 0) {
      return gift.costItems.reduce((sum, c) => sum + (Number(c.cost) || 0), 0);
    }
    return Number(gift?.cost) || 0;
  };

  const sumCostItems = (costItems) =>
    (costItems || []).reduce((sum, c) => sum + (Number(c.cost) || 0), 0);
  const [showAddGiftModal, setShowAddGiftModal] = useState(false);
  const [editingGiftId, setEditingGiftId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [shownNotifications, setShownNotifications] = useState(new Set());
  const [allUsers, setAllUsers] = useState([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(null); // "owner" or "participant"
  const [budgetCommission, setBudgetCommission] = useState(10); // Commission percentage, default 10%

  const getDismissedNotifications = () => {
    const dismissed = localStorage.getItem("dismissed_notifications");
    return dismissed ? new Set(JSON.parse(dismissed)) : new Set();
  };

  const dismissNotificationPermanently = (email, task) => {
    const dismissed = getDismissedNotifications();
    dismissed.add(`${email}_${task}`);
    localStorage.setItem("dismissed_notifications", JSON.stringify(Array.from(dismissed)));
  };
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newParticipantEmail, setNewParticipantEmail] = useState("");
  const [editingOwnerIdx, setEditingOwnerIdx] = useState(null);
  const [editingParticipantIdx, setEditingParticipantIdx] = useState(null);
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editOwnerEmail, setEditOwnerEmail] = useState("");
  const [editParticipantName, setEditParticipantName] = useState("");
  const [editParticipantEmail, setEditParticipantEmail] = useState("");

  useEffect(() => {
    if (user) {
      loadAllUsers();
      loadCampaigns();
      loadNotifications();
      // Refresh notifications every 30 seconds
      const notifInterval = setInterval(() => loadNotifications(), 30000);
      return () => clearInterval(notifInterval);
    }
  }, [user]);

  const loadNotifications = async () => {
    if (user && user.email) {
      const notifs = await fetchNotifications(user.email);
      const dismissed = getDismissedNotifications();
      
      // Filter out dismissed notifications
      const newNotifs = notifs.filter(n => !dismissed.has(`${n.email}_${n.task}`));
      
      if (newNotifs.length > 0) {
        setNotifications(newNotifs);
        // Mark these as shown
        const updatedShown = new Set(shownNotifications);
        newNotifs.forEach(n => updatedShown.add(`${n.email}_${n.task}`));
        setShownNotifications(updatedShown);
      }
    }
  };

  const getAlbumDefaultPlanningItems = () => [
    {
      id: "item_1787744718226",
      name: "הגדרת נראטיב לקמפיין",
      startDate: "2026-08-29",
      endDate: "2026-08-30",
      status: "not-started",
      owners: [{ name: "Amit", email: "colleagueproj@gmail.com" }],
      participants: [{ name: "Amit", email: "colleagueproj@gmail.com" }],
      reminderEnabled: true,
      reminderDays: 1
    },
    {
      id: "item_1787744659788",
      name: "הגדרת תשורות ראשונית",
      startDate: "2026-08-29",
      endDate: "2026-08-31",
      status: "not-started",
      owners: [{ name: "Amit", email: "colleagueproj@gmail.com" }],
      participants: [{ name: "Amit", email: "colleagueproj@gmail.com" }],
      reminderEnabled: true,
      reminderDays: 1
    },
    {
      id: "item_1787744667297",
      name: "סגירת רשימת התשורות",
      startDate: "2026-08-31",
      endDate: "2026-09-06",
      status: "not-started",
      owners: [{ name: "Amit", email: "colleagueproj@gmail.com" }],
      participants: [{ name: "Amit", email: "colleagueproj@gmail.com" }],
      reminderEnabled: true,
      reminderDays: 1
    },
    {
      id: "item_1787744674125",
      name: "עידכון רשימת תשורות - תזכורת",
      startDate: "2026-09-03",
      endDate: "2026-09-03",
      status: "not-started",
      owners: [{ name: "Amit", email: "colleagueproj@gmail.com" }],
      participants: [{ name: "Amit", email: "colleagueproj@gmail.com" }],
      reminderEnabled: true,
      reminderDays: 3
    },
    {
      id: "item_1787745320491",
      name: "לשלוח את האפליקציה לגלי",
      startDate: "2026-08-28",
      endDate: "2026-08-28",
      status: "not-started",
      owners: [{ name: "Amit", email: "colleagueproj@gmail.com" }],
      participants: [{ name: "Amit", email: "colleagueproj@gmail.com" }],
      reminderEnabled: true,
      reminderDays: 1
    }
  ];

  const loadCampaigns = async () => {
    const loaded = await fetchCampaignsFromSheet(getDefaultSheetId());
    console.log("Loaded campaigns:", loaded);
    let normalized = (Array.isArray(loaded) ? loaded : []).map(normalizeCampaign);
    console.log("Normalized campaigns:", normalized);

    // Auto-restore album plan if it was wiped (recovered from original campaign data)
    const albumIdx = normalized.findIndex(c => c.name === "Weeping Willow Tree first album and live show");
    if (albumIdx >= 0 && (!normalized[albumIdx].planningItems || normalized[albumIdx].planningItems.length === 0)) {
      const planningItems = getAlbumDefaultPlanningItems();
      const restored = {
        ...normalized[albumIdx],
        planningItems
      };
      normalized = normalized.map((c, i) => i === albumIdx ? restored : c);
      // Prefer targeted planning update (avoids wiping budget/gifts via truncated URL saves)
      const ok = await setPlanningItems(restored.name, planningItems);
      if (!ok) await saveCampaignToSheet(restored);
    }

    setCampaigns(normalized);
    if (normalized.length > 0 && !selectedCampaign) {
      const defaultCampaign = normalized.find(c => c.name === "Weeping Willow Tree first album and live show") || normalized[0];
      setSelectedCampaign(defaultCampaign);
    }
  };

  const restoreAlbumPlanningItems = async () => {
    const planningItems = getAlbumDefaultPlanningItems();
    const campaign = campaigns.find(c => c.name === "Weeping Willow Tree first album and live show");
    if (campaign) {
      const updated = { ...campaign, planningItems };
      const ok = await setPlanningItems(campaign.name, planningItems);
      if (!ok) await saveCampaignToSheet(updated);
      const updatedCampaigns = campaigns.map(c => c.id === campaign.id ? updated : c);
      setCampaigns(updatedCampaigns);
      if (selectedCampaign?.id === campaign.id) {
        setSelectedCampaign(updated);
      }
      alert("Planning items restored successfully!");
    } else {
      alert("Campaign 'Weeping Willow Tree first album and live show' not found!");
    }
  };

  const addAlbumGifts = async () => {
    const gifts = [
      // מוסיקה (Music)
      { name: "פוסטר אלבום", category: "music", price: 45, cost: 0, suggestedQuantity: 50, comment: "גודל 35x40 סמ" },
      { name: "חולצות", category: "music", price: 100, cost: 0, suggestedQuantity: 80, comment: "" },
      { name: "דיסק", category: "music", price: 70, cost: 0, suggestedQuantity: 100, comment: "כולל אריזה (קופסת Jewel Case מלאה + חוברת/עטיפה)" },
      { name: "ויניל + פוסטר תקליט", category: "music", price: 265, cost: 0, suggestedQuantity: 50, comment: "כולל פוסטר + מילים" },
      { name: "ספרון מילים עם הקדשה אישית", category: "music", price: 65, cost: 0, suggestedQuantity: 80, comment: "" },
      { name: "ספרון אקורדים ומילים עם הקדשה אישית", category: "music", price: 85, cost: 0, suggestedQuantity: 50, comment: "" },
      
      // פריטים (Other)
      { name: "פסלון עץ הערבה הבוכייה מברזל (עם הקדשה אישית)", category: "other", price: 450, cost: 0, suggestedQuantity: 15, comment: "" },
      
      // חבילות (Packs)
      { name: "דיסק + ספרון מילים", category: "packs", price: 30, cost: 30, suggestedQuantity: 0, comment: "חבילת המוסיקה" },
      { name: "דיסק + חולצה + פוסטר", category: "packs", price: 20, cost: 20, suggestedQuantity: 0, comment: "חבילת המרצ״" },
      { name: "ויניל + חולצה + פוסטר", category: "packs", price: 15, cost: 15, suggestedQuantity: 0, comment: "חבילת האספנים" },
      { name: "פסלון ברזל + ספר מילים/ואקורדים + פוסטר", category: "packs", price: 10, cost: 10, suggestedQuantity: 0, comment: "חבילת ה-Super-Fan (לחובבי פריטי האספנות הפיזיים)" },
      { name: "ויניל + דיסק + פוסטר", category: "packs", price: 15, cost: 15, suggestedQuantity: 0, comment: "חבילת ה\"אנלוג והדיגיטל\" (חבילת השמע השלמה)" },
      { name: "פסלון ברזל + ויניל + דיסק + חולצה + ספרון מילים ואקורדים + פוסטר אלבום", category: "packs", price: 5, cost: 5, suggestedQuantity: 0, comment: "חבילת ה-VIP הטוטאלית (חבילת \"הכל מהכל\")" }
    ];
    
    const campaign = campaigns.find(c => c.name === "Weeping Willow Tree first album and live show");
    if (campaign) {
      campaign.gifts = gifts.map((g, idx) => ({
        id: `gift_${idx}`,
        name: g.name,
        category: g.category,
        price: g.price,
        cost: g.cost,
        owners: [],
        suggestedQuantity: g.suggestedQuantity || 0,
        comment: g.comment || ""
      }));
      
      await saveCampaignToSheet(campaign);
      const updatedCampaigns = campaigns.map(c => c.id === campaign.id ? campaign : c);
      setCampaigns(updatedCampaigns);
      if (selectedCampaign?.id === campaign.id) {
        setSelectedCampaign(campaign);
      }
      alert("All gifts added successfully!");
    } else {
      alert("Campaign 'Weeping Willow Tree first album and live show' not found!");
    }
  };

  const addAlbumBudgetItems = async () => {
    const budgetItems = [
      { id: "budget_ngnim", description: "נגנים", amount: 5000, category: "הקלטות סופיות", comment: "" },
      { id: "budget_cheder_haklot", description: "חדר הקלטות", amount: 1400, category: "הקלטות סופיות", comment: "12 X 4 ש 350 השכרה" },
      { id: "budget_pizza", description: "פיצה", amount: 10000, category: "הקלטות סופיות", comment: "אין הוצאה עירונית" },
      { id: "budget_mastering", description: "מאסטור", amount: 7000, category: "הקלטות סופיות", comment: "" },
      { id: "budget_haklot_rosh", description: "הקלטות", amount: 1150, category: "הקלטות ראשוניות", comment: "12 X 3 ש 350 השכרה" },
      { id: "budget_cheder_mix", description: "חדר מיקס", amount: 700, category: "הקלטות ראשוניות", comment: "2 X 12 ש 350 השכרה" },
      { id: "budget_microphone", description: "כיסים קולי", amount: 5000, category: "הקלטות ראשוניות", comment: "RME" },
      { id: "budget_hoodies", description: "חלוציות", amount: 2000, category: "מרצ'נדייז", comment: "80 חלוציות" },
      { id: "budget_stickers", description: "מדבקות", amount: 200, category: "מרצ'נדייז", comment: "" },
      { id: "budget_disks", description: "דיסקים", amount: 1000, category: "מרצ'נדייז", comment: "100 יחידות צילום עצמי" },
      { id: "budget_prints", description: "הדפסים", amount: 10000, category: "מרצ'נדייז", comment: "" },
      { id: "budget_digital", description: "הצעה דיגיטלית", amount: 200, category: "מרצ'נדייז", comment: "" },
      { id: "budget_shipping", description: "שלוחה", amount: 400, category: "מרצ'נדייז", comment: "" },
      { id: "budget_tmchui", description: "תמחוי להדפסת סטודיו", amount: 3000, category: "ויזואל", comment: "" }
    ];
    
    const campaign = campaigns.find(c => c.name === "Weeping Willow Tree first album and live show");
    if (campaign) {
      campaign.budgetItems = budgetItems;
      await saveCampaignToSheet(campaign);
      const updatedCampaigns = campaigns.map(c => c.id === campaign.id ? campaign : c);
      setCampaigns(updatedCampaigns);
      if (selectedCampaign?.id === campaign.id) {
        setSelectedCampaign(campaign);
      }
      alert("Budget items added successfully!");
    } else {
      alert("Campaign 'Weeping Willow Tree first album and live show' not found!");
    }
  };

  const loadAllUsers = async () => {
    try {
      const users = await fetchAllUsers();
      const formattedUsers = Array.isArray(users) ? users.map(u => ({
        name: u.name || u.email.split('@')[0],
        email: u.email,
        is_admin: u.is_admin || false
      })) : [];
      setAllUsers(formattedUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      setAllUsers([]);
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

  const isOwner = selectedCampaign && selectedCampaign.owners.some(o => {
    const ownerEmail = typeof o === 'object' ? o.email : o;
    return ownerEmail === user?.email;
  });
  const canEdit = isOwner || user?.is_admin;
  const canCreateCampaign = user?.is_admin;
  const isAdmin = user?.is_admin && user?.email === "colleagueproj@gmail.com";

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
    
    // Add admin (Amit) and current user as owners
    const adminUser = { name: "Amit", email: "colleagueproj@gmail.com" };
    const currentUser = { name: user.name, email: user.email };
    
    // Owners: admin + current user (if not admin)
    const owners = [adminUser];
    if (user.email !== adminUser.email) {
      owners.push(currentUser);
    }
    
    // Participants: admin + current user + all other signed-in users
    const participants = [adminUser];
    if (user.email !== adminUser.email) {
      participants.push(currentUser);
    }
    
    // Add all other signed-in users as participants (but not owners)
    if (allUsers && allUsers.length > 0) {
      for (const u of allUsers) {
        // Skip if already an owner
        if (owners.some(o => o.email === u.email)) continue;
        participants.push({ name: u.name, email: u.email });
      }
    }
    
    const newCampaign = {
      id: `campaign_${Date.now()}`,
      name: newCampaignName,
      currency: "ILS",
      owners: owners,
      participants: participants,
      planningItems: [],
      budgetItems: [],
      gifts: [],
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
    if (!selectedCampaign || !newOwnerName.trim() || !newOwnerEmail.trim() || !canEdit) return;
    const ownerObj = { name: newOwnerName, email: newOwnerEmail };
    const updatedCampaign = {
      ...selectedCampaign,
      owners: [...selectedCampaign.owners, ownerObj],
      // Automatically add to participants if not already there
      participants: selectedCampaign.participants.some(p => p.email === newOwnerEmail) 
        ? selectedCampaign.participants 
        : [...selectedCampaign.participants, ownerObj],
    };
    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
    setNewOwnerName("");
    setNewOwnerEmail("");
  };

  const handleAddOwner_User = (user) => {
    if (!selectedCampaign || !canEdit) return;
    const ownerObj = { name: user.name, email: user.email };
    const updatedCampaign = {
      ...selectedCampaign,
      owners: [...selectedCampaign.owners, ownerObj],
      // Automatically add to participants if not already there
      participants: selectedCampaign.participants.some(p => (typeof p === 'object' ? p.email : p) === user.email)
        ? selectedCampaign.participants
        : [...selectedCampaign.participants, ownerObj],
    };
    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
  };

  const handleAddParticipant_User = (user) => {
    if (!selectedCampaign || !canEdit) return;
    const participantObj = { name: user.name, email: user.email };
    const updatedCampaign = {
      ...selectedCampaign,
      participants: [...selectedCampaign.participants, participantObj],
    };
    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
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
    if (!selectedCampaign || !newParticipantName.trim() || !newParticipantEmail.trim() || !canEdit) return;
    const participantObj = { name: newParticipantName, email: newParticipantEmail };
    const updatedCampaign = {
      ...selectedCampaign,
      participants: [...selectedCampaign.participants, participantObj],
    };
    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
    setNewParticipantName("");
    setNewParticipantEmail("");
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

  const handleEditOwner = (index) => {
    const owner = selectedCampaign.owners[index];
    setEditingOwnerIdx(index);
    setEditOwnerName(typeof owner === 'object' ? owner.name : owner);
    setEditOwnerEmail(typeof owner === 'object' ? owner.email : '');
  };

  const handleSaveOwner = () => {
    if (editingOwnerIdx === null || !editOwnerName.trim() || !editOwnerEmail.trim()) return;
    const updatedOwners = [...selectedCampaign.owners];
    const oldOwner = updatedOwners[editingOwnerIdx];
    const oldEmail = typeof oldOwner === 'object' ? oldOwner.email : '';
    const oldName = typeof oldOwner === 'object' ? oldOwner.name : oldOwner;
    
    updatedOwners[editingOwnerIdx] = { name: editOwnerName, email: editOwnerEmail };
    
    // Update matching participant if exists (match by email or name if no email)
    let updatedParticipants = [...selectedCampaign.participants];
    const participantIdx = updatedParticipants.findIndex(p => {
      const pEmail = typeof p === 'object' ? p.email : '';
      const pName = typeof p === 'object' ? p.name : p;
      return (oldEmail && pEmail === oldEmail) || (pName === oldName);
    });
    if (participantIdx !== -1) {
      updatedParticipants[participantIdx] = { name: editOwnerName, email: editOwnerEmail };
    }
    
    const updatedCampaign = {
      ...selectedCampaign,
      owners: updatedOwners,
      participants: updatedParticipants,
    };
    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
    setEditingOwnerIdx(null);
    setEditOwnerName("");
    setEditOwnerEmail("");
  };

  const handleEditParticipant = (index) => {
    const participant = selectedCampaign.participants[index];
    setEditingParticipantIdx(index);
    setEditParticipantName(typeof participant === 'object' ? participant.name : participant);
    setEditParticipantEmail(typeof participant === 'object' ? participant.email : '');
  };

  const handleSaveParticipant = () => {
    if (editingParticipantIdx === null || !editParticipantName.trim() || !editParticipantEmail.trim()) return;
    const updatedParticipants = [...selectedCampaign.participants];
    const oldParticipant = updatedParticipants[editingParticipantIdx];
    const oldEmail = typeof oldParticipant === 'object' ? oldParticipant.email : '';
    const oldName = typeof oldParticipant === 'object' ? oldParticipant.name : oldParticipant;
    
    updatedParticipants[editingParticipantIdx] = { name: editParticipantName, email: editParticipantEmail };
    
    // Update matching owner if exists (match by email or name if no email)
    let updatedOwners = [...selectedCampaign.owners];
    const ownerIdx = updatedOwners.findIndex(o => {
      const oEmail = typeof o === 'object' ? o.email : '';
      const oName = typeof o === 'object' ? o.name : o;
      return (oldEmail && oEmail === oldEmail) || (oName === oldName);
    });
    if (ownerIdx !== -1) {
      updatedOwners[ownerIdx] = { name: editParticipantName, email: editParticipantEmail };
    }
    
    const updatedCampaign = {
      ...selectedCampaign,
      owners: updatedOwners,
      participants: updatedParticipants,
    };
    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
    setEditingParticipantIdx(null);
    setEditParticipantName("");
    setEditParticipantEmail("");
  };

  const handleSaveNewItem = async () => {
    if (!selectedCampaign || !newItemForm.name.trim() || !newItemForm.startDate || !newItemForm.endDate || !canEdit) return;
    
    // Validate: end date must not be before start date
    const startDate = new Date(newItemForm.startDate);
    const endDate = new Date(newItemForm.endDate);
    if (endDate < startDate) {
      alert("End date cannot be before start date. Please select a valid date range.");
      return;
    }
    
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
    
    // Save to backend
    await saveCampaignToSheet(updatedCampaign);
    
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
    setNewItemForm({
      name: item.name,
      startDate: item.startDate,
      endDate: item.endDate,
      status: item.status,
      owners: item.owners || [],
      participants: item.participants || [],
      reminderEnabled: item.reminderEnabled || false,
      reminderDays: item.reminderDays || 1,
    });
    setEditingItemId(item.id);
    setShowAddItemModal(true);
  };

  const handleDeleteItem = async (itemId) => {
    if (!selectedCampaign || !canEdit) return;
    const updatedCampaign = {
      ...selectedCampaign,
      planningItems: selectedCampaign.planningItems.filter(i => i.id !== itemId),
    };
    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
    
    // Save to backend
    await saveCampaignToSheet(updatedCampaign);
  };

  const handleAddBudgetItem = async () => {
    if (!selectedCampaign || !newBudgetItem.description.trim() || !newBudgetItem.amount || !canEdit) {
      return;
    }
    
    if (selectedCampaign.owners.length === 0) {
      alert("Please add at least 1 owner to the campaign first (go to Campaign Settings)");
      return;
    }
    
    if (selectedCampaign.participants.length === 0) {
      alert("Please add at least 1 participant to the campaign first (go to Campaign Settings)");
      return;
    }

    const quantity = newBudgetItem.quantity !== "" && newBudgetItem.quantity != null
      ? parseFloat(newBudgetItem.quantity)
      : 1;

    const budgetItem = {
      id: editingItemId || `budget_${Date.now()}`,
      description: newBudgetItem.description.trim(),
      amount: parseFloat(newBudgetItem.amount),
      quantity: Number.isNaN(quantity) ? 1 : quantity,
      category: newBudgetItem.category,
      comment: newBudgetItem.comment || "",
    };

    const updatedCampaign = {
      ...selectedCampaign,
      budgetItems: editingItemId
        ? selectedCampaign.budgetItems.map(b => b.id === editingItemId ? budgetItem : b)
        : [...(selectedCampaign.budgetItems || []), budgetItem],
    };

    // Optimistic UI: update immediately, then sync in background
    setCampaigns(prev => prev.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
    setNewBudgetItem({ description: "", amount: "", quantity: "1", category: "recordings", comment: "" });
    setEditingItemId(null);
    setShowAddBudgetModal(false);
    setSyncStatus("⏳ Syncing...");

    // Prefer small single-item upsert (reliable); fall back to full campaign save
    let success = await upsertCampaignItem(selectedCampaign.id, "budgetItems", budgetItem, "upsert");
    if (!success) success = await saveCampaignToSheet(updatedCampaign);
    setSyncStatus(success ? "✓ Synced" : "❌ Sync failed");
    if (!success) {
      alert("Saved locally, but sync to Google Sheets failed. Please redeploy Apps Script (see Sync help) or click Sync Now after updating the script.");
    }
    setTimeout(() => setSyncStatus(success ? "✓ Synced" : "❌ Sync failed"), 4000);
  };

  const handleEditBudgetItem = (item) => {
    setNewBudgetItem({
      description: item.description,
      amount: item.amount != null ? String(item.amount) : "",
      quantity: item.quantity != null ? String(item.quantity) : "1",
      category: item.category,
      comment: item.comment || ""
    });
    setEditingItemId(item.id);
    setShowAddBudgetModal(true);
  };

  const handleDeleteBudgetItem = async (budgetId) => {
    if (!selectedCampaign || !canEdit) return;
    const updatedCampaign = {
      ...selectedCampaign,
      budgetItems: selectedCampaign.budgetItems.filter(b => b.id !== budgetId),
    };
    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
    
    // Save to backend
    await saveCampaignToSheet(updatedCampaign);
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    const categoryId = newCategory.toLowerCase().replace(/\s+/g, "_");
    const newCat = { id: categoryId, label: newCategory };
    const updated = [...categories, newCat];
    setCategories(updated);
    localStorage.setItem("budget_categories", JSON.stringify(updated));
    setNewCategory("");
  };

  const handleEditCategory = (cat) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryLabel(cat.label);
  };

  const handleSaveCategory = () => {
    if (!editingCategoryLabel.trim()) return;
    const updated = categories.map(c => c.id === editingCategoryId ? { ...c, label: editingCategoryLabel } : c);
    setCategories(updated);
    localStorage.setItem("budget_categories", JSON.stringify(updated));
    setEditingCategoryId(null);
    setEditingCategoryLabel("");
  };

  const handleRemoveCategory = (categoryId) => {
    const updated = categories.filter(c => c.id !== categoryId);
    setCategories(updated);
    localStorage.setItem("budget_categories", JSON.stringify(updated));
  };

  const getCategoryLabel = (categoryId, list = categories) => {
    if (!categoryId) return "-";
    const found = list.find(c => c.id === categoryId || c.label === categoryId);
    return found ? found.label : categoryId;
  };

  const handleAddGiftCategory = () => {
    if (!newGiftCategory.trim()) return;
    const categoryId = newGiftCategory.toLowerCase().replace(/\s+/g, "_");
    const newCat = { id: categoryId, label: newGiftCategory };
    const updated = [...giftCategories, newCat];
    setGiftCategories(updated);
    localStorage.setItem("gift_categories", JSON.stringify(updated));
    setNewGiftCategory("");
  };

  const handleEditGiftCategory = (cat) => {
    setEditingGiftCategoryId(cat.id);
    setEditingGiftCategoryLabel(cat.label);
  };

  const handleSaveGiftCategory = () => {
    if (!editingGiftCategoryLabel.trim()) return;
    const updated = giftCategories.map(c => c.id === editingGiftCategoryId ? { ...c, label: editingGiftCategoryLabel } : c);
    setGiftCategories(updated);
    localStorage.setItem("gift_categories", JSON.stringify(updated));
    setEditingGiftCategoryId(null);
    setEditingGiftCategoryLabel("");
  };

  const handleRemoveGiftCategory = (categoryId) => {
    const updated = giftCategories.filter(c => c.id !== categoryId);
    setGiftCategories(updated);
    localStorage.setItem("gift_categories", JSON.stringify(updated));
  };

  const handleAddGift = async () => {
    if (!selectedCampaign || !canEdit) return;

    const name = (newGiftItem.name || "").trim();
    const priceRaw = newGiftItem.price;
    const priceOk = priceRaw !== "" && priceRaw !== null && priceRaw !== undefined && !Number.isNaN(parseFloat(priceRaw));
    const owners = Array.isArray(newGiftItem.owners) ? newGiftItem.owners : [];
    const costItemsRaw = Array.isArray(newGiftItem.costItems) ? newGiftItem.costItems : [];

    if (!name) {
      alert("Please enter a gift name");
      return;
    }
    if (!priceOk) {
      alert("Please enter a price (0 is allowed)");
      return;
    }
    if (costItemsRaw.length === 0) {
      alert("Please add at least 1 cost item");
      return;
    }
    if (costItemsRaw.length > 7) {
      alert("You can add up to 7 cost items");
      return;
    }
    for (let i = 0; i < costItemsRaw.length; i++) {
      const c = costItemsRaw[i];
      const costOk = c.cost !== "" && c.cost !== null && c.cost !== undefined && !Number.isNaN(parseFloat(c.cost));
      if (!costOk) {
        alert(`Please enter a cost for item #${i + 1} (0 is allowed)`);
        return;
      }
    }

    // If no owner checked, default to current user / first campaign owner
    let giftOwners = owners;
    if (giftOwners.length === 0) {
      if (user) {
        giftOwners = [{ name: user.name || user.email, email: user.email }];
      } else if ((selectedCampaign.owners || []).length > 0) {
        giftOwners = [selectedCampaign.owners[0]];
      } else {
        alert("Please select at least 1 gift owner");
        return;
      }
    }

    const merchandiseItems = getMerchandiseBudgetItems();
    const costItems = costItemsRaw.map(c => {
      const isManual = c.source === "manual";
      const budgetItem = !isManual ? merchandiseItems.find(b => b.id === c.source || b.id === c.budgetItemId) : null;
      const lineCost = isManual
        ? (Number(c.cost) || 0)
        : (Number(budgetItem?.amount ?? c.cost) || 0);
      return {
        source: isManual ? "manual" : (c.source || c.budgetItemId),
        budgetItemId: isManual ? "" : (c.budgetItemId || c.source || ""),
        label: isManual ? (c.label || "Manual") : (budgetItem?.description || c.label || ""),
        cost: lineCost,
      };
    });
    // Gift Cost is always the sum of all cost items
    const cost = sumCostItems(costItems);

    const gift = {
      id: editingGiftId || `gift_${Date.now()}`,
      name,
      price: parseFloat(priceRaw),
      cost,
      costItems,
      category: newGiftItem.category || "",
      owners: giftOwners,
      comment: newGiftItem.comment || "",
      suggestedQuantity: newGiftItem.suggestedQuantity !== "" && newGiftItem.suggestedQuantity != null
        ? parseInt(newGiftItem.suggestedQuantity, 10)
        : null,
    };

    const updatedCampaign = {
      ...selectedCampaign,
      gifts: editingGiftId
        ? selectedCampaign.gifts.map(g => g.id === editingGiftId ? gift : g)
        : [...(selectedCampaign.gifts || []), gift],
    };

    // Optimistic UI: update immediately, then sync in background
    setCampaigns(prev => prev.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
    setNewGiftItem(emptyGiftForm());
    setEditingGiftId(null);
    setShowAddGiftModal(false);
    setSyncStatus("⏳ Syncing...");

    let success = await upsertCampaignItem(selectedCampaign.id, "gifts", gift, "upsert");
    if (!success) success = await saveCampaignToSheet(updatedCampaign);
    setSyncStatus(success ? "✓ Synced" : "❌ Sync failed");
    if (!success) {
      alert("Saved locally, but sync to Google Sheets failed. Please redeploy Apps Script or click Sync Now after updating the script.");
    }
    setTimeout(() => setSyncStatus(success ? "✓ Synced" : "❌ Sync failed"), 4000);
  };

  const handleEditGift = (gift) => {
    const merchandiseItems = getMerchandiseBudgetItems();
    let costItems;

    if (Array.isArray(gift.costItems) && gift.costItems.length > 0) {
      costItems = gift.costItems.slice(0, 7).map(c => {
        const linked = c.budgetItemId || (c.source !== "manual" ? c.source : "");
        const budgetItem = linked ? merchandiseItems.find(b => b.id === linked) : null;
        if (budgetItem) {
          return {
            source: budgetItem.id,
            budgetItemId: budgetItem.id,
            cost: String(budgetItem.amount ?? c.cost ?? 0),
            label: budgetItem.description || "",
          };
        }
        return {
          source: "manual",
          budgetItemId: "",
          cost: c.cost != null ? String(c.cost) : "",
          label: c.label || "Manual",
        };
      });
    } else {
      // Legacy single cost
      const linkedId = gift.costBudgetItemId || "";
      const linkedItem = linkedId ? merchandiseItems.find(b => b.id === linkedId) : null;
      const matchedByPrice = !linkedItem
        ? merchandiseItems.find(b => Number(b.amount) === Number(gift.cost))
        : null;
      const sourceItem = linkedItem || matchedByPrice;
      costItems = [{
        source: sourceItem ? sourceItem.id : "manual",
        budgetItemId: sourceItem ? sourceItem.id : "",
        cost: sourceItem
          ? String(sourceItem.amount ?? 0)
          : (gift.cost != null ? String(gift.cost) : ""),
        label: sourceItem ? sourceItem.description : "Manual",
      }];
    }

    setNewGiftItem({
      name: gift.name,
      price: gift.price != null ? String(gift.price) : "",
      costItems,
      category: gift.category || "",
      owners: Array.isArray(gift.owners) ? gift.owners : [],
      comment: gift.comment || "",
      suggestedQuantity: gift.suggestedQuantity != null ? String(gift.suggestedQuantity) : ""
    });
    setEditingGiftId(gift.id);
    setShowAddGiftModal(true);
  };

  const handleDeleteGift = async (giftId) => {
    if (!selectedCampaign || !canEdit) return;
    const updatedCampaign = {
      ...selectedCampaign,
      gifts: selectedCampaign.gifts.filter(g => g.id !== giftId),
    };
    setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c));
    setSelectedCampaign(updatedCampaign);
    
    // Save to backend
    await saveCampaignToSheet(updatedCampaign);
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

  const totalBudget = (selectedCampaign?.budgetItems || []).reduce((sum, item) => {
    const price = item?.amount || 0;
    const qty = item?.quantity != null && item.quantity !== "" ? Number(item.quantity) : 1;
    return sum + (price * (Number.isNaN(qty) ? 1 : qty));
  }, 0);

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
              // Ensure campaign has participants - auto-populate if empty
              if (campaign && (!campaign.participants || campaign.participants.length === 0)) {
                const adminUser = { name: "Amit", email: "colleagueproj@gmail.com" };
                const currentUser = { name: user.name, email: user.email };
                
                const participants = [adminUser];
                if (user.email !== adminUser.email) {
                  participants.push(currentUser);
                }
                
                // Add all signed-in users as participants
                if (allUsers && allUsers.length > 0) {
                  for (const u of allUsers) {
                    if (!participants.some(p => (typeof p === 'object' ? p.email : p) === u.email)) {
                      participants.push({ name: u.name, email: u.email });
                    }
                  }
                }
                
                campaign.participants = participants;
              }
              setSelectedCampaign(campaign);
            }}
            className="campaign-select"
          >
            {(campaigns || []).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {canCreateCampaign && (
            <button onClick={() => { loadAllUsers(); setShowNewCampaignForm(true); }} className="btn-small">+ Campaign</button>
          )}
          {canCreateCampaign && selectedCampaign && (
            <button onClick={handleDeleteCampaign} className="btn-small btn-danger">🗑️ Delete</button>
          )}
          {canEdit && (
            <button onClick={() => { loadAllUsers(); setShowCampaignSettings(true); }} className="btn-small">⚙️ Settings</button>
          )}
          {isAdmin && (
            <button onClick={() => { loadAllUsers(); setShowAdminPanel(true); }} className="btn-small" style={{ background: "#8B4513", borderColor: "#d4af37" }}>👤 Admin Panel</button>
          )}
          <button onClick={async () => { setSyncStatus("⏳ Syncing..."); const success = await saveCampaignToSheet(selectedCampaign); setSyncStatus(success ? "✓ Synced!" : "❌ Sync failed"); setTimeout(() => setSyncStatus("✓ Synced"), 3000); }} className="btn-small">🔄 Sync Now</button>
        </div>
      </div>

      {/* Notifications Banner */}
      {notifications.length > 0 && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setNotifications([])}>
          <div className="modal" style={{ maxWidth: "600px" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#d4af37", marginBottom: "20px", fontSize: "18px" }}>🔔 {notifications[0]?.message || "Notification"}</h2>
            {notifications.map(notif => (
              <div key={`${notif.email}_${notif.task}`} style={{ marginBottom: "20px", padding: "15px", background: "#3a3a3a", borderRadius: "6px", borderLeft: "4px solid #d4af37" }}>
                <p style={{ margin: "10px 0", fontSize: "16px", color: "#ffffff", fontWeight: "600" }}>
                  📋 {notif.task}
                </p>
                <p style={{ margin: "10px 0", fontSize: "13px", color: "#e0e0e0" }}>
                  <strong>Owners:</strong> {notif.owners || "N/A"}
                </p>
                <p style={{ margin: "10px 0", fontSize: "13px", color: "#e0e0e0" }}>
                  <strong>Participants:</strong> {notif.participants || "N/A"}
                </p>
                <p style={{ margin: "10px 0", fontSize: "13px", color: "#e0e0e0" }}>
                  <strong>Start Date:</strong> {notif.startDate || "N/A"}
                </p>
                <p style={{ margin: "10px 0", fontSize: "13px", color: "#e0e0e0" }}>
                  <strong>End Date:</strong> {notif.endDate || "N/A"}
                </p>
              </div>
            ))}
            <button
              onClick={() => {
                // Dismiss all notifications and save to localStorage
                notifications.forEach(notif => {
                  dismissNotificationPermanently(notif.email, notif.task);
                  dismissNotification(notif.email, notif.task);
                });
                setNotifications([]);
              }}
              className="btn-primary"
              style={{ width: "100%" }}
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}


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
                  <td>{(Array.isArray(item.owners) ? item.owners.map(o => typeof o === 'object' ? o.name : o).join(", ") : "-") || "-"}</td>
                  <td>{(Array.isArray(item.participants) ? item.participants.map(p => typeof p === 'object' ? p.name : p).join(", ") : "-") || "-"}</td>
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
                
                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Task Name</label>
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
                        // Disable dates before start date
                        const isBeforeStart = newItemForm.startDate && dateStr < newItemForm.startDate;
                        return (
                          <button
                            key={i}
                            onClick={() => { if (!isBeforeStart) { setNewItemForm({...newItemForm, endDate: dateStr}); setShowEndDatePicker(false); } }}
                            disabled={isBeforeStart}
                            style={{
                              padding: "8px",
                              background: isBeforeStart ? "#5a3a3a" : isSelected ? "#d4af37" : isToday ? "#5a6a7a" : "#3a3a3a",
                              color: isBeforeStart ? "#8a6a6a" : isSelected ? "#1a1a1a" : "#ffffff",
                              border: isToday ? "2px solid #d4af37" : "1px solid #505050",
                              cursor: isBeforeStart ? "not-allowed" : "pointer",
                              opacity: isBeforeStart ? 0.5 : 1,
                              borderRadius: "4px",
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

                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Owners</label>
                <div className="checkbox-group">
                  {selectedCampaign.owners.map((owner, idx) => {
                    const ownerEmail = typeof owner === 'object' ? owner.email : owner;
                    const ownerName = typeof owner === 'object' ? owner.name : owner;
                    const isChecked = newItemForm.owners.some(o => {
                      const oEmail = typeof o === 'object' ? o.email : o;
                      const oName = typeof o === 'object' ? o.name : o;
                      return (ownerEmail && oEmail === ownerEmail) || oName === ownerName;
                    });
                    return (
                      <label key={ownerEmail || ownerName} className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewItemForm({...newItemForm, owners: [...newItemForm.owners, owner]});
                            } else {
                              setNewItemForm({...newItemForm, owners: newItemForm.owners.filter(o => {
                                const oEmail = typeof o === 'object' ? o.email : o;
                                const oName = typeof o === 'object' ? o.name : o;
                                return !((ownerEmail && oEmail === ownerEmail) || oName === ownerName);
                              })});
                            }
                          }}
                        />
                        {ownerName}
                      </label>
                    );
                  })}
                </div>

                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Participants</label>
                <div className="checkbox-group">
                  {selectedCampaign.participants.map((p, idx) => {
                    const participantEmail = typeof p === 'object' ? p.email : p;
                    const participantName = typeof p === 'object' ? p.name : p;
                    const isChecked = newItemForm.participants.some(x => {
                      const xEmail = typeof x === 'object' ? x.email : x;
                      const xName = typeof x === 'object' ? x.name : x;
                      return (participantEmail && xEmail === participantEmail) || xName === participantName;
                    });
                    return (
                      <label key={participantEmail || participantName} className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewItemForm({...newItemForm, participants: [...newItemForm.participants, p]});
                            } else {
                              setNewItemForm({...newItemForm, participants: newItemForm.participants.filter(x => {
                                const xEmail = typeof x === 'object' ? x.email : x;
                                const xName = typeof x === 'object' ? x.name : x;
                                return !((participantEmail && xEmail === participantEmail) || xName === participantName);
                              })});
                            }
                          }}
                        />
                        {participantName}
                      </label>
                    );
                  })}
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
                      
                      // Disable if reminder date is before today
                      const isDisabled = reminderDate < today;
                      
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
                        // Parse dates correctly (YYYY-MM-DD format)
                        const parseDate = (dateStr) => {
                          const [year, month, day] = dateStr.split('-').map(Number);
                          return new Date(year, month - 1, day);
                        };
                        
                        // Calculate the date range from all planning items
                        const dates = selectedCampaign.planningItems.flatMap(item => [
                          parseDate(item.startDate),
                          parseDate(item.endDate)
                        ]);
                        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
                        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
                        
                        // Add padding: start 5 days before earliest, end 5 days after latest
                        minDate.setDate(minDate.getDate() - 5);
                        maxDate.setDate(maxDate.getDate() + 5);
                        
                        // Group dates by month
                        const monthGroups = [];
                        let currentDate = new Date(minDate);
                        while (currentDate <= maxDate) {
                          const year = currentDate.getFullYear();
                          const month = currentDate.getMonth();
                          const monthStart = new Date(year, month, 1);
                          const monthEnd = new Date(year, month + 1, 0);
                          
                          const startInRange = monthStart < minDate ? minDate : monthStart;
                          const endInRange = monthEnd > maxDate ? maxDate : monthEnd;
                          
                          const daysInRange = Math.ceil((endInRange - startInRange) / (1000 * 60 * 60 * 24)) + 1;
                          const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                          
                          monthGroups.push({
                            label: monthLabel,
                            startDate: startInRange,
                            endDate: endInRange,
                            daysInRange: daysInRange,
                            fullMonthStart: monthStart,
                            fullMonthEnd: monthEnd
                          });
                          
                          currentDate = new Date(year, month + 1, 1);
                        }
                        
                        const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
                        
                        // Define colors for different tasks (rotates through colors)
                        const taskColors = [
                          "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", 
                          "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B88B", "#52C4A1"
                        ];

                        return (
                          <>
                            {/* Month Headers */}
                            <div style={{ display: "flex", marginBottom: "5px", fontSize: "12px", color: "#ffffff", paddingLeft: "200px", fontWeight: "600" }}>
                              {monthGroups.map((month, idx) => {
                                const monthWidth = (month.daysInRange / totalDays) * 100;
                                return (
                                  <div 
                                    key={idx} 
                                    style={{ 
                                      width: `${monthWidth}%`,
                                      textAlign: "center",
                                      background: "#3a4a3a",
                                      borderRight: "2px solid #505050",
                                      padding: "8px 0",
                                      color: "#d4af37"
                                    }}
                                  >
                                    {month.label}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Date Numbers Row */}
                            <div style={{ display: "flex", marginBottom: "10px", fontSize: "11px", color: "#b0b0b0", paddingLeft: "200px", fontWeight: "400" }}>
                              {monthGroups.map((month, monthIdx) => {
                                const monthWidth = (month.daysInRange / totalDays) * 100;
                                const daysInThisMonth = month.daysInRange;
                                const dayWidth = 100 / daysInThisMonth;
                                
                                return (
                                  <div 
                                    key={monthIdx} 
                                    style={{ 
                                      width: `${monthWidth}%`,
                                      display: "flex",
                                      borderRight: "2px solid #505050"
                                    }}
                                  >
                                    {Array.from({ length: daysInThisMonth }).map((_, dayIdx) => {
                                      const currentDay = new Date(month.startDate);
                                      currentDay.setDate(currentDay.getDate() + dayIdx);
                                      const dayOfMonth = currentDay.getDate();
                                      
                                      return (
                                        <div
                                          key={dayIdx}
                                          style={{
                                            width: `${dayWidth}%`,
                                            textAlign: "center",
                                            padding: "3px 0",
                                            borderRight: "1px solid #404040",
                                            fontSize: "10px"
                                          }}
                                        >
                                          {dayOfMonth}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Gantt Bars */}
                            {selectedCampaign.planningItems.map((item, itemIdx) => {
                              const startDate = parseDate(item.startDate);
                              const endDate = parseDate(item.endDate);
                              
                              // Calculate position and width relative to the displayed timeline
                              const daysFromStart = Math.floor((startDate - minDate) / (1000 * 60 * 60 * 24));
                              const durationDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
                              
                              const barStartPercent = (daysFromStart / totalDays) * 100;
                              const barWidthPercent = (durationDays / totalDays) * 100;
                              
                              // Get color for this task based on index
                              const taskColor = taskColors[itemIdx % taskColors.length];

                              return (
                                <div key={item.id} style={{ display: "flex", alignItems: "center", marginBottom: "15px", fontSize: "13px" }}>
                                  <div style={{ width: "200px", color: "#ffffff", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", fontSize: "13px" }}>
                                    {item.name}
                                  </div>
                                  <div style={{ flex: 1, display: "flex", position: "relative", height: "40px", alignItems: "center" }}>
                                    {/* Background grid by month */}
                                    {monthGroups.map((month, idx) => {
                                      const monthWidth = (month.daysInRange / totalDays) * 100;
                                      return (
                                        <div 
                                          key={idx} 
                                          style={{ 
                                            width: `${monthWidth}%`, 
                                            height: "100%",
                                            borderRight: "2px solid #505050",
                                            display: "flex",
                                            background: idx % 2 === 0 ? "transparent" : "rgba(100, 100, 100, 0.1)"
                                          }} 
                                        />
                                      );
                                    })}
                                    
                                    {/* Bar */}
                                    {barStartPercent < 100 && barWidthPercent > 0 && (
                                      <div
                                        style={{
                                          position: "absolute",
                                          left: `${barStartPercent}%`,
                                          width: `${Math.min(barWidthPercent, 100 - barStartPercent)}%`,
                                          height: "30px",
                                          background: item.status === "completed" ? "#3a5a3a" : item.status === "in-progress" ? taskColor : "#6a6a6a",
                                          borderRadius: "4px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          color: item.status === "in-progress" ? "#1a1a1a" : "#ffffff",
                                          fontSize: "11px",
                                          fontWeight: "600",
                                          border: `2px solid ${taskColor}`,
                                          minWidth: "40px",
                                          overflow: "hidden",
                                          boxShadow: `0 0 8px ${taskColor}40`
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
                <button onClick={() => {
                  setNewBudgetItem({ description: "", amount: "", quantity: "1", category: "recordings", comment: "" });
                  setEditingItemId(null);
                  setShowAddBudgetModal(true);
                }} className="btn-primary">
                  + Add Budget Item
                </button>
              )}
            </>
          )}

          <div className="budget-summary">
            <div style={{ display: "flex", gap: "30px", alignItems: "center", padding: "15px", background: "#3a4a3a", borderRadius: "6px" }}>
              <div>
                <label style={{ color: "#d4af37", fontWeight: "600", fontSize: "12px" }}>Budget</label>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#ffffff" }}>{selectedCampaign?.currency} {totalBudget.toFixed(2)}</div>
              </div>
              
              <div>
                <label style={{ color: "#d4af37", fontWeight: "600", fontSize: "12px" }}>Commission %</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={budgetCommission}
                  onChange={e => setBudgetCommission(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                  style={{ width: "80px", padding: "8px", borderRadius: "4px", border: "1px solid #d4af37", background: "#2a3a2a", color: "#ffffff", fontWeight: "600", fontSize: "16px" }}
                />
              </div>
              
              <div>
                <label style={{ color: "#d4af37", fontWeight: "600", fontSize: "12px" }}>Total Budget</label>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#ffffff" }}>{selectedCampaign?.currency} {(totalBudget + (totalBudget * budgetCommission / 100)).toFixed(2)}</div>
              </div>
            </div>
          </div>

          <table className="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Total Price</th>
                <th>Comment</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {selectedCampaign?.budgetItems.map(item => {
                const unitPrice = item.amount || 0;
                const qty = item.quantity != null && item.quantity !== "" ? Number(item.quantity) : 1;
                const safeQty = Number.isNaN(qty) ? 1 : qty;
                const totalPrice = unitPrice * safeQty;
                return (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{getCategoryLabel(item.category)}</td>
                  <td>{selectedCampaign.currency} {unitPrice.toFixed(2)}</td>
                  <td>{safeQty}</td>
                  <td>{selectedCampaign.currency} {totalPrice.toFixed(2)}</td>
                  <td>{item.comment || "-"}</td>
                  {canEdit && (
                    <td>
                      <button onClick={() => handleEditBudgetItem(item)} className="btn-small">Edit</button>
                      <button onClick={() => handleDeleteBudgetItem(item.id)} className="btn-small btn-danger">Delete</button>
                    </td>
                  )}
                </tr>
              );
              })}
            </tbody>
          </table>

          {showAddBudgetModal && (
            <div className="modal-overlay" onClick={() => setShowAddBudgetModal(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <h2>{editingItemId ? "Edit Budget Item" : "Add Budget Item"}</h2>
                
                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Description</label>
                <input type="text" placeholder="Description" value={newBudgetItem.description} onChange={e => setNewBudgetItem({...newBudgetItem, description: e.target.value})} className="input-field" />
                
                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Price</label>
                <input type="number" placeholder="Price" value={newBudgetItem.amount} onChange={e => setNewBudgetItem({...newBudgetItem, amount: e.target.value})} className="input-field" />

                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Quantity</label>
                <input type="number" min="0" step="any" placeholder="Quantity" value={newBudgetItem.quantity} onChange={e => setNewBudgetItem({...newBudgetItem, quantity: e.target.value})} className="input-field" />

                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Total Price</label>
                <div className="input-field" style={{ background: "#2a2a2a", color: "#ffffff", padding: "10px" }}>
                  {selectedCampaign?.currency}{" "}
                  {(
                    (parseFloat(newBudgetItem.amount) || 0) *
                    (newBudgetItem.quantity !== "" && newBudgetItem.quantity != null && !Number.isNaN(parseFloat(newBudgetItem.quantity))
                      ? parseFloat(newBudgetItem.quantity)
                      : 1)
                  ).toFixed(2)}
                </div>
                
                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Category</label>
                <select value={newBudgetItem.category} onChange={e => setNewBudgetItem({...newBudgetItem, category: e.target.value})} className="input-field">
                  <option value="">-- Select a category --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
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
                <button onClick={() => { setNewGiftItem(emptyGiftForm()); setEditingGiftId(null); setShowAddGiftModal(true); }} className="btn-primary">
                  + Add Gift
                </button>
              )}
            </>
          )}

          <table className="items-table">
            <thead>
              <tr>
                <th>Gift Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Cost</th>
                <th>Total Cost</th>
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
                  const unitCost = getGiftUnitCost(gift);
                  const estimatedProfit = gift.suggestedQuantity ? (gift.price * gift.suggestedQuantity) : 0;
                  const totalCost = gift.suggestedQuantity ? (unitCost * gift.suggestedQuantity) : unitCost;
                  return (
                  <tr key={gift.id}>
                    <td>{gift.name}</td>
                    <td>{getCategoryLabel(gift.category, giftCategories)}</td>
                    <td>{selectedCampaign.currency} {gift.price.toFixed(2)}</td>
                    <td>{selectedCampaign.currency} {unitCost.toFixed(2)}</td>
                    <td>{selectedCampaign.currency} {totalCost.toFixed(2)}</td>
                    <td>{gift.suggestedQuantity || "-"}</td>
                    <td>{selectedCampaign.currency} {estimatedProfit.toFixed(2)}</td>
                    <td>{(gift.owners || []).map(o => typeof o === "object" ? (o.name || o.email) : o).filter(Boolean).join(", ") || "-"}</td>
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
                  <td colSpan={canEdit ? 10 : 9} style={{ textAlign: "center", color: "#d4af37" }}>No gifts added yet</td>
                </tr>
              )}
            </tbody>
          </table>

          {showAddGiftModal && selectedCampaign && (
            <div className="modal-overlay" onClick={() => setShowAddGiftModal(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <h2>{editingGiftId ? "Edit Gift" : "Add Gift"}</h2>
                
                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Gift Name</label>
                <input type="text" placeholder="Gift name" value={newGiftItem.name} onChange={e => setNewGiftItem({...newGiftItem, name: e.target.value})} className="input-field" />
                
                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Price</label>
                <input type="number" placeholder="Price" value={newGiftItem.price} onChange={e => setNewGiftItem({...newGiftItem, price: e.target.value})} className="input-field" />
                
                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>
                  Cost items (up to 7)
                </label>
                {(newGiftItem.costItems || []).map((costItem, idx) => (
                  <div key={idx} style={{ marginBottom: "12px", padding: "12px", background: "#2a3a2a", borderRadius: "6px", border: "1px solid #555" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ color: "#d4af37", fontWeight: "600", fontSize: "13px" }}>Item #{idx + 1}</span>
                      {(newGiftItem.costItems || []).length > 1 && (
                        <button
                          type="button"
                          className="btn-small btn-danger"
                          onClick={() => setNewGiftItem(prev => ({
                            ...prev,
                            costItems: prev.costItems.filter((_, i) => i !== idx)
                          }))}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <select
                      value={costItem.source || "manual"}
                      onChange={e => {
                        const value = e.target.value;
                        setNewGiftItem(prev => {
                          const next = [...(prev.costItems || [])];
                          if (value === "manual") {
                            next[idx] = { ...next[idx], source: "manual", budgetItemId: "", label: "Manual" };
                          } else {
                            const item = getMerchandiseBudgetItems().find(b => b.id === value);
                            next[idx] = {
                              ...next[idx],
                              source: value,
                              budgetItemId: value,
                              label: item?.description || "",
                              cost: item ? String(item.amount ?? 0) : next[idx].cost,
                            };
                          }
                          return { ...prev, costItems: next };
                        });
                      }}
                      className="input-field"
                    >
                      <option value="manual">Manual entry</option>
                      {getMerchandiseBudgetItems().map(item => (
                        <option key={item.id} value={item.id}>
                          {item.description} — {selectedCampaign.currency} {Number(item.amount || 0).toFixed(2)}
                        </option>
                      ))}
                    </select>
                    {(costItem.source || "manual") === "manual" ? (
                      <input
                        type="number"
                        placeholder="Enter cost manually"
                        value={costItem.cost}
                        onChange={e => setNewGiftItem(prev => {
                          const next = [...(prev.costItems || [])];
                          next[idx] = { ...next[idx], cost: e.target.value };
                          return { ...prev, costItems: next };
                        })}
                        className="input-field"
                        style={{ marginTop: "8px" }}
                      />
                    ) : (
                      <div className="input-field" style={{ marginTop: "8px", background: "#2a2a2a", color: "#ffffff" }}>
                        Cost from budget: {selectedCampaign.currency} {Number(costItem.cost || 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
                {(newGiftItem.costItems || []).length < 7 && (
                  <button
                    type="button"
                    className="btn-small"
                    style={{ marginBottom: "10px" }}
                    onClick={() => setNewGiftItem(prev => ({
                      ...prev,
                      costItems: [...(prev.costItems || []), { source: "manual", budgetItemId: "", cost: "" }]
                    }))}
                  >
                    + Add cost item
                  </button>
                )}
                {getMerchandiseBudgetItems().length === 0 && (
                  <p style={{ color: "#ffcc00", fontSize: "12px", marginBottom: "10px" }}>
                    No budget items in מרצ'נדייז (Merchandise). Use manual entry, or add merchandise items in Budget.
                  </p>
                )}
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Cost</label>
                  <div className="input-field" style={{ background: "#2a2a2a", color: "#ffffff", fontWeight: "700", fontSize: "16px" }}>
                    {selectedCampaign.currency} {sumCostItems(newGiftItem.costItems).toFixed(2)}
                  </div>
                  <p style={{ color: "#b0b0b0", fontSize: "12px", marginTop: "6px" }}>
                    Cost = sum of the cost items above
                  </p>
                </div>
                
                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Category</label>
                <select value={newGiftItem.category || ""} onChange={e => setNewGiftItem({...newGiftItem, category: e.target.value})} className="input-field">
                  <option value="">-- Select a category --</option>
                  {giftCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
                
                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Suggested Quantity (optional)</label>
                <input type="number" placeholder="Suggested Quantity (optional)" value={newGiftItem.suggestedQuantity} onChange={e => setNewGiftItem({...newGiftItem, suggestedQuantity: e.target.value})} className="input-field" />

                <label style={{ marginTop: "15px", display: "block", marginBottom: "5px", color: "#d4af37", fontWeight: "600" }}>Gift Owner(s):</label>
                <div className="checkbox-group">
                  {(() => {
                    // Show campaign owners + participants (unique by email/name)
                    const people = [];
                    const seen = new Set();
                    const addPerson = (p) => {
                      const key = (typeof p === "object" ? (p.email || p.name) : p) || "";
                      if (!key || seen.has(key)) return;
                      seen.add(key);
                      people.push(p);
                    };
                    (selectedCampaign.owners || []).forEach(addPerson);
                    (selectedCampaign.participants || []).forEach(addPerson);

                    if (people.length === 0) {
                      return <p style={{ color: "#ffcc00" }}>No owners/participants in Campaign Settings yet.</p>;
                    }

                    const currentOwners = Array.isArray(newGiftItem.owners) ? newGiftItem.owners : [];

                    return people.map((p) => {
                      const personEmail = typeof p === "object" ? p.email : p;
                      const personName = typeof p === "object" ? (p.name || p.email) : p;
                      const personKey = personEmail || personName;
                      const isChecked = currentOwners.some(o => {
                        const oEmail = typeof o === "object" ? o.email : o;
                        const oName = typeof o === "object" ? o.name : o;
                        return (personEmail && oEmail === personEmail) || oName === personName || oEmail === personKey;
                      });
                      return (
                        <label key={personKey} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              setNewGiftItem(prev => {
                                const prevOwners = Array.isArray(prev.owners) ? prev.owners : [];
                                if (e.target.checked) {
                                  return { ...prev, owners: [...prevOwners, p] };
                                }
                                return {
                                  ...prev,
                                  owners: prevOwners.filter(o => {
                                    const oEmail = typeof o === "object" ? o.email : o;
                                    const oName = typeof o === "object" ? o.name : o;
                                    return !((personEmail && oEmail === personEmail) || oName === personName || oEmail === personKey);
                                  })
                                };
                              });
                            }}
                          />
                          {personName}
                        </label>
                      );
                    });
                  })()}
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
                <div key={idx} className="list-item" style={{ display: editingOwnerIdx === idx ? "none" : "flex" }}>
                  <div>
                    <div style={{ fontWeight: "600", color: "#d4af37" }}>{typeof owner === 'object' ? owner.name : owner}</div>
                    <div style={{ fontSize: "12px", color: "#b0b0b0" }}>{typeof owner === 'object' ? owner.email : ''}</div>
                  </div>
                  <div style={{ display: "flex", gap: "5px" }}>
                    <button onClick={() => handleEditOwner(idx)} className="btn-small">Edit</button>
                    <button onClick={() => handleRemoveOwner(idx)} className="btn-small btn-danger">Remove</button>
                  </div>
                </div>
              ))}
              {editingOwnerIdx !== null && (
                <div style={{ padding: "12px", background: "#3a4a3a", borderRadius: "4px", marginBottom: "10px" }}>
                  <input type="text" placeholder="Owner name" value={editOwnerName} onChange={e => setEditOwnerName(e.target.value)} className="input-field" style={{ marginBottom: "10px" }} />
                  <input type="email" placeholder="Owner email" value={editOwnerEmail} onChange={e => setEditOwnerEmail(e.target.value)} className="input-field" style={{ marginBottom: "10px" }} />
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={handleSaveOwner} className="btn-primary" style={{ flex: 1 }}>Save</button>
                    <button onClick={() => setEditingOwnerIdx(null)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
              <input type="text" placeholder="Owner name" value={newOwnerName} onChange={e => setNewOwnerName(e.target.value)} className="input-field" style={{ flex: 1 }} />
              <input type="email" placeholder="Owner email" value={newOwnerEmail} onChange={e => setNewOwnerEmail(e.target.value)} className="input-field" style={{ flex: 1 }} />
            </div>
            <button onClick={handleAddOwner} className="btn-primary" style={{ width: "100%", marginBottom: "15px" }}>Add Owner</button>

            {/* Select from existing users */}
            <label style={{ display: "block", marginBottom: "8px", color: "#d4af37", fontWeight: "600", fontSize: "13px" }}>Or select from signed-in users:</label>
            <select 
              onChange={(e) => {
                if (e.target.value) {
                  const user = allUsers.find(u => u.email === e.target.value);
                  if (user && !selectedCampaign.owners.some(o => (typeof o === 'object' ? o.email : o) === user.email)) {
                    handleAddOwner_User(user);
                  }
                  e.target.value = "";
                }
              }}
              className="input-field"
              style={{ marginBottom: "15px" }}
            >
              <option value="">-- Select a user --</option>
              {allUsers.filter(u => !selectedCampaign.owners.some(o => (typeof o === 'object' ? o.email : o) === u.email)).map(user => (
                <option key={user.email} value={user.email}>{user.name} ({user.email})</option>
              ))}
            </select>

            <h3 style={{ marginTop: "20px" }}>Participants</h3>
            <div className="settings-list">
              {selectedCampaign.participants.map((p, idx) => {
                const pEmail = typeof p === 'object' ? p.email : p;
                const isAlreadyOwner = selectedCampaign.owners.some(o => (typeof o === 'object' ? o.email : o) === pEmail);
                
                return (
                  <div key={idx} className="list-item" style={{ display: editingParticipantIdx === idx ? "none" : "flex" }}>
                    <div>
                      <div style={{ fontWeight: "600", color: "#d4af37" }}>{typeof p === 'object' ? p.name : p}</div>
                      <div style={{ fontSize: "12px", color: "#b0b0b0" }}>{typeof p === 'object' ? p.email : ''}</div>
                      {isAlreadyOwner && <div style={{ fontSize: "11px", color: "#FFD700", marginTop: "4px", fontWeight: "500" }}>👑 Owner</div>}
                    </div>
                    <div style={{ display: "flex", gap: "5px" }}>
                      {!isAlreadyOwner && isOwner && (
                        <button 
                          onClick={() => {
                            const participant = typeof p === 'object' ? p : { name: p, email: p };
                            if (!selectedCampaign.owners.some(o => (typeof o === 'object' ? o.email : o) === (typeof participant === 'object' ? participant.email : participant))) {
                              setSelectedCampaign({
                                ...selectedCampaign,
                                owners: [...selectedCampaign.owners, participant]
                              });
                            }
                          }}
                          className="btn-small"
                          style={{ background: "#4a6a4a", borderColor: "#d4af37" }}
                          title="Promote to Owner"
                        >
                          ⬆️ Promote
                        </button>
                      )}
                      <button onClick={() => handleEditParticipant(idx)} className="btn-small">Edit</button>
                      <button onClick={() => handleRemoveParticipant(idx)} className="btn-small btn-danger">Remove</button>
                    </div>
                  </div>
                );
              })}
              {editingParticipantIdx !== null && (
                <div style={{ padding: "12px", background: "#3a4a3a", borderRadius: "4px", marginBottom: "10px" }}>
                  <input type="text" placeholder="Participant name" value={editParticipantName} onChange={e => setEditParticipantName(e.target.value)} className="input-field" style={{ marginBottom: "10px" }} />
                  <input type="email" placeholder="Participant email" value={editParticipantEmail} onChange={e => setEditParticipantEmail(e.target.value)} className="input-field" style={{ marginBottom: "10px" }} />
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={handleSaveParticipant} className="btn-primary" style={{ flex: 1 }}>Save</button>
                    <button onClick={() => setEditingParticipantIdx(null)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
              <input type="text" placeholder="Participant name" value={newParticipantName} onChange={e => setNewParticipantName(e.target.value)} className="input-field" style={{ flex: 1 }} />
              <input type="email" placeholder="Participant email" value={newParticipantEmail} onChange={e => setNewParticipantEmail(e.target.value)} className="input-field" style={{ flex: 1 }} />
            </div>
            <button onClick={handleAddParticipant} className="btn-primary" style={{ width: "100%", marginBottom: "15px" }}>Add Participant</button>

            {/* Select from existing users */}
            <label style={{ display: "block", marginBottom: "8px", color: "#d4af37", fontWeight: "600", fontSize: "13px" }}>Or select from signed-in users:</label>
            <select 
              onChange={(e) => {
                if (e.target.value) {
                  const user = allUsers.find(u => u.email === e.target.value);
                  if (user && !selectedCampaign.participants.some(p => (typeof p === 'object' ? p.email : p) === user.email)) {
                    handleAddParticipant_User(user);
                  }
                  e.target.value = "";
                }
              }}
              className="input-field"
              style={{ marginBottom: "15px" }}
            >
              <option value="">-- Select a user --</option>
              {allUsers.filter(u => !selectedCampaign.participants.some(p => (typeof p === 'object' ? p.email : p) === u.email)).map(user => (
                <option key={user.email} value={user.email}>{user.name} ({user.email})</option>
              ))}
            </select>

            <div className="modal-buttons" style={{ marginTop: "20px" }}>
              <button onClick={async () => { 
                await saveCampaignToSheet(selectedCampaign);
                const updatedCampaigns = campaigns.map(c => c.id === selectedCampaign.id ? selectedCampaign : c);
                setCampaigns(updatedCampaigns);
                setShowCampaignSettings(false);
              }} className="btn-primary">Save & Close</button>
              <button onClick={() => setShowCampaignSettings(false)} className="btn-secondary">Cancel</button>
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

      {/* Admin Panel Modal */}
      {showAdminPanel && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowAdminPanel(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "700px", maxHeight: "80vh", overflowY: "auto" }}>
            <h2 style={{ color: "#d4af37", marginBottom: "20px" }}>👤 Admin Panel - User Management</h2>
            
            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ color: "#d4af37", marginBottom: "15px" }}>Signed-in Users ({allUsers.length})</h3>
              
              {allUsers.length === 0 ? (
                <p style={{ color: "#999" }}>No users registered yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {allUsers.map((u, idx) => (
                    <div key={u.email} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "#3a4a3a", borderRadius: "6px", borderLeft: u.is_admin ? "4px solid #FFD700" : "4px solid #d4af37" }}>
                      <div>
                        <div style={{ fontWeight: "600", color: "#d4af37" }}>{u.name}</div>
                        <div style={{ fontSize: "12px", color: "#b0b0b0" }}>{u.email}</div>
                        {u.is_admin && <div style={{ fontSize: "11px", color: "#FFD700", marginTop: "4px", fontWeight: "500" }}>👑 Admin</div>}
                      </div>
                      <button 
                        onClick={async () => {
                          const success = await removeUser(u.email);
                          if (success) {
                            setAllUsers(allUsers.filter(usr => usr.email !== u.email));
                            alert(`User ${u.email} removed successfully.`);
                          } else {
                            alert(`Failed to remove user ${u.email}.`);
                          }
                        }}
                        className="btn-small btn-danger"
                        disabled={u.email === user?.email}
                        title={u.email === user?.email ? "Cannot remove yourself" : "Remove user"}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: "30px", paddingTop: "10px", borderTop: "1px solid #555" }}>
              <h3 style={{ color: "#d4af37", marginBottom: "10px" }}>Album Import Tools</h3>
              <p style={{ color: "#b0b0b0", fontSize: "13px", marginBottom: "15px" }}>
                These actions replace existing content on the &quot;Weeping Willow Tree first album and live show&quot; campaign.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  onClick={() => {
                    if (!window.confirm("Are you sure you want to override the existing content?")) return;
                    addAlbumBudgetItems();
                  }}
                  className="btn-primary"
                  style={{ background: "#4a6a4a", borderColor: "#d4af37" }}
                >
                  📊 Import Album Budget
                </button>
                <button
                  onClick={() => {
                    if (!window.confirm("Are you sure you want to override the existing content?")) return;
                    addAlbumGifts();
                  }}
                  className="btn-primary"
                  style={{ background: "#4a6a4a", borderColor: "#d4af37" }}
                >
                  🎁 Import Album Gifts
                </button>
              </div>
            </div>

            <div className="modal-buttons" style={{ marginTop: "20px" }}>
              <button onClick={() => setShowManageCategoriesModal(true)} className="btn-primary" style={{ marginRight: "10px" }}>⚙️ Manage Budget Categories</button>
              <button onClick={() => setShowManageGiftCategoriesModal(true)} className="btn-primary" style={{ marginRight: "10px" }}>⚙️ Manage Gift Categories</button>
              <button onClick={() => setShowAdminPanel(false)} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {showManageCategoriesModal && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowManageCategoriesModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "600px", maxHeight: "80vh", overflowY: "auto" }}>
            <h2 style={{ color: "#d4af37", marginBottom: "20px" }}>⚙️ Manage Budget Categories</h2>
            
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ color: "#d4af37", marginBottom: "15px" }}>Current Categories ({categories.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                {categories.map(cat => (
                  <div key={cat.id} style={{ display: editingCategoryId === cat.id ? "none" : "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "#3a4a3a", borderRadius: "6px", borderLeft: "4px solid #d4af37" }}>
                    <div>
                      <div style={{ fontWeight: "600", color: "#d4af37" }}>{cat.label}</div>
                      <div style={{ fontSize: "12px", color: "#b0b0b0" }}>ID: {cat.id}</div>
                    </div>
                    <div style={{ display: "flex", gap: "5px" }}>
                      <button 
                        onClick={() => handleEditCategory(cat)}
                        className="btn-small"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleRemoveCategory(cat.id)}
                        className="btn-small btn-danger"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {editingCategoryId && (
                  <div style={{ padding: "12px", background: "#4a4a3a", borderRadius: "6px", border: "2px solid #d4af37" }}>
                    <div style={{ marginBottom: "10px" }}>
                      <label style={{ color: "#d4af37", fontWeight: "600" }}>Edit Category Label</label>
                      <input 
                        type="text" 
                        value={editingCategoryLabel} 
                        onChange={e => setEditingCategoryLabel(e.target.value)}
                        className="input-field"
                        style={{ marginTop: "5px" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button onClick={handleSaveCategory} className="btn-primary" style={{ flex: 1 }}>Save</button>
                      <button onClick={() => setEditingCategoryId(null)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: "20px", padding: "15px", background: "#3a4a3a", borderRadius: "6px" }}>
              <h3 style={{ color: "#d4af37", marginBottom: "10px" }}>Add New Category</h3>
              <input 
                type="text" 
                placeholder="Category name (e.g., הקלטות סופיות)" 
                value={newCategory} 
                onChange={e => setNewCategory(e.target.value)}
                className="input-field"
                style={{ marginBottom: "10px" }}
              />
              <button onClick={handleAddCategory} className="btn-primary" style={{ width: "100%" }}>Add Category</button>
            </div>

            <div className="modal-buttons">
              <button onClick={() => setShowManageCategoriesModal(false)} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Gift Categories Modal */}
      {showManageGiftCategoriesModal && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowManageGiftCategoriesModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "600px", maxHeight: "80vh", overflowY: "auto" }}>
            <h2 style={{ color: "#d4af37", marginBottom: "20px" }}>⚙️ Manage Gift Categories</h2>
            
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ color: "#d4af37", marginBottom: "15px" }}>Current Categories ({giftCategories.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                {giftCategories.map(cat => (
                  <div key={cat.id} style={{ display: editingGiftCategoryId === cat.id ? "none" : "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "#3a4a3a", borderRadius: "6px", borderLeft: "4px solid #d4af37" }}>
                    <div>
                      <div style={{ fontWeight: "600", color: "#d4af37" }}>{cat.label}</div>
                      <div style={{ fontSize: "12px", color: "#b0b0b0" }}>ID: {cat.id}</div>
                    </div>
                    <div style={{ display: "flex", gap: "5px" }}>
                      <button 
                        onClick={() => handleEditGiftCategory(cat)}
                        className="btn-small"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleRemoveGiftCategory(cat.id)}
                        className="btn-small btn-danger"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {editingGiftCategoryId && (
                  <div style={{ padding: "12px", background: "#4a4a3a", borderRadius: "6px", border: "2px solid #d4af37" }}>
                    <div style={{ marginBottom: "10px" }}>
                      <label style={{ color: "#d4af37", fontWeight: "600" }}>Edit Category Label</label>
                      <input 
                        type="text" 
                        value={editingGiftCategoryLabel} 
                        onChange={e => setEditingGiftCategoryLabel(e.target.value)}
                        className="input-field"
                        style={{ marginTop: "5px" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button onClick={handleSaveGiftCategory} className="btn-primary" style={{ flex: 1 }}>Save</button>
                      <button onClick={() => setEditingGiftCategoryId(null)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: "20px", padding: "15px", background: "#3a4a3a", borderRadius: "6px" }}>
              <h3 style={{ color: "#d4af37", marginBottom: "10px" }}>Add New Category</h3>
              <input 
                type="text" 
                placeholder="Category name (e.g., מוזיקה)" 
                value={newGiftCategory} 
                onChange={e => setNewGiftCategory(e.target.value)}
                className="input-field"
                style={{ marginBottom: "10px" }}
              />
              <button onClick={handleAddGiftCategory} className="btn-primary" style={{ width: "100%" }}>Add Category</button>
            </div>

            <div className="modal-buttons">
              <button onClick={() => setShowManageGiftCategoriesModal(false)} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}