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
    let fullQuery = '';

    /* ------------------------------------------------------------------
       Public API
    ------------------------------------------------------------------ */

    function openCommandPalette(initialQuery) {
        const overlay = document.getElementById('cmdPaletteOverlay');
        if (!overlay) return;

        overlay.classList.add('active');
        paletteOpen = true;
        selectedResultIndex = -1;

        fullQuery = typeof initialQuery === 'string' ? initialQuery : '';
        const input = document.getElementById('cmdPaletteInput');
        if (input) {
            requestAnimationFrame(() => {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            });
        }

        renderResults(fullQuery);
    }

    function closeCommandPalette() {
        const overlay = document.getElementById('cmdPaletteOverlay');
        if (!overlay) return;
        overlay.classList.remove('active');
        paletteOpen = false;
        selectedResultIndex = -1;
    }

    /* ------------------------------------------------------------------
       Recent searches (localStorage)
    ------------------------------------------------------------------ */

    const RECENT_SEARCHES_KEY = 'cmdPaletteRecentSearches';
    const RECENT_SEARCHES_MAX = 10;

    function getRecentSearches() {
        try {
            const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (_) {
            return [];
        }
    }

    function addRecentSearch(query) {
        const q = (query || '').trim();
        if (!q) return;
        let arr = getRecentSearches();
        arr = arr.filter(s => s !== q);
        arr.unshift(q);
        arr = arr.slice(0, RECENT_SEARCHES_MAX);
        try {
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(arr));
        } catch (_) {}
    }

    function removeRecentSearch(query) {
        const q = (query || '').trim();
        if (!q) return;
        let arr = getRecentSearches().filter(s => s !== q);
        try {
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(arr));
        } catch (_) {}
    }

    /* ------------------------------------------------------------------
       Mode detection & multi-search token parsing
    ------------------------------------------------------------------ */

    function detectMode(query) {
        const q = (query || '').trim();
        if (q.startsWith('#')) return { mode: 'entry', term: q.slice(1).trimStart() };
        if (q.startsWith('@')) return { mode: 'tag', term: q.slice(1).trimStart() };
        if (q.startsWith('/')) return { mode: 'arc', term: q.slice(1).trimStart() };
        return { mode: 'text', term: q };
    }

    /** Split by spaces but keep double-quoted phrases as a single part.
     *  Unclosed quotes (no matching ") are kept as-is so the user can type inside. */
    function splitBySpacesRespectingQuotes(str) {
        const result = [];
        let i = 0;
        const s = String(str || '').trim();
        while (i < s.length) {
            while (i < s.length && /\s/.test(s[i])) i++;
            if (i >= s.length) break;
            if (s[i] === '"') {
                i++;
                let end = i;
                while (end < s.length && s[end] !== '"') end++;
                if (end < s.length) {
                    result.push('"' + s.slice(i, end) + '"');
                    i = end + 1;
                } else {
                    result.push(s.slice(i - 1));
                    break;
                }
            } else {
                let end = i;
                while (end < s.length && !/\s/.test(s[end])) end++;
                result.push(s.slice(i, end));
                i = end;
            }
        }
        return result;
    }

    /** Parse query into tokens: keyword, @tag, /arc, #entry. Quoted strings become one keyword (phrase). */
    function parseQueryTokens(query) {
        const q = (query || '').trim();
        if (!q) return [];
        const parts = splitBySpacesRespectingQuotes(q);
        return parts.map(p => {
            if (p.startsWith('#')) return { type: 'entry', value: p.slice(1).trimStart(), raw: p };
            if (p.startsWith('@')) return { type: 'tag', value: p.slice(1).trimStart(), raw: p };
            if (p.startsWith('/')) return { type: 'arc', value: p.slice(1).trimStart(), raw: p };
            if (p.length >= 2 && p.startsWith('"') && p.endsWith('"')) {
                return { type: 'keyword', value: p.slice(1, -1).trim(), raw: p };
            }
            return { type: 'keyword', value: p, raw: p };
        }).filter(t => t.value !== '');
    }

    /** Split query into committed tokens (shown as chips) and in-progress part (shown in input).
     *  Trailing space commits the last token as a chip. Respects quoted phrases. */
    function splitCommittedAndInProgress(query) {
        const raw = (query || '');
        const hasTrailingSpace = /\s$/.test(raw);
        const parts = splitBySpacesRespectingQuotes(raw).filter(Boolean);
        let committedParts;
        let inProgress;
        if (hasTrailingSpace && parts.length > 0) {
            committedParts = parts;
            inProgress = '';
        } else if (parts.length > 1) {
            committedParts = parts.slice(0, -1);
            inProgress = parts[parts.length - 1];
        } else {
            committedParts = [];
            inProgress = parts[0] || '';
        }
        const committed = committedParts.map(p => ({
            type: p.startsWith('#') ? 'entry' : p.startsWith('@') ? 'tag' : p.startsWith('/') ? 'arc' : 'keyword',
            value: p.startsWith('#') ? p.slice(1) : p.startsWith('@') ? p.slice(1) : p.startsWith('/') ? p.slice(1) : (p.length >= 2 && p.startsWith('"') && p.endsWith('"') ? p.slice(1, -1).trim() : p),
            raw: p
        }));
        return { committed, inProgress };
    }

    /** Get primary term for backward compat (first token's value) and whether we're in multi-search. */
    function getPrimaryFromTokens(tokens) {
        const keyword = tokens.find(t => t.type === 'keyword');
        const tag = tokens.find(t => t.type === 'tag');
        const arc = tokens.find(t => t.type === 'arc');
        const entry = tokens.find(t => t.type === 'entry');
        const isMulti = tokens.length > 1 || (keyword && (tag || arc));
        const primary = entry || tag || arc || keyword;
        return { tokens, isMulti, keyword: keyword?.value, tag: tag?.value, arc: arc?.value, entry: entry?.value, primaryTerm: primary?.value, primaryType: primary?.type };
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
        const tokens = parseQueryTokens(query);
        if (!tokens.length) return [];
        const { tag, arc, entry, keyword } = getPrimaryFromTokens(tokens);

        if (typeof allData === 'undefined' || !Array.isArray(allData)) return [];

        let matches = allData;

        if (entry && tokens.length === 1 && tokens[0].type === 'entry') {
            matches = matches.filter(e => {
                const num = String(e.Number);
                return num.startsWith(entry) || parseFloat(num) === parseFloat(entry);
            });
        } else if (tag && !keyword && !arc && tokens.every(t => t.type === 'tag')) {
            const lower = tag.toLowerCase();
            matches = matches.filter(e => {
                if (!e.Tags) return false;
                const tags = safeParseEntryTags(e.Tags);
                return tags.some(t => t.name.toLowerCase().includes(lower));
            });
        } else if (arc && !keyword && !tag && tokens.every(t => t.type === 'arc')) {
            const lower = arc.toLowerCase().trim();
            const termTrim = arc.trim();
            matches = matches.filter(e => {
                const n = parseFloat(e.Number);
                if (isNaN(n)) return false;
                const arcKey = Math.floor(n).toString();
                const arcData = (typeof allArcs !== 'undefined' && allArcs[arcKey]) || { name: '', color: 'slate' };
                const arcName = (arcData.name || '').toLowerCase();
                return arcKey === termTrim || arcKey.startsWith(termTrim) || arcName.includes(lower);
            });
        } else {
            const keywords = tokens.filter(t => t.type === 'keyword').map(t => t.value.toLowerCase());
            const tagVal = tokens.find(t => t.type === 'tag')?.value;
            const arcVal = tokens.find(t => t.type === 'arc')?.value;
            matches = matches.filter(e => {
                if (keywords.length) {
                    const desc = (e.Description || '').toLowerCase();
                    if (!keywords.every(kw => desc.includes(kw))) return false;
                }
                if (tagVal) {
                    const tagLower = tagVal.toLowerCase();
                    if (!e.Tags) return false;
                    const tags = safeParseEntryTags(e.Tags);
                    if (!tags.some(t => t.name.toLowerCase().includes(tagLower))) return false;
                }
                if (arcVal) {
                    const n = parseFloat(e.Number);
                    if (isNaN(n)) return false;
                    const arcKey = Math.floor(n).toString();
                    const arcData = (typeof allArcs !== 'undefined' && allArcs[arcKey]) || { name: '', color: 'slate' };
                    const arcName = (arcData.name || '').toLowerCase();
                    const termTrim = arcVal.trim().toLowerCase();
                    const numMatch = arcKey === termTrim || arcKey.startsWith(termTrim);
                    const nameMatch = arcName.includes(termTrim);
                    if (!numMatch && !nameMatch) return false;
                }
                return true;
            });
        }

        return matches.slice(0, MAX_RESULTS);
    }

    /** Tags whose name matches the term (unique by name).
     *  - When entriesScope is provided, suggestions are limited to those entries.
     *  - Empty term = all tags within the chosen scope.
     */
    function getMatchingTags(term, entriesScope) {
        const sourceEntries = Array.isArray(entriesScope)
            ? entriesScope
            : (Array.isArray(allData) ? allData : []);
        if (!sourceEntries.length) return [];
        const lower = (term || '').toLowerCase().trim();
        const showAll = (lower === '');
        const seen = new Set();
        const out = [];
        sourceEntries.forEach(e => {
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

    /** Arcs whose key or name matches the term.
     *  - When entriesScope is provided, suggestions are limited to those entries.
     *  - Empty term = all arcs within the chosen scope.
     */
    function getMatchingArcs(term, entriesScope) {
        const sourceEntries = Array.isArray(entriesScope)
            ? entriesScope
            : (Array.isArray(allData) ? allData : []);
        if (!sourceEntries.length) return [];
        const arcKeys = new Set();
        sourceEntries.forEach(e => {
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
        const colorClass = arc.color === 'amber' ? 'orange-red' : arc.color === 'green' ? 'lime' : arc.color === 'teal' ? 'aqua' : arc.color === 'pink' ? 'magenta' : arc.color;
        const count = typeof getArcEntryCount === 'function' ? getArcEntryCount(key) : 0;
        const titleUpper = `ARC ${key}: ${escapeHtml(displayName.toUpperCase())}`;
        return `<div class="cmd-palette-result cmd-palette-result--arc${selectedClass}" data-type="arc" data-index="${index}" data-arc-key="${escapeHtml(key)}" data-arc-name="${escapeHtml(displayName)}" data-arc-color="${escapeHtml(arc.color || 'slate')}">
            <div class="cmd-arc-bar-row">
                <div class="cmd-result-arc-bar arc-color--${colorClass}"></div>
                <div class="cmd-arc-bar">
                    <span class="cmd-arc-bar-title">${titleUpper}</span>
                    <span class="cmd-arc-bar-count">${count} entries</span>
                    <button type="button" class="cmd-arc-bar-edit" aria-label="Edit arc" title="Edit arc">
                        <svg class="icon" aria-hidden="true"><use href="img/sprites/light.svg#pen"></use></svg>
                    </button>
                </div>
            </div>
            <div class="cmd-arc-bar-row cmd-arc-bar-edit-mode" hidden>
                <div class="cmd-result-arc-bar arc-color--${colorClass}"></div>
                <div class="cmd-arc-bar">
                    <input type="text" class="cmd-arc-bar-title-input" value="${escapeHtml(displayName)}" data-arc-key="${escapeHtml(key)}" placeholder="Arc name" autocomplete="off">
                    <span class="cmd-arc-bar-count">${count} entries</span>
                    <div class="arc-color-selector">${buildArcColorBtns(key, arc.color)}</div>
                    <button type="button" class="cmd-arc-bar-save" aria-label="Save arc" title="Save arc">
                        <svg class="icon" aria-hidden="true"><use href="img/sprites/light.svg#floppy-disk"></use></svg>
                    </button>
                </div>
            </div>
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

    function attachDefaultHandlers(listEl) {
        if (!listEl) return;
        listEl.querySelectorAll('.cmd-palette-recent-remove').forEach(btn => {
            btn.addEventListener('mousedown', e => {
                e.preventDefault();
                e.stopPropagation();
                const query = btn.getAttribute('data-query') || '';
                removeRecentSearch(query);
                renderResults('');
            });
        });
        listEl.querySelectorAll('.cmd-palette-result').forEach(el => {
            el.addEventListener('mousedown', e => {
                if (e.target.closest('.cmd-palette-recent-remove')) return;
                e.preventDefault();
                const type = el.getAttribute('data-type');
                if (type === 'action') {
                    const action = el.getAttribute('data-action');
                    if (action === 'add-entry' && typeof openAddEntryModal === 'function') {
                        closeCommandPalette();
                        openAddEntryModal();
                    }
                } else if (type === 'recent') {
                    const query = el.getAttribute('data-query') || '';
                    fullQuery = query;
                    const input = document.getElementById('cmdPaletteInput');
                    const tokensEl = document.getElementById('cmdPaletteTokens');
                    if (input) {
                        const { committed, inProgress } = splitCommittedAndInProgress(query);
                        input.value = inProgress;
                        if (tokensEl) tokensEl.innerHTML = committed.map(t => `<kbd class="cmd-query-token">${escapeHtml(t.raw)}</kbd>`).join('');
                    }
                    renderResults(fullQuery);
                }
            });
        });
    }

    function renderResults(query) {
        const list = document.getElementById('cmdPaletteResults');
        if (!list) return;

        const tokens = parseQueryTokens(query);
        const { isMulti } = getPrimaryFromTokens(tokens);
        const { mode, term } = detectMode(query);

        updateModeBadge(mode);

        const { committed } = splitCommittedAndInProgress(query);
        const tokensEl = document.getElementById('cmdPaletteTokens');
        const inputEl = document.getElementById('cmdPaletteInput');
        if (tokensEl) {
            tokensEl.innerHTML = committed.map(t => `<kbd class="cmd-query-token">${escapeHtml(t.raw)}</kbd>`).join('');
        }
        if (inputEl) {
            const { inProgress } = splitCommittedAndInProgress(query);
            inputEl.value = inProgress;
            inputEl.placeholder = committed.length ? '' : 'Search: keyword, @tag, /arc...';
        }

        if (!query) {
            const recents = getRecentSearches();
            let html = '<div class="cmd-palette-section"><div class="cmd-palette-section-title">Quick actions</div>';
            html += '<div class="cmd-palette-result cmd-palette-result--action cmd-palette-result--selected" data-type="action" data-action="add-entry" data-index="0">';
            html += '<svg class="icon cmd-palette-action-icon" aria-hidden="true"><use href="img/sprites/regular.svg#plus"></use></svg>';
            html += '<span class="cmd-palette-action-label">New entry</span>';
            html += '</div></div>';

            if (recents.length > 0) {
                html += '<div class="cmd-palette-section"><div class="cmd-palette-section-title">Recent searches</div>';
                recents.forEach((term, i) => {
                    const idx = i + 1;
                    const sel = idx === 1 ? '' : '';
                    const qEsc = escapeHtml(term);
                    html += `<div class="cmd-palette-result cmd-palette-result--recent${sel}" data-type="recent" data-index="${idx}" data-query="${qEsc}">`;
                    html += '<svg class="icon cmd-palette-recent-icon" aria-hidden="true"><use href="img/sprites/regular.svg#magnifying-glass"></use></svg>';
                    html += `<span class="cmd-palette-recent-label">${qEsc}</span>`;
                    html += `<button type="button" class="cmd-palette-recent-remove" data-query="${qEsc}" aria-label="Remove from recent searches">`;
                    html += '<svg class="icon" aria-hidden="true"><use href="img/sprites/regular.svg#xmark"></use></svg>';
                    html += '</button>';
                    html += '</div>';
                });
                html += '</div>';
            }

            list.innerHTML = html;
            selectedResultIndex = 0;
            attachDefaultHandlers(list);
            return;
        }

        const showEntryNumbers = true;
        const termLower = term.trim().toLowerCase();

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

        const tagToken = tokens.find(t => t.type === 'tag');
        const arcToken = tokens.find(t => t.type === 'arc');
        const tagTerm = tagToken ? tagToken.value : (mode === 'tag' ? term : '');
        const arcTerm = arcToken ? arcToken.value : (mode === 'arc' ? term : '');
        const keywords = tokens.filter(t => t.type === 'keyword').map(t => t.value);
        const keywordForHighlight = keywords[0] || (mode === 'text' ? term : '');

        const hasTagToken = !!tagToken;
        const hasArcToken = !!arcToken;

        let matchingTags = [];
        let matchingArcs = [];
        let entries = [];

        if (tokens.length === 1 && tokens[0].type === 'tag') {
            matchingTags = getMatchingTags(tagTerm);
        } else if (tokens.length === 1 && tokens[0].type === 'arc') {
            matchingArcs = getMatchingArcs(arcTerm);
        } else if (tokens.length === 1 && tokens[0].type === 'entry') {
            entries = getResults(query);
        } else {
            // General case: entries come from full multi-search.
            entries = getResults(query);

            // Tags/Arcs sections only when @ or / is present (avoids confusion for plain keyword).
            // Plain keyword → Entries only. @tag or /arc (including chips) → show Tag/Arc sections.
            if (hasTagToken || mode === 'tag') {
                matchingTags = getMatchingTags(tagTerm);
            }
            if (hasArcToken || mode === 'arc') {
                matchingArcs = getMatchingArcs(arcTerm);
            }
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
            const entryMode = mode === 'entry' ? 'entry' : (keywordForHighlight ? 'text' : mode);
            html += `<div class="cmd-palette-section"><div class="cmd-palette-section-title">Entries</div>`;
            entries.forEach((entry, i) => {
                html += buildResultHTML(entry, globalIndex++, entryMode, keywordForHighlight || term, showEntryNumbers);
            });
            html += '</div>';
        }

        list.innerHTML = html;

        // Enter = save, Escape = revert (arc edit mode)
        list.addEventListener('keydown', (e) => {
            const editMode = document.activeElement?.closest('.cmd-arc-bar-edit-mode');
            const isVisibleEdit = editMode && !editMode.hasAttribute('hidden');
            if (e.key === 'Escape' && isVisibleEdit) {
                e.preventDefault();
                const row = editMode.closest('.cmd-palette-result');
                const viewRow = row?.querySelector('.cmd-arc-bar-row:not(.cmd-arc-bar-edit-mode)');
                if (viewRow) {
                    editMode.setAttribute('hidden', '');
                    viewRow.removeAttribute('hidden');
                    document.activeElement?.blur();
                }
                return;
            }
            if (e.key !== 'Enter') return;
            const input = e.target.closest('.cmd-arc-bar-title-input');
            if (!input) return;
            const row = input.closest('.cmd-palette-result');
            const arcKey = row?.getAttribute('data-arc-key');
            if (arcKey && typeof updateArcName === 'function') {
                e.preventDefault();
                updateArcName(arcKey, input.value.trim() || 'Untitled');
                        renderResults(fullQuery);
            }
        });

        // Attach click handlers (use mousedown to beat blur)
        list.querySelectorAll('.cmd-palette-result').forEach(el => {
            el.addEventListener('mousedown', e => {
                const type = el.getAttribute('data-type');
                const currentQuery = fullQuery;

                if (type === 'arc') {
                    const arcKey = el.getAttribute('data-arc-key');
                    const viewRow = el.querySelector('.cmd-arc-bar-row:not(.cmd-arc-bar-edit-mode)');
                    const editRow = el.querySelector('.cmd-arc-bar-edit-mode');
                    const isEditing = editRow && !editRow.hasAttribute('hidden');
                    const editBtn = e.target.closest('.cmd-arc-bar-edit');
                    const saveBtn = e.target.closest('.cmd-arc-bar-save');
                    const colorBtn = e.target.closest('.arc-color-btn');
                    const titleInput = e.target.closest('.cmd-arc-bar-title-input');
                    if (editBtn && !isEditing) {
                        e.preventDefault();
                        e.stopPropagation();
                        viewRow.setAttribute('hidden', '');
                        editRow.removeAttribute('hidden');
                        const input = editRow.querySelector('.cmd-arc-bar-title-input');
                        if (input) {
                            input.focus();
                            input.select();
                        }
                        return;
                    }
                    if (saveBtn && arcKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        const input = el.querySelector('.cmd-arc-bar-title-input');
                        const newName = input ? input.value.trim() : '';
                        if (typeof updateArcName === 'function') {
                            updateArcName(arcKey, newName || 'Untitled');
                        }
                        renderResults(currentQuery);
                        return;
                    }
                    if (colorBtn && arcKey && isEditing) {
                        e.preventDefault();
                        e.stopPropagation();
                        const color = colorBtn.getAttribute('data-color');
                        if (color && typeof updateArcColor === 'function') {
                            updateArcColor(arcKey, color);
                            const colorClass = color === 'amber' ? 'orange-red' : color === 'green' ? 'lime' : color === 'teal' ? 'aqua' : color === 'pink' ? 'magenta' : color;
                            editRow.querySelector('.cmd-result-arc-bar').className = `cmd-result-arc-bar arc-color--${colorClass}`;
                            editRow.querySelectorAll('.arc-color-btn').forEach(btn => {
                                btn.classList.toggle('selected', btn.getAttribute('data-color') === color);
                            });
                        }
                        return;
                    }
                    if (titleInput) return;
                    if (isEditing) {
                        e.preventDefault();
                        e.stopPropagation();
                        editRow.setAttribute('hidden', '');
                        viewRow.removeAttribute('hidden');
                        return;
                    }
                    e.preventDefault();
                    addRecentSearch(currentQuery);
                    closeCommandPalette();
                    if (arcKey) scrollToArc(arcKey);
                    return;
                }

                e.preventDefault();
                const { mode: m, term: t } = detectMode(currentQuery);

                if (type === 'tag') {
                    addRecentSearch(currentQuery);
                    const tagName = el.getAttribute('data-tag-name');
                    if (tagName && typeof selectedTags !== 'undefined') {
                        selectedTags.add(tagName);
                        if (typeof refreshTagFilter === 'function') refreshTagFilter();
                        if (typeof filterData === 'function') filterData();
                        if (typeof openFilterSidesheet === 'function') openFilterSidesheet();
                    }
                    closeCommandPalette();
                } else if (type === 'scroll') {
                    addRecentSearch(currentQuery);
                    const direction = el.getAttribute('data-scroll-direction');
                    closeCommandPalette();
                    if (direction === 'top') scrollToTop();
                    else if (direction === 'end') scrollToEnd();
                } else {
                    addRecentSearch(currentQuery);
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
        if (e.key === 'Backspace') {
            const input = document.getElementById('cmdPaletteInput');
            const { committed } = splitCommittedAndInProgress(fullQuery);
            if (input && input.value === '' && committed.length > 0) {
                e.preventDefault();
                const withoutLast = committed.slice(0, -1).map(t => t.raw).join(' ');
                const lastRaw = committed[committed.length - 1].raw;
                fullQuery = withoutLast ? withoutLast + ' ' + lastRaw : lastRaw;
                renderResults(fullQuery);
                input.focus();
                return;
            }
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

                if (type === 'action') {
                    const action = el.getAttribute('data-action');
                    if (action === 'add-entry' && typeof openAddEntryModal === 'function') {
                        closeCommandPalette();
                        openAddEntryModal();
                    }
                } else if (type === 'recent') {
                    const query = el.getAttribute('data-query') || '';
                    fullQuery = query;
                    const input = document.getElementById('cmdPaletteInput');
                    const tokensEl = document.getElementById('cmdPaletteTokens');
                    if (input) {
                        const { committed, inProgress } = splitCommittedAndInProgress(query);
                        input.value = inProgress;
                        if (tokensEl) tokensEl.innerHTML = committed.map(t => `<kbd class="cmd-query-token">${escapeHtml(t.raw)}</kbd>`).join('');
                    }
                    renderResults(fullQuery);
                } else if (type === 'tag') {
                    addRecentSearch(fullQuery);
                    const tagName = el.getAttribute('data-tag-name');
                    if (tagName && typeof selectedTags !== 'undefined') {
                        selectedTags.add(tagName);
                        if (typeof refreshTagFilter === 'function') refreshTagFilter();
                        if (typeof filterData === 'function') filterData();
                        if (typeof openFilterSidesheet === 'function') openFilterSidesheet();
                    }
                    closeCommandPalette();
                } else if (type === 'arc') {
                    addRecentSearch(fullQuery);
                    const arcKey = el.getAttribute('data-arc-key');
                    closeCommandPalette();
                    if (arcKey) scrollToArc(arcKey);
                } else if (type === 'scroll') {
                    addRecentSearch(fullQuery);
                    const direction = el.getAttribute('data-scroll-direction');
                    closeCommandPalette();
                    if (direction === 'top') scrollToTop();
                    else if (direction === 'end') scrollToEnd();
                } else {
                    addRecentSearch(fullQuery);
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
                    <div class="cmd-palette-input-wrap">
                        <span id="cmdPaletteTokens" class="cmd-palette-tokens" aria-live="polite"></span>
                        <input
                            type="text"
                            id="cmdPaletteInput"
                            class="cmd-palette-input"
                            placeholder="Search: keyword, @tag, /arc..."
                            autocomplete="off"
                            spellcheck="false"
                            aria-label="Search"
                        >
                    </div>
                    <span id="cmdPaletteModeBadge" class="cmd-palette-mode-badge" aria-live="polite"></span>
                </div>
                <div id="cmdPaletteResults" class="cmd-palette-results"></div>
                <div class="cmd-palette-footer">

                    <div class="cmd-palette-footer-hints">
                        <span class="cmd-palette-footer-hint">
                            Combine: <kbd>word</kbd> <kbd>@tag</kbd> <kbd>/arc</kbd> <kbd>#entry-number</kbd>
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

        // Click outside arc edit mode: revert without saving
        overlay.addEventListener('mousedown', (e) => {
            const clickedInsideVisibleEdit = e.target.closest('.cmd-arc-bar-edit-mode:not([hidden])');
            if (clickedInsideVisibleEdit) return;
            const visibleEdit = overlay.querySelector('.cmd-arc-bar-edit-mode:not([hidden])');
            if (!visibleEdit) return;
            const row = visibleEdit.closest('.cmd-palette-result');
            const viewRow = row?.querySelector('.cmd-arc-bar-row:not(.cmd-arc-bar-edit-mode)');
            if (viewRow) {
                visibleEdit.setAttribute('hidden', '');
                viewRow.removeAttribute('hidden');
                document.activeElement?.blur();
            }
        }, true);

        // Scrollbar visible only while scrolling
        const resultsEl = document.getElementById('cmdPaletteResults');
        if (resultsEl) {
            let scrollHideTimer;
            resultsEl.addEventListener('scroll', () => {
                resultsEl.classList.add('is-scrolling');
                clearTimeout(scrollHideTimer);
                scrollHideTimer = setTimeout(() => {
                    resultsEl.classList.remove('is-scrolling');
                }, 400);
            });
        }

        // Input events (chips + input: input shows in-progress, full query = committed + in-progress)
        const input = document.getElementById('cmdPaletteInput');
        function syncFullQueryFromInput() {
            const inp = document.getElementById('cmdPaletteInput');
            if (!inp) return;
            const { committed } = splitCommittedAndInProgress(fullQuery);
            const newInProgress = inp.value;
            fullQuery = (committed.map(t => t.raw).join(' ') + (committed.length && newInProgress ? ' ' : '')) + newInProgress;
            renderResults(fullQuery);
        }
        input.addEventListener('input', () => {
            selectedResultIndex = -1;
            syncFullQueryFromInput();
        });
        input.addEventListener('paste', () => {
            setTimeout(syncFullQueryFromInput, 0);
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
                e.stopPropagation();
                openCommandPalette();
            });
        }
    }

    function wireGlobalShortcut() {
        // Use capture so we intercept before app.js / keyboard-shortcuts.js
        document.addEventListener('keydown', e => {
            if (paletteOpen && (e.key === 'Escape' || e.key === 'Esc')) {
                e.preventDefault();
                e.stopPropagation();
                if (fullQuery.trim()) {
                    fullQuery = '';
                    const input = document.getElementById('cmdPaletteInput');
                    const tokensEl = document.getElementById('cmdPaletteTokens');
                    if (input) {
                        input.value = '';
                        input.blur();
                    }
                    if (tokensEl) tokensEl.innerHTML = '';
                    renderResults('');
                } else {
                    closeCommandPalette();
                }
                return;
            }

            // Cmd+K / Ctrl+K (with or without Shift for backward compat)
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
                if (e.repeat) return; // Ignore key repeat so palette doesn't close immediately
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
        if (!paletteOpen) return;
        if (detectMode(fullQuery).mode === 'arc') renderResults(fullQuery);
    };

})();