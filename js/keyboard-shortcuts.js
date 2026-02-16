/**
 * Keyboard Shortcuts
 * Adds keyboard navigation to the lore dump app
 */
(function () {
    'use strict';

    // Keyboard shortcut configuration
    const SHORTCUTS = {
        // Search
        FOCUS_SEARCH: ['/', 'ctrl+k', 'cmd+k'],

        // Navigation
        NEW_ENTRY: ['n'],
        EDIT_TAGS: ['t'],
        TOGGLE_FILTERS: ['f'],
        GOTO_ENTRY: ['g'],  // Focus jump-to-entry field

        // Actions
        SAVE_ENTRY: ['ctrl+s', 'cmd+s', 'ctrl+enter', 'cmd+enter'],
        CLOSE_MODAL: ['escape', 'esc'],

        // Card navigation (when viewing list)
        NEXT_CARD: ['j'],
        PREV_CARD: ['k'],
        OPEN_CARD: ['enter', 'o'],
    };

    let selectedCardIndex = -1;

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
     * Gets all visible entry cards
     */
    function getVisibleCards() {
        return Array.from(document.querySelectorAll('.card'));
    }

    /**
     * Highlights a card, scrolls to it, and updates the jump-to field
     */
    function selectCard(index) {
        const cards = getVisibleCards();
        if (index < 0 || index >= cards.length) return;

        // Remove previous highlight
        cards.forEach(card => card.classList.remove('card--selected'));

        // Add new highlight
        const card = cards[index];
        card.classList.add('card--selected');

        // Scroll into view
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Update jump-to field with the entry number
        const entryNumber = card.getAttribute('data-entry-number');
        const gotoEntry = document.getElementById('gotoEntry');
        if (gotoEntry && entryNumber) {
            gotoEntry.value = entryNumber;
        }

        selectedCardIndex = index;
    }

    /**
     * Opens the currently selected card
     */
    function openSelectedCard() {
        const cards = getVisibleCards();
        if (selectedCardIndex < 0 || selectedCardIndex >= cards.length) return;

        const card = cards[selectedCardIndex];
        const entryNumber = card.getAttribute('data-entry-number');
        if (entryNumber && typeof openEditEntryModal === 'function') {
            openEditEntryModal(entryNumber);
        }
    }

    /**
     * Resets card selection
     */
    function resetSelection() {
        selectedCardIndex = -1;
        document.querySelectorAll('.card--selected').forEach(card => {
            card.classList.remove('card--selected');
        });
        const gotoEntry = document.getElementById('gotoEntry');
        if (gotoEntry) {
            gotoEntry.value = '';
        }
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
                        <span>Go to entry (jump-to mode)</span>
                    </div>
                </div>

                <div style="margin: 20px 0;">
                    <h4 style="color: var(--lesser-text-color); margin-bottom: 10px;">Entry Navigation</h4>
                    <div class="shortcut-row">
                        <kbd>J</kbd>
                        <span>Next entry (highlights card, updates jump-to field)</span>
                    </div>
                    <div class="shortcut-row">
                        <kbd>K</kbd>
                        <span>Previous entry (highlights card, updates jump-to field)</span>
                    </div>
                    <div class="shortcut-row">
                        <kbd>Enter</kbd> or <kbd>O</kbd>
                        <span>Open highlighted entry</span>
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

        // Handle Enter in goto field (existing app.js behavior)
        const gotoEntry = document.getElementById('gotoEntry');
        if (gotoEntry && document.activeElement === gotoEntry && e.key === 'Enter') {
            // Let app.js handle this, but after it runs, select that card
            setTimeout(() => {
                const entryNum = gotoEntry.value;
                if (!entryNum) return;

                const cards = getVisibleCards();
                const index = cards.findIndex(card =>
                    card.getAttribute('data-entry-number') === entryNum
                );

                if (index >= 0) {
                    selectedCardIndex = index;
                    cards.forEach(card => card.classList.remove('card--selected'));
                    cards[index].classList.add('card--selected');
                }
            }, 100);
            return;
        }

        // Don't handle other shortcuts when typing (except save/close)
        if (isTyping()) return;

        // Check if we're in a modal - if so, don't handle navigation
        const modalOpen = document.querySelector('.modal.active') ||
            document.getElementById('editEntryContainer')?.classList.contains('show') ||
            document.getElementById('addEntryContainer')?.classList.contains('active');

        if (modalOpen) return;

        // Search focus
        if (matchesShortcut(e, SHORTCUTS.FOCUS_SEARCH)) {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
            resetSelection();
            return;
        }

        // Jump to entry (focus goto field)
        if (matchesShortcut(e, SHORTCUTS.GOTO_ENTRY)) {
            e.preventDefault();
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
            resetSelection();
            return;
        }

        // Edit tags
        if (matchesShortcut(e, SHORTCUTS.EDIT_TAGS)) {
            e.preventDefault();
            if (typeof openTagEditor === 'function') {
                openTagEditor();
            }
            resetSelection();
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

        // Card navigation - J (next)
        if (matchesShortcut(e, SHORTCUTS.NEXT_CARD)) {
            e.preventDefault();
            const cards = getVisibleCards();
            if (cards.length === 0) return;

            if (selectedCardIndex < 0) {
                // Nothing selected - select first card
                selectCard(0);
            } else if (selectedCardIndex < cards.length - 1) {
                // Move to next card
                selectCard(selectedCardIndex + 1);
            }
            return;
        }

        // Card navigation - K (previous)
        if (matchesShortcut(e, SHORTCUTS.PREV_CARD)) {
            e.preventDefault();
            const cards = getVisibleCards();
            if (cards.length === 0) return;

            if (selectedCardIndex < 0) {
                // Nothing selected - select first card
                selectCard(0);
            } else if (selectedCardIndex > 0) {
                // Move to previous card
                selectCard(selectedCardIndex - 1);
            }
            return;
        }

        // Open card - Enter or O
        if (matchesShortcut(e, SHORTCUTS.OPEN_CARD)) {
            e.preventDefault();
            openSelectedCard();
            return;
        }
    }

    /**
     * Initialize keyboard shortcuts
     */
    function init() {
        document.addEventListener('keydown', handleKeydown);

        // Reset selection when search/filter changes
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', resetSelection);
        }

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
            <svg class="icon" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
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