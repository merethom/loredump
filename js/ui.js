// UI rendering functions

const TAG_COLORS = { purple: 1, green: 1, blue: 1, orange: 1, teal: 1, pink: 1, amber: 1, slate: 1 };

const DEFAULT_TAG_COLOR = 'slate';

const ADD_ENTRY_PLACEHOLDER_OPTIONS = [
    'Once upon a time there was a silly little rat...',
    'Who slept with Ethak this time?',
    'Fool! The void awaits your words...',
    'Corvy the best, write of his greatness.',
    'LIIIIIINNNNNAAAAA',
    'You know, Nox, I\'m sure Cylene would be happy to help you write our histories.'
];

// ---------------------------------------------------------------------------
// Arc reorder mode (drag/drop within an arc)
// ---------------------------------------------------------------------------

let reorderArcKey = null;
let reorderDraggedEntryNumber = null;
let reorderDropTargetNumber = null;
let reorderDragHandleArmed = false;

function parseEntryTags(tagsStr) {
    if (!tagsStr || !tagsStr.trim()) return [];
    return tagsStr.split(',').map(part => {
        part = part.trim();
        if (!part) return null;
        const pipeIdx = part.lastIndexOf('|');
        if (pipeIdx > -1) {
            const name = part.slice(0, pipeIdx).trim();
            const color = part.slice(pipeIdx + 1).trim();
            if (!name) return null;
            return { name, color: TAG_COLORS[color] ? color : DEFAULT_TAG_COLOR };
        }
        return { name: part, color: DEFAULT_TAG_COLOR };
    }).filter(Boolean);
}

function serializeEntryTags(tags) {
    return tags.map(t => `${t.name}|${t.color}`).join(', ');
}

function getTagClass(color) {
    const c = TAG_COLORS[color] ? color : DEFAULT_TAG_COLOR;
    return `tag tag--${c}`;
}

const LORE_TAG_COLOR_MAP = { pink: 'magenta', green: 'lime', teal: 'aqua', amber: 'orange-red' };
function getLoreTagColorClass(color) {
    const c = TAG_COLORS[color] ? color : DEFAULT_TAG_COLOR;
    return LORE_TAG_COLOR_MAP[c] || c;
}

function getEntryTagsForDisplay(entry) {
    // Only show tags explicitly saved on the entry (not auto-detected suggestions)
    return parseEntryTags(entry.Tags).map(t => ({ name: t.name, color: t.color }));
}

