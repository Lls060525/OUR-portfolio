# GENESIS Z Portfolio

The team portfolio of GENESIS Z: Lee Long Sheng, Soo Jian Huang and Ng Hong Sang. React + Vite, no backend: every project is a JSON file, and adding one means opening a pull request.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Pages

| URL | What it shows |
| --- | --- |
| `#/` | Boot sequence, the 3D team globe with a holo name card per member, and every project with filters |
| `#/people/<id>` | One person's bio, links, résumé and only their projects, with "My role" on each card. Send this link in job applications. |
| `#/projects/<slug>` | Case study: problem, solution, outcome, demo video, and who built what |

## First things to edit

1. `content/site.json` — team name, headline (the `highlight` phrase gets the gradient) and intro.
1. `content/people.json` — names, bios, skills, GitHub/LinkedIn. The `id` becomes your URL (`#/people/<id>`); `short` is the name shown in the menu and on cards.
2. Put résumé PDFs in `public/` and set `links.resume` to the file name.
3. Replace the three sample files in `content/projects/`.

## Adding a project

1. Create a branch: `git checkout -b add-<project-name>`
2. Copy any file in `content/projects/` to `content/projects/<slug>.json` (the file name becomes the URL).
3. Fill it in:

| Field | Notes |
| --- | --- |
| `category` | `"project"` for personal / coursework builds, or `"competition"` |
| `competition` | With `"competition"`: `"hackathon"`, `"ctf"` or `"other"`. Drives the card badge and the Hackathon / CTF / Others filter chips |
| `date` | `"YYYY-MM"`, used for sorting |
| `event` | Optional event name shown instead of the date on cards, e.g. `"Sime Darby Hackathon"` |
| `status` | Optional. `"upcoming"` or `"in-progress"` shows a pulsing badge |
| `alsoProject` | Optional. `true` on a competition also lists it under the Projects filter |
| `cover` | Screenshot in `public/projects/`, e.g. `"projects/my-app.png"`. 16:9 looks best. |
| `links.repos` | List of `{ "label", "url" }` buttons, for projects with several repos (`links.repo` still works for one) |
| `links.video` | Any YouTube link; it's embedded via youtube-nocookie |
| `contributors` | One entry per person with `id` (from people.json) and `did`. A project shows up on each contributor's page. For teammates outside the site, use `name` instead of `id`. |
| `problem` / `solution` / `outcome` | 2–4 sentences each. Concrete numbers beat adjectives. |

4. Commit, push, open a pull request, and have the other person review it before merging.

## Effects

All in `src/fx/`, no extra dependencies, and all switched off (or shortened) when the visitor has *reduce motion* turned on.

| File | What it does |
| --- | --- |
| `BootScreen.jsx` | Loading sequence on first open. Click or any key skips it. |
| `CyberCursor.jsx` | Crosshair cursor with a text trail (coordinates, or the element's `data-cursor` label). Mouse/trackpad only. |
| `text.jsx` | `ProximityText` (headline letters lean toward the pointer) and `Scramble` (decode-on-hover titles). |
| `TeamGlobe.jsx` | Canvas 3D globe. Members sit on the +X, +Y, +Z axes (then -X, -Y, -Z…). Drag to rotate, Shift+drag to roll, arrow keys / Q / E / Enter on keyboard. |
| `HoloCard.jsx` | The projected name card for the selected member. |

## Deploying

**Vercel (recommended):** import the repo at vercel.com, keep the defaults (framework: Vite). Every merge to `main` redeploys. `vercel.json` adds security headers — check the result at securityheaders.com.

**GitHub Pages:** works too (asset paths are relative and routing uses `#` URLs), but Pages can't send custom headers, so you lose the CSP/HSTS setup.

If you add a third-party script, font or embed later, add its domain to the `Content-Security-Policy` in `vercel.json` or it will be blocked.

## Working together

- Protect `main` on GitHub (Settings → Branches) so changes go through pull requests.
- Use the PR checklist in `.github/pull_request_template.md`.
- Agree on "who built what" for shared projects before publishing.
