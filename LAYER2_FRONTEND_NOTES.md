# GenuineNG Layer 2 — Manufacturer Frontend

This patch adds the first Layer 2 frontend surface without changing the Layer 1 check logic.

## Routes
- `/manufacturer` — overview dashboard
- `/manufacturer/products` — registered products
- `/manufacturer/batches` — production batches
- `/manufacturer/generate-codes` — code-generation UI
- `/manufacturer/scan-activity` — aggregate scan/reuse-signal UI
- `/manufacturer/team` — frontend placeholder for team permissions
- `/manufacturer/settings` — frontend placeholder for manufacturer settings

## Current data state
The portal currently uses `frontend/src/data/manufacturerDemo.js` for UI/demo data. The forms and generation/export actions are frontend-only until the Layer 2 manufacturer APIs are connected.

## Access
Manufacturer routes reuse the existing signed-in Supabase session gate. Final approved-manufacturer authorization should be enforced by the Layer 2 backend/middleware when it is implemented.

## Visual direction
The portal deliberately mirrors the consumer workspace structure while using a deep-green dark theme, GenuineNG lime actions, dark emerald cards, and the same typography/rounded visual language.
