# Serch — Supabase SQL Schema

Run this in the Supabase SQL Editor to set up the entire database.

---

## 0. Clerk <> Supabase Auth Integration

This schema is designed for **Clerk authentication** with **Supabase Row-Level Security**.

### How it works

1. **Clerk issues JWTs** — Each authenticated user gets a signed JWT from Clerk
2. **Supabase JWT Template** — In the Clerk Dashboard, create a **Supabase JWT template** that includes the `sub` claim (Clerk user ID) in the JWT payload. Example template:

```
{
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "name": "{{user.full_name}}",
  "role": "authenticated",
  "aud": "authenticated",
  "iat": {{issued_at}},
  "exp": {{expire_at}}
}
```

3. **Client passes Clerk JWT to Supabase** — The client sends Clerk's JWT as the `Authorization: Bearer <token>` header to Supabase
4. **RLS reads `request.jwt.claims`** — Supabase exposes the Clerk JWT claims via `current_setting('request.jwt.claims', true)::json`
5. **`sub` maps to `clerk_user_id`** — All RLS policies match `current_setting(...)::json->>'sub'` against the `users.clerk_user_id` column

### Clerk Webhook (Required)

Create a **Clerk Webhook** listening to `user.created` and `user.updated` events. Point it to `/api/webhooks/clerk` in your Next.js app. The handler upserts the corresponding row in the `users` table:

- On `user.created`: `INSERT INTO users (clerk_user_id, email, full_name, avatar_url) VALUES (...)`
- On `user.updated`: `UPDATE users SET email = ..., full_name = ..., avatar_url = ... WHERE clerk_user_id = ...`

This ensures the `users` table stays in sync with Clerk's user database automatically.

---

## 1. Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

---

## 2. Enums

```sql
CREATE TYPE user_role AS ENUM ('seeker', 'provider', 'admin');

CREATE TYPE provider_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

CREATE TYPE provider_plan AS ENUM ('free', 'premium');

CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
```

---

## 3. Tables

### 3.1 users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'seeker',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_clerk_id ON users (clerk_user_id);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_email ON users (email);
```

### 3.2 providers

```sql
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  service_categories TEXT[], -- array of category names or IDs
  service_city TEXT NOT NULL DEFAULT '',
  service_district TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  website TEXT,
  business_permit_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  status provider_status NOT NULL DEFAULT 'pending',
  plan provider_plan NOT NULL DEFAULT 'free',
  house_building_number TEXT,
  street_name TEXT,
  state_province_region TEXT,
  postal_zip_code TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_providers_user_id ON providers (user_id);
CREATE INDEX idx_providers_status ON providers (status);
CREATE INDEX idx_providers_city ON providers (service_city);
CREATE INDEX idx_providers_verified ON providers (is_verified) WHERE is_verified = true;
CREATE INDEX idx_providers_plan ON providers (plan);
CREATE INDEX idx_providers_location ON providers (latitude, longitude);
```

### 3.3 provider_settings

```sql
CREATE TABLE provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE UNIQUE,
  slot_interval_minutes INT NOT NULL DEFAULT 30,
  booking_notice_hours INT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_provider_settings_provider ON provider_settings (provider_id);
```

### 3.4 categories

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_slug ON categories (slug);
CREATE INDEX idx_categories_active ON categories (is_active) WHERE is_active = true;
```

### 3.5 services

```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL DEFAULT 60,
  images TEXT[], -- array of Supabase storage URLs
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_services_provider ON services (provider_id);
CREATE INDEX idx_services_category ON services (category_id);
CREATE INDEX idx_services_active ON services (is_active) WHERE is_active = true;
```

### 3.6 provider_availability (business hours)

```sql
CREATE TABLE provider_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 6=Sat
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT chk_time_range CHECK (start_time < end_time)
);

CREATE INDEX idx_availability_provider ON provider_availability (provider_id);
CREATE INDEX idx_availability_day ON provider_availability (day_of_week);
CREATE UNIQUE INDEX idx_availability_unique
  ON provider_availability (provider_id, day_of_week)
  WHERE is_available = true;
```

### 3.7 blocked_dates

```sql
CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_blocked_date UNIQUE (provider_id, date)
);

CREATE INDEX idx_blocked_dates_provider ON blocked_dates (provider_id);
CREATE INDEX idx_blocked_dates_date ON blocked_dates (date);
```

