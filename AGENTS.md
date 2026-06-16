# Serch — Local Service Marketplace

You are a world-class full-stack product builder, creative director, and UI/UX designer.

Build a premium modern web app connecting seekers with local service providers (cleaning, roofing, aircon repair, etc.) website with a real-time search and make sure it looks premium and professional, not like a basic AI-generated template. Make sure to use the latest web development technologies and best practices. Always make your codes clean and professional and follow the latest web development trends. Follow all the instructions and guidelines.

================================================
ADDITIONAL CREATIVE DIRECTION
================================================
The final result should feel like it was designed by a top-tier design agency and built as a real production-ready product.

Do not create a generic template.
Do not create a basic admin panel.
Do not make small visual improvements.
Create a complete, polished, premium experience from the first version.

Rules:
- Use these values as environment variables
- Do not hardcode them inside components
- Create the Supabase client in src/lib/supabase.ts
- Use .env file to store .env variables
- Use .env.example file to store example variables

Environment Variables:
- NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anon key
- SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
- RESEND_API_KEY: Your Resend API key
- CLERK_PUBLISHABLE_KEY: Your Clerk publishable key
- CLERK_SECRET_KEY: Your Clerk secret key
- OPENAI_API_KEY: Your OpenAI API key

================================================
CREATIVE DIRECTION
================================================

This project must look premium from the first version.

Think like a world-class creative director.

The public website should feel:
- high-end
- modern
- visually impressive
- warm
- elegant
- refined
- stylish
- trustworthy
- polished
- realistic for a premium local service provider

The dashboard should feel:
- premium
- clean
- modern
- product-like
- organized
- smooth
- easy for a service provider to use
- visually polished, not basic

Design quality expectations:
- Avoid generic or template-like design
- Avoid flat and empty layouts
- Avoid boring sections
- Avoid weak spacing
- Avoid basic AI-generated landing page patterns
- Do not make the public website look like a simple template
- Do not make the admin dashboard look like a basic starter dashboard

================================================
VISUAL DESIGN SYSTEM
================================================

Use a warm, elegant visual style:

- warm off-white backgrounds
- champagne, beige, blush, mocha, espresso, or muted gold accents
- dark charcoal / espresso text
- warm gray supporting tones
- refined borders
- soft shadows
- layered visuals
- depth
- subtle gradients
- soft lighting effects
- tasteful contrast
- polished cards
- strong visual hierarchy
- elegant spacing
- premium buttons
- smooth transitions
- tasteful salon imagery or visual elements

Use depth, gradients, lighting, and layered visuals where appropriate.
Avoid flat backgrounds.
Create strong contrast and hierarchy.
Make the interface feel intentionally designed, not assembled from default components.

Typography:
- improve hierarchy and readability
- make headings expressive and premium
- use elegant, modern, readable typography
- public website can use a refined display style for headings
- dashboard should stay clean, readable, and product-like

Layout:
- improve spacing and composition
- use dynamic, modern layouts
- introduce tasteful asymmetry where appropriate
- avoid overly rigid or boring sections
- every section should feel intentionally designed

Interactions:
- add smooth animations and micro-interactions
- enhance hover effects and transitions
- make the experience feel polished and alive
- keep interactions elegant, not distracting

================================================
AVAILABILITY LOGIC
================================================

Available time slots must be generated using:

- business_hours
- services.duration_minutes
- provider_settings.slot_interval_minutes
- provider_settings.booking_notice_hours
- blocked_dates
- existing appointments

Rules:
- Only show slots inside working hours
- Skip blocked dates
- Skip overlapping appointments
- Ignore cancelled appointments
- Respect booking notice time
- Use the selected service duration to calculate end_time
- New active services added from the dashboard must work in the booking flow

Overlap rule:
new_start < existing_end AND new_end > existing_start

All slots should be normalized as:

{
  start: Date,
  end: Date,
  label: string
}

Time safety:
- Only format real Date objects
- Never pass invalid strings to format()
- Never use strings like "yyyy-MM-ddT10:30:00"
- Always combine the selected date and time correctly
- Save appointment_date as a Supabase-compatible date
- Save start_time and end_time as Supabase-compatible time values

================================================
QUALITY REQUIREMENTS
================================================

- Full working app end-to-end
- Clean code structure with proper separation of concerns
- Supabase fully connected with RLS policies
- Booking flow working end-to-end (search → compare → checkout → confirm)
- Admin login working with role-based access
- Protected dashboard for providers and admins
- Services management fully working (CRUD)
- Appointments management working (view, confirm, complete, cancel)
- Business hours editing working (per day-of-week)
- Blocked dates working (date-specific overrides)
- Provider settings editing working (profile, booking config, Leaflet map)
- No placeholder fake data or hardcoded mock content
- No disconnected dashboard pages
- No read-only admin pages where editing is expected
- Public website should feel top-tier, not template-like
- Dashboard should feel like a polished premium product
- Keep functionality and visual quality strong from the first version

