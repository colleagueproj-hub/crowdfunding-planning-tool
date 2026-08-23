const HARDCODED_SHEET_ID = "19Qir2g-4lZBJWuMvWudybqkIemqZxkeghEFfZsjJpfE";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyd2YkS903OtAm9rNBWggLvvUklk9QQs4lytTJwKyV9PRENM_9Uz3X52AcF8QhcH-VQkw/exec";

export function extractSheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export function getSheetCsvUrl(sheetId, gid = 0) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export async function fetchCampaignsFromSheet(sheetId = HARDCODED_SHEET_ID) {
  try {
    const csvUrl = getSheetCsvUrl(sheetId);
    console.log("Fetching from:", csvUrl);
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error("Failed to fetch sheet");
    
    const csvText = await response.text();
    console.log("CSV Data:", csvText.substring(0, 200));
    const campaigns = parseCampaignsFromCsv(csvText);
    console.log("Parsed campaigns:", campaigns);
    
    localStorage.setItem("crowdfunding_campaigns_cache", JSON.stringify(campaigns));
    localStorage.setItem("crowdfunding_last_sync", new Date().toISOString());
    
    return campaigns;
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
    
    const result = await response.text();
    console.log("Save response:", result);
    return true;
  } catch (error) {
    console.error("Error saving to Google Sheets:", error);
    return false;
  }
}

export function parseCampaignsFromCsv(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    console.log("No campaigns found in sheet (only headers or empty)");
    return [];
  }

  const campaigns = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const values = parseCSVLine(line);
      console.log("Row", i, "parsed values:", values);
      
      if (!values[0] || !values[1]) continue;
      
      const jsonStr = values[1];
      const campaign = JSON.parse(jsonStr);
      console.log("Parsed campaign:", campaign);
      campaigns.push(campaign);
    } catch (error) {
      console.warn(`Error parsing campaign at row ${i}:`, error, "Line:", line);
    }
  }

  console.log("Total campaigns parsed:", campaigns.length);
  return campaigns;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
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