### 3.8 bookings

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_seeker ON bookings (seeker_id);
CREATE INDEX idx_bookings_provider ON bookings (provider_id);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_date ON bookings (booking_date);
CREATE INDEX idx_bookings_provider_date ON bookings (provider_id, booking_date);
```

### 3.9 reviews

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
  seeker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_provider ON reviews (provider_id);
CREATE INDEX idx_reviews_seeker ON reviews (seeker_id);
CREATE INDEX idx_reviews_rating ON reviews (rating);
CREATE INDEX idx_reviews_provider_rating ON reviews (provider_id, rating);
```

### 3.10 chat_messages

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_booking ON chat_messages (booking_id);
CREATE INDEX idx_chat_sender ON chat_messages (sender_id);
CREATE INDEX idx_chat_created ON chat_messages (created_at);
```

---

## 4. Auto-update `updated_at` trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_provider_settings_updated_at
  BEFORE UPDATE ON provider_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 5. Row-Level Security (RLS)

### 5.1 Enable RLS on all tables

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
```

### 5.2 Helper function

```sql
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(role, 'seeker'::user_role)
  FROM users
  WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub';
$$;

CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT id
  FROM users
  WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub';
$$;

CREATE OR REPLACE FUNCTION auth_user_clerk_id()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'sub';
$$;
```

### 5.3 RLS Policies

#### users

```sql
-- Anyone can read their own profile
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (clerk_user_id = auth_user_clerk_id());

-- Admin can read all
CREATE POLICY users_select_admin ON users
  FOR SELECT
  USING (auth_user_role() = 'admin');

-- Users can update their own profile
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (clerk_user_id = auth_user_clerk_id())
  WITH CHECK (clerk_user_id = auth_user_clerk_id());

-- Users can insert their own profile (useful for client-side sync fallback)
CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (clerk_user_id = auth_user_clerk_id());

-- Admin can update any user
CREATE POLICY users_update_admin ON users
  FOR UPDATE
  USING (auth_user_role() = 'admin');
```

#### providers

```sql
-- Public can read approved providers
CREATE POLICY providers_select_public ON providers
  FOR SELECT
  USING (status = 'approved');

-- Provider can read own record
CREATE POLICY providers_select_own ON providers
  FOR SELECT
  USING (user_id = auth_user_id());

-- Admin can read all
CREATE POLICY providers_select_admin ON providers
  FOR SELECT
  USING (auth_user_role() = 'admin');

-- Provider can insert own record
CREATE POLICY providers_insert_own ON providers
  FOR INSERT
  WITH CHECK (user_id = auth_user_id());

-- Provider can update own record (except status)
CREATE POLICY providers_update_own ON providers
  FOR UPDATE
  USING (user_id = auth_user_id())
  WITH CHECK (
    user_id = auth_user_id()
    AND status = (SELECT status FROM providers WHERE id = providers.id) -- cannot change own status
  );

-- Admin can update any provider
CREATE POLICY providers_update_admin ON providers
  FOR UPDATE
  USING (auth_user_role() = 'admin');

-- Admin can delete providers
CREATE POLICY providers_delete_admin ON providers
  FOR DELETE
  USING (auth_user_role() = 'admin');
```

#### provider_settings

```sql
-- Provider can read own settings
CREATE POLICY provider_settings_select_own ON provider_settings
  FOR SELECT
  USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id()));

-- Admin can read all
CREATE POLICY provider_settings_select_admin ON provider_settings
  FOR SELECT
  USING (auth_user_role() = 'admin');

-- Provider can upsert own settings
CREATE POLICY provider_settings_insert_own ON provider_settings
  FOR INSERT
  WITH CHECK (provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id()));

CREATE POLICY provider_settings_update_own ON provider_settings
  FOR UPDATE
  USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id()));
```

#### categories

```sql
-- Public can read active categories
CREATE POLICY categories_select_public ON categories
  FOR SELECT
  USING (is_active = true);

-- Admin can manage categories
CREATE POLICY categories_all_admin ON categories
  FOR ALL
  USING (auth_user_role() = 'admin');
```

#### services

