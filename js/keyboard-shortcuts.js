/**
 * Keyboard Shortcuts
 * Adds keyboard navigation to the lore dump app
 */
(function() {
    'use strict';

    const SHORTCUTS = {
        FOCUS_SEARCH: ['/', 'ctrl+k', 'cmd+k'],
        SAVE_ENTRY: ['ctrl+s', 'cmd+s', 'ctrl+enter', 'cmd+enter'],
        CLOSE_MODAL: ['escape', 'esc'],
    };

    function normalizeKey(e) {
        const key = e.key.toLowerCase();
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;
        const alt = e.altKey;

        let combo = '';
        if (ctrl) combo += 'ctrl+';
        if (shift) combo += 'shift+';
        if (alt) combo += 'alt+';
        combo += key;

        if (e.metaKey) {
            return [combo, combo.replace('ctrl+', 'cmd+')];
        }
        return [combo];
    }

    function matchesShortcut(e, shortcuts) {
        const normalized = normalizeKey(e);
        return shortcuts.some(shortcut =>
            normalized.some(n => n === shortcut.toLowerCase())
        );
    }

    function isTyping() {
        const active = document.activeElement;
        if (!active) return false;

        const tagName = active.tagName.toLowerCase();
        const isInput = tagName === 'input' || tagName === 'textarea';
        const isEditable = active.isContentEditable;

        return isInput || isEditable;
    }

    function handleKeydown(e) {
        if (matchesShortcut(e, SHORTCUTS.CLOSE_MODAL)) {
            const gotoEntry = document.getElementById('gotoEntry');
            if (gotoEntry && document.activeElement === gotoEntry) {
                e.preventDefault();
                gotoEntry.blur();
                return;
            }
            return;
        }

        if (matchesShortcut(e, SHORTCUTS.SAVE_ENTRY)) {
            const editContainer = document.getElementById('editEntryContainer');
            const addContainer = document.getElementById('addEntryContainer');

            if (editContainer?.classList.contains('show')) {
                e.preventDefault();
                if (typeof updateEditEntry === 'function') {
                    updateEditEntry();
                }
                return;
            }

            if (addContainer?.classList.contains('active')) {
                e.preventDefault();
                if (typeof submitAddEntry === 'function') {
                    submitAddEntry();
                }
                return;
            }
        }

        if (isTyping()) return;

        const modalOpen = document.querySelector('.modal.active') ||
            document.getElementById('editEntryContainer')?.classList.contains('show') ||
            document.getElementById('addEntryContainer')?.classList.contains('active');

        if (modalOpen) return;

        if (matchesShortcut(e, SHORTCUTS.FOCUS_SEARCH)) {
            e.preventDefault();
            if (typeof openCommandPalette === 'function') {
                openCommandPalette();
            } else {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
        }
    }

    function init() {
        document.addEventListener('keydown', handleKeydown);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
