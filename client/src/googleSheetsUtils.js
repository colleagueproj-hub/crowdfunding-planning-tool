const HARDCODED_SHEET_ID = "19Qir2g-4lZBJWuMvWudybqkIemqZxkeghEFfZsjJpfE";
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzKYynX0HdNX4Pg55Nruo0u1_zSiGDBkx-uXV96-7PbTmBI0Y42y3kq35Etdd6ueaDBZA/exec";

async function callAppsScriptGet(params, timeoutMs = 15000) {
  const url = new URL(APPS_SCRIPT_URL);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value == null ? "" : String(value));
  });

  // Google Apps Script rejects very long URLs
  if (url.toString().length > 7500) {
    throw new Error("Request too large for GET");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url.toString(), { method: "GET", signal: controller.signal });
    const text = await response.text();
    if (!text || text.trim().startsWith("<")) {
      throw new Error("Apps Script returned HTML instead of JSON (redeploy needed?)");
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function callAppsScriptFormPost(params, timeoutMs = 15000) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    body.set(key, value == null ? "" : String(value));
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: body.toString(),
      redirect: "follow",
      signal: controller.signal
    });
    const text = await response.text();
    if (!text || text.trim().startsWith("<")) {
      throw new Error("POST not available on current Apps Script deployment");
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

export async function loginUser(email, password, name, isSignUp) {
  try {
    const result = await callAppsScriptGet({
      action: isSignUp ? "signup" : "login",
      email,
      password,
      ...(name ? { name } : {})
    });
    if (result.success) {
      localStorage.setItem("crowdfunding_user", JSON.stringify(result));
    }
    return result;
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: error.message };
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
    const result = await callAppsScriptGet({ action: "read" });
    const campaigns = Array.isArray(result) ? result : (result.campaigns || []);
    localStorage.setItem("crowdfunding_campaigns_cache", JSON.stringify(campaigns));
    return campaigns;
  } catch (error) {
    console.error("Error fetching:", error);
    const cached = localStorage.getItem("crowdfunding_campaigns_cache");
    return cached ? JSON.parse(cached) : [];
  }
}

async function setCampaignField(id, field, value) {
  const params = {
    action: "set_campaign_field",
    id,
    field,
    value: JSON.stringify(value)
  };

  // Prefer GET (works with current Apps Script CORS behavior); fall back to form POST
  try {
    const result = await callAppsScriptGet(params);
    return !!(result && (result.success || result.action === "save"));
  } catch (e) {
    try {
      const result = await callAppsScriptFormPost(params);
      return !!(result && (result.success || result.action === "save"));
    } catch (e2) {
      console.warn(`setCampaignField(${field}) failed:`, e2.message);
      return false;
    }
  }
}

/** Upsert/delete one item — small payload, reliable over GET */
export async function upsertCampaignItem(campaignId, listName, item, mode = "upsert") {
  const params = {
    action: "upsert_item",
    id: campaignId,
    list: listName,
    item: JSON.stringify(item),
    mode
  };
  try {
    const result = await callAppsScriptGet(params);
    return !!(result && (result.success || result.action === "save"));
  } catch (e) {
    try {
      const result = await callAppsScriptFormPost(params);
      return !!(result && (result.success || result.action === "save"));
    } catch (e2) {
      console.warn("upsertCampaignItem failed:", e2.message);
      return false;
    }
  }
}

/**
 * Save a full campaign without blowing the URL length limit.
 * Uses field-by-field merges (and per-item upserts if a field is still too large).
 */
export async function saveCampaignToSheet(campaign) {
  try {
    // 1) Try full form POST save (works after doPost redeploy)
    try {
      const result = await callAppsScriptFormPost({
        action: "save",
        id: campaign.id,
        data: JSON.stringify(campaign)
      });
      if (result && result.action === "save") return true;
    } catch (_) {
      // continue to chunked GET strategy
    }

    // 2) Try full GET save only if small enough
    try {
      const result = await callAppsScriptGet({
        action: "save",
        id: campaign.id,
        data: JSON.stringify(campaign)
      });
      if (result && result.action === "save") return true;
    } catch (_) {
      // continue
    }

    // 3) Chunked field merges via GET (requires set_campaign_field / upsert_item redeploy)
    const meta = {
      name: campaign.name,
      currency: campaign.currency,
      owners: campaign.owners || [],
      participants: campaign.participants || [],
      created_at: campaign.created_at,
      sentReminders: campaign.sentReminders || {}
    };

    const steps = [
      ["meta", meta],
      ["planningItems", campaign.planningItems || []],
      ["budgetItems", campaign.budgetItems || []],
      ["gifts", campaign.gifts || []]
    ];

    for (const [field, value] of steps) {
      const ok = await setCampaignField(campaign.id, field, value);
      if (ok) continue;

      // Field still too large — upsert items one-by-one
      if (field === "budgetItems" || field === "gifts" || field === "planningItems") {
        // Clear list first with empty array if possible
        await setCampaignField(campaign.id, field, []);
        for (const item of value) {
          const itemOk = await upsertCampaignItem(campaign.id, field, item, "upsert");
          if (!itemOk) return false;
        }
      } else {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error syncing:", error);
    return false;
  }
}

export async function setPlanningItems(campaignName, items) {
  try {
    const result = await callAppsScriptGet({
      action: "set_planning_items",
      campaignName,
      items: JSON.stringify(items)
    });
    return !!result.success;
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
    const result = await callAppsScriptGet({
      action: "fetch_notifications",
      email: userEmail
    });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export async function dismissNotification(userEmail, taskName) {
  try {
    const result = await callAppsScriptGet({
      action: "dismiss_notification",
      email: userEmail,
      task: taskName
    });
    return !!result.success;
  } catch (error) {
    console.error("Error dismissing notification:", error);
    return false;
  }
}

export async function fetchAllUsers() {
  try {
    const result = await callAppsScriptGet({ action: "get_all_users" });
    return Array.isArray(result) ? result : (result.users || []);
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function removeUser(email) {
  try {
    const result = await callAppsScriptGet({ action: "remove_user", email });
    return !!result.success;
  } catch (error) {
    console.error("Error removing user:", error);
    return false;
  }
}

export async function addBudgetItems(campaignName, items) {
  try {
    const result = await callAppsScriptGet({
      action: "add_budget_items",
      campaignName,
      items: JSON.stringify(items)
    });
    return !!result.success;
  } catch (error) {
    console.error("Error adding budget items:", error);
    return false;
  }
}
