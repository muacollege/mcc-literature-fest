# MCC Literature Fest — Frontend Demo

Premium Emerald Green + Ivory React frontend with English/Arabic switching and responsive layout.

## Requirements
- Node.js 20.19+ or 22.12+
- npm

## Run locally
1. Extract the ZIP and open this folder in VS Code.
2. Open Terminal → New Terminal.
3. Run `npm install`
4. Run `npm run dev`
5. Open the local URL shown by Vite (normally http://localhost:5173).

## Build check
Run `npm run build`.

## Included
- Responsive landing page
- English / Arabic toggle and RTL layout
- Event cards, search and category filter
- Demo registration form (stores submissions in this browser's localStorage)
- Coordinator login screen (visual demo only)
- Festival schedule and results placeholder

## Important limitations
This is a frontend demo. Firebase is NOT connected yet. There is no real authentication, cloud database, admin permission system, or live results. Do not enter real student personal data.

## Next phase
Create a Firebase project on the Spark plan, connect Authentication and Firestore, implement secure role-based rules, then deploy to Firebase Hosting. Check current Firebase no-cost quotas before launch.
