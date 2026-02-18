// Data loading and CSV parsing


async function loadData() {
    // Try Firebase first
    if (window.firebaseDb) {
        try {
            const data = await window.firebaseDb.loadLoreData();
            if (data !== null) {
                console.log('Loaded from Firebase');
                document.getElementById('dataSource').textContent = 'loaded from Firebase';
                document.getElementById('errorState').classList.remove('show');

                // Store the remote baseline
                remoteData = JSON.parse(JSON.stringify(data.entries || []));
                remoteTags = JSON.parse(JSON.stringify(data.tags || []));

                // Check for local draft
                const draft = window.syncManager ? window.syncManager.loadDraft() : null;
                if (draft) {
                    console.log('Local draft found, using draft data');
                    allData = draft.entries || [];
                    allTags = draft.tags || [];
                    document.getElementById('dataSource').textContent += ' (using local draft)';
                } else {
                    allData = data.entries || [];
                    allTags = data.tags || [];
                }

                syncTagsFromDocument();
                initializeApp();
                return;
            }
        } catch (e) {
            console.error('Firebase load failed:', e);
        }
    }

    // Firebase is the single source of truth
    console.error('Failed to load from Firebase');
    document.getElementById('dataSource').textContent = 'Error: Firebase unavailable';
    document.getElementById('database').style.display = 'none';
    document.getElementById('errorState').classList.add('show');
}
/**
 * Handles saving lore data.
 * In the new drafting system, this primarily saves to the local draft.
 */
function saveLoreToFirebase() {
    // Always save to local draft immediately
    if (window.syncManager) {
        window.syncManager.saveDraft(allData, allTags);
    }
}

/**
 * Explicitly publishes local changes to Firebase
 * @returns {Promise}
 */
async function publishLoreToFirebase() {
    if (!window.firebaseDb) throw new Error('Firebase not initialized');

    try {
        await window.firebaseDb.saveLoreData({
            entries: allData || [],
            tags: allTags || []
        });

        // Update baseline upon success
        remoteData = JSON.parse(JSON.stringify(allData || []));
        remoteTags = JSON.parse(JSON.stringify(allTags || []));

        // Clear local draft as it's now matching remote
        if (window.syncManager) {
            window.syncManager.clearDraft();
        }

        console.log('Published to Firebase successfully');
        return true;
    } catch (err) {
        console.error('Firebase publication failed:', err);
        throw err;
    }
}