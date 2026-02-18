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
 * @param {Object} [dataToPublish] - Optional partial data to publish. If omitted, publishes all local data.
 * @returns {Promise}
 */
async function publishLoreToFirebase(dataToPublish) {
    if (!window.firebaseDb) throw new Error('Firebase not initialized');

    const entries = dataToPublish ? dataToPublish.entries : (allData || []);
    const tags = dataToPublish ? dataToPublish.tags : (allTags || []);

    try {
        await window.firebaseDb.saveLoreData({
            entries: entries,
            tags: tags
        });

        // Update baseline upon success
        remoteData = JSON.parse(JSON.stringify(entries));
        remoteTags = JSON.parse(JSON.stringify(tags));

        // Only clear local draft if we published EVERYTHING
        // Otherwise, keep the draft so unpublished changes persist for next sync
        if (window.syncManager) {
            const isFullPublish = !dataToPublish ||
                (entries.length === allData.length &&
                    tags.length === allTags.length &&
                    JSON.stringify(entries) === JSON.stringify(allData) &&
                    JSON.stringify(tags) === JSON.stringify(allTags));

            if (isFullPublish) {
                window.syncManager.clearDraft();
                console.log('Full publish complete: local draft cleared');
            } else {
                // We keep the draft, but we should make sure the next diff 
                // only shows the remaining items. Since we updated remoteData (the baseline),
                // the next time getDiff runs it will naturally subtract these items.
                console.log('Partial publish complete: local draft retained for remaining changes');
            }
        }

        console.log('Published to Firebase successfully');
        return true;
    } catch (err) {
        console.error('Firebase publication failed:', err);
        throw err;
    }
}