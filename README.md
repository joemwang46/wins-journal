# Wins

A private daily journal for two. Each day, you and your partner each write your win — big or small. Wins keeps both entries sealed until you've both submitted, then reveals them side by side in real time.

![Wins app — cream and blush aesthetic, mobile-first](public/icons/icon.svg)

---

## How it works

1. **Write** — Each day, open the app and share something good that happened.
2. **Lock it in** — Your entry is sealed the moment you submit. Your partner can't see it, and you can't see theirs — yet.
3. **Reveal** — The instant both entries are submitted, they appear side by side automatically (no refresh needed — real-time via Supabase).

---

## Features

- **Mutual-reveal RLS** — Partner entries are inaccessible at the database level until both users have submitted for the day, not just hidden in the UI
- **Real-time sync** — Supabase `postgres_changes` subscription reveals the partner's entry the moment it lands
- **Comments** — Leave a short note under your partner's win once the day is revealed; RLS blocks commenting before both entries exist, and new comments appear in real time
- **Invite code pairing** — Generate a one-time code to link two accounts into a couple
- **History timeline** — Paginated feed of every shared day, newest first
- **Calendar view** — Month grid on the History screen with shared days highlighted; tap one to revisit both wins and their comments in a slide-up sheet. Only the visible month's dates are queried
- **Memories** — A dedicated tab that resurfaces a random past day's wins (and their comments), with an "Another memory" button to shuffle
- **Streak counter** — Consecutive days both partners submitted, calculated server-side
- **Display names** — Set a name that appears on your partner's cards
- **Offline support** — History is cached for 6 hours via Workbox NetworkFirst; writes show a friendly error when disconnected
- **PWA** — Installable on iOS and Android from the browser; no app store required
- **iOS-native feel** — Safe area insets, 16 px inputs (no auto-zoom), 48 px touch targets, momentum scrolling, overscroll disabled

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite 5 |
| Routing | React Router v6 |
| Styling | Tailwind CSS v3 (custom cream/blush palette) |
| Backend & Auth | Supabase (Postgres + RLS + Realtime + Auth) |
| PWA / Service Worker | vite-plugin-pwa (Workbox) |

---

## Project structure

```
src/
├── lib/
│   ├── supabase.js          # Supabase client
│   ├── AuthContext.jsx      # Session + coupleId state, loading flag
│   └── useOnlineStatus.js   # navigator.onLine hook
├── components/
│   ├── BottomNav.jsx        # Four-tab nav (Today / History / Memories / Profile)
│   ├── CommentSection.jsx   # Comment list + input under revealed entry cards
│   ├── HistoryCalendar.jsx  # Month-grid calendar + day-detail slide-up sheet
│   ├── ProtectedRoute.jsx   # Requires session + coupleId
│   ├── AuthRoute.jsx        # Requires session, redirects away if already paired
│   └── LoadingScreen.jsx
├── pages/
│   ├── Login.jsx
│   ├── Signup.jsx
│   ├── Pair.jsx             # Generate or enter an invite code
│   ├── Home.jsx             # Today's entry — three states: write / waiting / reveal
│   ├── History.jsx          # Paginated timeline with skeleton loading
│   ├── Memories.jsx         # Random past day's wins, "Another memory" shuffle
│   └── Profile.jsx          # Display name, streak, couple code, sign out
scripts/
└── generate-icons.js        # Generates PWA PNG icons (pure Node, no deps)
public/
├── icons/icon-192.png
├── icons/icon-512.png
└── apple-touch-icon.png
```

---

## Local setup

### 1. Clone and install

