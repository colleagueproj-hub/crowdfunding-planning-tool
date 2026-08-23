# Setup and Architecture Guide

## Getting Started

### System Requirements
- Node.js 16 or higher
- PostgreSQL 12 or higher
- npm or yarn
- ~500MB disk space

### Installation Steps

#### 1. Clone and Install Dependencies

```bash
cd crowdfunding-tool
npm install
cd client
npm install
cd ..
```

#### 2. PostgreSQL Setup

**Create the database:**
```bash
# On Windows (using pgAdmin or Command Prompt)
createdb crowdfunding_tool

# Or using psql
psql -U postgres -c "CREATE DATABASE crowdfunding_tool;"
```

**Get your connection string:**
```
postgresql://username:password@localhost:5432/crowdfunding_tool
```

#### 3. Environment Configuration

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
DATABASE_URL=postgresql://username:password@localhost:5432/crowdfunding_tool
PORT=5000
NODE_ENV=development
```

#### 4. Initialize Database

```bash
npm run db:setup      # Creates schema
npm run db:seed       # Loads sample data
```

#### 5. Start Application

```bash
npm run dev
```

The application will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Architecture Overview

### Frontend Architecture (React)

**Components Hierarchy:**
```
App
├── Header
├── Dashboard
└── Tabs
    ├── PlanScreen
    │   ├── PlanForm (modal)
    │   └── Table with filters/search
    ├── CalendarGanttScreen
    │   ├── Calendar (Month/Week/Day views)
    │   └── Gantt (Timeline view)
    └── BudgetScreen
        ├── BudgetForm (modal)
        └── Table with totals
```

**Data Flow:**
1. Components call API methods from `api.js`
2. API responses update React state
3. Components re-render automatically
4. Modal overlays for forms and confirmations

**Styling:**
- CSS Grid for layouts
- Flexbox for alignment
- Mobile-first responsive design
- CSS animations for transitions

### Backend Architecture (Node.js/Express)

**API Layers:**
1. **Routes** - HTTP endpoints handling requests
2. **Validation** - Client input verification
3. **Database** - SQL query execution
4. **Business Logic** - Reminder scheduling, calculations

**Cron Job (Background Scheduler):**
- Runs every minute
- Checks for due reminders
- Creates notification records
- Marks as sent/failed
- Logs activity

**Key Patterns:**
- RESTful endpoints
- SQL parameterized queries (prevents injection)
- Transactional updates (atomic operations)
- Comprehensive error handling

### Database Schema

**Tables:**

1. **campaigns**
   - Stores campaign metadata
   - Parent for all items

2. **planning_items**
   - Event, task, and milestone data
   - Timestamps and status
   - Reminder configuration

3. **budget_items**
   - Budget line items
   - Amount and currency
   - Belongs to campaign

4. **notification_records**
   - Delivery status tracking
   - Timestamp history
   - Failure reasons

5. **scheduled_reminders**
   - Pending reminders (cron checks this)
   - Timestamp and sent status
   - Unique constraint prevents duplicates

**Relationships:**
```
campaigns (1) → (many) planning_items
campaigns (1) → (many) budget_items
planning_items (1) → (many) notification_records
planning_items (1) → (many) scheduled_reminders
```

**Indexes:**
- `campaign_id` on planning_items, budget_items
- `status` on planning_items, notification_records
- `reminder_date_time` on scheduled_reminders (for cron queries)

## Reminder System Architecture

### Reminder Lifecycle

```
1. CREATE ITEM
   ├─ If reminder_enabled = true
   ├─ Calculate reminder_date = start_date - days_in_advance
   ├─ Store in scheduled_reminders table
   └─ Set reminder_status = 'scheduled'

2. EVERY MINUTE (Cron Job)
   ├─ Query: SELECT * FROM scheduled_reminders WHERE reminder_date_time <= NOW() AND is_sent = false
   ├─ For each reminder:
   │  ├─ Create notification_record
   │  ├─ Trigger notification delivery
   │  ├─ Mark reminder as sent
   │  └─ Log success or failure
   └─ Continue...

3. EDIT ITEM
   ├─ Delete old reminder from scheduled_reminders
   ├─ If still enabled:
   │  ├─ Recalculate reminder_date
   │  ├─ Insert new reminder
   │  └─ Update reminder_status
   └─ Update notification_records

4. DELETE ITEM
   ├─ Delete from scheduled_reminders
   ├─ Delete from notification_records
   └─ Cascading delete in database