```sql
-- Public can read active services
CREATE POLICY services_select_public ON services
  FOR SELECT
  USING (is_active = true);

-- Provider can read own services (including inactive)
CREATE POLICY services_select_own ON services
  FOR SELECT
  USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id()));

-- Provider can manage own services
CREATE POLICY services_insert_own ON services
  FOR INSERT
  WITH CHECK (provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id()));

CREATE POLICY services_update_own ON services
  FOR UPDATE
  USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id()));

CREATE POLICY services_delete_own ON services
  FOR DELETE
  USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id()));
```

#### provider_availability

```sql
-- Public can read availability of approved providers
CREATE POLICY availability_select_public ON provider_availability
  FOR SELECT
  USING (provider_id IN (SELECT id FROM providers WHERE status = 'approved'));

-- Provider can manage own availability
CREATE POLICY availability_insert_own ON provider_availability
  FOR INSERT
  WITH CHECK (provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id()));

CREATE POLICY availability_update_own ON provider_availability
  FOR UPDATE
  USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id()));

CREATE POLICY availability_delete_own ON provider_availability
  FOR DELETE
  USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id()));
```

#### blocked_dates

```sql
-- Public can read blocked dates of approved providers
CREATE POLICY blocked_dates_select_public ON blocked_dates
  FOR SELECT
  USING (provider_id IN (SELECT id FROM providers WHERE status = 'approved'));

-- Provider can manage own blocked dates
CREATE POLICY blocked_dates_insert_own ON blocked_dates
  FOR INSERT
  WITH CHECK (provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id()));

CREATE POLICY blocked_dates_update_own ON blocked_dates
  FOR UPDATE
  USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id()));

CREATE POLICY blocked_dates_delete_own ON blocked_dates
  FOR DELETE
  USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id()));
```

#### bookings

```sql
-- Seeker can read own bookings
CREATE POLICY bookings_select_seeker ON bookings
  FOR SELECT
  USING (seeker_id = auth_user_id());

-- Provider can read bookings for their services
CREATE POLICY bookings_select_provider ON bookings
  FOR SELECT
  USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id()));

-- Admin can read all bookings
CREATE POLICY bookings_select_admin ON bookings
  FOR SELECT
  USING (auth_user_role() = 'admin');

-- Seeker can create bookings
CREATE POLICY bookings_insert_seeker ON bookings
  FOR INSERT
  WITH CHECK (seeker_id = auth_user_id());

-- Provider can update bookings (confirm, complete, cancel)
CREATE POLICY bookings_update_provider ON bookings
  FOR UPDATE
  USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id()));

-- Seeker can cancel own bookings
CREATE POLICY bookings_update_seeker ON bookings
  FOR UPDATE
  USING (seeker_id = auth_user_id());
```

#### reviews

```sql
-- Public can read reviews
CREATE POLICY reviews_select_public ON reviews
  FOR SELECT
  USING (true);

-- Seeker can create review for own completed booking
CREATE POLICY reviews_insert_seeker ON reviews
  FOR INSERT
  WITH CHECK (
    seeker_id = auth_user_id()
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_id
      AND seeker_id = auth_user_id()
      AND status = 'completed'
    )
    AND NOT EXISTS (
      SELECT 1 FROM reviews WHERE booking_id = reviews.booking_id
    )
  );

-- Provider can see reviews for their services
CREATE POLICY reviews_select_provider ON reviews
  FOR SELECT
  USING (provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id()));

-- Admin can delete inappropriate reviews
CREATE POLICY reviews_delete_admin ON reviews
  FOR DELETE
  USING (auth_user_role() = 'admin');
```

#### chat_messages

```sql
-- Participants can read messages for their booking
CREATE POLICY chat_select_participants ON chat_messages
  FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings
      WHERE seeker_id = auth_user_id()
        OR provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id())
    )
  );

-- Participants can send messages to their booking
CREATE POLICY chat_insert_participants ON chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth_user_id()
    AND booking_id IN (
      SELECT id FROM bookings
      WHERE seeker_id = auth_user_id()
        OR provider_id IN (SELECT id FROM providers WHERE user_id = auth_user_id())
    )
  );
```

---

## 6. Realtime Publications

```sql
-- Enable Realtime for chat messages (used by Supabase Realtime JS)
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Enable Realtime for bookings (live slot update notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
```

---

## 7. Seed Data (Categories)

