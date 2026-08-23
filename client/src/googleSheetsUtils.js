const HARDCODED_SHEET_ID = "19Qir2g-4lZBJWuMvWudybqkIemqZxkeghEFfZsjJpfE";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyd2YkS903OtAm9rNBWggLvvUklk9QQs4lytTJwKyV9PRENM_9Uz3X52AcF8QhcH-VQkw/exec";

export async function fetchCampaignsFromSheet(sheetId = HARDCODED_SHEET_ID) {
  try {
    console.log("1. Starting fetch from Apps Script...");
    console.log("2. URL:", APPS_SCRIPT_URL);
    
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "GET",
      mode: "cors"
    });
    
    console.log("3. Response received:", response.status, response.statusText);
    
    if (!response.ok) {
      console.log("4. Response not OK:", response.status);
      throw new Error("Failed to fetch sheet: " + response.status);
    }
    
    const result = await response.json();
    console.log("5. JSON parsed:", result);
    
    if (!result.success || !result.campaigns) {
      console.log("6. No campaigns in response");
      return [];
    }
    
    console.log("7. Campaigns found:", result.campaigns.length);
    
    localStorage.setItem("crowdfunding_campaigns_cache", JSON.stringify(result.campaigns));
    localStorage.setItem("crowdfunding_last_sync", new Date().toISOString());
    
    return result.campaigns;
  } catch (error) {
    console.error("ERROR in fetch:", error);
    console.error("Error stack:", error.stack);
    const cached = localStorage.getItem("crowdfunding_campaigns_cache");
    console.log("Returning cached:", cached ? "yes" : "no");
    return cached ? JSON.parse(cached) : [];
  }
}

export async function saveCampaignToSheet(campaign) {
  try {
    console.log("Saving campaign:", campaign.id);
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(campaign),
      mode: "cors"
    });
    
    console.log("Save response status:", response.status);
    const result = await response.json();
    console.log("Save result:", result);
    return result.success;
  } catch (error) {
    console.error("Error saving:", error);
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