```

### Notification Channels

**In-App** (Implemented ✅)
- Server logs to console
- Records in notification_records table
- Frontend can poll for new notifications

**Email** (Integration Point - Setup Required)
- Configure SMTP in `.env.local`
- NodeMailer sends from server
- Template: Subject, recipient, time

**Microsoft Teams** (Integration Point - Setup Required)
- Configure webhook URL in `.env.local`
- POST JSON to Teams webhook
- Message includes item details and link

**Push Notifications** (Integration Point - Setup Required)
- Configure service API key
- Send to user devices
- Support Firebase, OneSignal, etc.

## Data Validation Rules

### Client-Side (React)
- Form validation before submission
- Real-time error messages
- Visual field highlighting
- Disabled submit button on errors

### Server-Side (Express)
- Reject invalid JSON
- Validate required fields
- Check date relationships
- Verify budget amounts
- Prevent SQL injection
- Sanitize user input

### Database-Level
- Data type constraints
- Unique constraints (no duplicate reminders)
- Foreign key constraints
- NOT NULL for required fields

## Performance Considerations

**Optimizations Implemented:**
1. Database indexes on frequently queried columns
2. Transactional operations for consistency
3. Pagination-ready (limit/offset in queries)
4. Connection pooling in pg client
5. React memoization ready (component structure)

**Scaling Recommendations:**
1. Add read replicas for reporting queries
2. Implement caching layer (Redis) for dashboard
3. Archive old notifications monthly
4. Load balance multiple backend instances
5. Use CDN for static frontend assets

## Security Considerations

**Implemented:**
✅ SQL parameterized queries
✅ Input validation on server
✅ CORS headers for local development
✅ Error messages don't leak sensitive info
✅ Timestamps stored for audit trail

**Recommended for Production:**
- JWT or OAuth authentication
- HTTPS/SSL certificates
- Rate limiting on API endpoints
- Input sanitization library (DOMPurify)
- Secrets management (not in .env)
- Database encryption at rest
- Audit logging for all changes

## Testing the Application

### Test Scenario 1: Create and Complete a Task

1. Go to Plan tab
2. Click "Add New Item"
3. Fill in:
   - Item Type: Task
   - Name: "Test Task"
   - Start Date: Today
   - End Date: Tomorrow
   - Owner: "Tester"
4. Enable Reminders, set to "3 days in advance"
5. Click "Create Item"
6. Item should appear in table
7. Switch to Calendar tab - item should appear
8. Switch to Gantt - item should appear as bar

### Test Scenario 2: Budget Calculation

1. Go to Budget tab
2. Add multiple items with different amounts
3. Verify total calculates correctly
4. Edit an item's budget
5. Verify total updates immediately
6. Delete an item
7. Verify total updates and removes item

### Test Scenario 3: Reminders

1. Create item with reminder enabled
2. Set to "1 day in advance"
3. Check server logs (should show reminder scheduled)
4. Wait for cron (or trigger manually for testing)
5. Check notification_records table
6. Verify status is 'sent' and sent_date_time is populated

## Troubleshooting

### "Cannot find module" Error
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
cd client && npm install && cd ..
```

### Database Connection Failed
```bash
# Verify PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Check your DATABASE_URL format
postgresql://user:password@localhost:5432/database_name

# Verify database exists
psql -U postgres -l
```

### Port Already in Use
```powershell
# Find process using port 5000
netstat -ano | findstr :5000
# Kill it
taskkill /PID <PID> /F

# Same for port 3000
netstat -ano | findstr :3000
```

### Reminders Not Working
1. Check that reminder_enabled = true in database
2. Verify scheduled_reminders table has entries
3. Check server logs for cron job output
4. Query: `SELECT * FROM scheduled_reminders WHERE is_sent = false`
5. Verify server time zone is correct

### Data Not Persisting
1. Confirm DATABASE_URL is correct
2. Check database exists: `psql -U postgres -l`
3. Verify tables created: `npm run db:setup`
4. Check for SQL errors in server logs

## Development Workflow

### Making Changes

1. **Backend**: Edit `server/index.js`, restart with Ctrl+C and `npm run dev`
2. **Frontend**: Changes hot-reload automatically in Vite
3. **Database**: Use `npm run db:reset && npm run db:setup && npm run db:seed`

### Debugging

**Frontend:**
- Open DevTools (F12)
- Check Console tab for errors
- Network tab shows API calls
- Use React DevTools extension

**Backend:**
- Server logs show in terminal
- Check request/response in Network tab
- Use SQL client to query database directly
- Add `console.log()` for debugging

### Database Inspection

```bash
# Connect to database
psql -U postgres -d crowdfunding_tool

# Show tables
\dt

# Query planning items
SELECT id, name, start_date, end_date, reminder_enabled FROM planning_items;

# Check scheduled reminders
SELECT * FROM scheduled_reminders WHERE is_sent = false;

# View notification history
SELECT * FROM notification_records ORDER BY created_at DESC LIMIT 10;
```

## Production Deployment

### Environment Setup

1. **Create production .env.local**
```
DATABASE_URL=postgresql://prod_user:secure_password@prod_db_host:5432/crowdfunding_prod
PORT=3000
NODE_ENV=production
```

2. **Build frontend**
```bash
cd client
npm run build
# Creates ./dist/ directory
```

3. **Deploy options:**
   - **Heroku**: Push to heroku remote
   - **AWS EC2**: SSH and deploy
   - **Railway/Render**: Connect GitHub repo
   - **Docker**: Containerize application

4. **Database backup**
```bash
pg_dump crowdfunding_tool > backup.sql
```

### Monitoring

- Set up error tracking (Sentry, Rollbar)
- Monitor database performance
- Alert on failed reminders
- Log all user actions

---

## File Reference

| File | Purpose |
|------|---------|
| `server/index.js` | Main Express server with all endpoints |
| `server/scripts/setupDatabase.js` | Create database schema |
| `server/scripts/seedDatabase.js` | Load sample data |
| `client/src/App.jsx` | Main React app wrapper |
| `client/src/api.js` | HTTP client and API methods |
| `client/src/constants.js` | Constants and utility functions |
| `client/src/styles.css` | Global CSS styling |
| `README.md` | User guide |
| `.env.local` | Environment configuration |
| `package.json` | Dependencies and scripts |

---

For questions or issues, refer to the README.md file or check the application logs.