```bash
git clone https://github.com/joemwang46/wins-journal.git
cd wins-journal
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a new project, then copy your **Project URL** and **anon public key** from **Settings → API**.

### 3. Set environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 4. Run the database migrations

Open the **SQL Editor** in your Supabase dashboard and run these blocks in order.

#### Block 1 — Core schema

```sql
-- Couples
CREATE TABLE couples (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Couple members (max 2 per couple)
CREATE TABLE couple_members (
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (couple_id, user_id)
);

-- Daily entries
CREATE TABLE entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id    uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  entry_date   date NOT NULL,
  content      text NOT NULL CHECK (char_length(content) <= 500),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

-- Invite codes
CREATE TABLE codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,
  creator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used            boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE couples        ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE codes          ENABLE ROW LEVEL SECURITY;

-- Helper: returns the current user's couple_id without triggering RLS recursion
CREATE OR REPLACE FUNCTION get_my_couple_id()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE v_couple_id uuid;
BEGIN
  SELECT couple_id INTO v_couple_id
  FROM couple_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN v_couple_id;
END;
$$;

-- Helper: true if the current user has submitted for a given date/couple
CREATE OR REPLACE FUNCTION i_have_entry_for_date(p_couple_id uuid, p_date date)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM entries
    WHERE user_id    = auth.uid()
      AND couple_id  = p_couple_id
      AND entry_date = p_date
  );
END;
$$;

-- couple_members policies
CREATE POLICY "couple_members: read own"
ON couple_members FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "couple_members: read partner"
ON couple_members FOR SELECT
USING (couple_id = get_my_couple_id());

CREATE POLICY "couple_members: insert own"
ON couple_members FOR INSERT WITH CHECK (user_id = auth.uid());

-- entries policies
CREATE POLICY "entries: insert own"
ON entries FOR INSERT WITH CHECK (
  user_id = auth.uid() AND couple_id = get_my_couple_id()
);

-- Mutual-reveal: you can only read a partner's entry once you've also submitted that day
CREATE POLICY "entries: read"
ON entries FOR SELECT
USING (
  couple_id = get_my_couple_id()
  AND (
    user_id = auth.uid()
    OR i_have_entry_for_date(couple_id, entry_date)
  )
);

-- codes policies
CREATE POLICY "codes: insert own"
ON codes FOR INSERT WITH CHECK (creator_user_id = auth.uid());

CREATE POLICY "codes: read own"
ON codes FOR SELECT USING (creator_user_id = auth.uid());

CREATE POLICY "codes: read couple's used code"
ON codes FOR SELECT
USING (
  used = true
  AND creator_user_id IN (
    SELECT user_id FROM couple_members WHERE couple_id = get_my_couple_id()
  )
);
```

#### Block 2 — Invite code functions

```sql
-- Generate a unique 6-character invite code for the current user
CREATE OR REPLACE FUNCTION create_invite_code()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    v_code := upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  INSERT INTO codes (code, creator_user_id)
  VALUES (v_code, auth.uid());

  RETURN v_code;
END;
$$;

-- Join a couple using a partner's invite code (atomic)
CREATE OR REPLACE FUNCTION join_couple_with_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_row  codes%ROWTYPE;
  v_couple_id uuid;
BEGIN
  SELECT * INTO v_code_row
  FROM codes
  WHERE code = p_code AND used = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or already used code');
  END IF;

  IF v_code_row.creator_user_id = auth.uid() THEN
    RETURN jsonb_build_object('error', 'You cannot use your own code');
  END IF;

  INSERT INTO couples DEFAULT VALUES RETURNING id INTO v_couple_id;

  INSERT INTO couple_members (couple_id, user_id) VALUES
    (v_couple_id, v_code_row.creator_user_id),
    (v_couple_id, auth.uid());

  UPDATE codes SET used = true WHERE id = v_code_row.id;

  RETURN jsonb_build_object('couple_id', v_couple_id);
END;
$$;
```

#### Block 3 — Profiles, streak, and Realtime

```sql
-- User profiles (display name)
CREATE TABLE profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: read couple"
ON profiles FOR SELECT
USING (
  user_id IN (
    SELECT user_id FROM couple_members WHERE couple_id = get_my_couple_id()
  )
);

