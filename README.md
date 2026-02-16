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

5. **GitHub backup** (optional – versioned backup of tags and entries)
   - Create a private GitHub repository for backups (e.g., `loredump-backups`)
   - Generate a Personal Access Token at [github.com/settings/tokens](https://github.com/settings/tokens)
     - Click "Generate new token (classic)"
     - Name it "Loredump Backup"
     - Check the **repo** scope (full control of private repositories)
     - Copy the token (you won't see it again!)
   - Copy `js/github-config.example.js` to `js/github-config.js`
   - Set `token` to your Personal Access Token
   - Set `repo` to your repository (format: `username/repo-name`)
   - After each successful Firebase save, a commit is automatically created in your backup repo
   - Browse and restore backups using `github-recovery.html`
