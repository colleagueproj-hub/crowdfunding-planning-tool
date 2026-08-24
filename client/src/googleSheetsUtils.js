const HARDCODED_SHEET_ID = "19Qir2g-4lZBJWuMvWudybqkIemqZxkeghEFfZsjJpfE";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxbzl5AlknHSsUNe6s1z5zZImhQiiyeU8qYeJEoL8hNd-zVP-zp9a4iU3FwE2DKbEEmqg/exec";

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
    const response = await fetch(APPS_SCRIPT_URL, { method: "GET" });
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