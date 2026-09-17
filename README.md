# Adnan's Portfolio — Deploy & Content Guide

## How this site works now

- `index.html`, `css/`, `js/` — the public site.
- `admin/` — your admin panel (password-protected editor).
- `content.json` — the **published** content. This is what every
  visitor's browser loads on the live GitHub Pages site.
- `images/`, `files/` — real image and resume files referenced by
  `content.json` (no more base64 blobs).

While you're editing locally, the Admin Panel still saves to your
browser's localStorage and the public page updates instantly —
nothing about that local workflow changed. `content.json` only
matters for what *other people* see on the published site, since
their browsers never have your localStorage.

## First-time GitHub Pages deployment

1. Create a GitHub repo (e.g. `adnan-portfolio`).
2. Push this entire folder's contents to it (see step-by-step in chat,
   or: `git init`, `git add .`, `git commit -m "Initial site"`,
   `git branch -M main`, `git remote add origin <your-repo-url>`,
   `git push -u origin main`).
3. In the repo on GitHub: **Settings → Pages → Source → Deploy from a
   branch → main / (root) → Save**.
4. Your site goes live at `https://<username>.github.io/<repo-name>/`
   within a minute or two.

## Making future changes (add / edit / delete content)

1. Run a local server in this folder (required for the admin panel
   and for `content.json` to load correctly):
   ```
   python -m http.server 8000
   ```
2. Open `http://localhost:8000/admin/`, log in, and make your edits
   (text, images, projects, theme, resume, etc.) — you'll see them
   reflected instantly at `http://localhost:8000/`.
3. When you're happy with the changes, go to **Account & Security →
   Deploy to GitHub Pages → Export site files (.zip)**.
4. Unzip the download. Copy `content.json` into this folder's root
   (overwrite), and merge the `images/`/`files/` folders in (keep
   both old and new files).
5. Push the update:
   ```
   git add content.json images files
   git commit -m "Update portfolio content"
   git push
   ```
6. GitHub Pages rebuilds automatically — refresh your live site in a
   minute or two.

That's it — repeat steps 1–6 any time you want to add, edit, or
delete something (a project, a certification, your photo, resume,
theme, contact info, etc.).
