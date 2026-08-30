function doGet(e) {
  const action = e.parameter.action;
  
  if (action === "login") {
    return handleLogin(e);
  } else if (action === "signup") {
    return handleSignup(e);
  } else if (action === "read") {
    return handleRead();
  } else if (action === "save") {
    return handleSave(e);
  } else if (action === "delete") {
    return handleDelete(e);
  } else if (action === "test_reminders") {
    return testReminders();
  } else if (action === "fetch_notifications") {
    return handleFetchNotifications(e);
  } else if (action === "dismiss_notification") {
    return handleDismissNotification(e);
  } else if (action === "get_all_users") {
    return handleGetAllUsers();
  } else if (action === "remove_user") {
    return handleRemoveUser(e);
  } else if (action === "add_budget_items") {
    return handleAddBudgetItems(e);
  } else if (action === "set_planning_items") {
    return handleSetPlanningItems(e);
  } else {
    return handleRead();
  }
}

function doPost(e) {
  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
    const action = payload.action || (e.parameter && e.parameter.action);
    if (action === "save") {
      return handleSavePayload(payload.id, typeof payload.data === "string" ? payload.data : JSON.stringify(payload.data));
    }
    if (action === "set_planning_items") {
      return handleSetPlanningItemsPayload(payload.campaignName, payload.items);
    }
    return ContentService.createTextOutput(JSON.stringify({success: false, error: "Unknown POST action"})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleLogin(e) {
  try {
    const email = e.parameter.email;
    const password = e.parameter.password;
    
    const usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
    const data = usersSheet.getRange("A:D").getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === email && data[i][1] === password) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          email: data[i][0],
          password: data[i][1],
          is_admin: data[i][2],
          name: data[i][3]
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({success: false, error: "Invalid credentials"})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleSignup(e) {
  try {
    const email = e.parameter.email;
    const password = e.parameter.password;
    const name = e.parameter.name || email.split("@")[0];
    
    const usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
    usersSheet.appendRow([email, password, false, name]);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      email: email,
      password: password,
      is_admin: false,
      name: name
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleRead() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("data");
    const data = sheet.getRange("B:B").getValues();
    
    const campaigns = [];
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0]) break;
      try {
        campaigns.push(JSON.parse(data[i][0]));
      } catch (e) {
        Logger.log("Failed to parse row " + i + ": " + e);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(campaigns)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleSave(e) {
  return handleSavePayload(e.parameter.id, e.parameter.data);
}

function handleSavePayload(id, data) {
  try {
    // Reject truncated / invalid JSON so we never wipe fields like planningItems
    JSON.parse(data);
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("data");
    const allData = sheet.getRange("A:B").getValues();
    
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] === id) {
        sheet.getRange(i + 1, 2).setValue(data);
        return ContentService.createTextOutput(JSON.stringify({action: "save", id: id, hasData: true})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    sheet.appendRow([id, data]);
    return ContentService.createTextOutput(JSON.stringify({action: "save", id: id, hasData: true})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleSetPlanningItems(e) {
  return handleSetPlanningItemsPayload(e.parameter.campaignName, JSON.parse(e.parameter.items));
}

function handleSetPlanningItemsPayload(campaignName, items) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("data");
    const data = sheet.getRange("A:B").getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (!data[i][1]) break;
      try {
        const campaign = JSON.parse(data[i][1]);
        if (campaign.name === campaignName) {
          campaign.planningItems = items;
          sheet.getRange(i + 1, 2).setValue(JSON.stringify(campaign));
          return ContentService.createTextOutput(JSON.stringify({success: true, count: items.length})).setMimeType(ContentService.MimeType.JSON);
        }
      } catch (parseError) {
        Logger.log("Error parsing row " + i + ": " + parseError);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({success: false, error: "Campaign not found"})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleDelete(e) {
  try {
    const id = e.parameter.id;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("data");
    const allData = sheet.getRange("A:B").getValues();
    
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] === id) {
        sheet.deleteRow(i + 1);
        return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({success: false})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function testReminders() {
  try {
    Logger.log("=== TESTING REMINDERS ===");
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("data");
    const data = sheet.getRange("B:B").getValues();
    
    Logger.log(`Total rows in data sheet: ${data.length}`);
    
    let campaignCount = 0;
    let itemsWithReminder = 0;
    let itemsWithoutEmail = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0]) break;
      
      try {
        const campaign = JSON.parse(data[i][0]);
        campaignCount++;
        Logger.log(`\nCampaign ${campaignCount}: "${campaign.name}"`);
        Logger.log(`  Total planning items: ${campaign.planningItems?.length || 0}`);
        
        if (campaign.planningItems) {
          for (let j = 0; j < campaign.planningItems.length; j++) {
            const item = campaign.planningItems[j];
            Logger.log(`\n  Item ${j + 1}: "${item.name}"`);
            Logger.log(`    Reminder enabled: ${item.reminderEnabled}`);
            
            if (item.reminderEnabled) {
              itemsWithReminder++;
              Logger.log(`    Start date: ${item.startDate}`);
              Logger.log(`    Reminder days: ${item.reminderDays}`);
              Logger.log(`    Participants: ${JSON.stringify(item.participants)}`);
              
              // Check reminder date
              const startDate = new Date(item.startDate);
              const reminderDate = new Date(startDate);
              reminderDate.setDate(reminderDate.getDate() - item.reminderDays);
              
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              reminderDate.setHours(0, 0, 0, 0);
              
              const isToday = reminderDate.getTime() === today.getTime();
              Logger.log(`    Reminder date: ${reminderDate.toDateString()}`);
              Logger.log(`    Today: ${today.toDateString()}`);
              Logger.log(`    Should trigger today: ${isToday}`);
              
              // Check participants
              if (item.participants && item.participants.length > 0) {
                Logger.log(`    Checking ${item.participants.length} participants...`);
                for (let k = 0; k < item.participants.length; k++) {
                  const p = item.participants[k];
                  const pEmail = typeof p === 'object' ? p.email : p;
                  const pName = typeof p === 'object' ? p.name : p;
                  Logger.log(`      - ${pName || 'NO NAME'} (${pEmail || 'NO EMAIL'})`);
                  if (!pEmail) itemsWithoutEmail++;
                }
              }
            }
          }
        }
      } catch (parseError) {
        Logger.log(`Error parsing row ${i}: ${parseError}`);
      }
    }
    
    Logger.log(`\n=== SUMMARY ===`);
    Logger.log(`Total campaigns: ${campaignCount}`);
    Logger.log(`Items with reminder enabled: ${itemsWithReminder}`);
    Logger.log(`Participants without email: ${itemsWithoutEmail}`);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      campaignCount,
      itemsWithReminder,
      itemsWithoutEmail
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log(`ERROR: ${error}`);
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function checkAndSendReminders() {
  try {
    Logger.log("=== CHECKING REMINDERS ===");
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("data");
    const data = sheet.getRange("B:B").getValues();
    
    let remindersSent = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0]) break;
      
      try {
        const campaign = JSON.parse(data[i][0]);
        
        if (!campaign.planningItems) continue;
        
        for (const item of campaign.planningItems) {
          if (!item.reminderEnabled) continue;
          
          const startDate = new Date(item.startDate);
          const reminderDate = new Date(startDate);
          reminderDate.setDate(reminderDate.getDate() - item.reminderDays);
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          reminderDate.setHours(0, 0, 0, 0);
          
          // Only send if reminder date is today
          if (reminderDate.getTime() !== today.getTime()) continue;
          
          Logger.log(`\nProcessing reminder for: "${item.name}"`);
          
          // Check for duplicates (sentReminders tracking)
          if (!campaign.sentReminders) campaign.sentReminders = {};
          const reminderKey = `${item.id}_${reminderDate.getTime()}`;
          if (campaign.sentReminders[reminderKey]) {
            Logger.log(`  Already sent - skipping`);
            continue;
          }
          
          // Get participants
          if (!item.participants || item.participants.length === 0) {
            Logger.log(`  No participants - skipping`);
            continue;
          }
          
          // Send email to each participant
          for (const p of item.participants) {
            const email = typeof p === 'object' ? p.email : p;
            const name = typeof p === 'object' ? p.name : p;
            
            if (!email) {
              Logger.log(`  Participant has no email - skipping`);
              continue;
            }
            
            try {
              GmailApp.sendEmail(email, 
                `Weeping Willow Tree crowd sourcing - ${item.name}`, 
                `Hi ${name},\n\n**DO NOT REPLY!**\n\nThis is a reminder about your task:\n\nTask: ${item.name}\nStart Date: ${item.startDate}\nReminder: ${item.reminderDays} day(s) before\n\nPlease visit the application to view full details:\nhttps://colleagueproj-hub.github.io/crowdfunding-planning-tool/\n\nThank you,\nWeeping Willow Tree Campaign Team`
              );
              Logger.log(`  Email sent to ${email}`);
              remindersSent++;
            } catch (emailError) {
              Logger.log(`  Email error for ${email}: ${emailError}`);
            }
          }
          
          // Mark as sent
          campaign.sentReminders[reminderKey] = true;
          
          // Create in-app notification
          createNotification(item.name, `Weeping Willow Tree crowd sourcing - ${item.name}`, item.participants, item);
          
          // Save updated campaign with sentReminders
          sheet.getRange(i + 1, 2).setValue(JSON.stringify(campaign));
        }
      } catch (error) {
        Logger.log(`Error processing campaign row ${i}: ${error}`);
      }
    }
    
    Logger.log(`\n=== REMINDERS SENT: ${remindersSent} ===`);
    return remindersSent;
  } catch (error) {
    Logger.log(`CRITICAL ERROR: ${error}`);
    return 0;
  }
}

function createNotification(taskName, message, participants, item) {
  try {
    const notifSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Notifications");
    
    if (participants && participants.length > 0) {
      for (const p of participants) {
        const email = typeof p === 'object' ? p.email : p;
        const name = typeof p === 'object' ? p.name : p;
        if (email) {
          const owners = item.owners ? (Array.isArray(item.owners) ? item.owners.map(o => typeof o === 'object' ? o.name : o).join(", ") : item.owners) : "";
          const participantsList = item.participants ? (Array.isArray(item.participants) ? item.participants.map(x => typeof x === 'object' ? x.name : x).join(", ") : item.participants) : "";
          notifSheet.appendRow([
            new Date().toISOString(), 
            email, 
            taskName, 
            message, 
            "unread",
            owners,
            participantsList,
            item.startDate,
            item.endDate
          ]);
        }
      }
    }
  } catch (error) {
    Logger.log(`Error creating notification: ${error}`);
  }
}

function ensureNotificationsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Notifications");
  if (!sheet) {
    sheet = ss.insertSheet("Notifications");
    sheet.appendRow(["Timestamp", "Email", "Task", "Message", "Status", "Owners", "Participants", "Start Date", "End Date"]);
  }
  return sheet;
}

function fetchNotifications(email) {
  try {
    ensureNotificationsSheet();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Notifications");
    const data = sheet.getRange("A:E").getValues();
    
    const notifications = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email && data[i][4] === "unread") {
        notifications.push({
          timestamp: data[i][0],
          email: data[i][1],
          task: data[i][2],
          message: data[i][3],
          rowIndex: i + 1
        });
      }
    }
    
    return notifications;
  } catch (error) {
    Logger.log(`Error fetching notifications: ${error}`);
    return [];
  }
}

function dismissNotification(email, task) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Notifications");
    const data = sheet.getRange("A:E").getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email && data[i][2] === task && data[i][4] === "unread") {
        sheet.getRange(i + 1, 5).setValue("read");
        return;
      }
    }
  } catch (error) {
    Logger.log(`Error dismissing notification: ${error}`);
  }
}

