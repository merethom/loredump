/**
 * Keyboard Shortcuts
 * Adds keyboard navigation to the lore dump app
 */
(function() {
    'use strict';

    // Keyboard shortcut configuration
    const SHORTCUTS = {
        // Search
        FOCUS_SEARCH: ['/', 'ctrl+k', 'cmd+k'],

        // Navigation
        NEW_ENTRY: ['n'],
        EDIT_TAGS: ['t'],
        TOGGLE_FILTERS: ['f'],
        GOTO_ENTRY: ['g'], // Focus jump-to-entry field

        // Actions
        SAVE_ENTRY: ['ctrl+s', 'cmd+s', 'ctrl+enter', 'cmd+enter'],
        CLOSE_MODAL: ['escape', 'esc'],
    };

    /**
     * Normalizes key combination for comparison
     */
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

        // Also support cmd+
        if (e.metaKey) {
            return [combo, combo.replace('ctrl+', 'cmd+')];
        }

        return [combo];
    }

    /**
     * Checks if a key event matches a shortcut
     */
    function matchesShortcut(e, shortcuts) {
        const normalized = normalizeKey(e);
        return shortcuts.some(shortcut =>
            normalized.some(n => n === shortcut.toLowerCase())
        );
    }

    /**
     * Checks if user is currently typing in an input field
     */
    function isTyping() {
        const active = document.activeElement;
        if (!active) return false;

        const tagName = active.tagName.toLowerCase();
        const isInput = tagName === 'input' || tagName === 'textarea';
        const isEditable = active.isContentEditable;

        return isInput || isEditable;
    }

    /**
     * Shows keyboard shortcuts help modal
     */
    function showKeyboardHelp() {
        // Remove existing help modal if present
        const existing = document.getElementById('keyboardHelpModal');
        if (existing) existing.remove();

        const helpHtml = `
            <div style="max-width: 600px; margin: 0 auto;">
                <h3 style="margin-top: 0; color: var(--text-color);">Keyboard Shortcuts</h3>
                
                <div style="margin: 20px 0;">
                    <h4 style="color: var(--lesser-text-color); margin-bottom: 10px;">Search & Navigation</h4>
                    <div class="shortcut-row">
                        <kbd>/</kbd> or <kbd>Ctrl+K</kbd>
                        <span>Focus search</span>
                    </div>
                    <div class="shortcut-row">
                        <kbd>F</kbd>
                        <span>Toggle filters</span>
                    </div>
                    <div class="shortcut-row">
                        <kbd>N</kbd>
                        <span>New entry</span>
                    </div>
                    <div class="shortcut-row">
                        <kbd>T</kbd>
                        <span>Edit tags</span>
                    </div>
                    <div class="shortcut-row">
                        <kbd>G</kbd>
                        <span>Focus jump-to field (type entry number)</span>
                    </div>
                </div>

                <div style="margin: 20px 0;">
                    <h4 style="color: var(--lesser-text-color); margin-bottom: 10px;">Actions</h4>
                    <div class="shortcut-row">
                        <kbd>Ctrl+S</kbd> or <kbd>Ctrl+Enter</kbd>
                        <span>Save entry (when editing)</span>
                    </div>
                    <div class="shortcut-row">
                        <kbd>Esc</kbd>
                        <span>Close modal/panel</span>
                    </div>
                </div>

                <style>
                    .shortcut-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 0;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    }
                    .shortcut-row kbd {
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 3px;
                        padding: 4px 8px;
                        font-family: var(--font-mono);
                        font-size: 12px;
                        color: var(--text-color);
                        margin-right: 8px;
                    }
                    .shortcut-row span {
                        flex: 1;
                        color: var(--lesser-text-color);
                        font-size: 14px;
                    }
                </style>
            </div>
        `;

        // Create and show help modal
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'keyboardHelpModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2 class="modal-title">Keyboard Shortcuts</h2>
                    <button class="modal-close" id="closeKeyboardHelp">&times;</button>
                </div>
                <div style="padding: 20px;">
                    ${helpHtml}
                </div>
            </div>
        `;

        // Close on X button
        modal.querySelector('#closeKeyboardHelp').addEventListener('click', () => modal.remove());

        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Close on Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape' || e.key === 'Esc') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        document.body.appendChild(modal);
    }

    /**
     * Main keyboard event handler
     */
    function handleKeydown(e) {
        // Handle shortcuts that work even when typing
        if (matchesShortcut(e, SHORTCUTS.CLOSE_MODAL)) {
            // Close help modal if open
            const helpModal = document.getElementById('keyboardHelpModal');
            if (helpModal) {
                e.stopPropagation();
                helpModal.remove();
                return;
            }

            // Blur goto field if focused
            const gotoEntry = document.getElementById('gotoEntry');
            if (gotoEntry && document.activeElement === gotoEntry) {
                e.preventDefault();
                gotoEntry.blur();
                return;
            }

            // Otherwise let existing escape handling work
            return;
        }

        // Handle save shortcuts when in edit/add modals
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

        // Don't handle other shortcuts when typing (except save/close)
        if (isTyping()) return;

        // Check if we're in a modal - if so, don't handle navigation
        const modalOpen = document.querySelector('.modal.active') ||
            document.getElementById('editEntryContainer')?.classList.contains('show') ||
            document.getElementById('addEntryContainer')?.classList.contains('active');

        if (modalOpen) return;

        // Search focus → open command palette if available, else fall back to searchInput
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
            return;
        }

        // Jump to entry (focus goto field)
        if (matchesShortcut(e, SHORTCUTS.GOTO_ENTRY)) {
            e.preventDefault();
            const gotoEntry = document.getElementById('gotoEntry');
            if (gotoEntry) {
                gotoEntry.focus();
                gotoEntry.select();
            }
            return;
        }

        // New entry
        if (matchesShortcut(e, SHORTCUTS.NEW_ENTRY)) {
            e.preventDefault();
            if (typeof openAddEntryModal === 'function') {
                openAddEntryModal();
            }
            return;
        }

        // Edit tags
        if (matchesShortcut(e, SHORTCUTS.EDIT_TAGS)) {
            e.preventDefault();
            if (typeof openTagEditor === 'function') {
                openTagEditor();
            }
            return;
        }

        // Toggle filters
        if (matchesShortcut(e, SHORTCUTS.TOGGLE_FILTERS)) {
            e.preventDefault();
            const sidesheet = document.getElementById('filterSidesheet');
            if (sidesheet?.classList.contains('open')) {
                if (typeof closeFilterSidesheet === 'function') {
                    closeFilterSidesheet();
                }
            } else {
                if (typeof openFilterSidesheet === 'function') {
                    openFilterSidesheet();
                }
            }
            return;
        }

    }

    /**
     * Initialize keyboard shortcuts
     */
    function init() {
        document.addEventListener('keydown', handleKeydown);

        // Add help button to UI
        addHelpButton();

        console.log('⌨️  Keyboard shortcuts enabled! Click ? button for help');
    }

    /**
     * Adds a help button to show keyboard shortcuts
     */
    function addHelpButton() {
        const controls = document.querySelector('.controls-row');
        if (!controls) return;

        const helpBtn = document.createElement('button');
        helpBtn.className = 'generic-ui-btn';
        helpBtn.title = 'Keyboard shortcuts';
        helpBtn.innerHTML = `
            <svg class="icon" aria-hidden="true">
                <use href="img/sprites/solid.svg#circle-info"></use>
            </svg>
        `;
        helpBtn.addEventListener('click', showKeyboardHelp);

        // Insert before sort control
        const sortControl = controls.querySelector('.sort-control-wrapper');
        if (sortControl) {
            controls.insertBefore(helpBtn, sortControl);
        } else {
            controls.appendChild(helpBtn);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for external use (if help button is clicked)
    window.showKeyboardHelp = showKeyboardHelp;

})();