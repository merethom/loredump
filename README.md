# Loredump

Noxsyphone lore database with Firebase auth and Realtime Database.

## Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/merethom/loredump.git
   cd loredump
   ```

2. **Firebase config**
   - Copy `js/firebase-config.example.js` to `js/firebase-config.js`
   - Add your Firebase project values from [Firebase Console](https://console.firebase.google.com) → Project Settings → Your apps

3. **Run locally**
   ```bash
   npx serve
   ```
   Then open http://localhost:3000

4. **Firebase setup** (if starting fresh)
   - Create a Firebase project
   - Enable Authentication → Google sign-in
   - Enable Realtime Database
   - Add your domain to Authorized domains (Authentication → Settings)
   - Set Realtime Database rules for your allowed users
