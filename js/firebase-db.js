/**
 * Firebase Realtime Database - load and save lore data
 * Requires: firebase-config.js, firebase-app-compat.js, firebase-database-compat.js
 *
 * Note: Firebase RTDB stores arrays as objects with numeric keys ("0", "1", ...).
 * snapshot.val() returns a plain object, not an Array. We must normalize to an array
 * so no entries are dropped (e.g. 290 in Firebase showing as 269 on the site).
 */
(function() {
    function getDb() {
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            window.firebase.initializeApp(window.firebaseConfig);
        }
        return window.firebase.database();
    }

    /** Convert Firebase value to array: use as-is if array, else object keys (numeric sort) to array. */
    function toArray(val) {
        if (Array.isArray(val)) return val;
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            const keys = Object.keys(val).filter(k => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
            return keys.map(k => val[k]);
        }
        return [];
    }

    async function loadLoreData() {
        try {
            const db = getDb();
            const snapshot = await db.ref('loredump').once('value');
            const data = snapshot.val();
            if (!data || (!data.entries && !data.tags)) return null;

            const entriesArray = toArray(data.entries);
            const tagsArray = toArray(data.tags);

            // Debug info to help diagnose count mismatches (e.g. 290 vs 269)
            if (typeof console !== 'undefined') {
                const rawEntries = data.entries;
                const rawType = Array.isArray(rawEntries) ? 'array' : typeof rawEntries;
                const rawKeys = rawEntries && typeof rawEntries === 'object'
                    ? Object.keys(rawEntries).length
                    : 0;
                console.log('[Firebase] loredump entries:',
                    { rawType, rawKeys, normalizedLength: entriesArray.length });
            }

            return {
                entries: entriesArray,
                tags: tagsArray
            };
        } catch (err) {
            console.error('Firebase load error:', err);
            return null;
        }
    }

    async function saveLoreData(data) {
        try {
            const db = getDb();
            await db.ref('loredump').set({
                entries: data.entries || [],
                tags: data.tags || []
            });
            return true;
        } catch (err) {
            console.error('Firebase save error:', err);
            return false;
        }
    }

    window.firebaseDb = { loadLoreData, saveLoreData };
})();