CREATE POLICY "profiles: insert own"
ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles: update own"
ON profiles FOR UPDATE
USING     (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Auto-create profile row on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (user_id, display_name)
  VALUES (NEW.id, '')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Backfill for any users already signed up
INSERT INTO profiles (user_id, display_name)
SELECT id, '' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Streak: consecutive days both partners submitted
CREATE OR REPLACE FUNCTION get_streak(p_couple_id uuid)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  v_streak     int  := 0;
  v_check_date date;
  v_count      int;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO v_count
  FROM entries
  WHERE couple_id = p_couple_id AND entry_date = CURRENT_DATE;

  v_check_date := CASE WHEN v_count >= 2 THEN CURRENT_DATE ELSE CURRENT_DATE - 1 END;

  LOOP
    SELECT COUNT(DISTINCT user_id) INTO v_count
    FROM entries
    WHERE couple_id = p_couple_id AND entry_date = v_check_date;

    EXIT WHEN v_count < 2;
    v_streak     := v_streak + 1;
    v_check_date := v_check_date - 1;
  END LOOP;

  RETURN v_streak;
END;
$$;

-- Enable Realtime on the entries table
ALTER PUBLICATION supabase_realtime ADD TABLE entries;
```

#### Block 4 — Comments

```sql
-- Comments on revealed entries
CREATE TABLE comments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id       uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id      uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  content        text NOT NULL CHECK (char_length(content) <= 500),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX comments_entry_id_idx ON comments (entry_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Helper: true if the entry belongs to the current user's couple AND both
-- partners have submitted for that entry's date (i.e. the entry is revealed)
CREATE OR REPLACE FUNCTION can_comment_on_entry(p_entry_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  v_couple_id uuid;
  v_date      date;
  v_count     int;
BEGIN
  SELECT couple_id, entry_date INTO v_couple_id, v_date
  FROM entries WHERE id = p_entry_id;

  IF NOT FOUND OR v_couple_id IS DISTINCT FROM get_my_couple_id() THEN
    RETURN false;
  END IF;

  SELECT COUNT(DISTINCT user_id) INTO v_count
  FROM entries
  WHERE couple_id = v_couple_id AND entry_date = v_date;

  RETURN v_count >= 2;
END;
$$;

-- Comments are only allowed post-reveal, on entries within your own couple
CREATE POLICY "comments: insert own post-reveal"
ON comments FOR INSERT WITH CHECK (
  author_user_id = auth.uid()
  AND couple_id = get_my_couple_id()
  AND can_comment_on_entry(entry_id)
);

CREATE POLICY "comments: read couple"
ON comments FOR SELECT
USING (couple_id = get_my_couple_id());

CREATE POLICY "comments: delete own"
ON comments FOR DELETE
USING (author_user_id = auth.uid());

-- Enable Realtime on the comments table
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
```

### 5. Start the dev server

```bash
npm run dev
```

---

## Regenerating PWA icons

The PNG icons in `public/icons/` were generated by `scripts/generate-icons.js` using only Node.js built-ins. To regenerate (e.g. after a design change):

```bash
node scripts/generate-icons.js
```

---

## Deployment

The app is a standard Vite SPA — deploy anywhere that serves static files and supports SPA fallback routing.

**Vercel (recommended)**

```bash
npm i -g vercel
vercel
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project's environment variables.

**Netlify**

Add a `_redirects` file to `public/`:
```
/* /index.html 200
```

Then drag the `dist/` folder into the Netlify dashboard, or connect the repo.

---

## Security notes

- The anon key is safe to expose in the client — all data access is governed by RLS policies on the Postgres side.
- Partner entries are blocked at the **database level** via the `i_have_entry_for_date` policy, not just hidden in the UI. A raw API call with the anon key returns an empty result until both entries exist.
- `.env` is in `.gitignore`. Never commit it.
