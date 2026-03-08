/**
 * Command Palette
 * A floating search/navigation modal triggered by the search nav icon or Cmd+K / Ctrl+K.
 *
 * Search modes (detected by input prefix):
 *   No prefix   → full-text search across entry content
 *   #<num>      → jump directly to that entry number
 *   @<tag>      → filter entries by tag name
 *   /<arc>      → filter entries by arc (number or arc name)
 */
(function() {
    'use strict';

    let paletteOpen = false;
    let selectedResultIndex = -1;

    /* ------------------------------------------------------------------
       Public API
    ------------------------------------------------------------------ */

    function openCommandPalette(initialQuery) {
        const overlay = document.getElementById('cmdPaletteOverlay');
        if (!overlay) return;

        overlay.classList.add('active');
        paletteOpen = true;
        selectedResultIndex = -1;

        const input = document.getElementById('cmdPaletteInput');
        const query = typeof initialQuery === 'string' ? initialQuery : '';
        if (input) {
            input.value = query;
            requestAnimationFrame(() => {
                input.focus();
                input.setSelectionRange(query.length, query.length);
            });
        }

        renderResults(query);
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
            mode: 'tag',
            term: query.slice(1).trimStart()
        };
        if (query.startsWith('/')) return {
            mode: 'arc',
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
        } else if (mode === 'tag') {
            // Search by tag name
            const lower = term.toLowerCase();
            matches = allData.filter(e => {
                if (!e.Tags) return false;
                const tags = safeParseEntryTags(e.Tags);
                return tags.some(t => t.name.toLowerCase().includes(lower));
            });
        } else {
            // mode === 'arc' — search by arc number or arc name
            const lower = term.toLowerCase().trim();
            const termTrim = term.trim();
            matches = allData.filter(e => {
                const n = parseFloat(e.Number);
                if (isNaN(n)) return false;
                const arcKey = Math.floor(n).toString();
                const arcData = (typeof allArcs !== 'undefined' && allArcs[arcKey]) || { name: '', color: 'slate' };
                const arcName = (arcData.name || '').toLowerCase();
                const numMatch = arcKey === termTrim || arcKey.startsWith(termTrim);
                const nameMatch = arcName.includes(lower);
                return numMatch || nameMatch;
            });
        }

        return matches.slice(0, MAX_RESULTS);
    }

    /** Tags whose name matches the term (unique by name). Empty term = all tags. */
    function getMatchingTags(term) {
        if (typeof allData === 'undefined' || !Array.isArray(allData)) return [];
        const lower = (term || '').toLowerCase().trim();
        const showAll = (lower === '');
        const seen = new Set();
        const out = [];
        allData.forEach(e => {
            if (!e.Tags) return;
            const tags = safeParseEntryTags(e.Tags);
            tags.forEach(t => {
                if (!t.name) return;
                const nameLower = t.name.toLowerCase();
                if (!seen.has(nameLower) && (showAll || nameLower.includes(lower))) {
                    seen.add(nameLower);
                    out.push({ name: t.name, color: t.color || 'slate' });
                }
            });
        });
        return out.slice(0, showAll ? 100 : 15);
    }

    /** Arcs whose key or name matches the term. Empty term = all arcs. */
    function getMatchingArcs(term) {
        if (typeof allData === 'undefined' || !Array.isArray(allData)) return [];
        const arcKeys = new Set();
        allData.forEach(e => {
            const n = parseFloat(e.Number);
            if (!isNaN(n)) arcKeys.add(Math.floor(n).toString());
        });
        const lower = (term || '').toLowerCase().trim();
        const termTrim = (term || '').trim();
        const showAll = lower === '';
        const out = [];
        arcKeys.forEach(key => {
            const arcData = (typeof allArcs !== 'undefined' && allArcs[key]) || { name: '', color: 'slate' };
            const name = (arcData.name || '').trim() || 'Untitled';
            if (showAll) {
                out.push({ key, name, color: arcData.color || 'slate' });
            } else {
                const nameMatch = name.toLowerCase().includes(lower);
                const numMatch = key === termTrim || key.startsWith(termTrim);
                if (nameMatch || numMatch) {
                    out.push({ key, name, color: arcData.color || 'slate' });
                }
            }
        });
        return out.sort((a, b) => parseInt(a.key, 10) - parseInt(b.key, 10)).slice(0, showAll ? 50 : 15);
    }

    /* ------------------------------------------------------------------
       Rendering
    ------------------------------------------------------------------ */

    function updateModeBadge(mode) {
        const badge = document.getElementById('cmdPaletteModeBadge');
        if (!badge) return;

        const labels = {
            entry: 'Entry #',
            tag: 'Tag',
            arc: 'Arc',
        };

        if (mode === 'text' || !labels[mode]) {
            badge.className = 'cmd-palette-mode-badge';
            badge.textContent = '';
        } else {
            badge.className = `cmd-palette-mode-badge visible mode-${mode}`;
            badge.textContent = labels[mode];
        }
    }

    /** Map arc color to arc-color-indicator class (reused from styles.css) */
    function getArcColorClass(color) {
        if (!color || color === 'slate') return 'slate';
        if (color === 'amber') return 'orange-red';
        if (color === 'green') return 'lime';
        if (color === 'teal') return 'aqua';
        if (color === 'pink') return 'magenta';
        return color;
    }

    function buildResultHTML(entry, index, mode, term, showEntryNumber) {
        const desc = entry.Description || '';
        const snippet = getSnippet(desc, mode === 'text' ? term : '');
        const highlighted = mode === 'text' ? highlight(snippet, term) : escapeHtml(snippet);
        const entryNum = escapeHtml(String(entry.Number));

        const selectedClass = index === selectedResultIndex ? ' cmd-palette-result--selected' : '';
        const tags = safeGetEntryTagsForDisplay(entry) || [];
        const visibleTags = tags.slice(0, 3);
        const extraCount = tags.length - visibleTags.length;

        const showTags = mode !== 'entry' && mode !== 'text';

        let tagsHtml = '';
        if (showTags && visibleTags.length > 0) {
            tagsHtml = '<div class="cmd-result-tags cmd-result-tags--entry">';
            visibleTags.forEach(tag => {
                const tagClass = typeof getTagClass === 'function' ? getTagClass(tag.color || 'slate') : 'tag tag--slate';
                const loreClass = typeof getLoreTagColorClass === 'function' ? getLoreTagColorClass(tag.color || 'slate') : 'slate';
                const name = escapeHtml(tag.name);
                tagsHtml += `<span class="${tagClass} lore-tag ${loreClass}">${name}</span>`;
            });
            if (extraCount > 0) {
                tagsHtml += `<span class="cmd-result-tag-more">+${extraCount} more</span>`;
            }
            tagsHtml += '</div>';
        }

        let arcKey = '';
        let arcColorClass = 'slate';
        let arcLabelHtml = '';
        if (typeof allArcs !== 'undefined') {
            const num = parseFloat(entry.Number);
            if (!isNaN(num)) {
                arcKey = Math.floor(num).toString();
                const arcData = allArcs[arcKey] || { name: '', color: 'slate' };
                arcColorClass = getArcColorClass(arcData.color || 'slate');
                arcLabelHtml = `<span class="cmd-result-arc-num">Arc ${escapeHtml(arcKey)}</span>`;
            }
        }

        let numPrefixHtml = '';
        if (mode === 'entry') {
            numPrefixHtml = `<span class="cmd-entry-num-prefix cmd-entry-num-prefix--${arcColorClass}">#${entryNum}</span> `;
        } else if (mode === 'text') {
            numPrefixHtml = `<span class="cmd-entry-num-prefix cmd-entry-num-prefix--keyword">#${entryNum}</span> `;
        }

        return `<div class="cmd-palette-result cmd-palette-result--entry cmd-result-arc--${arcColorClass}${selectedClass}" data-type="entry" data-index="${index}" data-entry-number="${entryNum}">
            <div class="cmd-result-arc-bar arc-color--${arcColorClass}"></div>
            <div class="cmd-result-body cmd-result-body--entry">
                <div class="cmd-result-snippet">${numPrefixHtml}${highlighted}</div>
                ${tagsHtml}
            </div>
            ${arcLabelHtml}
        </div>`;
    }

    function buildTagRow(tag, index) {
        const tagClass = typeof getTagClass === 'function' ? getTagClass(tag.color || 'slate') : 'tag tag--slate';
        const loreClass = typeof getLoreTagColorClass === 'function' ? getLoreTagColorClass(tag.color || 'slate') : 'slate';
        const selectedClass = index === selectedResultIndex ? ' cmd-palette-result--selected' : '';
        const name = escapeHtml(tag.name);
        return `<div class="cmd-palette-result cmd-palette-result--tag${selectedClass}" data-type="tag" data-index="${index}" data-tag-name="${escapeHtml(tag.name)}">
            <span class="${tagClass} lore-tag ${loreClass}">${name}</span>
        </div>`;
    }

    /** Build arc color selector buttons (data attributes for delegation; same order as arc-manager) */
    function buildArcColorBtns(key, selectedColor) {
        const colors = ['pink', 'amber', 'orange', 'green', 'teal', 'blue', 'purple', 'slate'];
        return colors.map(color => {
            const cssClass = color === 'amber' ? 'orange-red' : color === 'green' ? 'lime' : color === 'teal' ? 'aqua' : color === 'pink' ? 'magenta' : color;
            const selected = color === selectedColor ? ' selected' : '';
            return `<button type="button" class="arc-color-btn tag-color ${cssClass}${selected}" title="${escapeHtml(color)}" data-arc-key="${escapeHtml(key)}" data-color="${escapeHtml(color)}" aria-label="Set color ${color}"></button>`;
        }).join('');
    }

    function buildArcRow(arc, index) {
        const selectedClass = index === selectedResultIndex ? ' cmd-palette-result--selected' : '';
        const key = arc.key;
        const displayName = (arc.name && arc.name !== 'Untitled') ? arc.name : 'Untitled';
        const titleUpper = `ARC ${key}: ${escapeHtml(displayName.toUpperCase())}`;
        const colorClass = arc.color === 'amber' ? 'orange-red' : arc.color === 'green' ? 'lime' : arc.color === 'teal' ? 'aqua' : arc.color === 'pink' ? 'magenta' : arc.color;
        const count = typeof getArcEntryCount === 'function' ? getArcEntryCount(key) : 0;
        const range = typeof getArcNumberRange === 'function' ? getArcNumberRange(key) : { min: '', max: '' };
        const rangeStr = range.min !== '' && range.max !== '' ? `${range.min} to ${range.max}` : '';
        const infoStr = rangeStr ? `${count} entries // ${rangeStr}` : `${count} entries`;
        const colorBtns = buildArcColorBtns(key, arc.color);
        const fullEditorHtml = `
            <div class="arc-item cmd-palette-arc-item">
                <div class="arc-item-header">
                    <span class="arc-number">Arc ${escapeHtml(key)}</span>
                    <div class="arc-color-selector">${colorBtns}</div>
                </div>
                <div class="arc-title" data-arc-key="${escapeHtml(key)}" role="button" tabindex="0">
                    <div class="arc-color-indicator arc-color--${colorClass}"></div>
                    <span class="arc-title-text">${escapeHtml(displayName)}</span>
                </div>
                <div class="arc-number-info">${infoStr}</div>
            </div>`;
        return `<div class="cmd-palette-result cmd-palette-result--arc${selectedClass}" data-type="arc" data-index="${index}" data-arc-key="${escapeHtml(key)}">
            <div class="cmd-arc-bar-row">
                <div class="cmd-result-arc-bar arc-color--${colorClass}"></div>
                <div class="cmd-arc-bar">
                    <span class="cmd-arc-bar-title">${titleUpper}</span>
                    <span class="cmd-arc-bar-count">${count} entries</span>
                    <button type="button" class="cmd-arc-bar-edit" aria-label="Edit arc" title="Edit arc">
                        <svg class="icon" aria-hidden="true"><use href="img/sprites/duotone.svg#pen"></use></svg>
                    </button>
                </div>
            </div>
            <div class="cmd-arc-editor" hidden>${fullEditorHtml}</div>
        </div>`;
    }

    function buildScrollRow(direction, index) {
        const selectedClass = index === selectedResultIndex ? ' cmd-palette-result--selected' : '';
        const label = direction === 'top' ? 'Scroll to top' : 'Scroll to end';
        return `<div class="cmd-palette-result cmd-palette-result--scroll${selectedClass}" data-type="scroll" data-index="${index}" data-scroll-direction="${escapeHtml(direction)}">
            <div class="cmd-result-body cmd-result-body--full">
                <span class="cmd-result-arc-label">${escapeHtml(label)}</span>
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

        if (!query) {
            list.innerHTML = [
                '<div class="cmd-palette-hint">',
                '<span class="cmd-palette-footer-hint">This is a spot for the hint<kbd>#</kbd> Entry number</span>',
                '<span class="cmd-palette-footer-hint"><kbd>#</kbd> Entry number</span>',
                '<span class="cmd-palette-footer-hint"><kbd>@</kbd> Tag</span>',
                '<span class="cmd-palette-footer-hint"><kbd>/</kbd> Arc</span>',
                '</div>',
            ].join('');
            selectedResultIndex = -1;
            return;
        }

        const showEntryNumbers = true;
        const termLower = term.trim().toLowerCase();

        // Special commands: "top" and "end" scroll to top or end of the list
        if (termLower === 'top' || termLower === 'end') {
            selectedResultIndex = 0;
            list.innerHTML = '<div class="cmd-palette-section"><div class="cmd-palette-section-title">Commands</div>' +
                buildScrollRow(termLower, 0) + '</div>';
            list.querySelector('.cmd-palette-result').addEventListener('mousedown', e => {
                e.preventDefault();
                closeCommandPalette();
                if (termLower === 'top') scrollToTop();
                else scrollToEnd();
            });
            return;
        }

        // For prefixed modes, show only the matching category; for text search show all three
        let matchingTags = [];
        let matchingArcs = [];
        let entries = [];

        if (mode === 'text') {
            matchingTags = getMatchingTags(term);
            matchingArcs = getMatchingArcs(term);
            entries = getResults(query);
        } else if (mode === 'tag') {
            matchingTags = getMatchingTags(term);
        } else if (mode === 'arc') {
            matchingArcs = getMatchingArcs(term);
        } else {
            entries = getResults(query);
        }

        // Build flat list of selectable items for keyboard nav
        const allItems = [];
        matchingTags.forEach(tag => allItems.push({ type: 'tag', tag }));
        matchingArcs.forEach(arc => allItems.push({ type: 'arc', arc }));
        entries.forEach(entry => allItems.push({ type: 'entry', entry }));

        if (allItems.length === 0) {
            list.innerHTML = '<div class="cmd-palette-empty">No results</div>';
            selectedResultIndex = -1;
            return;
        }

        selectedResultIndex = selectedResultIndex >= allItems.length ? allItems.length - 1 : (selectedResultIndex < 0 ? 0 : selectedResultIndex);

        let html = '';
        let globalIndex = 0;

        if (matchingTags.length > 0) {
            html += '<div class="cmd-palette-section"><div class="cmd-palette-section-title">Tags</div><div class="cmd-palette-tags-inline">';
            matchingTags.forEach(tag => {
                html += buildTagRow(tag, globalIndex++);
            });
            html += '</div></div>';
        }
        if (matchingArcs.length > 0) {
            html += '<div class="cmd-palette-section"><div class="cmd-palette-section-title">Arcs</div>';
            matchingArcs.forEach(arc => {
                html += buildArcRow(arc, globalIndex++);
            });
            html += '</div>';
        }
        if (entries.length > 0) {
            const entrySectionTitle = mode === 'text' ? 'Keyword' : 'Entries';
            html += `<div class="cmd-palette-section"><div class="cmd-palette-section-title">${entrySectionTitle}</div>`;
            entries.forEach((entry, i) => {
                html += buildResultHTML(entry, globalIndex++, mode, term, showEntryNumbers);
            });
            html += '</div>';
        }

        list.innerHTML = html;

        // Attach click handlers (use mousedown to beat blur)
        list.querySelectorAll('.cmd-palette-result').forEach(el => {
            el.addEventListener('mousedown', e => {
                const type = el.getAttribute('data-type');
                const currentQuery = document.getElementById('cmdPaletteInput')?.value || '';

                if (type === 'arc') {
                    const arcKey = el.getAttribute('data-arc-key');
                    const editBtn = e.target.closest('.cmd-arc-bar-edit');
                    const colorBtn = e.target.closest('.arc-color-btn');
                    const titleEl = e.target.closest('.arc-title');
                    const isEditing = titleEl && titleEl.classList.contains('arc-title--editing');
                    const isTitleInteractive = titleEl && (e.target.closest('.arc-title-input') || e.target.closest('.arc-title-confirm'));
                    if (editBtn) {
                        e.preventDefault();
                        e.stopPropagation();
                        const editor = el.querySelector('.cmd-arc-editor');
                        if (editor) {
                            const isHidden = editor.hasAttribute('hidden');
                            editor.toggleAttribute('hidden', !isHidden);
                        }
                        return;
                    }
                    if (colorBtn && arcKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        const color = colorBtn.getAttribute('data-color');
                        if (color && typeof updateArcColor === 'function') {
                            updateArcColor(arcKey, color);
                            renderResults(currentQuery);
                        }
                        return;
                    }
                    if (titleEl && !isEditing && !isTitleInteractive && arcKey && typeof enterArcTitleEdit === 'function') {
                        e.preventDefault();
                        e.stopPropagation();
                        enterArcTitleEdit(arcKey, titleEl);
                        return;
                    }
                    e.preventDefault();
                    closeCommandPalette();
                    if (arcKey) scrollToArc(arcKey);
                    return;
                }

                e.preventDefault();
                const { mode: m, term: t } = detectMode(currentQuery);

                if (type === 'tag') {
                    const tagName = el.getAttribute('data-tag-name');
                    if (tagName && typeof selectedTags !== 'undefined') {
                        selectedTags.add(tagName);
                        if (typeof refreshTagFilter === 'function') refreshTagFilter();
                        if (typeof filterData === 'function') filterData();
                    }
                    closeCommandPalette();
                } else if (type === 'scroll') {
                    const direction = el.getAttribute('data-scroll-direction');
                    closeCommandPalette();
                    if (direction === 'top') scrollToTop();
                    else if (direction === 'end') scrollToEnd();
                } else {
                    const entryNum = el.getAttribute('data-entry-number');
                    applyResult(entryNum);
                }
            });
        });
    }

    /* ------------------------------------------------------------------
       Applying a result
    ------------------------------------------------------------------ */

    function applyResult(entryNum) {
        closeCommandPalette();
        scrollToEntry(entryNum);
    }

    function scrollToEntry(entryNum) {
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
            }
        });
    }

    /** Scroll so the arc header sits at its sticky position (top of scroll area) */
    const ARC_HEADER_STICKY_TOP = 125;
    function scrollToArc(arcKey) {
        requestAnimationFrame(() => {
            const scrollEl = document.querySelector('.app-main-content');
            const header = document.querySelector(`.db-arc-header[data-arc-key="${arcKey}"]`);
            if (!scrollEl || !header) return;
            const headerRect = header.getBoundingClientRect();
            const scrollElRect = scrollEl.getBoundingClientRect();
            const newScrollTop = scrollEl.scrollTop + (headerRect.top - scrollElRect.top) - ARC_HEADER_STICKY_TOP;
            scrollEl.scrollTo({ top: Math.max(0, newScrollTop), behavior: 'smooth' });
        });
    }

    function scrollToTop() {
        const scrollEl = document.querySelector('.app-main-content');
        if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function scrollToEnd() {
        const scrollEl = document.querySelector('.app-main-content');
        if (scrollEl) scrollEl.scrollTo({ top: scrollEl.scrollHeight - scrollEl.clientHeight, behavior: 'smooth' });
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
                const type = el.getAttribute('data-type');

                if (type === 'tag') {
                    const tagName = el.getAttribute('data-tag-name');
                    if (tagName && typeof selectedTags !== 'undefined') {
                        selectedTags.add(tagName);
                        if (typeof refreshTagFilter === 'function') refreshTagFilter();
                        if (typeof filterData === 'function') filterData();
                    }
                    closeCommandPalette();
                } else if (type === 'arc') {
                    const arcKey = el.getAttribute('data-arc-key');
                    closeCommandPalette();
                    if (arcKey) scrollToArc(arcKey);
                } else if (type === 'scroll') {
                    const direction = el.getAttribute('data-scroll-direction');
                    closeCommandPalette();
                    if (direction === 'top') scrollToTop();
                    else if (direction === 'end') scrollToEnd();
                } else {
                    const entryNum = el.getAttribute('data-entry-number');
                    applyResult(entryNum);
                }
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
                        <use href="img/sprites/light.svg#magnifying-glass"></use>
                    </svg>
                    <input
                        type="text"
                        id="cmdPaletteInput"
                        class="cmd-palette-input"
                        placeholder="Search keywords, #entry numbers, @tags, or /arcs..."
                        autocomplete="off"
                        spellcheck="false"
                        aria-label="Search"
                    >
                    <span id="cmdPaletteModeBadge" class="cmd-palette-mode-badge" aria-live="polite"></span>
                </div>
                <div id="cmdPaletteResults" class="cmd-palette-results"></div>
                <div class="cmd-palette-footer">

                    <div class="cmd-palette-footer-hints">
                        <span class="cmd-palette-footer-hint">
                            <kbd>/</kbd> Arc
                        </span>
                        <span class="cmd-palette-footer-hint">
                            <kbd>#</kbd> Entry number
                        </span>
                        <span class="cmd-palette-footer-hint">
                            <kbd>@</kbd> Tag
                        </span>
                    </div>

                    <div class="cmd-palette-footer-hints">
                        <span class="cmd-palette-footer-hint">
                            <kbd>top</kbd> To top
                        </span>
                        <span class="cmd-palette-footer-hint">
                            <kbd>end</kbd> To end
                        </span>
                        <span class="cmd-palette-footer-hint">
                            <kbd>↑↓</kbd> Navigate
                        </span>
                        <span class="cmd-palette-footer-hint">
                            <kbd>⏎</kbd> Select
                        </span>
                        <span class="cmd-palette-footer-hint">
                            <kbd>Esc</kbd> Close
                        </span>
                    </div>
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

    // Expose for use from keyboard-shortcuts.js, side-nav, and arc-manager (after inline title edit)
    window.openCommandPalette = openCommandPalette;
    window.closeCommandPalette = closeCommandPalette;
    window.refreshCommandPaletteArcs = function () {
        const input = document.getElementById('cmdPaletteInput');
        if (!input || !paletteOpen) return;
        const q = input.value || '';
        if (detectMode(q).mode === 'arc') renderResults(q);
    };

})();