## Project Overview
Mobile-friendly web app connecting seekers with local service providers (cleaning, roofing, aircon repair, etc.). Providers self-register with business permit upload → admin approval → go live. Seekers browse, compare providers side-by-side, and book via calendar-based slots.

## Brand
- **Name**: Serch
- **Tagline**: Find Trusted Services Near You — Fast
- **Primary Color**: #0F172A (Deep Navy)
- **Accent Color**: #0D9488 (Teal)
- **Background**: #F8FAFC (Cool Gray)
- **Font**: Inter (sans-serif)

## User Roles

| Role | Access |
|------|--------|
| **Seeker** (default) | Browse, search, compare providers, calendar booking, manage bookings, in-app chat, rate & review (locked), AI assistant |
| **Provider** | Dashboard, manage profile/services/calendar/bookings, verified badge, in-app chat, review responses, free tier (premium deferred) |
| **Admin** | Provider CRUD + approval/rejection + toggle verified, category management, platform dashboard, review moderation |

## Tech Stack
- **Frontend**: React / Next.js + Tailwind CSS (mobile-first, fully responsive down to 320px)
- **Backend**: Supabase (BaaS — DB, Storage, Realtime)
- **Database**: PostgreSQL (via Supabase)
- **Auth**: Clerk (email/password + Google OAuth + SSO)
- **File Storage**: Supabase Storage (business permit PDF uploads, provider photos)
- **Hosting**: Vercel (frontend) + Supabase (backend)
- **Calendar UI**: FullCalendar or react-calendar
- **Maps**: Leaflet (free, no API key required, OpenStreetMap tiles) — address input auto-pins location, user can drag to adjust
- **Email**: Resend (transactional emails — confirmation, notifications, reminders)
- **Chat**: Supabase Realtime (WebSocket-based in-app messaging)
- **AI Assistant**: OpenAI API or Claude API (real-time Q&A chatbot, trained on platform docs/services)
- **Cache**: In-memory via React Query (server state cache with `staleTime` for search results, provider profiles, availability slots)

## Core Data Models

### users
id, clerk_user_id (unique), email, full_name, phone, role (seeker | provider | admin), avatar_url, created_at

### providers
id, user_id (FK), business_name, description, logo_url, service_categories[], service_city, service_district, latitude, longitude, website, business_permit_url, is_verified (boolean), status (pending | approved | rejected | suspended), plan (free | premium), created_at

### services
id, provider_id (FK), category_id (FK), name, description, price, duration_minutes, images[] (URLs), is_active

### categories
id, name, slug, icon, is_active

### bookings
id, seeker_id (FK), provider_id (FK), service_id (FK), booking_date, start_time, end_time, status (pending | confirmed | completed | cancelled | no_show), notes, created_at

### reviews
id, booking_id (FK, unique), seeker_id (FK), provider_id (FK), rating (1-5), comment, is_locked (boolean, default true), created_at

### provider_availability
id, provider_id (FK), day_of_week (0=Sun .. 6=Sat), start_time, end_time, is_available

### blocked_dates
id, provider_id (FK), date, is_available (boolean, default false), reason (optional)

### chat_messages
id, booking_id (FK), sender_id (FK), message, created_at

## Provider Onboarding Flow
1. Provider signs up → fills business details + uploads business permit PDF
2. Provider enters service address → Leaflet map auto-pins location via geocoding
3. Provider can drag the pin on the Leaflet map to adjust exact position
4. Auto-confirmation email sent to provider ("registration received")
5. Admin logs in → sees all pending providers with submitted info + permit + location on Leaflet map
6. Admin reviews → approves or rejects
7. If approved → email notification to provider → account auto-activated → visible in search
8. If rejected → email notification with reason

## Booking Flow
1. Seeker searches by city/district (default) or selects on map
2. Browses provider list with filters (category, price, rating)
3. Compares providers side-by-side
4. Selects provider → page guards access:
   - If not signed in: Prompts the user to Sign In as Seeker using Clerk's SignIn component.
   - If signed in as Provider: Blocks access with a "Seeker Account Required" message.
   - If signed in as Seeker (or Admin): Shows profile with verified badge, rating, reviews, and availability.
5. Picks date/time → enters booking checkout (review service, add notes, confirm details)
7. Submits booking request → booking created with status "pending"
8. Provider views pending booking in dashboard → approves or contacts seeker
9. Provider notified in-app + via email of new request
10. Upon provider approval → status changes to "confirmed"
11. Seeker notified that booking is confirmed
12. In-app chat automatically enabled for the seeker & provider to communicate
13. After service date → seeker prompted to leave review
14. Review is locked upon submission (no edits)

## Email Notifications (via Resend)

