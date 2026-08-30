const HARDCODED_SHEET_ID = "19Qir2g-4lZBJWuMvWudybqkIemqZxkeghEFfZsjJpfE";
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzKYynX0HdNX4Pg55Nruo0u1_zSiGDBkx-uXV96-7PbTmBI0Y42y3kq35Etdd6ueaDBZA/exec";

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
    const payload = JSON.stringify({
      action: "save",
      id: campaign.id,
      data: campaign
    });

    // Prefer POST so large campaigns (budget + gifts + plan) are not truncated by URL length
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: payload,
          redirect: "follow"
        });
        const result = await response.json();
        if (result.action === "save" || result.success !== false) {
          return true;
        }
      } catch (error) {
        // Fallback to GET for older deployments / smaller payloads
        try {
          const url = new URL(APPS_SCRIPT_URL);
          url.searchParams.append("action", "save");
          url.searchParams.append("id", campaign.id);
          url.searchParams.append("data", JSON.stringify(campaign));
          const response = await fetch(url.toString(), { method: "GET" });
          const result = await response.json();
          if (result.action === "save") return true;
        } catch (_) {
          if (attempt === 3) throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
    return false;
  } catch (error) {
    console.error("Error syncing:", error);
    return false;
  }
}

export async function setPlanningItems(campaignName, items) {
  try {
    const payload = JSON.stringify({
      action: "set_planning_items",
      campaignName,
      items
    });
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: payload,
      redirect: "follow"
    });
    const result = await response.json();
    if (result.success) return true;

    // Fallback GET for older deployments
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append("action", "set_planning_items");
    url.searchParams.append("campaignName", campaignName);
    url.searchParams.append("items", JSON.stringify(items));
    const getResp = await fetch(url.toString(), { method: "GET" });
    const getResult = await getResp.json();
    return !!getResult.success;
  } catch (error) {
    console.error("Error setting planning items:", error);
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

export async function fetchAllUsers() {
  try {
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append("action", "get_all_users");
    
    const response = await fetch(url.toString(), { method: "GET" });
    if (!response.ok) throw new Error("Failed to fetch users");
    const result = await response.json();
    
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
}

export async function removeUser(email) {
  try {
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append("action", "remove_user");
    url.searchParams.append("email", email);
    
    const response = await fetch(url.toString(), { method: "GET" });
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Error removing user:", error);
    return false;
  }
}

export async function addBudgetItems(campaignName, items) {
  try {
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append("action", "add_budget_items");
    url.searchParams.append("campaignName", campaignName);
    url.searchParams.append("items", JSON.stringify(items));
    
    const response = await fetch(url.toString(), { method: "GET" });
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Error adding budget items:", error);
    return false;
  }
}