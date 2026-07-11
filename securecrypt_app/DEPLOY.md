# Deploying SecureCrypt — GitHub + Supabase + Render

This app is already wired up for this exact stack:
- **GitHub** — hosts your code, Render deploys from it
- **Supabase** — hosts the PostgreSQL database (users, activity_log, auth_log)
- **Render** — runs the Flask app (`gunicorn app:app`)

Nothing else to install locally to deploy — just push code and click through
two dashboards. Total time: ~10 minutes.

---

## 1. Push the code to GitHub

```bash
cd securecrypt_app
git init
git add .
git commit -m "Initial commit"
```

Create a new empty repo on GitHub (no README/gitignore — you already have
both), then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/securecrypt.git
git branch -M main
git push -u origin main
```

The included `.gitignore` already excludes `__pycache__/`, `.env`, and any
stray `.db` files, so you won't accidentally commit secrets or local
databases.

---

## 2. Create the database on Supabase

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick a name, a strong database password (save it somewhere — you'll need
   it in the connection string), and a region close to where Render will
   run (Render's free tier defaults to Oregon, US — pick the closest
   Supabase region to that, or just go with the default).
3. Once the project finishes provisioning, go to
   **Project Settings → Database → Connection string**.
4. Use the **"Connection pooling"** URI (not the direct connection), on
   port `6543`, in **Transaction** mode. It looks like:
   ```
   postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-xx-xxxx-1.pooler.supabase.com:6543/postgres
   ```
   **Why the pooler and not the direct URI:** this app opens a fresh
   database connection per request (simple, no extra pooling library).
   Supabase's free tier caps direct connections fairly low, and the
   pooler is built exactly for this pattern — use it, not the direct
   `db.xxxx.supabase.co:5432` URL.
5. Replace `[YOUR-PASSWORD]` in that string with the real password from
   step 2. This full string is your `DATABASE_URL`.

You don't need to manually create any tables — `app.py` creates
`users`, `activity_log`, and `auth_log` automatically (via
`CREATE TABLE IF NOT EXISTS`) the moment the app starts up.

---

## 3. Deploy the web service on Render

**Option A — Blueprint (uses the included `render.yaml`):**
1. Go to [render.com](https://render.com) → **New +** → **Blueprint**.
2. Connect your GitHub account and pick the `securecrypt` repo.
3. Render reads `render.yaml` and proposes a web service named
   `securecrypt`. Click **Apply**.
4. It will pause and ask you to fill in `DATABASE_URL` (paste the Supabase
   pooler string from step 2). `SECRET_KEY` is auto-generated for you.

**Option B — Manual setup:**
1. Go to [render.com](https://render.com) → **New +** → **Web Service**.
2. Connect the `securecrypt` GitHub repo.
3. Settings:
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
   - **Plan:** Free
4. Under **Environment**, add:
   - `DATABASE_URL` → the Supabase pooler connection string
   - `SECRET_KEY` → any long random string (e.g. generate one locally with
     `python -c "import secrets; print(secrets.token_hex(32))"`)
5. Click **Create Web Service**.

Either way, Render will install dependencies, run
`gunicorn app:app`, and give you a live URL like
`https://securecrypt.onrender.com`.

---

## 4. Verify it worked

Visit `https://your-app.onrender.com/healthz` — you should see:
```json
{"status": "ok"}
```
That endpoint actually queries the database, so this confirms Render can
reach Supabase.

Then just use the site normally: sign up, log in, encrypt a file, check the
dashboard.

---

## 5. Viewing the stored data after deployment

This is the part that didn't work with SQLite — now it does, from
anywhere, without needing shell access to Render at all:

**Easiest — Supabase Table Editor (GUI, no setup):**
Supabase dashboard → **Table Editor** → pick `users`, `activity_log`, or
`auth_log` from the sidebar. You'll see every signup, login, logout, failed
login attempt, and encrypt/decrypt action across **all** users, live,
updating as people use the deployed site.

**SQL, if you prefer queries:**
Supabase dashboard → **SQL Editor** → run e.g.:
```sql
select username, event, ip_address, created_at
from auth_log
order by id desc
limit 50;
```

**From your own machine with `psql` or a GUI client (DBeaver, TablePlus,
pgAdmin):** connect using the same `DATABASE_URL` you put in Render's
environment variables. Since it's a normal hosted Postgres connection
string, any Postgres client works.

---

## Notes on the free tiers

- **Render free web services spin down after ~15 minutes of inactivity**
  and take a few seconds to wake back up on the next request. This doesn't
  affect your data (it's not on Render's disk anymore, it's on Supabase),
  only the first request after idle time feels slow.
- **Supabase free projects pause after 1 week with no activity** (they wake
  up automatically on the next connection, but the first request after a
  pause can be slow too). This is a Supabase limitation, not something in
  this app.
- If you outgrow the free tiers, both offer paid plans that remove these
  limits — no code changes required, since everything's already using
  standard environment-variable configuration.
