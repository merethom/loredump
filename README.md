# Loredump

Noxsyphone lore database with Firebase auth and Realtime Database.

## Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/merethom/loredump.git
   cd loredump
   ```

2. **Firebase config** (for local dev or your own deploy)
   - The repo includes config for the main loredump deployment
   - For your own Firebase project: copy `js/firebase-config.example.js` to `js/firebase-config.js` and add your values

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

5. **JSONBin backup** (optional – versioned backup of tags and entries)
   - Sign up at [jsonbin.io](https://jsonbin.io)
   - Go to [API Keys](https://jsonbin.io/app/api-keys) and copy your Master Key (or create an Access Key)
   - Copy `js/jsonbin-config.example.js` to `js/jsonbin-config.js`
   - Set `apiKey` to your key; leave `binId` empty (a bin is created on first save)
   - After each successful Firebase save, a snapshot is stored to JSONBin with versioning (up to 1000 versions)
   - No UI – for recovery only. Use the JSONBin dashboard or `fetchBackupVersion('latest')` in the console to inspect data