| Event | Sender | Recipient | Template |
|-------|--------|-----------|----------|
| Provider registered | System | Provider | "We received your registration — we'll review it shortly" |
| Provider approved | Admin | Provider | "Your account is now active! Start managing your services." |
| Provider rejected | Admin | Provider | "Your application was not approved — reason: [reason]" |
| Booking request | System | Provider | "You have a new booking request from [seeker] on [date] at [time]" |
| Booking confirmed | System | Seeker | "Your booking with [provider] on [date] at [time] is confirmed" |
| Booking cancelled | System | Seeker + Provider | "[Seeker/provider] cancelled the booking on [date]" |
| Booking reminder | System | Seeker | "Reminder: you have a booking with [provider] tomorrow at [time]" |
| Review prompt | System | Seeker | "How was your service with [provider]? Leave a review." |

## Caching Strategy (In-Memory via React Query)

Server state cache with `staleTime` and `gcTime` — no external infrastructure required.

| Cache Key | Data | staleTime | Invalidate On |
|-----------|------|-----------|---------------|
| `search:{city}:{category}` | Provider search results | 5 min | Provider create / update / status change |
| `popular:providers` | Top-rated providers | 10 min | New review submitted |
| `provider:{id}:profile` | Provider profile + services | 5 min | Service CRUD / profile update |
| `slots:{providerId}:{date}` | Available time slots | 2 min | New booking / blocked date change |

## Key Feature Requirements

### Seeker
- Home / Dashboard with search bar at top, Popular Providers section, then all approved providers list
- Search + filter (city/district, category, price range, rating)
- Map-based search with city/district default
- Popular Providers section (curated / highest rated) above the provider listing
- Provider comparison view
- Provider profile with verified badge, ratings, reviews, and availability calendar
- Calendar-based booking (real-time slot selection)
- Booking checkout flow (review service details, add notes, confirm)
- Booking management (cancel within policy)
- In-app chat with provider for active bookings (presence/online status)
- Post-service ratings & reviews (locked after submission)
- AI Assistant (floating button, real-time Q&A chatbot)

### Provider
- Self-registration with business permit upload
- Dashboard with tabbed navigation:
  - **Overview** — hero section with stat cards: total appointments, pending, confirmed, completed, active services, today's visits; below that, upcoming appointments list with quick actions
  - **Appointments** — view, confirm, complete, cancel bookings; filter by date/status
  - **Services** — CRUD services (name, description, price, duration, photos)
  - **Business Hours** — set recurring weekly availability (per day-of-week with time ranges)
  - **Blocked Dates** — block specific dates (holidays, days off) override business hours
  - **Settings** — business profile (name, email, phone, address with Leaflet map auto-populate), booking configuration (slot interval in minutes — 30 default, booking notice in hours — 2 default)
- Verified badge (after admin approval)
- In-app chat with seekers for active bookings (presence/online status)
- View & respond to reviews
- Free tier (premium deferred to Phase 2)

### Admin
- Dashboard (total users, providers, bookings)
- Provider CRUD + approve/reject with document review
- Toggle provider verified status
- Category CRUD
- Review moderation (remove inappropriate reviews)
- Platform settings

## Non-Functional
- Mobile-first responsive (320px+)
- WCAG 2.1 AA accessibility
- Page load < 2s on 3G
- Touch-friendly UI
- HTTPS, RBAC, input sanitization

## MVP (Phase 1) — In Scope
- Seeker full flow (browse, search, compare, book, review)
- Provider self-registration with permit upload + email confirmations
- Admin approval workflow with email notifications
- Provider profiles with verified badge, ratings, reviews, availability
- Booking checkout flow (review service, add notes, confirm)
- In-app chat for active bookings (presence/online status)
- Post-service ratings & reviews (locked after submission)
- AI Assistant (floating button, real-time Q&A chatbot)
- Free tier only
- English-only UI
- No payments (bookings are requests)

## Phase 2 (Deferred)
- Premium subscription & online payments
- Provider analytics
- Review moderation dashboard
- Dispute handling
- Push notifications (mobile)
- Multi-language support

## UI/UX Conventions
- Clean, corporate, elegant
- Cards for provider listings
- Bottom nav for mobile (Seeker: Home, Search, Bookings, Profile)
- Sidebar nav for desktop
- Stepped forms for provider registration
- Toast notifications for booking/approval events
- Skeleton loaders for async content
- Chat bubble UI for in-app messaging (bottom sheet on mobile, sidebar on desktop)
- Online/offline presence indicator (green dot / gray dot)
- Verified badge (checkmark icon in teal) on provider cards and profiles
- AI Assistant floating button (bottom-right corner, expandable chat panel)
- Review lock indicator (lock icon, visible after submission, no edit button)

## Coding Conventions
- Tailwind CSS utility classes (no CSS modules unless necessary)
- TypeScript throughout
- Functional components with hooks
- Supabase client-side queries with RLS policies
- Component library: shadcn/ui (built on Radix + Tailwind)
- Form handling: React Hook Form + Zod validation
- State management: React context + SWR/React Query for server state
- File naming: kebab-case for files, PascalCase for components
- All text in English only
- No emojis in UI
- Minimal comments — code should be self-documenting