function handleFetchNotifications(e) {
  try {
    const email = e.parameter.email;
    ensureNotificationsSheet();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Notifications");
    const data = sheet.getRange("A:I").getValues();
    
    const notifications = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email && data[i][4] === "unread") {
        notifications.push({
          timestamp: data[i][0],
          email: data[i][1],
          task: data[i][2],
          message: data[i][3],
          owners: data[i][5],
          participants: data[i][6],
          startDate: data[i][7],
          endDate: data[i][8]
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(notifications)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log(`Error fetching notifications: ${error}`);
    return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleDismissNotification(e) {
  try {
    const email = e.parameter.email;
    const task = e.parameter.task;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Notifications");
    const data = sheet.getRange("A:I").getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email && data[i][2] === task && data[i][4] === "unread") {
        sheet.getRange(i + 1, 5).setValue("read");
        return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({success: false})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log(`Error dismissing notification: ${error}`);
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGetAllUsers() {
  try {
    const usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
    const data = usersSheet.getRange("A:D").getValues();
    
    const users = [];
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0]) break; // Stop at first empty row
      users.push({
        email: data[i][0],
        name: data[i][3] || data[i][0].split("@")[0],
        is_admin: data[i][2] === true || data[i][2] === "TRUE"
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify(users)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log(`Error fetching all users: ${error}`);
    return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleRemoveUser(e) {
  try {
    const emailToRemove = e.parameter.email;
    const usersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
    const data = usersSheet.getRange("A:D").getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === emailToRemove) {
        usersSheet.deleteRow(i + 1);
        return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({success: false, error: "User not found"})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log(`Error removing user: ${error}`);
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleAddBudgetItems(e) {
  try {
    const campaignName = e.parameter.campaignName;
    const itemsJson = e.parameter.items;
    const items = JSON.parse(itemsJson);
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("data");
    const data = sheet.getRange("B:B").getValues();
    
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0]) break;
      try {
        const campaign = JSON.parse(data[i][0]);
        if (campaign.name === campaignName) {
          if (!campaign.budgetItems) campaign.budgetItems = [];
          campaign.budgetItems = campaign.budgetItems.concat(items);
          sheet.getRange(i + 1, 2).setValue(JSON.stringify(campaign));
          found = true;
          break;
        }
      } catch (parseError) {
        Logger.log(`Error parsing row ${i}: ${parseError}`);
      }
    }
    
    if (found) {
      return ContentService.createTextOutput(JSON.stringify({success: true, message: `Added ${items.length} budget items`})).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({success: false, error: "Campaign not found"})).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    Logger.log(`Error adding budget items: ${error}`);
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}
