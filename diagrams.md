# Serch — Diagrams

Copy/paste any block into [mermaid.ai](https://mermaid.ai) to render.

---

## 1. Site Map (Navigation Structure)

```mermaid
graph TD
    Home["/ Home
    Seeker Dashboard:
    Search bar at top,
    Popular Providers section,
    All approved providers below"]
    Search["/search Results / Filters"]
    Provider["/provider/:id Detail Page"]
    Compare["/compare Comparison View"]
    Book["/book/:providerId Calendar Booking"]
    BookCheckout["/book/:providerId/checkout Review & Confirm"]
    BookConfirm["/book/:providerId/confirmation Success"]

    SeekerDash["/seeker/dashboard"]
    SeekerBookings["/seeker/bookings"]
    SeekerChat["/seeker/chat/:bookingId In-App Chat"]
    SeekerReviews["/seeker/reviews"]
    SeekerFavs["/seeker/favorites"]

    ProviderDash["/provider/dashboard
    Overview: Hero stat cards
    (total, pending, confirmed,
    completed, active services,
    today's visits) + Upcoming
    Appointments list below
    Tabs: Appointments, Services,
    Business Hours, Blocked Dates,
    Settings"]
    ProviderServices["/provider/dashboard?tab=services"]
    ProviderBusinessHours["/provider/dashboard?tab=business-hours"]
    ProviderBlockedDates["/provider/dashboard?tab=blocked-dates"]
    ProviderBookings["/provider/dashboard?tab=appointments"]
    ProviderChat["/provider/chat/:bookingId In-App Chat"]
    ProviderReviews["/provider/dashboard?tab=reviews"]
    ProviderSettings["/provider/dashboard?tab=settings
    Name, Email, Phone, Address
    + Leaflet map auto-populate
    + Booking Config: slot interval (30min),
    booking notice (2hrs)"]

    AdminDash["/admin/dashboard"]
    AdminProviders["/admin/providers"]
    AdminCategories["/admin/categories"]
    AdminBookings["/admin/bookings"]
    AdminReviews["/admin/reviews"]
    AdminSettings["/admin/settings"]

    AuthSignIn["/auth/sign-in"]
    AuthSeeker["/auth/sign-up/seeker"]
    AuthProvider["/auth/sign-up/provider"]

    StaticAbout["/about"]
    StaticFAQ["/faq"]
    StaticTerms["/terms"]
    StaticPrivacy["/privacy"]

    AIAssistant["AI Assistant
    (Floating button, bottom-right)"]

    Home --> Search
    Home --> AuthSignIn
    Home --> AuthSeeker
    Home --> AuthProvider
    Search --> Provider
    Search --> Compare
    Provider --> Book
    Book --> BookCheckout
    BookCheckout --> BookConfirm

    SeekerDash --> SeekerBookings
    SeekerDash --> SeekerReviews
    SeekerDash --> SeekerFavs
    SeekerBookings --> Provider
    SeekerBookings --> SeekerChat

    ProviderDash --> ProviderServices
    ProviderDash --> ProviderBusinessHours
    ProviderDash --> ProviderBlockedDates
    ProviderDash --> ProviderBookings
    ProviderDash --> ProviderReviews
    ProviderDash --> ProviderSettings
    ProviderBookings -.-> ProviderChat

    AdminDash --> AdminProviders
    AdminDash --> AdminCategories
    AdminDash --> AdminBookings
    AdminDash --> AdminReviews
    AdminDash --> AdminSettings

    AuthSeeker --> SeekerDash
    AuthProvider --> ProviderDash
    AuthSignIn --> AdminDash

    Home -.->|global| AIAssistant
    Provider -.->|global| AIAssistant
    Search -.->|global| AIAssistant
```

---

## 2. Role-Based Access Control (RBAC) Matrix

```mermaid
graph LR
    sublegend["Legend:
    CRUD = Create / Read / Update / Delete
    R    = Read-only
    --   = No access"]

    subgraph Seeker["Seeker Role"]
        S1["Browse / Search Providers"]
        S2["Compare Providers"]
        S3["View Provider Details (verified badge, reviews, availability)"]
        S4["Book Appointment (Calendar + Checkout)"]
        S5["Manage Own Bookings"]
        S6["In-App Chat with Provider (active bookings only)"]
        S7["Write Reviews (locked after submission)"]
        S8["Save Favorites"]
        S9["AI Assistant (Q&A chatbot)"]
        S10["Edit Own Profile"]
    end

    subgraph Provider["Provider Role"]
        P1["Dashboard Overview (stat cards + upcoming appointments list)"]
        P2["Manage Services (CRUD)"]
        P3["Set Business Hours (weekly recurring)"]
        P4["Block Specific Dates (one-off)"]
        P5["Manage Appointments (view/confirm/complete/cancel)"]
        P6["In-App Chat with Seekers (active bookings only)"]
        P7["View & Respond to Reviews"]
        P8["Settings (profile, account, notifications)"]
        P9["Display Verified Badge"]
        P10["Upgrade Plan"]
    end

    subgraph Admin["Admin Role"]
        A1["Platform Dashboard (All Stats)"]
        A2["Provider CRUD + Approve / Reject"]
        A3["Toggle Provider Verified Status"]
        A4["Category CRUD"]
        A5["View All Bookings"]
        A6["Moderate Reviews (remove inappropriate)"]
        A7["Platform Settings"]
    end

    S1 -.->|R| SearchDB[("Database")]
    S2 -.->|R| SearchDB
    S3 -.->|R| SearchDB
    S4 -.->|CRUD| BookDB[("Bookings Table")]
    S5 -.->|CRUD| BookDB
    S6 -.->|CRUD| ChatDB[("Chat Messages Table")]
    S7 -.->|CRUD| ReviewDB[("Reviews Table")]
    S8 -.->|CRUD| FavDB[("Favorites Table")]
    S9 -.->|R| AIDB[("AI Knowledge Base")]
    S10 -.->|CRUD| UserDB[("Users Table")]

    P1 -.->|R| AggDB[("Aggregated Stats")]
    P2 -.->|CRUD| ServiceDB[("Services Table")]
    P3 -.->|CRUD| AvailDB[("Business Hours Table")]
    P4 -.->|CRUD| BlockDB[("Blocked Dates Table")]
    P5 -.->|R / Update| BookDB
    P6 -.->|CRUD| ChatDB
    P7 -.->|R| ReviewDB
    P8 -.->|CRUD| UserDB
    P9 -.->|R| ProvDB[("Providers Table")]

    A2 -.->|CRUD| ProvDB
    A3 -.->|Update| ProvDB
    A4 -.->|CRUD| CatDB[("Categories Table")]
    A5 -.->|R| BookDB
    A6 -.->|CRUD| ReviewDB
    A7 -.->|CRUD| SettingsDB[("Platform Settings Table")]
```

---

## 3. Data Flow Diagrams

### 3.1 Provider Onboarding Flow

```mermaid
sequenceDiagram
    actor Provider
    participant App as Web App
    participant Clerk as Clerk Auth
    participant Leaflet as Leaflet (OpenStreetMap)
    participant Supabase as Supabase (DB + Storage)
    participant Resend as Resend (Email)
    actor Admin

    Provider->>App: Sign up (email, password)
    App->>Clerk: Create user
    Clerk-->>App: User created (clerk_user_id)
    App->>Supabase: Insert user record (role=provider)
    App->>App: Show multi-step form
    Provider->>App: Fill business details
    Provider->>App: Upload business permit PDF
    App->>Supabase Storage: Upload PDF
    Supabase Storage-->>App: Return file URL
    Provider->>App: Enter service address
    App->>Leaflet: Geocode address (Nominatim)
    Leaflet-->>App: Return lat/lng coordinates
    App-->>Provider: Show auto-placed pin on Leaflet map
    Provider->>App: Drag pin to adjust exact location (optional)
    App->>App: Capture final lat/lng coordinates
    App->>Supabase: Insert provider record (status=pending, lat, lng)
    App->>Resend: Send "registration received" email
    Resend-->>Provider: Confirmation email
    Note over Admin: Admin checks dashboard
    Admin->>App: Login
    App->>Clerk: Authenticate
    Clerk-->>App: Session (role=admin)
    App->>Supabase: Query pending providers
    Supabase-->>App: List of pending providers + permit URLs + coordinates
    App-->>Admin: View provider details + download permit + view location on Leaflet map
    Admin->>App: Approve / Reject
    alt Approved
        App->>Supabase: Update provider status=approved
        App->>Resend: Send "approved" notification
        Resend-->>Provider: "Your account is now active!"
        App->>Supabase: Provider visible in search results
    else Rejected
        App->>Supabase: Update provider status=rejected
        App->>Resend: Send rejection with reason
        Resend-->>Provider: "Your application was not approved"
    end
```

### 3.2 Booking Flow

```mermaid
sequenceDiagram
    actor Seeker
    participant App as Web App
    participant Clerk as Clerk Auth
    participant Supabase as Supabase (DB)
    participant Resend as Resend (Email)
    actor Provider

    Seeker->>App: Search by city / district
    App->>Supabase: Query providers (filters)
    Supabase-->>App: Provider list
    App-->>Seeker: Display results + map
    Seeker->>App: Select provider
    App->>Supabase: Query provider details + reviews
    Supabase-->>App: Provider data
    App-->>Seeker: Provider profile page
    Seeker->>App: Click "Compare"
    App-->>Seeker: Side-by-side comparison view
    Seeker->>App: Click "Book Now"
    Note over App: Check if seeker is authenticated
    alt Not Authenticated
        App-->>Seeker: Redirect to Clerk sign-in / sign-up
        Seeker->>App: Sign in via Clerk (email/password or Google)
        App->>Clerk: Authenticate
        Clerk-->>App: JWT + session
        App-->>Seeker: Redirect back to booking
    else Authenticated
        App-->>Seeker: Proceed to booking
    end
    App->>Supabase: Query availability slots
    Supabase-->>App: Available time slots
    App-->>Seeker: Calendar picker
    Seeker->>App: Select date + time slot
    App->>Supabase: Check slot still available
    alt Slot Taken
        App-->>Seeker: "Slot no longer available, pick another"
    else Slot Available
        App->>Supabase: Insert booking (status=pending, seeker_id from JWT)
        App->>Resend: Send request notification to provider
        Resend-->>Provider: "New booking request from [seeker]!"
        App-->>Seeker: "Booking request sent — awaiting provider approval"
    end
    Note over Provider: Provider reviews in dashboard
    Provider->>App: Approve booking
    App->>Supabase: Update booking status = confirmed
    App->>Resend: Send confirmation to seeker
    Resend-->>Seeker: "Your booking is confirmed!"
    Note over Provider: After service date
    App->>Resend: Send review prompt to seeker
    Seeker->>App: Leave rating + review
    App->>Supabase: Insert review
    Supabase-->>App: Review saved
    App-->>Provider: Review visible on profile
```

### 3.3 Search & Filter Data Flow

```mermaid
sequenceDiagram
    actor Seeker
    participant App as Web App
    participant Supabase as Supabase

    Seeker->>App: Type in search bar + select filters
    App->>Supabase: Query providers (city, district, category)
    Supabase-->>App: Provider results with lat/lng
    App->>App: Render Leaflet map with OpenStreetMap tiles + provider markers
    App-->>Seeker: Display card list + map markers
    Seeker->>App: Adjust price range slider
    App->>App: Client-side filter (or re-query)
    App-->>Seeker: Filtered list
    Seeker->>App: Click map marker
    App->>App: Scroll to / highlight that provider card
    Seeker->>App: Select provider to view detail
```

### 3.4 Booking Checkout Flow

```mermaid
sequenceDiagram
    actor Seeker
    participant App as Web App
    participant Clerk as Clerk Auth
    participant Supabase as Supabase (DB)

    Note over Seeker,Supabase: Seeker is already authenticated via Clerk (JWT in session)
    Seeker->>App: Select date + time slot on calendar
    App->>Supabase: Query service details + price
    Supabase-->>App: Service name, price, duration
    App-->>Seeker: Show checkout summary (service, date, time, price)
    Seeker->>App: Add optional notes
    Seeker->>App: Click "Confirm Booking"
    App->>Supabase: Check slot availability again (prevent double-book)
    alt Slot Taken
        App-->>Seeker: "Sorry, this slot was just taken. Pick another."
    else Slot Available
        App->>Supabase: Insert booking (status=pending, seeker_id from JWT)
        App-->>Seeker: "Booking request sent — awaiting provider approval"
        Note over App: Trigger Resend emails + Realtime chat activation
    end
```

### 3.5 In-App Chat Flow

```mermaid
sequenceDiagram
    actor Seeker
    participant App as Web App
    participant SupabaseRealtime as Supabase Realtime
    participant SupabaseDB as Supabase (DB)
    actor Provider

    Note over Seeker,Provider: Chat is enabled after booking is confirmed

    Seeker->>App: Open chat for booking
    App->>SupabaseDB: Query previous messages
    SupabaseDB-->>App: Message history
    App->>SupabaseRealtime: Subscribe to booking chat channel
    App-->>Seeker: Show chat UI with history

    Provider->>App: Open chat for same booking
    App->>SupabaseDB: Query previous messages
    SupabaseDB-->>App: Message history
    App->>SupabaseRealtime: Subscribe to same channel
    App-->>Provider: Show chat UI with history

    Seeker->>App: Type message + send
    App->>SupabaseDB: Insert chat_message (sender_id, booking_id, message)
    App->>SupabaseRealtime: Broadcast new message to channel
    SupabaseRealtime-->>App: Push new message (to both participants)
    App-->>Seeker: Message appears in UI
    App-->>Provider: Message appears in real-time

    Provider->>App: Type reply + send
    App->>SupabaseDB: Insert chat_message
    App->>SupabaseRealtime: Broadcast reply
    SupabaseRealtime-->>App: Push reply
    App-->>Provider: Reply appears in UI
    App-->>Seeker: Reply appears in real-time

    Note over Seeker,Provider: Presence (online/offline) via Realtime presence
    App-->>Seeker: Show green/gray dot for provider status
    App-->>Provider: Show green/gray dot for seeker status
```

### 3.6 AI Assistant Flow

```mermaid
sequenceDiagram
    actor User
    participant App as Web App
    participant AIAPI as AI API (OpenAI / Claude)

    User->>App: Click AI Assistant floating button
    App-->>User: Expand chat panel (bottom-right corner)
    User->>App: Type question (e.g. "How do I book a provider?")
    App->>App: Add question to conversation context
    App->>AIAPI: Send prompt + platform context + conversation history
    AIAPI-->>App: Generated response
    App-->>User: Display answer in chat bubble
    User->>App: Ask follow-up question
    App->>AIAPI: Send updated conversation + new question
    AIAPI-->>App: Response
    App-->>User: Display answer
    Note over User,AIAPI: AI trained on platform docs, FAQs, policies
```

---

## 4. Database Schema (Entity Relationship)

```mermaid
erDiagram
    users {
        uuid id PK
        string clerk_user_id UK
        string email UK
        string full_name
        string phone
        enum role
        string avatar_url
        timestamp created_at
    }

    providers {
        uuid id PK
        uuid user_id FK
        string business_name
        text description
        string logo_url
        text service_categories
        string service_city
        string service_district
        float latitude
        float longitude
        string website
        string business_permit_url
        boolean is_verified
        enum status
        enum plan
        timestamp created_at
    }

    services {
        uuid id PK
        uuid provider_id FK
        uuid category_id FK
        string name
        text description
        float price
        int duration_minutes
        text images
        boolean is_active
    }

    categories {
        uuid id PK
        string name
        string slug UK
        string icon
        boolean is_active
    }

    bookings {
        uuid id PK
        uuid seeker_id FK
        uuid provider_id FK
        uuid service_id FK
        date booking_date
        time start_time
        time end_time
        enum status
        text notes
        timestamp created_at
    }

    reviews {
        uuid id PK
        uuid booking_id FK UK
        uuid seeker_id FK
        uuid provider_id FK
        int rating
        text comment
        boolean is_locked
        timestamp created_at
    }

    provider_availability {
        uuid id PK
        uuid provider_id FK
        int day_of_week
        time start_time
        time end_time
        boolean is_available
    }

    blocked_dates {
        uuid id PK
        uuid provider_id FK
        date date
        boolean is_available
        string reason
    }

    chat_messages {
        uuid id PK
        uuid booking_id FK
        uuid sender_id FK
        text message
        timestamp created_at
    }

    users ||--o{ providers : "has (if role=provider)"
    providers ||--o{ services : "offers"
    categories ||--o{ services : "belongs to"
    users ||--o{ bookings : "as seeker"
    providers ||--o{ bookings : "receives"
    services ||--o{ bookings : "for"
    bookings ||--o| reviews : "has one"
    users ||--o{ reviews : "writes (as seeker)"
    providers ||--o{ reviews : "receives"
    providers ||--o{ provider_availability : "sets weekly hours"
    providers ||--o{ blocked_dates : "blocks dates"
    bookings ||--o{ chat_messages : "has many"
    users ||--o{ chat_messages : "sends"
```

---

## 5. Architecture Overview

```mermaid
graph TD
    subgraph Client["Client (Browser)"]
        NextApp["Next.js App
        (React + Tailwind CSS)
        Mobile-First Responsive"]
        ClerkFE["Clerk.js
        Auth Components"]
        AIWidget["AI Assistant Widget
        (Floating bottom-right)"]
        LeafletMap["Leaflet Map (OpenStreetMap)
        Free tiles, no API key
        Auto-pin + drag to adjust"]
    end

    subgraph Vercel["Vercel (Hosting)"]
        NextApp
    end

    subgraph Supabase["Supabase (Backend)"]
        Postgres[("PostgreSQL
        Database")]
        Storage["File Storage
        (Business Permits, Photos)"]
        Realtime["Realtime
        (Chat + Presence + Slot Updates)"]
    end

    subgraph Clerk["Clerk (Auth)"]
        ClerkAPI["Auth API
        Email/Password + Google OAuth"]
    end

    subgraph External["External Services"]
        Resend["Resend
        (Transactional Emails)"]
        AIAPI["AI API
        (OpenAI / Claude)"]
    end

    ClerkFE <-->|Auth Sessions| ClerkAPI
    NextApp <-->|API Queries (RLS)| Postgres
    NextApp <-->|File Uploads| Storage
    NextApp <-->|Chat Messages + Presence| Realtime
    NextApp <-->|Slot Updates| Realtime
    NextApp -->|Email Notifications| Resend
    AIWidget -->|Q&A Prompts| AIAPI
    LeafletMap -->|Tile requests (free)| OSM[("OpenStreetMap
    CDN")]
    ClerkAPI -->|Webhook: user created| Postgres

    style Client fill:#F8FAFC,stroke:#0F172A
    style Vercel fill:#F8FAFC,stroke:#0F172A
    style Supabase fill:#F8FAFC,stroke:#0F172A
    style Clerk fill:#F8FAFC,stroke:#0F172A
    style External fill:#F8FAFC,stroke:#0F172A
```
