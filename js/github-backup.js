/**
 * GitHub backup - versioned snapshots via git commits
 * Every Firebase save creates a commit with timestamp
 * Free, unlimited storage, built-in versioning
 * 
 * Requires: github-config.js with GitHub Personal Access Token
 */
(function() {
    function getConfig() {
        return window.githubConfig || {};
    }

    function isConfigured() {
        const config = getConfig();
        return config.token &&
            config.repo &&
            config.token !== 'YOUR_GITHUB_TOKEN' &&
            config.repo !== 'username/repo-name';
    }

    /**
     * Get current file SHA (needed for updates)
     */
    async function getFileSha(token, repo) {
        try {
            const res = await fetch(`https://api.github.com/repos/${repo}/contents/backup.json`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (res.status === 404) return null; // File doesn't exist yet
            if (!res.ok) return null;

            const data = await res.json();
            return data.sha;
        } catch (e) {
            return null;
        }
    }

    /**
     * Create or update backup.json in GitHub repo
     */
    async function commitBackup(token, repo, snapshot, sha) {
        const timestamp = new Date().toISOString();
        const entryCount = snapshot.entries?.length || 0;
        const tagCount = snapshot.tags?.length || 0;

        const message = `📦 Backup: ${timestamp} | ${entryCount} entries, ${tagCount} tags`;

        // Convert to base64
        const jsonString = JSON.stringify(snapshot, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

        const body = {
            message: message,
            content: base64Content,
            branch: 'main'
        };

        // Include SHA if updating existing file
        if (sha) {
            body.sha = sha;
        }

        const res = await fetch(`https://api.github.com/repos/${repo}/contents/backup.json`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `GitHub commit failed: ${res.status}`);
        }

        return await res.json();
    }

    /**
     * Save a backup snapshot to GitHub
     * Called automatically after successful Firebase saves
     * @param {Array} entries
     * @param {Array} tags
     */
    async function saveBackup(entries, tags) {
        if (!isConfigured()) {
            // Silently skip if not configured
            return;
        }

        const config = getConfig();
        const snapshot = {
            tags: [...(tags || [])],
            entries: [...(entries || [])],
            timestamp: new Date().toISOString()
        };

        try {
            // Get current file SHA (needed for updates)
            const sha = await getFileSha(config.token, config.repo);

            // Commit to GitHub
            await commitBackup(config.token, config.repo, snapshot, sha);

            console.log('✅ GitHub backup saved');
        } catch (err) {
            console.warn('GitHub backup failed:', err.message);
            // Don't throw - backup failures shouldn't break the app
        }
    }

    /**
     * Fetch a specific commit's backup data
     * @param {string} sha - Commit SHA
     * @returns {Promise<{tags, entries, timestamp}>|null}
     */
    async function fetchBackupVersion(sha) {
        if (!isConfigured()) return null;

        const config = getConfig();

        try {
            // If sha is 'latest' or empty, get the current file
            const url = sha && sha !== 'latest' ?
                `https://api.github.com/repos/${config.repo}/contents/backup.json?ref=${sha}` :
                `https://api.github.com/repos/${config.repo}/contents/backup.json`;

            const res = await fetch(url, {
                headers: {
                    'Authorization': `token ${config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!res.ok) return null;

            const data = await res.json();

            // Decode base64 content
            const jsonString = decodeURIComponent(escape(atob(data.content)));
            const backup = JSON.parse(jsonString);

            return {
                tags: backup.tags || [],
                entries: backup.entries || [],
                timestamp: backup.timestamp
            };
        } catch (e) {
            console.warn('GitHub fetch failed:', e);
            return null;
        }
    }

    /**
     * List all backup commits
     * @returns {Promise<Array>} Array of commit objects
     */
    async function listBackups() {
        if (!isConfigured()) return [];

        const config = getConfig();

        try {
            const res = await fetch(
                `https://api.github.com/repos/${config.repo}/commits?path=backup.json&per_page=100`, {
                    headers: {
                        'Authorization': `token ${config.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!res.ok) return [];

            const commits = await res.json();

            return commits.map(commit => ({
                sha: commit.sha,
                message: commit.commit.message,
                date: commit.commit.author.date,
                url: commit.html_url
            }));
        } catch (e) {
            console.warn('GitHub list failed:', e);
            return [];
        }
    }

    window.githubBackup = {
        saveBackup,
        fetchBackupVersion,
        listBackups,
        isConfigured
    };
})();