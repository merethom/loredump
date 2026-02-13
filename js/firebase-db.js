/**
 * Firebase Realtime Database - load and save lore data
 * Requires: firebase-config.js, firebase-app-compat.js, firebase-database-compat.js
 */
(function() {
    function getDb() {
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            window.firebase.initializeApp(window.firebaseConfig);
        }
        return window.firebase.database();
    }

    async function loadLoreData() {
        try {
            const db = getDb();
            const snapshot = await db.ref('loredump').once('value');
            const data = snapshot.val();
            if (!data || (!data.entries && !data.tags)) return null;
            return {
                entries: Array.isArray(data.entries) ? data.entries : [],
                tags: Array.isArray(data.tags) ? data.tags : []
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
