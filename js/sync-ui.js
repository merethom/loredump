/**
 * Sync UI - handles updating the sync status badge and dashboard
 */
(function () {
    // Track which changes are selected for publishing.
    // keys are "entry:{number}" or "tag:{id}"
    let selectedChanges = new Set();
    let currentDiff = null;

    /**
     * Updates the sync status badge in the header
     */
    function updateSyncStatus() {
        const syncStatusEl = document.getElementById('syncStatus');
        if (!syncStatusEl) return;

        if (window.syncManager && typeof window.syncManager.hasChanges === 'function') {
            const hasChanges = window.syncManager.hasChanges(
                remoteData,
                remoteTags,
                allData,
                allTags
            );

            syncStatusEl.style.display = hasChanges ? 'flex' : 'none';
        }
    }

    /**
     * Opens the sync review sidesheet
     */
    function openSyncSidesheet() {
        const sidesheet = document.getElementById('syncSidesheet');
        if (!sidesheet) return;

        // Close other sidesheets
        if (typeof closeFilterSidesheet === 'function') closeFilterSidesheet();
        if (typeof closeTagEditor === 'function') closeTagEditor();
        if (typeof closeAddEntryModal === 'function') closeAddEntryModal();
        if (typeof closeEditEntryModal === 'function') closeEditEntryModal();

        renderDiff();
        sidesheet.classList.add('open');
        sidesheet.setAttribute('aria-hidden', 'false');
    }

    /**
     * Closes the sync review sidesheet
     */
    function closeSyncSidesheet() {
        const sidesheet = document.getElementById('syncSidesheet');
        if (sidesheet) {
            sidesheet.classList.remove('open');
            sidesheet.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Renders the diff between local and remote states
     */
    function renderDiff() {
        const container = document.getElementById('syncDiffContainer');
        if (!container) return;

        if (!window.syncManager || typeof window.syncManager.getDiff !== 'function') {
            container.innerHTML = '<p>Error: Sync manager tool missing.</p>';
            return;
        }

        currentDiff = window.syncManager.getDiff(remoteData, remoteTags, allData, allTags);

        // Populate selectedChanges with all new changes if it's empty or first load of this diff
        // For simplicity, we'll reset selection to "all" whenever the diff is re-rendered from scratch
        selectedChanges.clear();

        let html = '';

        // Render Entries Diff
        if (currentDiff.entries.added.length > 0 || currentDiff.entries.modified.length > 0 || currentDiff.entries.deleted.length > 0) {
            html += '<h3 class="diff-section-title">Lore Entries</h3>';

            currentDiff.entries.added.forEach(e => {
                const id = `entry:${e.Number}`;
                selectedChanges.add(id);
                html += `
                <div class="diff-item" data-change-id="${id}">
                    <div class="diff-item-header">
                        <div class="diff-item-identity">
                            <div class="diff-select-circle selected" onclick="toggleChangeSelection('${id}')"></div>
                            <span>${e.Number}</span>
                        </div>
                        <span class="diff-type-badge diff-type-added">added</span>
                    </div>
                    <div class="diff-content">${escapeHtml(e.Description)}</div>
                </div>`;
            });

            currentDiff.entries.modified.forEach(m => {
                const id = `entry:${m.new.Number}`;
                selectedChanges.add(id);
                html += `
                <div class="diff-item" data-change-id="${id}">
                    <div class="diff-item-header">
                        <div class="diff-item-identity">
                            <div class="diff-select-circle selected" onclick="toggleChangeSelection('${id}')"></div>
                            <span>${m.new.Number}</span>
                        </div>
                        <span class="diff-type-badge diff-type-modified">modified</span>
                    </div>
                    <div class="diff-content">
                        ${m.old.Description !== m.new.Description ? `
                            <div class="diff-change-line"><span class="diff-old">${escapeHtml(m.old.Description)}</span></div>
                            <div class="diff-change-line"><span class="diff-new">${escapeHtml(m.new.Description)}</span></div>
                        ` : '<div class="diff-change-line"><em>Tags updated</em></div>'}
                    </div>
                </div>`;
            });

            currentDiff.entries.deleted.forEach(e => {
                const id = `entry:${e.Number}`;
                selectedChanges.add(id);
                html += `
                <div class="diff-item" data-change-id="${id}">
                    <div class="diff-item-header">
                        <div class="diff-item-identity">
                            <div class="diff-select-circle selected" onclick="toggleChangeSelection('${id}')"></div>
                            <span>${e.Number}</span>
                        </div>
                        <span class="diff-type-badge diff-type-deleted">deleted</span>
                    </div>
                    <div class="diff-content diff-old">${escapeHtml(e.Description)}</div>
                </div>`;
            });
        }

        // Render Tags Diff
        if (currentDiff.tags.added.length > 0 || currentDiff.tags.modified.length > 0 || currentDiff.tags.deleted.length > 0) {
            html += '<h3 class="diff-section-title">Tags</h3>';

            currentDiff.tags.added.forEach(t => {
                const id = `tag:${t.id}`;
                selectedChanges.add(id);
                html += `
                <div class="diff-item" data-change-id="${id}">
                    <div class="diff-item-header" style="align-items: center;">
                        <div class="diff-item-identity">
                            <div class="diff-select-circle selected" onclick="toggleChangeSelection('${id}')"></div>
                            <span class="${getTagClass(t.color)}">${escapeHtml(t.name)}</span>
                        </div>
                        <span class="diff-type-badge diff-type-added">added</span>
                    </div>
                    <div class="diff-content">Color: ${t.color}, Terms: ${t.terms.join(', ')}</div>
                </div>`;
            });

            currentDiff.tags.modified.forEach(m => {
                const id = `tag:${m.new.id}`;
                selectedChanges.add(id);
                html += `
                <div class="diff-item" data-change-id="${id}">
                    <div class="diff-item-header" style="align-items: center;">
                        <div class="diff-item-identity">
                            <div class="diff-select-circle selected" onclick="toggleChangeSelection('${id}')"></div>
                            <span class="${getTagClass(m.new.color)}">${escapeHtml(m.new.name)}</span>
                        </div>
                        <span class="diff-type-badge diff-type-modified">modified</span>
                    </div>
                    <div class="diff-content">
                        <div class="diff-change-line">Changes in color or terms.</div>
                    </div>
                </div>`;
            });

            currentDiff.tags.deleted.forEach(t => {
                const id = `tag:${t.id}`;
                selectedChanges.add(id);
                html += `
                <div class="diff-item" data-change-id="${id}">
                    <div class="diff-item-header" style="align-items: center;">
                        <div class="diff-item-identity">
                            <div class="diff-select-circle selected" onclick="toggleChangeSelection('${id}')"></div>
                            <span class="${getTagClass(t.color)}" style="opacity: 0.7; text-decoration: line-through;">${escapeHtml(t.name)}</span>
                        </div>
                        <span class="diff-type-badge diff-type-deleted">deleted</span>
                    </div>
                </div>`;
            });
        }

        if (!html) {
            html = '<p style="text-align: center; color: var(--lesser-text-color); padding: 40px;">No changes detected.</p>';
        }

        container.innerHTML = html;
        updatePublishButtonText();
    }

    /**
     * Toggles whether a specific change is selected for publication
     */
    function toggleChangeSelection(id) {
        if (selectedChanges.has(id)) {
            selectedChanges.delete(id);
        } else {
            selectedChanges.add(id);
        }

        // Update UI
        const item = document.querySelector(`.diff-item[data-change-id="${id}"]`);
        if (item) {
            const circle = item.querySelector('.diff-select-circle');
            circle.classList.toggle('selected', selectedChanges.has(id));
            item.classList.toggle('deselected', !selectedChanges.has(id));
        }

        updatePublishButtonText();
    }

    /**
     * Updates the "Publish Changes" button text to show count
     */
    function updatePublishButtonText() {
        const publishBtn = document.getElementById('publishBtn');
        if (!publishBtn) return;

        const count = selectedChanges.size;
        if (count === 0) {
            publishBtn.textContent = 'Publish Changes';
            publishBtn.disabled = true;
        } else {
            publishBtn.textContent = `Publish ${count} Change${count === 1 ? '' : 's'}`;
            publishBtn.disabled = false;
        }
    }

    /**
     * Publishes local changes to Firebase
     */
    async function publishChanges() {
        const publishBtn = document.getElementById('publishBtn');
        if (!publishBtn || !currentDiff) return;

        const originalText = publishBtn.textContent;
        publishBtn.disabled = true;
        publishBtn.textContent = 'Publishing...';

        try {
            // Perform a partial merge: start with remote baseline and apply ONLY selected changes
            let entriesToPublish = JSON.parse(JSON.stringify(remoteData || []));
            let tagsToPublish = JSON.parse(JSON.stringify(remoteTags || []));

            // Apply selected entry changes
            currentDiff.entries.added.forEach(e => {
                if (selectedChanges.has(`entry:${e.Number}`)) {
                    entriesToPublish.push(JSON.parse(JSON.stringify(e)));
                }
            });

            currentDiff.entries.modified.forEach(m => {
                if (selectedChanges.has(`entry:${m.new.Number}`)) {
                    const idx = entriesToPublish.findIndex(e => e.Number === m.new.Number);
                    if (idx !== -1) entriesToPublish[idx] = JSON.parse(JSON.stringify(m.new));
                }
            });

            currentDiff.entries.deleted.forEach(e => {
                if (selectedChanges.has(`entry:${e.Number}`)) {
                    const idx = entriesToPublish.findIndex(ent => ent.Number === e.Number);
                    if (idx !== -1) entriesToPublish.splice(idx, 1);
                }
            });

            // Apply selected tag changes
            currentDiff.tags.added.forEach(t => {
                if (selectedChanges.has(`tag:${t.id}`)) {
                    tagsToPublish.push(JSON.parse(JSON.stringify(t)));
                }
            });

            currentDiff.tags.modified.forEach(m => {
                if (selectedChanges.has(`tag:${m.new.id}`)) {
                    const idx = tagsToPublish.findIndex(t => t.id === m.new.id);
                    if (idx !== -1) tagsToPublish[idx] = JSON.parse(JSON.stringify(m.new));
                }
            });

            currentDiff.tags.deleted.forEach(t => {
                if (selectedChanges.has(`tag:${t.id}`)) {
                    const idx = tagsToPublish.findIndex(tag => tag.id === t.id);
                    if (idx !== -1) tagsToPublish.splice(idx, 1);
                }
            });

            if (typeof publishLoreToFirebase === 'function') {
                await publishLoreToFirebase({
                    entries: entriesToPublish,
                    tags: tagsToPublish
                });

                updateSyncStatus();
                closeSyncSidesheet();
                // Refresh UI to show data is in sync
                if (typeof filterData === 'function') filterData();
            }
        } catch (err) {
            alert('Failed to publish changes: ' + err.message);
        } finally {
            publishBtn.disabled = false;
            updatePublishButtonText();
        }
    }

    /**
     * Discards local changes and reverts to remote state
     */
    function discardLocalChanges() {
        if (!confirm('Discard all local unpublished changes? This cannot be undone.')) return;

        // Revert local state to remote baseline
        allData = JSON.parse(JSON.stringify(remoteData || []));
        allTags = JSON.parse(JSON.stringify(remoteTags || []));

        // Clear local draft
        if (window.syncManager) {
            window.syncManager.clearDraft();
        }

        updateSyncStatus();
        closeSyncSidesheet();

        // Refresh UI
        if (typeof syncTagsFromDocument === 'function') syncTagsFromDocument();
        if (typeof filterData === 'function') filterData();
    }

    /**
     * Downloads the current local lore state (entries + tags) as a JSON file
     */
    function downloadLoreJson() {
        const data = {
            entries: allData || [],
            tags: allTags || [],
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.href = url;
        a.download = `noxsyphone-lore-draft-${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Attach to global scope
    window.openSyncSidesheet = openSyncSidesheet;
    window.closeSyncSidesheet = closeSyncSidesheet;
    window.publishChanges = publishChanges;
    window.discardLocalChanges = discardLocalChanges;
    window.downloadLoreJson = downloadLoreJson;
    window.toggleChangeSelection = toggleChangeSelection;

    // Listen for data updates to refresh the badge
    window.addEventListener('loreDraftUpdated', updateSyncStatus);

    // Initial check (useful after login/load)
    window.addEventListener('load', () => {
        // Delay a bit to ensure data-loader has finished
        setTimeout(updateSyncStatus, 500);

        // Click handler for badge
        const syncStatusEl = document.getElementById('syncStatus');
        if (syncStatusEl) {
            syncStatusEl.addEventListener('click', openSyncSidesheet);
        }

        // Backdrop click for syncSidesheet
        const syncSidesheet = document.getElementById('syncSidesheet');
        if (syncSidesheet) {
            syncSidesheet.addEventListener('click', (e) => {
                if (e.target === syncSidesheet) closeSyncSidesheet();
            });
        }
    });

    // Also update when we load data initially
    const originalLoadData = window.loadData;
    if (typeof originalLoadData === 'function') {
        window.loadData = async function () {
            await originalLoadData();
            updateSyncStatus();
        };
    }

    window.syncUi = {
        updateSyncStatus,
        openSyncSidesheet,
        closeSyncSidesheet
    };
})();
