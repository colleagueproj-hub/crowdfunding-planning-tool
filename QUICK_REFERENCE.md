# Quick Reference Card

## 🚀 Getting Started (First Time Setup)

```bash
# 1. Install all dependencies (2-3 minutes)
npm install
cd client && npm install && cd ..

# 2. Create and setup database (1 minute)
npm run db:setup
npm run db:seed

# 3. Start the app (instant)
npm run dev

# 4. Open browser
Open http://localhost:3000
```

**That's it!** Application is ready with sample data.

---

## 📱 Using the Application

### Create a Planning Item
1. Go to **Plan** tab
2. Click **+ Add New Item**
3. Fill in fields:
   - Item Type: (dropdown)
   - Name: (required)
   - Start Date: (required, date picker)
   - End Date: (required, must be ≥ start date)
   - Owner Name: (required)
   - Status: (dropdown)
4. **Enable Reminders** (toggle):
   - Choose: 1, 3, 5, or 10 days in advance
5. Click **Create Item**
6. Item appears in table, calendar, and Gantt

### View Timeline
1. Go to **Calendar & Gantt** tab
2. Choose view:
   - **Calendar**: Month/Week/Day views
   - **Gantt**: Timeline bar view
3. Filter by type, owner, or status
4. Click items for details

### Manage Budget
1. Go to **Budget** tab
2. Click **+ Add Budget Item**
3. Enter:
   - Item name
   - Required budget amount
   - Optional details
   - Currency (ILS/USD/EUR/GBP)
4. Total updates automatically
5. Edit or delete anytime

### Enable Reminders
When creating/editing an item:
1. Toggle **Enable Reminders** ON
2. Select timing (1/3/5/10 days before start)
3. Server schedules automatically
4. Reminder sends at scheduled time

---

## 🔧 Database Commands

```bash
# Create fresh database
npm run db:setup

# Load sample data
npm run db:seed

# Reset everything (clears data)
npm run db:reset

# Full reset cycle
npm run db:reset && npm run db:setup && npm run db:seed

# Direct database access
psql -d crowdfunding_tool -U postgres
```

---

## 📊 Data Validation Rules

### Planning Items
- ✅ Name: Required (not empty)
- ✅ Start Date: Required
- ✅ End Date: Required (≥ start date)
- ✅ Owner: Required (not empty)
- ✅ Reminder Timing: Required (when reminders enabled)

### Budget Items
- ✅ Item Name: Required (not empty)
- ✅ Required Budget: Required, ≥ 0

---

## 🔔 Reminder System

**How it works:**
1. Enable reminders on item
2. Choose timing: 1/3/5/10 days before
3. Server calculates: `remind_date = start_date - days_in_advance`
4. Cron job checks every minute
5. Sends notification at calculated time
6. Status tracked: scheduled → sent/failed

**Integration Points** (Optional setup):
- Email: Configure SMTP
- Teams: Add webhook URL
- Push: Add service API key

---

## 📱 Responsive Breakpoints

- **Mobile**: 375px - 767px
- **Tablet**: 768px - 1023px
- **Desktop**: 1024px+

All features work on all screen sizes.

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 5000 in use | `netstat -ano \| findstr :5000` then kill process |
| No database connection | Check `DATABASE_URL` in `.env.local` |
| Items not showing in calendar | Verify dates are in calendar view range |
| Reminders not sending | Check server logs, verify reminder_enabled=true |
| Module not found | `npm install` in both root and client folders |
| CSS not loading | Clear browser cache (Ctrl+Shift+Delete) |

---

## 💾 Important Locations

| What | Where |
|------|-------|
| Frontend code | `client/src/components/` |
| Backend code | `server/index.js` |
| Database setup | `server/scripts/` |
| Styles | `client/src/styles.css` |
| API client | `client/src/api.js` |
| Configuration | `.env.local` |
| Database | PostgreSQL (localhost:5432) |

---

## 🔗 URLs & Ports

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost:3000 | 3000 |
| Backend | http://localhost:5000 | 5000 |
| Database | localhost | 5432 |

---

## 🌐 Environment Variables

```bash
# Copy example
cp .env.local.example .env.local

# Edit with your values
DATABASE_URL=postgresql://user:pass@localhost:5432/crowdfunding_tool
PORT=5000
NODE_ENV=development
```

---

## 📦 What's Included

✅ **3 Main Screens**
- Plan: Create and manage items
- Calendar & Gantt: Visual timeline
- Budget: Manage costs

✅ **6 Item Types**
- Event
- Task
- Reminder
- Milestone
- Meeting
- Other

✅ **Features**
- Search & filter
- Sort by multiple fields
- Date validation
- Budget calculations
- Reminder scheduling
- Notification tracking
- Responsive design
- Dark mode ready

---

## 🚀 Deployment Ready

To deploy to production:
1. Build frontend: `cd client && npm run build`
2. Set production `.env.local`
3. Deploy server (Heroku, Railway, AWS, etc.)
4. Point database to production
5. Run `npm run db:setup` on production

---

## 📞 Need Help?

1. Check README.md (comprehensive guide)
2. Check SETUP_GUIDE.md (detailed setup)
3. Check server logs (terminal where running `npm run dev`)
4. Query database directly (psql tool)
5. Check browser DevTools (F12)

---

## ⚡ Pro Tips

1. **Bulk load data**: Edit seedDatabase.js and run `npm run db:seed`
2. **Quick reset**: `npm run db:reset && npm run db:setup && npm run db:seed`
3. **Development mode**: Hot reload auto-updates (no refresh needed)
4. **Testing reminders**: Set to "1 day in advance" and wait 1 minute
5. **Filter results**: Use search box for instant filtering
6. **Multi-campaign**: Create campaigns in header dropdown
7. **Keyboard nav**: Tab through form fields, Enter to submit
8. **Mobile testing**: Resize browser or use device emulation (F12)

---

**Status: READY TO USE**
