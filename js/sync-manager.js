/**
 * Sync Manager - handles local drafting and diffing
 */
(function () {
    const STORAGE_KEY = 'noxsyphone_lore_draft';

    /**
     * Saves the current lore state to localStorage
     * @param {Array} entries 
     * @param {Array} tags 
     */
    function saveDraft(entries, tags) {
        try {
            const data = {
                entries: entries || [],
                tags: tags || [],
                arcs: allArcs || {},
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            console.log('[SyncManager] Draft saved');

            // Dispatch event for UI to update badge if needed
            window.dispatchEvent(new CustomEvent('loreDraftUpdated'));
        } catch (err) {
            console.error('[SyncManager] Failed to save draft:', err);
        }
    }

    /**
     * Loads the lore draft from localStorage
     * @returns {Object|null}
     */
    function loadDraft() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (err) {
            console.error('[SyncManager] Failed to load draft:', err);
            return null;
        }
    }

    /**
     * Clears the local draft
     */
    function clearDraft() {
        localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('loreDraftUpdated'));
    }

    /**
     * Checks if local state differs from remote state
     * @param {Array} remEntries 
     * @param {Array} remTags 
     * @param {Array} locEntries 
     * @param {Array} locTags 
     * @returns {boolean}
     */
    function hasChanges(remEntries, remTags, locEntries, locTags) {
        // Simple but effective for this scale: stringify comparison
        // Note: allData/allTags are sorted consistently by our code
        try {
            const remoteStr = JSON.stringify({ e: remEntries || [], t: remTags || [], a: remoteArcs || {} });
            const localStr = JSON.stringify({ e: locEntries || [], t: locTags || [], a: allArcs || {} });
            return remoteStr !== localStr;
        } catch (e) {
            return false;
        }
    }

    /**
     * Calculates the differences between local and remote states
     * @param {Array} remEntries 
     * @param {Array} remTags 
     * @param {Array} locEntries 
     * @param {Array} locTags 
     * @returns {Object} { added: [], modified: [], deleted: [] }
     */
    function getDiff(remEntries, remTags, locEntries, locTags) {
        const diff = {
            entries: { added: [], modified: [], deleted: [] },
            tags: { added: [], modified: [], deleted: [] },
            arcs: { added: [], modified: [], deleted: [] }
        };

        // Entries diffing (using Number as key)
        const remEntryMap = new Map(remEntries.map(e => [e.Number, e]));
        const locEntryMap = new Map(locEntries.map(e => [e.Number, e]));

        locEntries.forEach(loc => {
            const rem = remEntryMap.get(loc.Number);
            if (!rem) {
                diff.entries.added.push(loc);
            } else if (JSON.stringify(loc) !== JSON.stringify(rem)) {
                diff.entries.modified.push({ old: rem, new: loc });
            }
        });

        remEntries.forEach(rem => {
            if (!locEntryMap.has(rem.Number)) {
                diff.entries.deleted.push(rem);
            }
        });

        // Tags diffing (using id as key)
        const remTagMap = new Map(remTags.map(t => [t.id, t]));
        const locTagMap = new Map(locTags.map(t => [t.id, t]));

        locTags.forEach(loc => {
            const rem = remTagMap.get(loc.id);
            if (!rem) {
                diff.tags.added.push(loc);
            } else if (JSON.stringify(loc) !== JSON.stringify(rem)) {
                diff.tags.modified.push({ old: rem, new: loc });
            }
        });

        remTags.forEach(rem => {
            if (!locTagMap.has(rem.id)) {
                diff.tags.deleted.push(rem);
            }
        });

        // Arcs diffing (using integer key string)
        const remArcs = remoteArcs || {};
        const locArcs = allArcs || {};
        const allArcKeys = new Set([...Object.keys(remArcs), ...Object.keys(locArcs)]);

        allArcKeys.forEach(key => {
            const rem = remArcs[key];
            const loc = locArcs[key];
            if (!rem && loc) {
                diff.arcs.added.push({ key, ...loc });
            } else if (rem && !loc) {
                diff.arcs.deleted.push({ key, ...rem });
            } else if (JSON.stringify(rem) !== JSON.stringify(loc)) {
                diff.arcs.modified.push({ key, old: rem, new: loc });
            }
        });

        return diff;
    }

    window.syncManager = {
        saveDraft,
        loadDraft,
        clearDraft,
        hasChanges,
        getDiff
    };
})();
