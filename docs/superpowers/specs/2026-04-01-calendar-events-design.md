# Calendar Events Design

## Context
The War Room "Week Ahead" section is currently plain textareas — one per day. Jonny and Alex need structured, color-coded events they can add to each day (calls, meetings, deadlines, launches, tasks). Events sync between both users via Supabase and today's events surface on the Today dashboard tab.

## Architecture

A new `events` table in Supabase stores structured events per day. The War Room Week Ahead section is rebuilt as day cards with event chips and a lightweight add-event modal. The Today tab gets a new "Today's Schedule" section that queries today's events from the same table.

No external calendar libraries — all vanilla JS/HTML/CSS consistent with the existing codebase.

---

## Data Model

### `events` table (new)

```sql
create table events (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  title      text not null,
  type       text not null check (type in ('call','meeting','deadline','launch','task')),
  time       text,           -- e.g. "10:00 AM", null if all-day
  owner      text,           -- 'jonny' | 'alex' | 'both' | null
  created_at timestamptz default now()
);

alter table events enable row level security;

create policy "agency read" on events for select using (auth.uid() is not null);
create policy "agency insert" on events for insert with check (auth.uid() is not null);
create policy "agency delete" on events for delete using (auth.uid() is not null);
```

---

## Event Types & Colors

| Type | Color | Hex |
|---|---|---|
| call | Blue | `#0176D3` |
| meeting | Purple | `#8B5CF6` |
| deadline | Amber | `#F59E0B` |
| launch | Red | `#EF4444` |
| task | Green | `#22C55E` |

Event title text: `#111827`, `font-weight: 500` — full contrast on all backgrounds.

---

## War Room — Week Ahead (rebuilt)

Replaces the 7 plain textareas with 7 day cards (Mon–Sun).

**Day card anatomy:**
- Header row: day name (bold), date, TODAY pill (if current day), `+` button
- Today's card: blue border (`2px solid var(--primary)`), light blue background (`#EFF6FF`)
- Other days: white card, `1px solid var(--border)`
- Empty days: subtle, no placeholder text needed

**Event chip (per event in a day card):**
- Type badge: colored pill with white text (e.g. `CALL`, `MEETING`)
- Title: `#111827`, `font-weight: 500`, `font-size: 11px`
- Time (optional): muted, right-aligned
- Owner (optional): small uppercase label, muted (`JONNY`, `ALEX`, `BOTH`)
- Delete: small `×` on hover

**Add Event modal (inline overlay):**
- Triggered by `+` on any day card
- Fields: Title (text input), Type (pill toggle — one required), Time (text input, optional), Owner (pill toggle — Jonny/Alex/Both, optional)
- Buttons: Cancel, Add Event (blue)
- On save: `INSERT` to Supabase, re-render that day's card
- No drag, no time grid — keep it fast and low-friction

**localStorage migration:** The old textarea data (`warroom-week-*` keys) is no longer written or read. Existing keys are left alone (not deleted).

---

## Today Tab — Today's Schedule (new section)

Inserts a **"Today's Schedule"** section between the header stats and the Urgent tasks section.

- Queries events where `date = today`
- Shows events sorted by time (timed events first, then untimed)
- Each row: type badge, title, time (if set), owner (if set)
- If no events: shows a subtle empty state ("Nothing scheduled today")
- Clicking a row does nothing (read-only on Today tab — add/delete from War Room)

---

## Mobile

Same day card layout stacks vertically (no change needed — existing responsive CSS handles it). Today's card is pinned visually by the blue border. The `+` button and modal work identically on mobile.

---

## Files to modify

| File | Change |
|---|---|
| `js/db.js` | Add `getEvents(dateStr)` (single day), `getWeekEvents(mondayStr, sundayStr)` (7-day range), `addEvent(data)`, `deleteEvent(id)` |
| `js/warroom.js` | Replace Week Ahead textareas with day cards + modal logic |
| `js/today.js` | Add Today's Schedule section using `getEvents(today)` |
| `css/styles.css` | Add `.event-chip`, `.day-card`, `.event-modal` styles |

### New Supabase SQL (run once)
Create the `events` table with RLS as shown in Data Model above.

---

## Verification

1. Run SQL in Supabase to create `events` table
2. Open War Room — Week Ahead shows 7 day cards, no textareas
3. Click `+` on any day — modal appears with correct fields
4. Add a "Call" event — chip appears with blue badge and dark title text
5. Add event as Jonny in one browser, open hub in another — event is visible (Supabase sync)
6. Open Today tab — Today's Schedule section shows today's events
7. Delete an event via `×` — disappears immediately
8. On mobile — day cards stack vertically, Today card highlighted, modal opens correctly
