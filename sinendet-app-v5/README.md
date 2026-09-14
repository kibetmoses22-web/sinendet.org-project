# Sinendet Mixed Day Senior School — Project Log

A shared project-upload site for all 11 subjects. Any device (phone, laptop,
lab computer) that opens the site sees the same data, because uploads are
stored on Netlify's servers (via Netlify Blobs) instead of in a single
browser.

## Default admin login

Works immediately, no setup required:

- **Username:** `admin`
- **Password:** `Sinendet@2026`

Change this soon after deploying — see "Changing the admin password" below.
The default is written in this file, so it isn't private until you change it.

## Important: why this needs GitHub, not plain drag-and-drop

This site needs small pieces of server code ("functions") to save data so
it's shared across devices. Netlify's plain drag-and-drop deploy **does not
run functions at all** — it's built only for very simple static pages. The
reliable way to get functions working, confirmed by Netlify's own support
team, is to connect the project to a GitHub repository and let Netlify build
it from there. You still get a drag-and-drop-style upload — just into
GitHub's website instead of Netlify's.

## Deploy steps (one-time)

1. **Create a free GitHub account** at github.com if you don't have one.
2. **Create a new repository** — click the "+" in the top right → "New
   repository". Name it something like `sinendet-project-log`. Leave it
   otherwise empty (no README, no .gitignore) and click "Create repository".
3. **Upload the project** — on the new repo's page, click "uploading an
   existing file" (or "Add file" → "Upload files"). Drag the *entire*
   unzipped project folder (the one containing `netlify.toml`, `public/`,
   and `netlify/`) onto the upload area — GitHub keeps the folder structure.
   Scroll down and click "Commit changes".
4. **Create a free Netlify account** at netlify.com if you don't have one.
5. **Connect the repo** — in the Netlify dashboard, click "Add new site" →
   "Import an existing project" → choose GitHub → authorize Netlify → select
   your `sinendet-project-log` repository.
6. Netlify reads `netlify.toml` automatically (publish folder, functions
   folder are already configured) — just click **Deploy**.
7. Wait about a minute for the first build to finish. Netlify gives you a
   live link like `https://random-name-123.netlify.app` — that's what you
   open on any phone or computer.
8. From **Site configuration → Change site name**, you can rename it to
   something like `sinendet-projects.netlify.app`.

## Changing the admin password

In the Netlify dashboard for this site, go to **Site configuration →
Environment variables** and add:

- `ADMIN_USERNAME` — your new username
- `ADMIN_PASSWORD` — your new password
- `JWT_SECRET` — any long random string (keeps admin sessions secure)

These always override the built-in defaults. After adding them, go to
**Deploys → Trigger deploy → Deploy site** so the change takes effect.

## Updating the site later

Go back to the GitHub repo, open the file you want to change, click the
pencil (edit) icon, make your change, and commit — or just drag a replacement
file onto the repo the same way you did the first upload. Netlify
automatically rebuilds and redeploys within a minute or two, no extra steps.

## Things to know

- **File size**: photos, video, and audio can each be up to **100MB per
  file**. Large uploads (and the "Download report" feature for lots of
  videos) rely on Netlify's Blobs storage, which has generous but not
  unlimited space on the free tier — if the school accumulates a very large
  video library over time, keep an eye on usage in the Netlify dashboard
  under **Data & storage → Blobs**.
- **Admin login is intentionally simple**: one shared username/password for
  whoever administers the site, not individual accounts. Fine for a small
  internal school tool — don't reuse a password you care about elsewhere.
- **Everyone can upload without logging in** — only editing and deleting
  require the admin login, as requested.
