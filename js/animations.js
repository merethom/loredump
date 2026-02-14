/**
 * Animations using anime.js
 * Add and organize animation logic here.
 */
(function() {
    'use strict';

    // Example: anime is available globally when loaded via script tag
    // anime({ targets: '.selector', opacity: 1, duration: 500 });

    function init() {
        // Initialize animations when DOM is ready
        // Add animation setup here
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
