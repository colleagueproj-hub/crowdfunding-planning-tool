const HARDCODED_SHEET_ID = "19Qir2g-4lZBJWuMvWudybqkIemqZxkeghEFfZsjJpfE";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyd2YkS903OtAm9rNBWggLvvUklk9QQs4lytTJwKyV9PRENM_9Uz3X52AcF8QhcH-VQkw/exec";

export async function fetchCampaignsFromSheet(sheetId = HARDCODED_SHEET_ID) {
  try {
    console.log("Fetching campaigns from Apps Script...");
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "GET"
    });
    
    if (!response.ok) throw new Error("Failed to fetch sheet");
    
    const result = await response.json();
    console.log("Apps Script response:", result);
    
    if (!result.success || !result.campaigns) {
      console.log("No campaigns found");
      return [];
    }
    
    console.log("Parsed campaigns:", result.campaigns);
    
    localStorage.setItem("crowdfunding_campaigns_cache", JSON.stringify(result.campaigns));
    localStorage.setItem("crowdfunding_last_sync", new Date().toISOString());
    
    return result.campaigns;
  } catch (error) {
    console.error("Error fetching from Google Sheets:", error);
    const cached = localStorage.getItem("crowdfunding_campaigns_cache");
    return cached ? JSON.parse(cached) : [];
  }
}

export async function saveCampaignToSheet(campaign) {
  try {
    console.log("Saving campaign to sheet:", campaign);
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(campaign)
    });
    
    const result = await response.json();
    console.log("Save response:", result);
    return result.success;
  } catch (error) {
    console.error("Error saving to Google Sheets:", error);
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