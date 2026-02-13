/**
 * JSONBin backup config - copy to jsonbin-config.js and add your values.
 * Get your API key from https://jsonbin.io/app/api-keys
 * 
 * Setup:
 * 1. Sign up at https://jsonbin.io
 * 2. Create an API key (or use Master Key from API Keys page)
 * 3. Copy this file to jsonbin-config.js
 * 4. Add your API key below
 * 5. Leave binId empty - the app will create a bin on first backup and store the ID in localStorage
 *    OR create a bin manually at jsonbin.io and paste its ID here
 * 
 * Note: The API key will be in your client-side code. For a personal app this is usually fine.
 * Use a private repo, or create an Access Key with limited permissions (Bins Create/Read/Update only).
 */
window.jsonbinConfig = {
    apiKey: 'YOUR_JSONBIN_API_KEY',
    binId: ''  // Optional: set if you created a bin manually. Otherwise auto-created on first backup.
};