function renderDatabase() {
    const db = document.getElementById('database');
    const emptyState = document.getElementById('emptyState');

    if (filteredData.length === 0) {
        db.innerHTML = '';
        emptyState.classList.add('show');
        return;
    }

    emptyState.classList.remove('show');

    // Group entries by arc key
    const arcsMap = new Map();
    filteredData.forEach(entry => {
        const entryNum = parseFloat(entry.Number);
        const arcKey = Math.floor(entryNum).toString();
        if (!arcsMap.has(arcKey)) arcsMap.set(arcKey, []);
        arcsMap.get(arcKey).push(entry);
    });

    const sortedArcKeys = Array.from(arcsMap.keys()).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    const collapsedArcKeys = (typeof window.collapsedArcKeys !== 'undefined' && window.collapsedArcKeys) || (window.collapsedArcKeys = new Set());
    let html = '';

    sortedArcKeys.forEach(arcKey => {
        const entries = arcsMap.get(arcKey) || [];
        const arcData = allArcs[arcKey] || { name: '', color: 'slate' };

        const sortKey = (typeof currentSort !== 'undefined' && currentSort) || 'entry-asc';
        const sortedEntries = entries.slice().sort((a, b) => {
            const aNum = parseFloat(a.Number);
            const bNum = parseFloat(b.Number);
            return sortKey === 'entry-desc' ? bNum - aNum : aNum - bNum;
        });

        const arcDisplayName = arcData.name ? `Arc ${arcKey}: ${arcData.name}` : `Arc ${arcKey}`;
        const arcColorClass = arcData.color === 'amber' ? 'orange-red' : arcData.color === 'green' ? 'lime' : arcData.color === 'teal' ? 'aqua' : arcData.color === 'pink' ? 'magenta' : arcData.color;
        const isCollapsed = collapsedArcKeys.has(arcKey);
        const chevronIcon = isCollapsed ? 'chevron-up' : 'chevron-down';

        html += `
            <div class="arc-scroll-anchor" data-arc-key="${arcKey}"></div>
            <div class="db-arc-header" data-arc-key="${arcKey}">
                <div class="arc-title">
                    <div class="arc-color-indicator arc-color--${arcColorClass}"></div>
                    <button type="button" class="arc-chevron-btn" data-arc-key="${arcKey}" aria-expanded="${!isCollapsed}" aria-label="${isCollapsed ? 'Expand' : 'Collapse'} arc">
                        <svg class="icon" aria-hidden="true">
                            <use href="img/sprites/regular.svg#${chevronIcon}"></use>
                        </svg>
                    </button>
                    <span class="arc-header-label">${arcDisplayName}</span>
                    <span class="arc-entry-count">${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</span>
                    <button type="button" class="arc-kebab-btn" aria-label="Arc actions" title="Arc actions">
                        <svg class="icon" aria-hidden="true"><use href="img/sprites/regular.svg#ellipsis-vertical"></use></svg>
                    </button>
                    <button type="button" class="arc-reorder-done" data-arc-key="${arcKey}" aria-label="Done reordering">Done</button>
                </div>
            </div>
            <div class="db-arc-entries" data-arc-key="${arcKey}"${isCollapsed ? ' hidden' : ''}>
        `;

        sortedEntries.forEach(entry => {
            const tags = getEntryTagsForDisplay(entry);
            const tagsHtml = tags.map(t =>
                `<span class="${getTagClass(t.color)}" data-name="${escapeHtml(t.name)}">${escapeHtml(t.name)}</span>`
            ).join('');

            html += `
                <div class="card card-arc card-arc--${arcColorClass}" data-entry-number="${entry.Number}" data-arc-key="${arcKey}">
                    <div class="card-body-row">
                        <button type="button" class="card-grip-btn" aria-label="Reorder entry" title="Drag to reorder" tabindex="-1">
                            <svg class="icon" aria-hidden="true"><use href="img/sprites/regular.svg#grip-vertical"></use></svg>
                        </button>
                        <div class="card-description">${escapeHtml(entry.Description)}</div>
                    </div>
                    <div class="card-divider"></div>
                    <div class="card-footer">
                        <span class="card-number">${entry.Number}</span>
                        <div class="card-tags">
                            ${tagsHtml}
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
    });

    db.innerHTML = html;

    updateArcTimeline();
    // If we were in reorder mode, re-apply it after re-render.
    if (reorderArcKey) {
        setTimeout(() => enterReorderMode(reorderArcKey), 0);
    }

    // Event delegation is set up once in setupDatabaseEventDelegation()
    // No need to add listeners here anymore!
}

/**
 * Builds the vertical arc timeline from current arc headers and updates current arc on scroll.
 */
function updateArcTimeline() {
    const container = document.getElementById('arcTimeline');
    if (!container) return;

    const headers = document.querySelectorAll('.db-arc-header');
    let html = '';
    headers.forEach((header, i) => {
        const key = header.getAttribute('data-arc-key');
        if (!key) return;
        const colorEl = header.querySelector('.arc-color-indicator');
        const colorClass = colorEl ? Array.from(colorEl.classList).find(function(c) { return c.startsWith('arc-color--'); }) || 'arc-color--slate' : 'arc-color--slate';
        const arcData = (typeof allArcs !== 'undefined' && allArcs[key]) || { name: '' };
        const arcLabel = arcData.name ? 'Arc ' + key + ': ' + arcData.name : 'Arc ' + key;
        if (i > 0) html += '<div class="arc-timeline-line"></div>';
        html += '<button type="button" class="arc-timeline-dot ' + escapeHtml(colorClass) + '" data-arc-key="' + escapeHtml(key) + '" data-arc-label="' + escapeHtml(arcLabel) + '" data-arc-color="' + escapeHtml(colorClass) + '" aria-label="Go to ' + escapeHtml(arcLabel) + '"></button>';
    });
    container.innerHTML = html;

    if (!container._hasTimelineDelegation) {
        container._hasTimelineDelegation = true;
        var tooltipEl = document.getElementById('arc-timeline-tooltip');
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = 'arc-timeline-tooltip';
            tooltipEl.className = 'arc-timeline-tooltip';
            tooltipEl.setAttribute('aria-hidden', 'true');
            tooltipEl.innerHTML = '<span class="arc-timeline-tooltip-bar arc-color-indicator arc-color--slate"></span><span class="arc-timeline-tooltip-label"></span>';
            document.body.appendChild(tooltipEl);
        }
        container.addEventListener('mouseover', function(e) {
            var dot = e.target.closest('.arc-timeline-dot');
            if (!dot) return;
            var label = dot.getAttribute('data-arc-label');
            var colorClass = dot.getAttribute('data-arc-color') || 'arc-color--slate';
            if (label && tooltipEl) {
                var bar = tooltipEl.querySelector('.arc-timeline-tooltip-bar');
                var labelEl = tooltipEl.querySelector('.arc-timeline-tooltip-label');
                if (bar) {
                    bar.className = 'arc-timeline-tooltip-bar arc-color-indicator ' + colorClass;
                }
                if (labelEl) labelEl.textContent = label;
                var rect = dot.getBoundingClientRect();
                tooltipEl.style.left = (rect.left - 8) + 'px';
                tooltipEl.style.top = (rect.top + rect.height / 2) + 'px';
                tooltipEl.style.transform = 'translate(-100%, -50%)';
                tooltipEl.classList.add('visible');
            }
        }, true);
        container.addEventListener('mouseleave', function(e) {
            if (!e.relatedTarget || !container.contains(e.relatedTarget)) {
                tooltipEl.classList.remove('visible');
            }
        }, true);
        container.addEventListener('click', function(e) {
            const dot = e.target.closest('.arc-timeline-dot');
            if (!dot) return;
            e.preventDefault();
            e.stopPropagation();
            const arcKey = dot.getAttribute('data-arc-key');
            if (arcKey && typeof window.scrollToArc === 'function') window.scrollToArc(arcKey);
            return false;
        }, true);
        const scrollEl = document.querySelector('.app-main-content');
        if (scrollEl) {
            scrollEl.addEventListener('scroll', updateCurrentArcDotFromScroll);
        }
    }
    updateCurrentArcDotFromScroll();
}

function updateCurrentArcDotFromScroll() {
    const container = document.getElementById('arcTimeline');
    const scrollEl = document.querySelector('.app-main-content');
    if (!container || !scrollEl) return;
    const headers = document.querySelectorAll('.db-arc-header');
    const scrollRect = scrollEl.getBoundingClientRect();
    const threshold = scrollRect.top + 120;
    let currentKey = null;
    headers.forEach(function(header) {
        const r = header.getBoundingClientRect();
        if (r.top <= threshold) currentKey = header.getAttribute('data-arc-key');
    });
    container.querySelectorAll('.arc-timeline-dot').forEach(function(dot) {
        dot.classList.toggle('current', dot.getAttribute('data-arc-key') === currentKey);
    });
}

/**
 * Sets up event delegation for database cards (called once on init)
 * This prevents memory leaks from adding new listeners on every render
 */
function setupDatabaseEventDelegation() {
    const db = document.getElementById('database');
    if (!db) return;

    // Only set up the listener once
    if (db._hasCardDelegation) return;
    db._hasCardDelegation = true;

    db.addEventListener('click', (e) => {
        const doneBtn = e.target.closest('.arc-reorder-done');
        if (doneBtn) {
            e.preventDefault();
            e.stopPropagation();
            exitReorderMode();
            return;
        }

        const arcKebabBtn = e.target.closest('.arc-kebab-btn');
        if (arcKebabBtn) {
            e.preventDefault();
            e.stopPropagation();
            const header = arcKebabBtn.closest('.db-arc-header');
            const arcKey = header ? header.getAttribute('data-arc-key') : null;
            if (arcKey) openArcActionsMenu(arcKebabBtn, arcKey);
            return;
        }

        const chevronBtn = e.target.closest('.arc-chevron-btn');
        if (chevronBtn) {
            e.preventDefault();
            e.stopPropagation();
            const arcKey = chevronBtn.getAttribute('data-arc-key');
            if (!arcKey) return;
            const collapsedArcKeys = (typeof window.collapsedArcKeys !== 'undefined' && window.collapsedArcKeys) || (window.collapsedArcKeys = new Set());
            const header = chevronBtn.closest('.db-arc-header');
            const entriesEl = header && header.nextElementSibling;
            if (entriesEl && entriesEl.classList.contains('db-arc-entries')) {
                const isCollapsed = entriesEl.hidden;
                if (isCollapsed) {
                    collapsedArcKeys.delete(arcKey);
                    entriesEl.hidden = false;
                    const use = chevronBtn.querySelector('use');
                    if (use) use.setAttribute('href', 'img/sprites/regular.svg#chevron-down');
                    chevronBtn.setAttribute('aria-expanded', 'true');
                    chevronBtn.setAttribute('aria-label', 'Collapse arc');
                } else {
                    collapsedArcKeys.add(arcKey);
                    entriesEl.hidden = true;
                    const use = chevronBtn.querySelector('use');
                    if (use) use.setAttribute('href', 'img/sprites/regular.svg#chevron-up');
                    chevronBtn.setAttribute('aria-expanded', 'false');
                    chevronBtn.setAttribute('aria-label', 'Expand arc');
                }
            }
            return;
        }

        const gripBtn = e.target.closest('.card-grip-btn');
        if (gripBtn) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // Find the card that was clicked
        const card = e.target.closest('.card');
        if (!card) return;

        // Don't open modal if clicking on a tag
        if (e.target.closest('.card-tags .tag')) return;

        // Card click no longer opens edit; actions live in entry context menu.
    });

    db.addEventListener('contextmenu', (e) => {
        const card = e.target.closest('.card[data-entry-number]');
        if (!card) return;
        if (e.target.closest('.card-tags .tag')) return;
        if (reorderArcKey) return;
        e.preventDefault();
        e.stopPropagation();
        const entryNumber = card.getAttribute('data-entry-number');
        if (entryNumber) openEntryActionsMenu(e, entryNumber);
    });

    // Arm drag only when the user starts interaction on the grip.
    db.addEventListener('mousedown', (e) => {
        reorderDragHandleArmed = !!e.target.closest('.card-grip-btn');
    }, true);

    db.addEventListener('dragstart', (e) => {
        if (!reorderArcKey) return;
        const card = e.target.closest('.card[data-entry-number][data-arc-key]');
        if (!card) return;
        if (!reorderDragHandleArmed) {
            e.preventDefault();
            return;
        }
        if (card.getAttribute('data-arc-key') !== String(reorderArcKey)) {
            e.preventDefault();
            return;
        }
        reorderDraggedEntryNumber = card.getAttribute('data-entry-number');
        card.classList.add('card--dragging');
        e.dataTransfer.effectAllowed = 'move';
        try {
            e.dataTransfer.setData('text/plain', reorderDraggedEntryNumber || '');
        } catch (_) {}
    });

    db.addEventListener('dragover', (e) => {
        if (!reorderArcKey || !reorderDraggedEntryNumber) return;
        const card = e.target.closest('.card[data-entry-number][data-arc-key]');
        if (!card) return;
        if (card.getAttribute('data-arc-key') !== String(reorderArcKey)) return;
        const targetNum = card.getAttribute('data-entry-number');
        if (!targetNum || targetNum === reorderDraggedEntryNumber) return;

        e.preventDefault();
        reorderDropTargetNumber = targetNum;

        let indicator = document.getElementById('reorderInsertIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'reorderInsertIndicator';
            indicator.className = 'reorder-insert-indicator';
            indicator.setAttribute('aria-hidden', 'true');
        }
        const container = document.querySelector(`.db-arc-entries[data-arc-key="${reorderArcKey}"]`);
        if (container) container.insertBefore(indicator, card);
    });

    db.addEventListener('drop', (e) => {
        if (!reorderArcKey || !reorderDraggedEntryNumber || !reorderDropTargetNumber) return;
        e.preventDefault();
        reorderEntriesInArc(reorderArcKey, reorderDraggedEntryNumber, reorderDropTargetNumber);
        cleanupReorderDragState();
    });

    db.addEventListener('dragend', (e) => {
        cleanupReorderDragState();
    });

    // Escape exits reorder mode
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!reorderArcKey) return;
        exitReorderMode();
    });
}

function deleteEntryByNumber(entryNumber) {
    const entry = allData.find(e => String(e.Number) === String(entryNumber) || parseFloat(e.Number) === parseFloat(entryNumber));
    if (!entry) return;
    if (!confirm(`Delete Entry #${entry.Number}?`)) return;
    const deletedStr = String(entry.Number);
    const deletedNum = parseFloat(deletedStr);
    if (isNaN(deletedNum)) return;
    const arcKey = Math.floor(deletedNum).toString();
    const decimals = getDecimalPlacesFromNumberString(deletedStr);
    const step = Math.pow(10, -decimals);
    const idx = allData.findIndex(e => String(e.Number) === String(entry.Number) || parseFloat(e.Number) === parseFloat(entry.Number));
    if (idx > -1) allData.splice(idx, 1);

    // Close the gap: shift later entries in the same arc down by one step.
    const arcEntries = allData
        .filter(e => {
            const n = parseFloat(e.Number);
            return !isNaN(n) && Math.floor(n).toString() === arcKey && n > deletedNum + (step / 10);
        })
        .slice()
        .sort((a, b) => parseFloat(a.Number) - parseFloat(b.Number)); // ascending to avoid collisions while subtracting

    arcEntries.forEach(e => {
        const n = parseFloat(e.Number);
        e.Number = formatEntryNumber(n - step, decimals);
    });

    allData.sort((a, b) => parseFloat(a.Number) - parseFloat(b.Number));
    if (typeof syncTagsFromDocument === 'function') syncTagsFromDocument();
    if (typeof saveLoreToFirebase === 'function') saveLoreToFirebase();
    if (typeof refreshTagFilter === 'function') refreshTagFilter();
    if (typeof filterData === 'function') filterData();
}

function openEntryActionsMenu(anchorBtn, entryNumber) {
    let menu = document.getElementById('entryActionsMenu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'entryActionsMenu';
        menu.className = 'entry-actions-menu';
        menu.setAttribute('role', 'menu');
        menu.innerHTML = `
            <button type="button" class="entry-actions-item" data-action="edit" role="menuitem">
                <svg class="icon" aria-hidden="true"><use href="img/sprites/regular.svg#pen"></use></svg>
                <span class="entry-actions-label">Edit entry</span>
            </button>
            <button type="button" class="entry-actions-item entry-actions-item--danger" data-action="delete" role="menuitem">
                <svg class="icon" aria-hidden="true"><use href="img/sprites/regular.svg#trash"></use></svg>
                <span class="entry-actions-label">Delete entry</span>
            </button>
            <div class="entry-actions-divider" role="separator"></div>
            <button type="button" class="entry-actions-item" data-action="add-before" role="menuitem">
                <svg class="icon" aria-hidden="true"><use href="img/sprites/regular.svg#arrow-up"></use></svg>
                <span class="entry-actions-label">Add before</span>
            </button>
            <button type="button" class="entry-actions-item" data-action="add-after" role="menuitem">
                <svg class="icon" aria-hidden="true"><use href="img/sprites/regular.svg#arrow-down"></use></svg>
                <span class="entry-actions-label">Add after</span>
            </button>
            <div class="entry-actions-divider" role="separator"></div>
            <button type="button" class="entry-actions-item" data-action="edit-order" role="menuitem">
                <svg class="icon" aria-hidden="true"><use href="img/sprites/regular.svg#grip-vertical"></use></svg>
                <span class="entry-actions-label">Edit order</span>
            </button>
        `;
        document.body.appendChild(menu);

        document.addEventListener('mousedown', (ev) => {
            if (!menu.classList.contains('open')) return;
            if (ev.target.closest('#entryActionsMenu')) return;
            menu.classList.remove('open');
        }, true);

        document.addEventListener('keydown', (ev) => {
            if (ev.key !== 'Escape') return;
            if (!menu.classList.contains('open')) return;
            menu.classList.remove('open');
        }, true);

        menu.addEventListener('click', (ev) => {
            const btn = ev.target.closest('.entry-actions-item[data-action]');
            if (!btn) return;
            ev.preventDefault();
            ev.stopPropagation();
            const action = btn.getAttribute('data-action');
            const num = menu.getAttribute('data-entry-number');
            menu.classList.remove('open');
            if (!num) return;
            if (action === 'edit') {
                if (typeof openEditEntryModal === 'function') openEditEntryModal(num);
            } else if (action === 'delete') {
                deleteEntryByNumber(num);
            } else if (action === 'add-before') {
                insertEntryRelativeTo(num, 'before');
            } else if (action === 'add-after') {
                insertEntryRelativeTo(num, 'after');
            } else if (action === 'edit-order') {
                const arcKey = getArcKeyFromEntryNumber(num);
                if (arcKey) enterReorderMode(arcKey);
            } else {
                // Intentionally no-op for now (future actions).
            }
        });
    }

    menu.setAttribute('data-entry-number', entryNumber);
    menu.classList.add('open');

    const pad = 8;
    const firstItem = menu.querySelector('.entry-actions-item');
    const mRect = menu.getBoundingClientRect();
    const fRect = firstItem ? firstItem.getBoundingClientRect() : null;

    const isEvent = anchorBtn && 'clientX' in anchorBtn && 'clientY' in anchorBtn;
    if (isEvent) {
        // Right-click context menu: position top-left at cursor.
        let menuLeft = anchorBtn.clientX;
        let menuTop = anchorBtn.clientY;
        menu.style.transform = '';
        menuLeft = Math.max(pad, Math.min(menuLeft, window.innerWidth - mRect.width - pad));
        menuTop = Math.max(pad, Math.min(menuTop, window.innerHeight - mRect.height - pad));
        menu.style.left = menuLeft + 'px';
        menu.style.top = menuTop + 'px';
    } else {
        // Anchor button: position so the first row sits under the button.
        const rect = anchorBtn.getBoundingClientRect();
        menu.style.left = rect.right + 'px';
        menu.style.top = rect.top + 'px';
        menu.style.transform = 'translateX(-100%)';
        const desiredY = rect.top + rect.height / 2;
        const firstCenterOffset = fRect ? (fRect.top - mRect.top) + (fRect.height / 2) : 0;
        let anchorX = rect.right;
        let menuTop = desiredY - firstCenterOffset;
        anchorX = Math.max(pad + mRect.width, Math.min(anchorX, window.innerWidth - pad));
        menuTop = Math.max(pad, Math.min(menuTop, window.innerHeight - mRect.height - pad));
        menu.style.left = anchorX + 'px';
        menu.style.top = menuTop + 'px';
    }
}

function openArcActionsMenu(anchorBtn, arcKey) {
    let menu = document.getElementById('arcActionsMenu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'arcActionsMenu';
        menu.className = 'entry-actions-menu';
        menu.setAttribute('role', 'menu');
        menu.innerHTML = `
            <button type="button" class="entry-actions-item" data-arc-action="edit-arc" role="menuitem">
                <svg class="icon" aria-hidden="true"><use href="img/sprites/regular.svg#pen"></use></svg>
                <span class="entry-actions-label">Edit arc</span>
            </button>
            <button type="button" class="entry-actions-item" data-arc-action="reorder-entries" role="menuitem">
                <svg class="icon" aria-hidden="true"><use href="img/sprites/regular.svg#grip-vertical"></use></svg>
                <span class="entry-actions-label">Reorder entries</span>
            </button>
        `;
        document.body.appendChild(menu);

        document.addEventListener('mousedown', (ev) => {
            if (!menu.classList.contains('open')) return;
            if (ev.target.closest('#arcActionsMenu')) return;
            menu.classList.remove('open');
        }, true);

        document.addEventListener('keydown', (ev) => {
            if (ev.key !== 'Escape') return;
            if (!menu.classList.contains('open')) return;
            menu.classList.remove('open');
        }, true);

        menu.addEventListener('click', (ev) => {
            const btn = ev.target.closest('.entry-actions-item[data-arc-action]');
            if (!btn) return;
            ev.preventDefault();
            ev.stopPropagation();
            const action = btn.getAttribute('data-arc-action');
            const key = menu.getAttribute('data-arc-key');
            menu.classList.remove('open');
            if (!key) return;
            if (action === 'edit-arc') {
                if (typeof openArcEditor === 'function') {
                    openArcEditor();
                    // Optionally, in future we could scroll to the arc in the list.
                }
            } else if (action === 'reorder-entries') {
                enterReorderMode(key);
            }
        });
    }

    menu.setAttribute('data-arc-key', arcKey);
    menu.classList.add('open');

    const rect = anchorBtn.getBoundingClientRect();
    menu.style.left = rect.right + 'px';
    menu.style.top = rect.top + 'px';
    menu.style.transform = 'translateX(-100%)';

    const pad = 8;
    const firstItem = menu.querySelector('.entry-actions-item');
    const mRect = menu.getBoundingClientRect();
    const fRect = firstItem ? firstItem.getBoundingClientRect() : null;

    const desiredY = rect.top + rect.height / 2;
    const firstCenterOffset = fRect ? (fRect.top - mRect.top) + (fRect.height / 2) : 0;

    let anchorX = rect.right;
    let menuTop = desiredY - firstCenterOffset;

    anchorX = Math.max(pad + mRect.width, Math.min(anchorX, window.innerWidth - pad));
    menuTop = Math.max(pad, Math.min(menuTop, window.innerHeight - mRect.height - pad));

    menu.style.left = anchorX + 'px';
    menu.style.top = menuTop + 'px';
}

function enterReorderMode(arcKey) {
    if (!arcKey) return;
    reorderArcKey = String(arcKey);
    document.body.classList.add('reorder-mode');
    document.body.setAttribute('data-reorder-arc', reorderArcKey);

    // Enable draggable only for cards in this arc.
    document.querySelectorAll('.card[data-arc-key]').forEach(card => {
        const isArc = card.getAttribute('data-arc-key') === reorderArcKey;
        card.draggable = !!isArc;
        card.classList.toggle('card--reorderable', !!isArc);
    });

    // Mark header active.
    document.querySelectorAll('.db-arc-header[data-arc-key]').forEach(h => {
        h.classList.toggle('db-arc-header--reorder', h.getAttribute('data-arc-key') === reorderArcKey);
    });
}

function exitReorderMode() {
    reorderArcKey = null;
    cleanupReorderDragState();
    document.body.classList.remove('reorder-mode');
    document.body.removeAttribute('data-reorder-arc');
    document.querySelectorAll('.card[data-arc-key]').forEach(card => {
        card.draggable = false;
        card.classList.remove('card--reorderable', 'card--drag-over', 'card--dragging');
    });
    document.querySelectorAll('.db-arc-header--reorder').forEach(h => h.classList.remove('db-arc-header--reorder'));
}

function cleanupReorderDragState() {
    reorderDraggedEntryNumber = null;
    reorderDropTargetNumber = null;
    reorderDragHandleArmed = false;
    document.querySelectorAll('.card.card--dragging').forEach(el => el.classList.remove('card--dragging'));
    const indicator = document.getElementById('reorderInsertIndicator');
    if (indicator && indicator.parentNode) indicator.parentNode.removeChild(indicator);
}

function getArcDecimalsForRenumbering(arcKey) {
    const entries = getArcEntriesSortedAsc(arcKey);
    let max = 0;
    entries.forEach(e => {
        max = Math.max(max, getDecimalPlacesFromNumberString(e.Number));
    });
    return Math.max(2, Math.min(3, max));
}

function renumberArcWithOrder(arcKey, orderedEntryNumbers) {
    const arcInt = parseInt(String(arcKey), 10);
    if (isNaN(arcInt)) return false;
    const count = orderedEntryNumbers.length;
    let decimals = getArcDecimalsForRenumbering(arcKey);

    if (decimals < 3 && count > 99) {
        decimals = 3;
    }
    if (decimals >= 3 && count > 999) {
        showArcCapacityModal(`Arc ${arcKey} has ${count} entries. This exceeds the 1000-entry limit for a single arc.`);
        return false;
    }

    const step = Math.pow(10, -decimals);
    orderedEntryNumbers.forEach((oldNum, idx) => {
        const entry = allData.find(e => String(e.Number) === String(oldNum) || parseFloat(e.Number) === parseFloat(oldNum));
        if (!entry) return;
        const newNum = arcInt + (idx + 1) * step;
        entry.Number = formatEntryNumber(newNum, decimals);
    });
    return true;
}

function reorderEntriesInArc(arcKey, draggedNum, targetNum) {
    const key = String(arcKey);
    const container = document.querySelector(`.db-arc-entries[data-arc-key="${key}"]`);
    if (!container) return;

    const cards = Array.from(container.querySelectorAll('.card[data-entry-number]'));
    const order = cards.map(c => c.getAttribute('data-entry-number')).filter(Boolean);

    const fromIdx = order.indexOf(draggedNum);
    const targetIdx = order.indexOf(targetNum);
    if (fromIdx === -1 || targetIdx === -1) return;

    order.splice(fromIdx, 1);
    const insertAt = order.indexOf(targetNum);
    order.splice(Math.max(0, insertAt), 0, draggedNum);

    const ok = renumberArcWithOrder(key, order);
    if (!ok) return;

    allData.sort((a, b) => parseFloat(a.Number) - parseFloat(b.Number));
    if (typeof syncTagsFromDocument === 'function') syncTagsFromDocument();
    if (typeof saveLoreToFirebase === 'function') saveLoreToFirebase();
    if (typeof refreshTagFilter === 'function') refreshTagFilter();
    if (typeof filterData === 'function') filterData();
}

function getDecimalPlacesFromNumberString(numStr) {
    const s = String(numStr ?? '');
    const idx = s.indexOf('.');
    if (idx === -1) return 2; // default precision when entry has no decimals
    return Math.max(0, s.length - idx - 1);
}

function formatEntryNumber(n, decimals) {
    const d = Math.max(0, Number(decimals) || 0);
    // Avoid scientific notation and keep consistent decimal precision.
    const out = Number(n).toFixed(d);
    return out;
}

function getArcKeyFromEntryNumber(numStr) {
    const n = parseFloat(String(numStr));
    if (isNaN(n)) return null;
    return Math.floor(n).toString();
}

function getArcEntriesSortedAsc(arcKey) {
    return allData
        .filter(e => {
            const n = parseFloat(e.Number);
            return !isNaN(n) && Math.floor(n).toString() === String(arcKey);
        })
        .slice()
        .sort((a, b) => parseFloat(a.Number) - parseFloat(b.Number));
}

function getMaxNumberInArc(arcKey) {
    const entries = getArcEntriesSortedAsc(arcKey);
    if (!entries.length) return null;
    return parseFloat(entries[entries.length - 1].Number);
}

function renumberArcToThreeDecimals(arcKey) {
    const entries = getArcEntriesSortedAsc(arcKey);
    const arcInt = parseInt(String(arcKey), 10);
    if (!entries.length || isNaN(arcInt)) return;

    const decimals = 3;
    const step = 0.001;
    // Use 1..999 slots: arcKey.001, arcKey.002, ...
    if (entries.length > 999) {
        showArcCapacityModal(`Arc ${arcKey} has ${entries.length} entries. This exceeds the 1000-entry limit for a single arc.`);
        return false;
    }

    for (let i = 0; i < entries.length; i++) {
        const newNum = arcInt + (i + 1) * step;
        entries[i].Number = formatEntryNumber(newNum, decimals);
    }
    return true;
}

function showArcCapacityModal(message) {
    let modal = document.getElementById('arcCapacityModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'arcCapacityModal';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <div>
                        <h2 class="modal-title">Arc limit reached</h2>
                    </div>
                    <button type="button" class="modal-close" aria-label="Close">&times;</button>
                </div>
                <div class="modal-description" id="arcCapacityModalMessage"></div>
                <div style="display:flex;justify-content:flex-end;margin-top:16px;">
                    <button type="button" class="generic-ui-btn magenta-btn" id="arcCapacityModalOk">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const close = () => modal.classList.remove('active');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });
        modal.querySelector('.modal-close')?.addEventListener('click', close);
        modal.querySelector('#arcCapacityModalOk')?.addEventListener('click', close);
    }
    const msgEl = modal.querySelector('#arcCapacityModalMessage');
    if (msgEl) msgEl.textContent = message;
    modal.classList.add('active');
}

function insertEntryRelativeTo(entryNumber, where) {
    const baseEntry = allData.find(e => String(e.Number) === String(entryNumber) || parseFloat(e.Number) === parseFloat(entryNumber));
    if (!baseEntry) return;

    const baseStr = String(baseEntry.Number);
    const baseNum = parseFloat(baseStr);
    if (isNaN(baseNum)) return;

    const arcKey = Math.floor(baseNum).toString();
    let decimals = getDecimalPlacesFromNumberString(baseStr);
    let step = Math.pow(10, -decimals);

    // If this insert would overflow the arc boundary at current precision, bump to 3 decimals and renumber the whole arc.
    const maxN = getMaxNumberInArc(arcKey);
    const arcBoundary = parseInt(arcKey, 10) + 1;
    if (maxN != null && !isNaN(arcBoundary)) {
        if (decimals < 3 && (maxN + step) >= arcBoundary) {
            const ok = renumberArcToThreeDecimals(arcKey);
            if (ok === false) return;
            // Recompute after renumbering
            decimals = 3;
            step = 0.001;
        } else if (decimals >= 3 && (maxN + step) >= arcBoundary) {
            // Would exceed 1000 slots in this arc.
            const count = getArcEntriesSortedAsc(arcKey).length;
            showArcCapacityModal(`This arc is at its maximum capacity (~1000 entries). You can’t add another entry in Arc ${arcKey} without moving some entries to a different arc.`);
            return;
        }
    }

    // Determine new entry number for insertion.
    const insertNum = (where === 'after') ? (baseNum + step) : baseNum;
    const insertNumStr = formatEntryNumber(insertNum, decimals);

    // Shift all entries in the same arc that would collide at/after insert point.
    // before: shift >= baseNum
    // after:  shift >= baseNum + step
    const shiftFrom = insertNum;
    const arcEntries = allData
        .filter(e => {
            const n = parseFloat(e.Number);
            return !isNaN(n) && Math.floor(n).toString() === arcKey;
        })
        .slice()
        .sort((a, b) => parseFloat(b.Number) - parseFloat(a.Number)); // descending to avoid cascading collisions

    arcEntries.forEach(e => {
        const n = parseFloat(e.Number);
        if (n >= shiftFrom - (step / 10)) {
            const newN = n + step;
            e.Number = formatEntryNumber(newN, decimals);
        }
    });

    // Insert the new entry at the intended number.
    allData.push({
        Number: insertNumStr,
        Description: '',
        Tags: ''
    });

    // Keep global ordering stable.
    allData.sort((a, b) => parseFloat(a.Number) - parseFloat(b.Number));

    if (typeof syncTagsFromDocument === 'function') syncTagsFromDocument();
    if (typeof saveLoreToFirebase === 'function') saveLoreToFirebase();
    if (typeof refreshTagFilter === 'function') refreshTagFilter();
    if (typeof filterData === 'function') filterData();

    // Open the new entry for editing.
    if (typeof openEditEntryModal === 'function') {
        setTimeout(() => openEditEntryModal(insertNumStr), 0);
    }
}

function updateStats() {
    document.getElementById('resultCount').textContent = filteredData.length;
    document.getElementById('totalCount').textContent = allData.length;
}

function openModal(number) {
    const entry = allData.find(e => e.Number === number);
    if (!entry) return;

    document.getElementById('modalNumber').textContent = `Entry #${entry.Number}`;
    document.getElementById('modalTitle').textContent = `Entry ${entry.Number}`;
    document.getElementById('modalDescription').innerHTML = escapeHtml(entry.Description);

    const tags = getEntryTagsForDisplay(entry);
    const tagsHtml = tags.map(t =>
        `<span class="${getTagClass(t.color)}" data-name="${escapeHtml(t.name)}">${escapeHtml(t.name)}</span>`
    ).join('');
    document.getElementById('modalTags').innerHTML = tagsHtml;

    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

// ============================================================================
// SHARED TAG MANAGEMENT FUNCTIONS
// These functions work for both Add and Edit entry modals
// ============================================================================

/**
 * Renders tags in a container
 * @param {Array} tagArray - Array of tag objects {name, color}
 * @param {string} containerId - ID of the container element
 */
function renderTags(tagArray, containerId) {
    const tagItems = tagArray.map((tag, idx) =>
        `<span class="${getTagClass(tag.color)} lore-tag ${getLoreTagColorClass(tag.color)}" data-name="${escapeHtml(tag.name)}" data-index="${idx}">` +
        `${escapeHtml(tag.name)}` +
        `<button type="button" class="tag__remove" data-tag-index="${idx}" aria-label="Remove tag"></button></span>`
    ).join('');
    document.getElementById(containerId).innerHTML = tagItems;
}

/**
 * Adds a tag from input to the tag array
 * @param {string} inputId - ID of the input element
 * @param {Array} tagArray - Tag array to add to
 * @param {string} selectedColor - Currently selected color
 * @param {Function} renderCallback - Function to call after adding
 */
function addTagFromInput(inputId, tagArray, selectedColor, renderCallback) {
    const inputElement = document.getElementById(inputId);
    const value = inputElement.value.trim();

    if (value && !tagArray.some(t => t.name === value)) {
        const existing = typeof allTags !== 'undefined' && allTags.find(t => t.name.toLowerCase() === value.toLowerCase());
        const color = existing ? (existing.color || 'slate') : selectedColor;
        tagArray.push({ name: value, color });
        inputElement.value = '';
        renderCallback();
    }
}

/**
 * Adds a tag from autocomplete to the tag array
 * @param {string} name - Tag name
 * @param {string} color - Tag color
 * @param {Array} tagArray - Tag array to add to
 * @param {Function} renderCallback - Function to call after adding
 */
function addTagFromAutocomplete(name, color, tagArray, renderCallback) {
    if (!name || tagArray.some(t => t.name.toLowerCase() === name.toLowerCase())) return;
    tagArray.push({ name: name, color: color || 'slate' });
    renderCallback();
}

/**
 * Adds a suggested tag to the tag array
 * @param {number} suggestedIndex - Index of suggested tag
 * @param {Array} tagArray - Tag array to add to
 * @param {Array} suggestedArray - Suggested tags array
 * @param {Function} renderTags - Function to render tags
 * @param {Function} renderSuggested - Function to render suggested tags
 */
function addSuggestedTag(suggestedIndex, tagArray, suggestedArray, renderTags, renderSuggested) {
    if (suggestedIndex < 0 || suggestedIndex >= suggestedArray.length) return;
    const tag = suggestedArray[suggestedIndex];
    tagArray.push({ name: tag.name, color: tag.color });
    suggestedArray.splice(suggestedIndex, 1);
    renderTags();
    renderSuggested();
}

/**
 * Adds all suggested tags to the tag array
 * @param {Array} tagArray - Tag array to add to
 * @param {Array} suggestedArray - Suggested tags array
 * @param {Function} renderTags - Function to render tags
 * @param {Function} renderSuggested - Function to render suggested tags
 */
function addAllSuggestedTags(tagArray, suggestedArray, renderTags, renderSuggested) {
    suggestedArray.forEach(tag => tagArray.push({ name: tag.name, color: tag.color }));
    suggestedArray.length = 0; // Clear array
    renderTags();
    renderSuggested();
}

/**
 * Removes a tag from the array
 * @param {number} index - Index to remove
 * @param {Array} tagArray - Tag array to remove from
 * @param {Function} renderCallback - Function to call after removing
 */
function removeTag(index, tagArray, renderCallback) {
    if (index >= 0 && index < tagArray.length) {
        tagArray.splice(index, 1);
        renderCallback();
    }
}

/**
 * Renders suggested tags
 * @param {Array} suggestedArray - Suggested tags array
 * @param {string} containerId - ID of container element
 * @param {string} listId - ID of list element
 * @param {string} buttonId - ID of "add all" button
 */
function renderSuggestedTags(suggestedArray, containerId, listId, buttonId) {
    const container = document.getElementById(containerId);
    const list = document.getElementById(listId);
    const addAllBtn = document.getElementById(buttonId);

    if (!container) return;

    if (suggestedArray.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'grid';
    if (addAllBtn) {
        addAllBtn.style.display = suggestedArray.length > 1 ? 'inline-block' : 'none';
    }

    const tagItems = suggestedArray.map((tag, idx) =>
        `<span class="${getTagClass(tag.color)} tag--suggested lore-tag ${getLoreTagColorClass(tag.color)}" data-suggested-index="${idx}" role="button" tabindex="0">${escapeHtml(tag.name)}</span>`
    ).join('');
    list.innerHTML = tagItems;
}

/**
 * Updates color selector buttons to show selected state
 * @param {string} containerId - ID of container with color buttons
 * @param {string} selectedColor - Currently selected color
 */
function updateColorSelector(containerId, selectedColor) {
    document.querySelectorAll(`#${containerId} .edit-entry-color-btn`).forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-color') === selectedColor);
    });
    const swatch = document.getElementById(`${containerId === 'editEntryContainer' ? 'editEntryColorSwatch' : 'addEntryColorSwatch'}`);
    if (swatch) swatch.setAttribute('data-color', selectedColor);
}

// ============================================================================
// EDIT ENTRY MODAL FUNCTIONS
// ============================================================================

let currentEditingEntryNumber = null;
let editingEntryTags = [];
let editingEntrySuggestedTags = [];
let editingEntrySelectedColor = 'slate';

function openEditEntryModal(entryNumber) {
    const entry = allData.find(e => e.Number === entryNumber);
    if (!entry) return;

    if (typeof filtersVisible !== 'undefined' && filtersVisible && typeof closeFilterSidesheet === 'function') {
        closeFilterSidesheet();
    }
    if (typeof closeSyncSidesheet === 'function') closeSyncSidesheet();
    closeAddEntryModal();
    currentEditingEntryNumber = entryNumber;

    // Existing tags: only from entry.Tags (explicitly saved)
    editingEntryTags = parseEntryTags(entry.Tags).map(t => ({ name: t.name, color: t.color }));

    // Suggested tags: detected in content but not already in entry
    const existingNames = new Set(editingEntryTags.map(t => t.name));
    editingEntrySuggestedTags = findTagsInText(entry.Description)
        .filter(tag => !existingNames.has(tag.name))
        .map(tag => ({ name: tag.name, color: tag.color || DEFAULT_TAG_COLOR }));

    // Fill in content and entry number
    document.getElementById('editEntryContent').value = entry.Description;
    document.getElementById('editEntryNumber').value = entry.Number;

    // Update arc indicator in editor if element exists
    const arcKey = Math.floor(parseFloat(entry.Number)).toString();
    const arcData = allArcs[arcKey] || { name: '', color: 'slate' };
    const arcIndicator = document.getElementById('editEntryArcIndicator');
    if (arcIndicator) {
        arcIndicator.textContent = arcData.name ? `Arc ${arcKey}: ${arcData.name}` : `Arc ${arcKey}`;
        arcIndicator.className = `editor-arc-badge arc--badge-${arcData.color}`;
    }

    // Clear input and set default color
    document.getElementById('editEntryTagInput').value = '';
    editingEntrySelectedColor = 'slate';
    updateEditEntryColorSelector();

    // Render tags and suggested
    renderEditEntryTags();
    renderEditEntrySuggestedTags();

    const editContainer = document.getElementById('editEntryContainer');
    const card = document.querySelector(`.card[data-entry-number="${entryNumber}"]`);
    const mainContent = document.querySelector('.app-main-content');
    if (card && editContainer && mainContent && card.parentNode) {
        editContainer.remove();
        card.parentNode.insertBefore(editContainer, card);
        card.remove();
    }
    document.getElementById('editTraySaveMessage').textContent = '';
    editContainer.classList.add('show');

    requestAnimationFrame(() => {
        editContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

function updateEditEntryColorSelector() {
    updateColorSelector('editEntryContainer', editingEntrySelectedColor);
}

function closeEditEntryModal() {
    const editContainer = document.getElementById('editEntryContainer');
    const mainContent = document.querySelector('.app-main-content');
    if (editContainer && mainContent) {
        editContainer.classList.remove('show');
        if (editContainer.parentNode !== mainContent) {
            editContainer.remove();
            mainContent.appendChild(editContainer);
        }
        if (typeof refreshTagFilter === 'function') refreshTagFilter();
        filterData();
    }
    currentEditingEntryNumber = null;
}

// Edit entry specific wrappers for shared functions
function renderEditEntryTags() {
    renderTags(editingEntryTags, 'editEntryTags');
}

function addTagToEditEntry() {
    addTagFromInput('editEntryTagInput', editingEntryTags, editingEntrySelectedColor, renderEditEntryTags);
}

function addTagToEditEntryFromAutocomplete(name, color) {
    addTagFromAutocomplete(name, color, editingEntryTags, renderEditEntryTags);
}

function addSuggestedTagToEditEntry(suggestedIndex) {
    addSuggestedTag(suggestedIndex, editingEntryTags, editingEntrySuggestedTags, renderEditEntryTags, renderEditEntrySuggestedTags);
}

function addAllSuggestedTagsToEditEntry() {
    addAllSuggestedTags(editingEntryTags, editingEntrySuggestedTags, renderEditEntryTags, renderEditEntrySuggestedTags);
}

function renderEditEntrySuggestedTags() {
    renderSuggestedTags(editingEntrySuggestedTags, 'editEntrySuggestedTags', 'editEntrySuggestedTagsList', 'editEntryAddAllSuggested');
}

function removeEditEntryTag(index) {
    removeTag(index, editingEntryTags, renderEditEntryTags);
}

function showTraySaveMessage(tray) {
    const id = tray === 'add' ? 'addTraySaveMessage' : 'editTraySaveMessage';
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = 'Saved';
    clearTimeout(showTraySaveMessage._timer);
    showTraySaveMessage._timer = setTimeout(() => {
        el.textContent = '';
    }, 2500);
}

function updateEditEntry() {
    if (!currentEditingEntryNumber) return;

    const entry = allData.find(e => e.Number === currentEditingEntryNumber);
    if (!entry) return;

    const numberInput = document.getElementById('editEntryNumber');
    const numberVal = numberInput.value.trim();
    if (!numberVal) {
        numberInput.focus();
        return;
    }
    const num = parseFloat(numberVal);
    if (isNaN(num) || num <= 0) {
        numberInput.focus();
        return;
    }

    entry.Number = numberVal;
    entry.Description = document.getElementById('editEntryContent').value.trim();
    entry.Tags = serializeEntryTags(editingEntryTags);
    allData.sort((a, b) => parseFloat(a.Number) - parseFloat(b.Number));
    syncTagsFromDocument();
    if (typeof saveLoreToFirebase === 'function') saveLoreToFirebase();
    if (typeof refreshTagFilter === 'function') refreshTagFilter();
    showTraySaveMessage('edit');
    setTimeout(closeEditEntryModal, 600);
}

function deleteEditEntry() {
    if (!currentEditingEntryNumber) return;

    const entry = allData.find(e => e.Number === currentEditingEntryNumber);
    if (!entry) return;

    if (!confirm(`Delete Entry #${entry.Number}?`)) return;

    const index = allData.findIndex(e => e.Number === currentEditingEntryNumber);
    allData.splice(index, 1);
    if (typeof saveLoreToFirebase === 'function') saveLoreToFirebase();
    showTraySaveMessage('edit');
    setTimeout(closeEditEntryModal, 600);
}

// ============================================================================
// ADD ENTRY MODAL FUNCTIONS
// ============================================================================

let addingEntryTags = [];
let addingEntrySuggestedTags = [];
let addingEntrySelectedColor = 'slate';

function getNextEntryNumber() {
    if (!allData || allData.length === 0) return 1;
    const numbers = allData.map(e => parseFloat(e.Number)).filter(n => !isNaN(n));
    if (numbers.length === 0) return 1;
    const max = Math.max(...numbers);
    return Math.floor(max) + 1;
}

function openAddEntryModal() {
    if (typeof openAddEntryInPalette === 'function') {
        openAddEntryInPalette();
    } else if (typeof openCommandPalette === 'function') {
        openCommandPalette();
    }

    if (typeof filtersVisible !== 'undefined' && filtersVisible && typeof closeFilterSidesheet === 'function') {
        closeFilterSidesheet();
    }
    if (typeof closeSyncSidesheet === 'function') closeSyncSidesheet();
    document.getElementById('addEntryNumber').value = getNextEntryNumber();
    const addContent = document.getElementById('addEntryContent');
    addContent.value = '';
    if (addContent && ADD_ENTRY_PLACEHOLDER_OPTIONS.length) {
        addContent.placeholder = ADD_ENTRY_PLACEHOLDER_OPTIONS[Math.floor(Math.random() * ADD_ENTRY_PLACEHOLDER_OPTIONS.length)];
    }
    document.getElementById('addEntryTagInput').value = '';
    addingEntryTags = [];
    addingEntrySuggestedTags = [];
    addingEntrySelectedColor = 'slate';
    updateAddEntryColorSelector();
    renderAddEntryTags();
    renderAddEntrySuggestedTags();
    document.getElementById('addTraySaveMessage').textContent = '';
    document.getElementById('addEntryContainer').classList.add('active');
    document.getElementById('addEntryBtn')?.classList.add('active');
    document.getElementById('mobileAddEntryBtn')?.classList.add('active');

    // Update arc indicator
    updateArcIndicator('add');
}

function closeAddEntryModal() {
    document.getElementById('addEntryContainer').classList.remove('active');
    const paletteModal = document.getElementById('cmdPaletteModal');
    if (paletteModal) {
        paletteModal.classList.remove('cmd-palette-modal--add-entry');
    }
    document.getElementById('addEntryBtn')?.classList.remove('active');
    document.getElementById('mobileAddEntryBtn')?.classList.remove('active');
}

function updateAddEntryColorSelector() {
    updateColorSelector('addEntryContainer', addingEntrySelectedColor);
}

// Add entry specific wrappers for shared functions
function renderAddEntryTags() {
    renderTags(addingEntryTags, 'addEntryTags');
}

function addTagToAddEntry() {
    addTagFromInput('addEntryTagInput', addingEntryTags, addingEntrySelectedColor, () => {
        renderAddEntryTags();
        updateAddEntrySuggestedTags();
    });
}

function addTagToAddEntryFromAutocomplete(name, color) {
    addTagFromAutocomplete(name, color, addingEntryTags, () => {
        renderAddEntryTags();
        updateAddEntrySuggestedTags();
    });
}

function updateAddEntrySuggestedTags() {
    const content = document.getElementById('addEntryContent').value;
    const existingNames = new Set(addingEntryTags.map(t => t.name));
    addingEntrySuggestedTags = findTagsInText(content)
        .filter(tag => !existingNames.has(tag.name))
        .map(tag => ({ name: tag.name, color: tag.color || DEFAULT_TAG_COLOR }));
    renderAddEntrySuggestedTags();
}

function addSuggestedTagToAddEntry(suggestedIndex) {
    addSuggestedTag(suggestedIndex, addingEntryTags, addingEntrySuggestedTags, renderAddEntryTags, renderAddEntrySuggestedTags);
}

function addAllSuggestedTagsToAddEntry() {
    addAllSuggestedTags(addingEntryTags, addingEntrySuggestedTags, renderAddEntryTags, renderAddEntrySuggestedTags);
}

function renderAddEntrySuggestedTags() {
    renderSuggestedTags(addingEntrySuggestedTags, 'addEntrySuggestedTags', 'addEntrySuggestedTagsList', 'addEntryAddAllSuggested');
}

function removeAddEntryTag(index) {
    removeTag(index, addingEntryTags, () => {
        renderAddEntryTags();
        updateAddEntrySuggestedTags();
    });
}

function submitAddEntry() {
    const numberInput = document.getElementById('addEntryNumber');
    const numberVal = numberInput.value.trim();
    const content = document.getElementById('addEntryContent').value.trim();

    if (!numberVal) {
        numberInput.focus();
        return;
    }
    const num = parseFloat(numberVal);
    if (isNaN(num) || num <= 0) {
        numberInput.focus();
        return;
    }
    if (!content) {
        document.getElementById('addEntryContent').focus();
        return;
    }

    const entry = {
        Number: numberVal,
        Description: content,
        Tags: serializeEntryTags(addingEntryTags)
    };
    allData.push(entry);
    allData.sort((a, b) => parseFloat(a.Number) - parseFloat(b.Number));
    syncTagsFromDocument();
    if (typeof saveLoreToFirebase === 'function') saveLoreToFirebase();
    if (typeof refreshTagFilter === 'function') refreshTagFilter();
    filterData();
    showTraySaveMessage('add');
    setTimeout(closeAddEntryModal, 600);
}
/**
 * Updates the arc indicator in the add/edit tray
 * @param {string} type - 'add' or 'edit'
 */
function updateArcIndicator(type) {
    const inputId = type === 'add' ? 'addEntryNumber' : 'editEntryNumber';
    const indicatorId = type === 'add' ? 'addEntryArcIndicator' : 'editEntryArcIndicator';
    const numValue = document.getElementById(inputId).value;
    const num = parseFloat(numValue);
    const indicator = document.getElementById(indicatorId);
    if (!indicator) return;

    if (isNaN(num)) {
        indicator.textContent = '';
        indicator.className = 'editor-arc-badge';
        return;
    }

    const arcKey = Math.floor(num).toString();
    const arcData = allArcs[arcKey] || { name: '', color: 'slate' };
    indicator.textContent = arcData.name ? `Arc ${arcKey}: ${arcData.name}` : `Arc ${arcKey}`;
    indicator.className = `editor-arc-badge arc--badge-${arcData.color}`;
}
