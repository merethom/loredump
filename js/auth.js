/**
 * Firebase Auth - Google sign-in, sign-out, auth state
 */
(function() {
    function ensureFirebaseInit() {
        if (!window.firebase?.apps?.length) {
            window.firebase.initializeApp(window.firebaseConfig);
        }
    }

    function getAuth() {
        ensureFirebaseInit();
        return window.firebase.auth();
    }

    function showSignInScreen() {
        document.body.classList.remove('app-active');
        document.getElementById('signInScreen').style.display = 'flex';
        document.getElementById('appContent').style.display = 'none';
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }

    function showApp() {
        document.body.classList.add('app-active');
        document.getElementById('signInScreen').style.display = 'none';
        document.getElementById('appContent').style.display = 'grid';
        if (typeof setupEventListeners === 'function') setupEventListeners();
    }

    function updateUserDisplay(user) {
        const el = document.getElementById('userEmail');
        if (el) el.textContent = user ? user.email : '';
    }

    window.signInWithGoogle = function() {
        ensureFirebaseInit();
        const provider = new window.firebase.auth.GoogleAuthProvider();
        getAuth().signInWithPopup(provider).catch(err => {
            console.error('Sign-in error:', err);
            alert('Sign-in failed: ' + (err.message || 'Unknown error'));
        });
    };

    window.signOut = function() {
        getAuth().signOut();
    };

    function initAuth() {
        const signInBtn = document.getElementById('signInBtn');
        const signOutBtn = document.getElementById('signOutBtn');

        if (signInBtn) signInBtn.addEventListener('click', window.signInWithGoogle);
        if (signOutBtn) signOutBtn.addEventListener('click', window.signOut);

        getAuth().onAuthStateChanged(user => {
            if (user) {
                showApp();
                updateUserDisplay(user);
                loadData();
            } else {
                showSignInScreen();
                updateUserDisplay(null);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }
})();
