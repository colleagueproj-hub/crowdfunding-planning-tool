export function extractSheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export function getSheetCsvUrl(sheetId, gid = 0) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export async function fetchCampaignsFromSheet(sheetId) {
  try {
    const csvUrl = getSheetCsvUrl(sheetId);
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error("Failed to fetch sheet");
    
    const csvText = await response.text();
    const campaigns = parseCampaignsFromCsv(csvText);
    
    localStorage.setItem("crowdfunding_campaigns_cache", JSON.stringify(campaigns));
    localStorage.setItem("crowdfunding_last_sync", new Date().toISOString());
    
    return campaigns;
  } catch (error) {
    console.error("Error fetching from Google Sheets:", error);
    const cached = localStorage.getItem("crowdfunding_campaigns_cache");
    return cached ? JSON.parse(cached) : [];
  }
}

export function parseCampaignsFromCsv(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const campaigns = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const values = parseCSVLine(line);
      const campaign = {
        id: values[0] || `campaign_${Date.now()}_${i}`,
        name: values[1] || "Untitled",
        currency: values[2] || "ILS",
        owners: parseJsonArray(values[3]),
        participants: parseJsonArray(values[4]),
        planningItems: parseJsonArray(values[5]),
        budgetItems: parseJsonArray(values[6]),
        created_at: values[7] || new Date().toISOString(),
      };
      campaigns.push(campaign);
    } catch (error) {
      console.warn(`Error parsing campaign at row ${i}:`, error);
    }
  }

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

function parseJsonArray(jsonStr) {
  try {
    if (!jsonStr || jsonStr === '""' || jsonStr === "") return [];
    if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
      jsonStr = jsonStr.slice(1, -1);
    }
    jsonStr = jsonStr.replace(/\\"/g, '"');
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Error parsing JSON array:", jsonStr);
    return [];
  }
}

export function getStoredSheetUrl() {
  return localStorage.getItem("crowdfunding_sheet_url");
}

export function storeSheetUrl(url) {
  localStorage.setItem("crowdfunding_sheet_url", url);
}

export function clearStoredSheetUrl() {
  localStorage.removeItem("crowdfunding_sheet_url");
  localStorage.removeItem("crowdfunding_campaigns_cache");
  localStorage.removeItem("crowdfunding_last_sync");
}

export function openSheetInGoogle(sheetId) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
  window.open(url, "_blank");
}