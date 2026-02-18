/**
 * Sync UI - handles updating the sync status badge and dashboard
 */
(function () {
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

        const diff = window.syncManager.getDiff(remoteData, remoteTags, allData, allTags);

        let html = '';

        // Render Entries Diff
        if (diff.entries.added.length > 0 || diff.entries.modified.length > 0 || diff.entries.deleted.length > 0) {
            html += '<div class="diff-section-title">Lore Entries</div>';

            diff.entries.added.forEach(e => {
                html += `
                <div class="diff-item">
                    <div class="diff-item-header">
                        <span>Entry #${e.Number}</span>
                        <span class="diff-type-badge diff-type-added">Added</span>
                    </div>
                    <div class="diff-content">${escapeHtml(e.Description)}</div>
                </div>`;
            });

            diff.entries.modified.forEach(m => {
                html += `
                <div class="diff-item">
                    <div class="diff-item-header">
                        <span>Entry #${m.new.Number}</span>
                        <span class="diff-type-badge diff-type-modified">Modified</span>
                    </div>
                    <div class="diff-content">
                        ${m.old.Description !== m.new.Description ? `
                            <div class="diff-change-line"><span class="diff-old">${escapeHtml(m.old.Description)}</span></div>
                            <div class="diff-change-line"><span class="diff-new">${escapeHtml(m.new.Description)}</span></div>
                        ` : '<div class="diff-change-line"><em>Tags updated</em></div>'}
                    </div>
                </div>`;
            });

            diff.entries.deleted.forEach(e => {
                html += `
                <div class="diff-item">
                    <div class="diff-item-header">
                        <span>Entry #${e.Number}</span>
                        <span class="diff-type-badge diff-type-deleted">Deleted</span>
                    </div>
                    <div class="diff-content diff-old">${escapeHtml(e.Description)}</div>
                </div>`;
            });
        }

        // Render Tags Diff
        if (diff.tags.added.length > 0 || diff.tags.modified.length > 0 || diff.tags.deleted.length > 0) {
            html += '<div class="diff-section-title" style="margin-top: 24px;">Tags</div>';

            diff.tags.added.forEach(t => {
                html += `
                <div class="diff-item">
                    <div class="diff-item-header">
                        <span>${escapeHtml(t.name)}</span>
                        <span class="diff-type-badge diff-type-added">Added</span>
                    </div>
                    <div class="diff-content">Color: ${t.color}, Terms: ${t.terms.join(', ')}</div>
                </div>`;
            });

            diff.tags.modified.forEach(m => {
                html += `
                <div class="diff-item">
                    <div class="diff-item-header">
                        <span>${escapeHtml(m.new.name)}</span>
                        <span class="diff-type-badge diff-type-modified">Modified</span>
                    </div>
                    <div class="diff-content">
                        <div class="diff-change-line">Changes in color or terms.</div>
                    </div>
                </div>`;
            });

            diff.tags.deleted.forEach(t => {
                html += `
                <div class="diff-item">
                    <div class="diff-item-header">
                        <span>${escapeHtml(t.name)}</span>
                        <span class="diff-type-badge diff-type-deleted">Deleted</span>
                    </div>
                </div>`;
            });
        }

        if (!html) {
            html = '<p style="text-align: center; color: var(--lesser-text-color); padding: 40px;">No changes detected.</p>';
        }

        container.innerHTML = html;
    }

    /**
     * Publishes local changes to Firebase
     */
    async function publishChanges() {
        const publishBtn = document.getElementById('publishBtn');
        if (!publishBtn) return;

        const originalText = publishBtn.textContent;
        publishBtn.disabled = true;
        publishBtn.textContent = 'Publishing...';

        try {
            if (typeof publishLoreToFirebase === 'function') {
                await publishLoreToFirebase();
                updateSyncStatus();
                closeSyncSidesheet();
                // Refresh UI to show data is in sync
                if (typeof filterData === 'function') filterData();
            }
        } catch (err) {
            alert('Failed to publish changes: ' + err.message);
        } finally {
            publishBtn.disabled = false;
            publishBtn.textContent = originalText;
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

    // Attach to global scope
    window.openSyncSidesheet = openSyncSidesheet;
    window.closeSyncSidesheet = closeSyncSidesheet;
    window.publishChanges = publishChanges;
    window.discardLocalChanges = discardLocalChanges;

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