```sql
INSERT INTO categories (name, slug, icon) VALUES
  ('Home Cleaning', 'home-cleaning', 'sparkles'),
  ('Aircon Repair', 'aircon-repair', 'snowflake'),
  ('Roof Repair', 'roof-repair', 'home'),
  ('Plumbing', 'plumbing', 'wrench'),
  ('Electrical', 'electrical', 'zap'),
  ('Painting', 'painting', 'brush'),
  ('Pest Control', 'pest-control', 'bug'),
  ('Moving & Hauling', 'moving-hauling', 'truck'),
  ('Gardening & Landscaping', 'gardening-landscaping', 'flower'),
  ('Carpentry', 'carpentry', 'hammer')
ON CONFLICT (slug) DO NOTHING;
```

---

## 8. Useful Queries

### Get available providers with active services

```sql
SELECT
  p.id,
  p.business_name,
  p.service_city,
  p.service_district,
  p.latitude,
  p.longitude,
  p.is_verified,
  COALESCE(AVG(r.rating), 0) AS avg_rating,
  COUNT(DISTINCT r.id) AS review_count,
  COUNT(DISTINCT s.id) FILTER (WHERE s.is_active) AS active_services
FROM providers p
LEFT JOIN reviews r ON r.provider_id = p.id
LEFT JOIN services s ON s.provider_id = p.id
WHERE p.status = 'approved'
  AND p.service_city ILIKE '%' || $1 || '%'
GROUP BY p.id
ORDER BY p.is_verified DESC, avg_rating DESC;
```

### Get available time slots for a provider on a given date

```sql
WITH date_params AS (
  SELECT
    $1::date AS target_date,
    EXTRACT(DOW FROM $1::date)::int AS target_dow
),
working_hours AS (
  SELECT start_time, end_time
  FROM provider_availability, date_params
  WHERE provider_id = $2
    AND day_of_week = target_dow
    AND is_available = true
),
blocked AS (
  SELECT 1
  FROM blocked_dates, date_params
  WHERE provider_id = $2
    AND date = target_date
    AND is_available = false
),
existing_bookings AS (
  SELECT start_time, end_time
  FROM bookings, date_params
  WHERE provider_id = $2
    AND booking_date = target_date
    AND status IN ('pending', 'confirmed', 'completed')
),
service_duration AS (
  SELECT duration_minutes FROM services WHERE id = $3
),
slot_interval AS (
  SELECT slot_interval_minutes FROM provider_settings WHERE provider_id = $2
)
SELECT
  gs.start_time::text AS start_time,
  (gs.start_time + (SELECT duration_minutes FROM service_duration) * interval '1 minute')::text AS end_time
FROM working_hours, slot_interval,
LATERAL (
  SELECT generate_series(
    working_hours.start_time,
    working_hours.end_time - (SELECT duration_minutes FROM service_duration) * interval '1 minute',
    slot_interval.slot_interval_minutes * interval '1 minute'
  ) AS start_time
) gs
WHERE NOT EXISTS (SELECT 1 FROM blocked)
  AND NOT EXISTS (
    SELECT 1 FROM existing_bookings eb
    WHERE gs.start_time < eb.end_time
      AND gs.start_time + (SELECT duration_minutes FROM service_duration) * interval '1 minute' > eb.start_time
  )
  AND gs.start_time >= now()::time + (SELECT booking_notice_hours FROM provider_settings WHERE provider_id = $2) * interval '1 hour'
ORDER BY gs.start_time;
```

## 8.5 Storage Buckets & RLS Policies

```sql
-- 1. Create the 'permits' bucket (for business permits and service images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('permits', 'permits', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the 'logos' bucket (for provider company logos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up RLS policies to allow public reads and uploads for both buckets
CREATE POLICY "Public Read Access permits" ON storage.objects FOR SELECT USING (bucket_id = 'permits');
CREATE POLICY "Allow Uploads permits" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'permits');

CREATE POLICY "Public Read Access logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Allow Uploads logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');
```

---

## 9. Cleanup (if needed)

```sql
-- Drop all tables (reverse order to respect FKs)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS blocked_dates CASCADE;
DROP TABLE IF EXISTS provider_availability CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS provider_settings CASCADE;
DROP TABLE IF EXISTS providers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS booking_status;
DROP TYPE IF EXISTS provider_plan;
DROP TYPE IF EXISTS provider_status;
DROP TYPE IF EXISTS user_role;
```
