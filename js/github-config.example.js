/**
 * GitHub backup configuration
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Create a private GitHub repository for backups (e.g., 'loredump-backups')
 * 
 * 2. Generate a Personal Access Token:
 *    - Go to: https://github.com/settings/tokens
 *    - Click "Generate new token (classic)"
 *    - Name it "Loredump Backup"
 *    - Check the "repo" scope (full control of private repositories)
 *    - Click "Generate token"
 *    - Copy the token (you won't see it again!)
 * 
 * 3. Copy THIS file to: github-config.js
 * 
 * 4. Replace YOUR_GITHUB_TOKEN with your actual token
 * 
 * 5. Replace username/repo-name with your repo (e.g., 'merethom/loredump-backups')
 * 
 * 6. NEVER commit github-config.js to version control (it's in .gitignore)
 */

window.githubConfig = {
    // Your GitHub Personal Access Token (keep this secret!)
    token: 'YOUR_GITHUB_TOKEN',

    // Your backup repository in format: 'username/repo-name'
    repo: 'username/repo-name'
};