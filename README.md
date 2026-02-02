# ux-planner

A **frontend-only UX planning tool** that combines:
- a **nested left-to-right spreadsheet** for decomposition (Problem → Requirement → Feature → Execution Level → …)
- a **tradeoff grid** to review leaf “execution levels” ranked by **importance** and **ease**

It’s designed to be a living planning document: fast to edit, easy to share, and resilient to change.

## What it does

- **Infinite nesting via columns**
  - Add as many columns (levels) as you want and rename them.
  - Add cells and sub-cells (children) in the next column.
- **Tree rendered as a spreadsheet**
  - Parents **span** the vertical height of their descendants (true “header cell” behavior).
  - Collapse/expand (currently on Column 1) to hide whole branches.
- **Metrics with rollups**
  - Leaf nodes are the only place you can edit:
    - Importance (0–5)
    - Ease (0–5)
    - Time (hours)
  - Parent nodes show **SUM** rollups of all descendant leaves.
- **Execution Grid**
  - Leaf nodes (execution levels) are shown in a 5-column grid:
    - left → right: importance 5 → 1
    - top → bottom (within a column): ease 5 → 1
- **Persistence + portability**
  - Auto-saves to localStorage.
  - Import/export JSON (export is copyable text; import supports paste or file upload).

## Tech

- Next.js (App Router) + React + TypeScript
- TailwindCSS
- `tailwind-merge` for predictable class overrides
- Static export compatible (GitHub Pages)

## Quick start

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Then open `http://localhost:3000`.

## How to use

1. **Create columns** (top-right `...` → Add column) and rename them.
2. In Column 1, open the cell menu (`...`) and **Add item**.
3. Add deeper levels by selecting a cell and choosing **Add sub-item**.
4. Only leaf nodes (right-most cells) accept metrics; parents show rollups automatically.
5. Switch to **Execution Grid** to review leaf execution levels by importance/ease.

## Import / Export

- **Export JSON**: top-right `...` → Export JSON → copy the text
- **Import JSON**: top-right `...` → Import JSON → paste or upload a `.json` file

Import replaces the current document.

## Deploy to GitHub Pages

This repo is configured for static export via `next.config.ts` (`output: "export"`).

If you use GitHub Actions to deploy:
- Set `NEXT_PUBLIC_BASE_PATH` to `/<repo>` during build (for `username.github.io/<repo>/`).
- The build output directory is `out/`.

## Notes / constraints

- This is intentionally **frontend-only** (no backend).
- Data lives in your browser (localStorage) unless you export/import JSON.

## License

Pick a license (MIT/Apache-2.0/etc) and add it as `LICENSE` when you’re ready to open-source.
