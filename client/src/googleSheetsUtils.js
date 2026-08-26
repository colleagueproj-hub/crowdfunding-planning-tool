const HARDCODED_SHEET_ID = "19Qir2g-4lZBJWuMvWudybqkIemqZxkeghEFfZsjJpfE";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxeai5uzPe5yqWQV8H_-SSbvem6ERuWN29VGxYznerzGu0vKjenAAu1pNj_wHTLIsVmcw/exec";

export async function loginUser(email, password, name, isSignUp) {
  try {
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append("action", isSignUp ? "signup" : "login");
    url.searchParams.append("email", email);
    url.searchParams.append("password", password);
    if (name) url.searchParams.append("name", name);
    
    const response = await fetch(url.toString(), { method: "GET" });
    const result = await response.json();
    
    if (result.success) {
      localStorage.setItem("crowdfunding_user", JSON.stringify(result));
    }
    return result;
  } catch (error) {
    console.error("Login error:", error);
    return {success: false, error: error.message};
  }
}

export function getLoggedInUser() {
  const user = localStorage.getItem("crowdfunding_user");
  return user ? JSON.parse(user) : null;
}

export function logoutUser() {
  localStorage.removeItem("crowdfunding_user");
}

export async function fetchCampaignsFromSheet() {
  try {
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append("action", "read");
    
    const response = await fetch(url.toString(), { method: "GET" });
    if (!response.ok) throw new Error("Failed to fetch");
    const result = await response.json();
    
    const campaigns = Array.isArray(result) ? result : (result.campaigns || []);
    localStorage.setItem("crowdfunding_campaigns_cache", JSON.stringify(campaigns));
    return campaigns;
  } catch (error) {
    console.error("Error fetching:", error);
    const cached = localStorage.getItem("crowdfunding_campaigns_cache");
    return cached ? JSON.parse(cached) : [];
  }
}

export async function saveCampaignToSheet(campaign) {
  try {
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append("action", "save");
    url.searchParams.append("id", campaign.id);
    url.searchParams.append("data", JSON.stringify(campaign));
    
    const response = await fetch(url.toString(), { method: "GET" });
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Error syncing:", error);
    return false;
  }
}

export function getDefaultSheetId() {
  return HARDCODED_SHEET_ID;
}

export async function fetchNotifications(userEmail) {
  try {
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append("action", "fetch_notifications");
    url.searchParams.append("email", userEmail);
    
    const response = await fetch(url.toString(), { method: "GET" });
    if (!response.ok) throw new Error("Failed to fetch notifications");
    const result = await response.json();
    
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export async function dismissNotification(userEmail, taskName) {
  try {
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append("action", "dismiss_notification");
    url.searchParams.append("email", userEmail);
    url.searchParams.append("task", taskName);
    
    const response = await fetch(url.toString(), { method: "GET" });
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Error dismissing notification:", error);
    return false;
  }
}