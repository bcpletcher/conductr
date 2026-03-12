# 🎥 Design Context — Video Analysis

This file captures the UI/UX reference from the original TikTok video by @tristynnmcgowan:
"Build Your Own Mission Control with OpenClaw"
https://www.tiktok.com/@tristynnmcgowan/video/7603652249683807518

Use this as the visual and functional reference when building any screen.

---

## Overall Aesthetic

- **Dark Mac app** — near-black backgrounds, dark card surfaces
- **Runs fullscreen** on a MacBook Pro
- **Native Mac window chrome** — traffic light buttons (red/yellow/green) top left
- **Top menu bar** — File, Edit, View, Go, Window, Help
- **Left sidebar** — fixed 200px, dark, icon + label nav items
- **Content area** — card-based grid layout, generous padding
- **Font** — SF Pro (system), clean and modern
- **Accent colors** — indigo/blue for primary actions, green for active/live states, orange for in-progress

---

## Screen 1 — Dashboard (Home)

**Header**:
- Title: "Mission Control"
- Subtitle: "Real-time overview of all systems"
- Small status dot top right

**Top Row — 4 Status Cards** (side by side):
- Queued (number)
- Active (number)
- In Progress (number)
- Announcements / Notifications

**Middle Section — 2 columns**:
- Left: **Live Activity** feed
  - Header: "Live Activity" + "View All" button (blue)
  - List of tasks with: colored status dot, task name, agent name, timestamp
  - Status values: "In Progress", "Queued"
  - Orange dot = in progress, Blue dot = queued
- Right: **Announcements** panel (empty state shown)

**Bottom Section — 2 columns**:
- Left: **Recent Documents** 
  - Header + "View All" button
  - Empty state: "No documents yet"
- Right: **Quick Links**
  - List of shortcut buttons: "Marketing Queue", "Client Intelligence", "DevOps"
  - Each is a clickable pill/button

---

## Screen 2 — Workshop (Task Queue)

**Header**:
- Title: "Mission Control Workshop"
- Subtitle: "Autonomous work queue & live progress"

**Tab Bar**:
- Queued (7) | Active (0) — tab switcher
- "Live Feed" button (blue, right side)

**Task Cards** (in Queued tab):
Each card contains:
- Title (bold)
- Description (2 lines, muted text)
- Tag pills: e.g. "building", "skill", colors vary
- Progress indicator
- Timestamp (e.g. "3h ago")
- "Start →" button (right side)
- Status badge top right: "Active" (blue) or queued state

**Example tasks visible in video**:
1. "Client Sentiment Tracking System" — Analyze tone/sentiment of client messages over time. Track satisfaction signals: response time, enthusiasm, complaints...
2. "Skill Building Skill" — A skill that constantly thinks and builds new skills each day so the bot gets stronger and faster
3. "Memory Building Skill" — A skill that constantly looks for ways to improve our memory every 24 hours
4. "Prevent Brain Cool Down" — Figure out how to work at a high rate 24/7 without hitting rate limits or exhaustion
5. "Brand Briefs and Resources Tab in Meta Dashboard A..." — Building a brand brief tool into the ad element area so each user can see their offers, guidelines, stockfiles, target audience, ad A...

---

## Screen 3 — Task Detail Modal

Opens when clicking a task card. Overlays the Workshop screen.

**Content**:
- Task title (large, bold)
- Status badge: "Completed" (green) or other states
- Description (full text)
- Tags row (colored pill badges)
- Created date | Started date (two columns)
- Progress section
- **Activity Log** (scrollable list):
  - Timestamped steps showing what the agent did
  - Example entries:
    - "Mission Control back-end — reconfigured for new release: V12.N.E.X.4"
    - "Meta Policy Change Monitor: deployed daily cron job (3:20 AM) for enhanced monitoring"
    - "Configured daily cron job (3:20 AM) for enhanced monitoring"
    - "Created Mission Control UI dashboard and API endpoints"
- [Close] button bottom right

---

## Screen 4 — API Usage & Metrics

**Header**:
- Title: "API Usage & Metrics"
- Subtitle: "Real-time financial and token intelligence"

**Top Cards Row**:
- "Today's Spend": $0.00
- "7-Day Billing": $0.08 (with "from around past 7 days" note)

**Bottom Section**:
- "Intelligence" panel — listed items with icons
  - "Meta Policy" item visible
  - "Attorney" item visible with note "I will auto-p..." (truncated)

---

## Screen 5 — Agents / Personas

**Layout**: Left panel (agent list) + Right panel (agent detail)

**Left Panel**:
- "Personnel" header
- "INTELLIGENCE MASTER" section label
- Agent list items — avatar circle + name + subtitle

**Agent Detail — Nova** (formerly shown as "Jarvis" in video):
- Large icon/avatar (muscle arm emoji 💪 in video)
- Name: **Nova**
- Role subtitle: "System Orchestration & I..." (truncated)
- **Hidden Directives** section:
  - "To provide [User] with ultimate leverage through autonomous intelligence swarms."
- **Operational Role** section:
  - "Lead intelligence and commander of the centre. Responsible for delegating high-thrust objectives and ensuring mission success for the channel."

---

## Sidebar Navigation Items (in order)

1. Mission Control (logo/home)
2. Dashboard
3. Journal
4. Documents
5. Agents
6. Intelligence
7. Weekly Recaps
8. Clients
9. Core Data
10. (Separator)
11. API Manager
12. Settings
13. Help

---

## Key Design Details

- All cards have subtle border (`#1e1e2e` range) and dark surface background
- Status badges are rounded pills — color coded
- "Live Feed" mode shows a real-time streaming activity log
- Empty states are clean — just a short message, no heavy graphics
- The app feels like an internal ops tool, not a consumer app
- Spacing is generous — not cramped
- Most text is left-aligned
- Action buttons are right-aligned on cards
- Blue is the primary CTA color throughout

---

## Creator Notes (from video caption)

> "First thing I do when you get OpenClaw is build your mission control. This is an app you use to basically monitor and track all of the projects that you're working on with your bot. It will literally build anything you want if you can explain it."

> "If you continue to use it over and over again you'll think of all kinds of new functions that you want to put into mission control to make the app better. It's been by far the best thing I've built with OpenClaw."
