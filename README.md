# Crowdfunding Planning Tool

A comprehensive full-stack web application for managing crowdfunding campaigns, planning activities, tracking timelines, managing budgets, and scheduling reminders.

## Features

✅ **Campaign Management**
- Create and manage multiple crowdfunding campaigns
- Track campaign owners, start/end dates, and currency

✅ **Planning & Scheduling**
- Create 6 types of planning items: Event, Task, Reminder, Milestone, Meeting, Other
- Set start and end dates, assign owners
- Track item status: Not Started, In Progress, Completed, Cancelled
- Search, filter, and sort planning items
- Visual indicators for overdue items

✅ **Reminders & Notifications**
- Enable/disable reminders for any planning item
- Set reminder timing: 1, 3, 5, or 10 days in advance
- Automatic reminder scheduling using server-side cron jobs
- Notification status tracking: Scheduled, Sent, Failed, Cancelled
- Server-side timestamp management with UTC storage
- Local timezone calculation

✅ **Calendar & Gantt View**
- Month, week, and day views
- Visual item display on calendar dates
- Gantt timeline with architecture ready for drag-and-drop
- Milestone visual differentiation
- Today line indicator
- Filter by owner, status, and item type

✅ **Budget Management**
- Add, edit, and delete budget items
- Track required budget per item
- Automatic total calculation
- Currency support: ILS, USD, EUR, GBP
- Search and sort budget items
- Real-time total updates

✅ **Dashboard**
- Summary cards: Total items, Upcoming, Overdue, Completed, Reminders enabled, Total budget
- Auto-updating statistics

## Tech Stack

**Frontend**: React 18, Axios, Vite, CSS3
**Backend**: Node.js + Express, PostgreSQL, node-cron
**Database**: PostgreSQL with comprehensive schema

## Installation Quick Start

### 1. Prerequisites
- Node.js (v16+)
- PostgreSQL (v12+)

### 2. Setup

```bash
cd crowdfunding-tool
npm install
cd client && npm install && cd ..
```

### 3. Database

```bash
createdb crowdfunding_tool
cp .env.local.example .env.local
# Edit .env.local with your DATABASE_URL
npm run db:setup
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Project Structure

```
├── client/
│   └── src/
│       ├── components/
│       ├── App.jsx
│       ├── api.js
│       ├── constants.js
│       └── styles.css
├── server/
│   ├── index.js
│   └── scripts/
│       ├── setupDatabase.js
│       ├── seedDatabase.js
│       └── resetDatabase.js
└── README.md
```

## Key Features Implemented

### ✅ All Acceptance Criteria Met
- Add, edit, delete planning items
- Six item types with dropdown selection
- Mandatory fields: Name, Start Date, End Date, Owner
- Date validation (end >= start)
- On/Off reminder toggle
- 1, 3, 5, 10 day reminder options
- Server-side reminder scheduling with cron
- Automatic Calendar & Gantt sync
- Month/Week/Day calendar views
- Gantt timeline with milestones
- Budget table with add/edit/delete
- Automatic budget totals
- Currency selection (ILS, USD, EUR, GBP)
- Data persistence in PostgreSQL
- Responsive desktop and mobile layouts
- Notification status tracking
- No duplicate reminders (database constraint)

## Sample Data

Pre-loaded campaigns include:
- **Planning**: 6 sample items with various types
- **Budget**: 6 sample items totaling 14,000 ILS
- Ready to demo all features immediately

## Reminder System

**How it works:**
1. Create item with reminder enabled
2. Set days in advance (1, 3, 5, or 10)
3. Server calculates: reminderDate = startDate - daysInAdvance, time = 9 AM
4. Cron job checks every minute for due reminders
5. Sends notifications and records status
6. Supports multiple channels (in-app ready, email/Teams/Push ready for integration)

**External Integrations (optional):**
- Email: Configure SMTP in .env.local
- Microsoft Teams: Add webhook URL
- Push: Configure service API key

## API Endpoints

```
GET    /api/campaigns
POST   /api/campaigns
GET    /api/campaigns/:id
PUT    /api/campaigns/:id

GET    /api/campaigns/:campaignId/planning-items
POST   /api/campaigns/:campaignId/planning-items
PUT    /api/planning-items/:id
DELETE /api/planning-items/:id

GET    /api/campaigns/:campaignId/budget-items
POST   /api/campaigns/:campaignId/budget-items
PUT    /api/budget-items/:id
DELETE /api/budget-items/:id

GET    /api/campaigns/:campaignId/summary
GET    /api/campaigns/:campaignId/notifications
```

## Database Commands

```bash
npm run db:setup      # Create schema
npm run db:seed       # Load sample data
npm run db:reset      # Drop all tables
npm run db:reset && npm run db:setup && npm run db:seed  # Full reset
```

## Architecture Highlights

- **Transactional Updates**: Item + reminder changes are atomic
- **Timezone Aware**: Local time calculations, UTC storage
- **Indexed Queries**: Fast filtering and sorting
- **REST API**: Clean separation of frontend/backend
- **Real-time UI**: React updates without page reload
- **Input Validation**: Client and server-side
- **Error Handling**: User-friendly messages

## Future Enhancements

1. User authentication & permissions
2. Draggable Gantt bars
3. Custom email templates
4. Team collaboration
5. File attachments
6. Export to PDF/Excel
7. Analytics dashboard
8. Webhook integrations

## Support

- Check browser console for client errors
- Check server logs for API issues
- Query `notification_records` table for reminder status
- All data persists in PostgreSQL

---

**Built for crowdfunding teams to plan, track, and deliver successful campaigns**
