const HARDCODED_SHEET_ID = "19Qir2g-4lZBJWuMvWudybqkIemqZxkeghEFfZsjJpfE";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwM3vkIsjFkoEFa9kp3VXXWDK4d8tcDOh_LParXcya83nEMCOHgWh3Ip3n5_jp1sPVA9g/exec";

export async function fetchCampaignsFromSheet(sheetId = HARDCODED_SHEET_ID) {
  try {
    console.log("Fetching campaigns from Apps Script...");
    const response = await fetch(APPS_SCRIPT_URL, { method: "GET" });
    if (!response.ok) throw new Error("Failed to fetch");
    const result = await response.json();
    console.log("Campaigns loaded:", result.campaigns ? result.campaigns.length : 0);
    
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
    console.log("Syncing campaign:", campaign.id);
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.append("action", "save");
    url.searchParams.append("id", campaign.id);
    url.searchParams.append("data", JSON.stringify(campaign));
    
    const response = await fetch(url.toString(), { method: "GET" });
    const result = await response.json();
    console.log("Sync result:", result.success ? "SUCCESS" : "FAILED");
    return result.success;
  } catch (error) {
    console.error("Error syncing:", error);
    return false;
  }
}

export function extractSheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export function getStoredSheetUrl() {
  return localStorage.getItem("crowdfunding_sheet_url") || HARDCODED_SHEET_ID;
}

export function storeSheetUrl(url) {
  localStorage.setItem("crowdfunding_sheet_url", url);
}

export function getDefaultSheetId() {
  return HARDCODED_SHEET_ID;
}