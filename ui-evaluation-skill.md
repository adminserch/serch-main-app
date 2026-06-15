# Serch — UI/UX Evaluation Skill

Use this skill when building, reviewing, or refining any UI component for Serch. Every screen must be evaluated against these criteria before shipping.

---

## 1. Brand Fidelity

**Pass** criteria:
- Primary color `#0F172A` (Deep Navy) is used for primary buttons, headers, navigation, key headings
- Accent color `#0D9488` (Teal) is used for CTAs, verified badges, active states, links
- Background `#F8FAFC` (Cool Gray) is the default page background
- Inter font is used throughout (sans-serif, multiple weights)
- White space is generous — no cramped layouts

**Fail** if:
- Default Tailwind blue/gray are visible
- Colors deviate from the palette without intentional design reason
- Multiple accent colors compete for attention

---

## 2. Visual Design Quality

### 2.1 Premium Look & Feel

**Pass** criteria:
- Cards have refined borders and soft shadows
- Subtle gradients or layered backgrounds add depth
- Buttons feel substantial — proper padding, hover states, transitions
- No flat, empty sections
- Text has clear hierarchy (size, weight, color contrast)

**Fail** if:
- Looks like a basic Tailwind starter template
- Any bootstrap/default component style is visible
- Sections are boring or lack intentional spacing

### 2.2 Provider Cards (Public Website)

**Pass** criteria:
- Card shows: business name, rating stars, price indicator, city/district, verified badge
- Hover state lifts card slightly (transform + shadow)
- Clickable area is the full card
- Verified badge is teal checkmark
- Online/offline dot indicator present (if applicable)

**Fail** if:
- Card is flat with no hover interaction
- Verified badge is missing or styled generically
- Text is cramped or overflows

### 2.3 Dashboard (Provider)

**Pass** criteria:
- Clean sidebar navigation (desktop) / bottom tabs (mobile)
- Hero stat cards: total appointments, pending, confirmed, completed, active services, today's visits
- Each stat card has: icon, number, label, subtle color coding
- Upcoming appointments list below hero with: time, seeker name, service, status badge, action buttons
- Tab navigation feels product-like (not generic)

**Fail** if:
- Dashboard looks like a basic admin starter
- Stat cards are flat or hard to scan
- Tabs are unstyled or misaligned

### 2.4 Dashboard (Admin)

**Pass** criteria:
- Clean sidebar navigation
- Stat cards match Provider dashboard style
- Provider list has: name, status badge (pending/approved/rejected), date, actions (approve/reject/view)
- Category management is inline or modal-based, not a separate clunky page
- Overall feel is premium product, not generic admin panel

**Fail** if:
- Looks like a default Laravel/Next.js admin template
- Provider approve/reject flow is unclear or unpolished

---

## 3. Responsive & Mobile

**Check all viewports: 320px, 375px, 768px, 1024px, 1440px**

### 3.1 Public Website

**Pass** criteria:
- Bottom nav appears on mobile (Home, Search, Bookings, Profile)
- Search bar is prominent at top on mobile
- Provider cards stack in single column on mobile, 2 columns on tablet, 3+ on desktop
- Map view collapses to a toggle or smaller panel on mobile
- AI Assistant button is accessible but not obstructive on small screens

**Fail** if:
- Horizontal scroll exists at any breakpoint
- Text overflows or gets cut off
- Bottom nav icons are misaligned or text is truncated
- Buttons are too small to tap (< 44px touch target)

### 3.2 Provider Dashboard

**Pass** criteria:
- Sidebar nav collapses to hamburger on mobile
- Stat cards wrap to 2 columns on mobile
- Tables have horizontal scroll or mobile card view
- Settings forms are full-width on mobile
- Leaflet map resizes properly

**Fail** if:
- Dashboard is unusable on mobile
- Tables break layout
- Forms are zoomed out or overflow

---

## 4. Interaction & Animation

**Pass** criteria:
- Button hover: scale(1.02) + shadow increase, smooth 200ms transition
- Card hover: lift with shadow, 300ms ease
- Page transitions: subtle fade or slide (not instant jarring)
- Modal/overlay: backdrop blur, scale-in animation
- Skeleton loaders: shimmer animation for async content
- Toast notifications: slide-in from top-right, auto-dismiss
- Chat messages: smooth scroll to bottom on new message
- AI Assistant: slide-up panel with spring animation

**Fail** if:
- Animations are jarring or too slow (> 500ms)
- No loading states for async data
- Transitions are missing or default browser behavior
- Micro-interactions feel unnecessary or distracting

---

## 5. Accessibility (WCAG 2.1 AA)

**Pass** criteria:
- All interactive elements focusable via keyboard
- Visible focus ring on all interactive elements
- Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- Form inputs have visible labels
- Images have alt text
- Error messages are clear and associated with inputs
- ARIA labels on icon-only buttons (chat, close, menu)

**Fail** if:
- Keyboard navigation is broken or incomplete
- Color alone conveys information (must have icon/label too)
- Missing focus indicators

---

## 6. Component Checklist

For every page rendered, verify these components exist and match the design system:

| Component | Mandatory Elements |
|-----------|-------------------|
| **Button (Primary)** | Navy bg, white text, rounded-lg, hover: darker shade, padding-y-3 padding-x-6 |
| **Button (Outline)** | Transparent bg, navy border + text, hover: fill |
| **Button (Ghost)** | No bg, navy text, hover: light bg |
| **Input** | Cool gray border, focus: teal ring, rounded-lg, floating label or top label |
| **Card** | White bg, rounded-xl, subtle border, p-6, soft shadow |
| **Modal** | Backdrop blur, white rounded-xl, max-w-lg, scale-in animation |
| **Toast** | White bg, colored left border (green=success, red=error), icon, auto-dismiss 4s |
| **Skeleton** | Animated shimmer, matching card/row dimensions |
| **Badge** | Small rounded-pill, colored (teal=verified, amber=pending, green=active, gray=inactive) |
| **Bottom Nav** | 4 icons max, active state in teal, label below icon |

---

## 7. Scoring Rubric

| Score | Label | Meaning |
|-------|-------|---------|
| 1 | Fails | Does not meet brand/quality standards. Must be redesigned. |
| 2 | Needs Work | Meets basic requirements but feels generic or unpolished. |
| 3 | Good | Solid execution, feels premium. Minor tweaks possible. |
| 4 | Excellent | Top-tier design. No changes needed. |

**Minimum acceptable score per screen: 3 (Good)**

Any screen scoring 1 or 2 must be flagged and reworked before proceeding.

---

## 8. Review Process

Before each commit/PR that touches UI:

1. **Self-review** against this checklist
2. **Responsive check** at 3 breakpoints (mobile, tablet, desktop)
3. **Brand check** — no color/style drift from the design system
4. **Animation check** — no missing or broken transitions
5. **Accessibility check** — keyboard nav + contrast + labels

Log any failures and fix before marking complete.
