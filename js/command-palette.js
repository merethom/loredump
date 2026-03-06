/**
 * Command Palette
 * A floating search/navigation modal triggered by the search nav icon or Cmd+K / Ctrl+K.
 *
 * Search modes (detected by input prefix):
 *   No prefix   → full-text search across entry content
 *   #<num>      → jump directly to that entry number
 *   @<name>     → filter entries by character / entity tag
 *   /<tag>      → filter entries by any tag
 */
(function() {
    'use strict';

    let paletteOpen = false;
    let selectedResultIndex = -1;

    /* ------------------------------------------------------------------
       Public API
    ------------------------------------------------------------------ */

    function openCommandPalette() {
        const overlay = document.getElementById('cmdPaletteOverlay');
        if (!overlay) return;

        overlay.classList.add('active');
        paletteOpen = true;
        selectedResultIndex = -1;

        const input = document.getElementById('cmdPaletteInput');
        if (input) {
            input.value = '';
            // Small delay ensures focus works after overlay display transition
            requestAnimationFrame(() => input.focus());
        }

        renderResults('');
    }

    function closeCommandPalette() {
        const overlay = document.getElementById('cmdPaletteOverlay');
        if (!overlay) return;
        overlay.classList.remove('active');
        paletteOpen = false;
        selectedResultIndex = -1;
    }

    /* ------------------------------------------------------------------
       Mode detection
    ------------------------------------------------------------------ */

    function detectMode(query) {
        if (query.startsWith('#')) return {
            mode: 'entry',
            term: query.slice(1).trimStart()
        };
        if (query.startsWith('@')) return {
            mode: 'character',
            term: query.slice(1).trimStart()
        };
        if (query.startsWith('/')) return {
            mode: 'tag',
            term: query.slice(1).trimStart()
        };
        return {
            mode: 'text',
            term: query.trim()
        };
    }

    /* ------------------------------------------------------------------
       Helpers
    ------------------------------------------------------------------ */

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /** Wrap matching term in <mark> for snippet highlighting */
    function highlight(text, term) {
        if (!term) return escapeHtml(text);
        const re = new RegExp(`(${escapeRegex(term)})`, 'gi');
        return escapeHtml(text).replace(re, '<mark class="cmd-highlight">$1</mark>');
    }

    /** Extract a short excerpt around the first occurrence of term */
    function getSnippet(text, term, maxLen) {
        maxLen = maxLen || 130;
        if (!term) {
            return text.slice(0, maxLen) + (text.length > maxLen ? '\u2026' : '');
        }
        const lower = text.toLowerCase();
        const idx = lower.indexOf(term.toLowerCase());
        if (idx === -1) {
            return text.slice(0, maxLen) + (text.length > maxLen ? '\u2026' : '');
        }
        const start = Math.max(0, idx - 45);
        const end = Math.min(text.length, idx + term.length + 85);
        return (start > 0 ? '\u2026' : '') + text.slice(start, end) + (end < text.length ? '\u2026' : '');
    }

    /** Safely call app-level parseEntryTags if available */
    function safeParseEntryTags(tagsStr) {
        if (typeof parseEntryTags === 'function') return parseEntryTags(tagsStr);
        if (!tagsStr) return [];
        return tagsStr.split(',').map(t => ({
            name: t.trim(),
            color: 'slate'
        })).filter(t => t.name);
    }

    /** Safely call app-level getEntryTagsForDisplay if available */
    function safeGetEntryTagsForDisplay(entry) {
        if (typeof getEntryTagsForDisplay === 'function') return getEntryTagsForDisplay(entry);
        return safeParseEntryTags(entry.Tags);
    }

    /* ------------------------------------------------------------------
       Search logic
    ------------------------------------------------------------------ */

    const MAX_RESULTS = 50;

    function getResults(query) {
        if (!query) return [];
        const {
            mode,
            term
        } = detectMode(query);
        if (!term) return [];

        // allData is the global array defined in index.html
        if (typeof allData === 'undefined' || !Array.isArray(allData)) return [];

        let matches;

        if (mode === 'text') {
            const lower = term.toLowerCase();
            matches = allData.filter(e =>
                e.Description && e.Description.toLowerCase().includes(lower)
            );
        } else if (mode === 'entry') {
            matches = allData.filter(e => {
                const num = String(e.Number);
                return num.startsWith(term) || parseFloat(num) === parseFloat(term);
            });
        } else {
            // 'character' or 'tag' — search by tag name
            const lower = term.toLowerCase();
            matches = allData.filter(e => {
                if (!e.Tags) return false;
                const tags = safeParseEntryTags(e.Tags);
                return tags.some(t => t.name.toLowerCase().includes(lower));
            });
        }

        return matches.slice(0, MAX_RESULTS);
    }

    /* ------------------------------------------------------------------
       Rendering
    ------------------------------------------------------------------ */

    function updateModeBadge(mode) {
        const badge = document.getElementById('cmdPaletteModeBadge');
        if (!badge) return;

        const labels = {
            entry: 'Entry #',
            character: 'Character',
            tag: 'Tag',
        };

        if (mode === 'text' || !labels[mode]) {
            badge.className = 'cmd-palette-mode-badge';
            badge.textContent = '';
        } else {
            badge.className = `cmd-palette-mode-badge visible mode-${mode}`;
            badge.textContent = labels[mode];
        }
    }

    function buildResultHTML(entry, index, mode, term) {
        const desc = entry.Description || '';
        const snippet = getSnippet(desc, mode === 'text' ? term : '');
        const highlighted = mode === 'text' ? highlight(snippet, term) : escapeHtml(snippet);
        const entryNum = escapeHtml(String(entry.Number));

        const tags = safeGetEntryTagsForDisplay(entry);
        const lowerTerm = term.toLowerCase();

        const tagsHtml = tags.slice(0, 6).map(t => {
            const isMatch = (mode === 'character' || mode === 'tag') &&
                t.name.toLowerCase().includes(lowerTerm);
            const colorClass = `cmd-tag--${t.color || 'slate'}`;
            const matchClass = isMatch ? ' cmd-tag--match' : '';
            return `<span class="cmd-tag ${colorClass}${matchClass}">${escapeHtml(t.name)}</span>`;
        }).join('');

        const selectedClass = index === selectedResultIndex ? ' cmd-palette-result--selected' : '';

        return `<div class="cmd-palette-result${selectedClass}" data-index="${index}" data-entry-number="${entryNum}">
            <div class="cmd-result-num">#${entryNum}</div>
            <div class="cmd-result-body">
                <div class="cmd-result-snippet">${highlighted}</div>
                ${tagsHtml ? `<div class="cmd-result-tags">${tagsHtml}</div>` : ''}
            </div>
        </div>`;
    }

    function renderResults(query) {
        const list = document.getElementById('cmdPaletteResults');
        if (!list) return;

        const {
            mode,
            term
        } = detectMode(query);

        updateModeBadge(mode);

        if (!query || !term) {
            list.innerHTML = [
                '<div class="cmd-palette-hint">',
                'Type to search, or use prefixes: ',
                '<span class="cmd-prefix">#</span> entry number &nbsp;',
                '<span class="cmd-prefix">@</span> character &nbsp;',
                '<span class="cmd-prefix">/</span> tag',
                '</div>',
            ].join('');
            selectedResultIndex = -1;
            return;
        }

        const results = getResults(query);

        if (results.length === 0) {
            list.innerHTML = '<div class="cmd-palette-empty">No results</div>';
            selectedResultIndex = -1;
            return;
        }

        list.innerHTML = results.map((entry, i) => buildResultHTML(entry, i, mode, term)).join('');

        // Attach click handlers (use mousedown to beat blur)
        list.querySelectorAll('.cmd-palette-result').forEach(el => {
            el.addEventListener('mousedown', e => {
                e.preventDefault();
                const entryNum = el.getAttribute('data-entry-number');
                const currentQuery = document.getElementById('cmdPaletteInput')?.value || '';
                const {
                    mode: m,
                    term: t
                } = detectMode(currentQuery);
                applyResult(entryNum, m, t, results);
            });
        });
    }

    /* ------------------------------------------------------------------
       Applying a result
    ------------------------------------------------------------------ */

    function applyResult(entryNum, mode, term, results) {
        if (mode === 'text') {
            // Drive existing search via the hidden searchInput so all app.js
            // listeners fire naturally (clear button visibility, filterData, etc.)
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = term;
                searchInput.dispatchEvent(new Event('input', {
                    bubbles: true
                }));
            } else {
                // Fallback: set globals directly
                if (typeof searchTerm !== 'undefined') {
                    window.searchTerm = term.toLowerCase();
                }
                if (typeof filterData === 'function') filterData();
            }
        } else if (mode === 'entry') {
            // No filter changes — just scroll to the entry
        } else {
            // character or tag — add the best matching exact tag name to selectedTags
            // Find the entry and pick the matching tag name
            const entry = (results || []).find(e => String(e.Number) === String(entryNum));
            if (entry) {
                const tags = safeParseEntryTags(entry.Tags);
                const lowerTerm = term.toLowerCase();
                const matchingTags = tags.filter(t => t.name.toLowerCase().includes(lowerTerm));

                if (matchingTags.length > 0 && typeof selectedTags !== 'undefined') {
                    matchingTags.forEach(t => selectedTags.add(t.name));
                    if (typeof refreshTagFilter === 'function') refreshTagFilter();
                    if (typeof filterData === 'function') filterData();

                    // Also open the filter sidesheet so the user can see active filters
                    if (typeof openFilterSidesheet === 'function') {
                        window.filtersVisible = true;
                        openFilterSidesheet();
                    }
                }
            }
        }

        closeCommandPalette();
        scrollToEntry(entryNum);
    }

    function scrollToEntry(entryNum) {
        // Wait a frame in case filterData re-rendered the list
        requestAnimationFrame(() => {
            const cards = document.querySelectorAll('.card');
            let found = null;
            for (const card of cards) {
                const cn = card.getAttribute('data-entry-number');
                if (cn === String(entryNum) || parseFloat(cn) === parseFloat(entryNum)) {
                    found = card;
                    break;
                }
            }
            if (found) {
                found.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                found.classList.add('card--highlighted');
                setTimeout(() => found.classList.remove('card--highlighted'), 3000);
            }
        });
    }

    /* ------------------------------------------------------------------
       Keyboard handling inside the palette
    ------------------------------------------------------------------ */

    function handlePaletteKeydown(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            e.preventDefault();
            e.stopPropagation();
            closeCommandPalette();
            return;
        }

        const list = document.getElementById('cmdPaletteResults');
        const items = list ? Array.from(list.querySelectorAll('.cmd-palette-result')) : [];

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (items.length === 0) return;
            selectedResultIndex = Math.min(selectedResultIndex + 1, items.length - 1);
            updateSelectedItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (items.length === 0) return;
            selectedResultIndex = Math.max(selectedResultIndex - 1, -1);
            updateSelectedItem(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedResultIndex >= 0 && items[selectedResultIndex]) {
                const el = items[selectedResultIndex];
                const entryNum = el.getAttribute('data-entry-number');
                const currentQuery = document.getElementById('cmdPaletteInput')?.value || '';
                const {
                    mode,
                    term
                } = detectMode(currentQuery);
                // Gather results list for tag matching
                const results = getResults(currentQuery);
                applyResult(entryNum, mode, term, results);
            }
        }
    }

    function updateSelectedItem(items) {
        items.forEach((el, i) => {
            el.classList.toggle('cmd-palette-result--selected', i === selectedResultIndex);
        });
        if (selectedResultIndex >= 0 && items[selectedResultIndex]) {
            items[selectedResultIndex].scrollIntoView({
                block: 'nearest'
            });
        }
    }

    /* ------------------------------------------------------------------
       Build the palette DOM and wire everything up
    ------------------------------------------------------------------ */

    function buildPalette() {
        const overlay = document.createElement('div');
        overlay.id = 'cmdPaletteOverlay';
        overlay.className = 'cmd-palette-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Command palette');

        overlay.innerHTML = `
            <div class="cmd-palette-modal">
                <div class="cmd-palette-input-row">
                    <svg class="icon cmd-palette-icon" aria-hidden="true">
                        <use href="img/sprites/regular.svg#magnifying-glass"></use>
                    </svg>
                    <input
                        type="text"
                        id="cmdPaletteInput"
                        class="cmd-palette-input"
                        placeholder="Search entries, #1.03, @Character, /Tag\u2026"
                        autocomplete="off"
                        spellcheck="false"
                        aria-label="Search"
                    >
                    <span id="cmdPaletteModeBadge" class="cmd-palette-mode-badge" aria-live="polite"></span>
                </div>
                <div id="cmdPaletteResults" class="cmd-palette-results"></div>
                <div class="cmd-palette-footer">
                    <span class="cmd-palette-footer-hint">
                        <kbd>\u2191\u2193</kbd> navigate
                    </span>
                    <span class="cmd-palette-footer-hint">
                        <kbd>\u23ce</kbd> select
                    </span>
                    <span class="cmd-palette-footer-hint">
                        <kbd>Esc</kbd> close
                    </span>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Input events
        const input = document.getElementById('cmdPaletteInput');
        input.addEventListener('input', e => {
            selectedResultIndex = -1;
            renderResults(e.target.value);
        });
        input.addEventListener('keydown', handlePaletteKeydown);

        // Backdrop click closes
        overlay.addEventListener('mousedown', e => {
            if (e.target === overlay) closeCommandPalette();
        });
    }

    /* ------------------------------------------------------------------
       Wire open triggers:
         1. Side-nav search button (id="cmdPaletteNavBtn")
         2. Global Cmd+K / Ctrl+K (capture phase, overrides keyboard-shortcuts.js)
         3. Also the old "/" shortcut for backward compat
    ------------------------------------------------------------------ */

    function wireNavButton() {
        const btn = document.getElementById('cmdPaletteNavBtn');
        if (btn) {
            btn.addEventListener('click', e => {
                e.preventDefault();
                openCommandPalette();
            });
        }
    }

    function wireGlobalShortcut() {
        // Use capture so we intercept before keyboard-shortcuts.js bubble handlers
        document.addEventListener('keydown', e => {
            // Cmd+K / Ctrl+K (with or without Shift for backward compat)
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
                // Don't intercept if Shift is held and something else handles it
                e.preventDefault();
                if (paletteOpen) {
                    closeCommandPalette();
                } else {
                    openCommandPalette();
                }
                return;
            }

            // "/" key when not typing in an input → open palette (mirrors old focus-search)
            if (e.key === '/' && !paletteOpen) {
                const active = document.activeElement;
                const tag = active ? active.tagName.toLowerCase() : '';
                const isEditing = tag === 'input' || tag === 'textarea' || active?.isContentEditable;
                if (!isEditing) {
                    e.preventDefault();
                    openCommandPalette();
                }
            }
        }, true /* capture */ );
    }

    /* ------------------------------------------------------------------
       Init
    ------------------------------------------------------------------ */

    function init() {
        buildPalette();
        wireNavButton();
        wireGlobalShortcut();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for use from keyboard-shortcuts.js and side-nav inline handlers
    window.openCommandPalette = openCommandPalette;
    window.closeCommandPalette = closeCommandPalette;

})();