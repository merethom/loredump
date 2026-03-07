/**
 * Arc Manager - handles renaming, coloring, and reordering of entry arcs
 */

function getArcEntryCount(key) {
    if (!allData || !Array.isArray(allData)) return 0;
    const k = parseInt(key, 10);
    return allData.filter(entry => {
        const n = parseFloat(entry.Number);
        return !isNaN(n) && Math.floor(n) === k;
    }).length;
}

function getArcNumberRange(key) {
    if (!allData || !Array.isArray(allData)) return { min: '', max: '' };
    const k = parseInt(key, 10);
    const numbers = allData
        .filter(entry => {
            const n = parseFloat(entry.Number);
            return !isNaN(n) && Math.floor(n) === k;
        })
        .map(entry => parseFloat(entry.Number));
    if (numbers.length === 0) return { min: '', max: '' };
    return {
        min: Math.min(...numbers).toFixed(2),
        max: Math.max(...numbers).toFixed(2)
    };
}

function openArcEditor() {
    if (typeof closeFilterSidesheet === 'function') closeFilterSidesheet();
    if (typeof closeTagEditor === 'function') closeTagEditor();
    if (typeof closeSyncSidesheet === 'function') closeSyncSidesheet();

    document.getElementById('arcEditorSidesheet').classList.add('open');
    document.getElementById('arcEditorSidesheet').setAttribute('aria-hidden', 'false');
    document.getElementById('arcEditorBtn').classList.add('active');

    renderArcList();
}

function closeArcEditor() {
    document.getElementById('arcEditorSidesheet').classList.remove('open');
    document.getElementById('arcEditorSidesheet').setAttribute('aria-hidden', 'true');
    document.getElementById('arcEditorBtn').classList.remove('active');
}

function renderArcList() {
    const arcList = document.getElementById('arcList');
    if (!arcList) return;

    const arcKeys = new Set();
    allData.forEach(entry => {
        const arc = Math.floor(parseFloat(entry.Number));
        if (!isNaN(arc)) arcKeys.add(arc.toString());
    });

    const sortedKeys = Array.from(arcKeys).sort((a, b) => parseInt(a) - parseInt(b));

    arcList.innerHTML = sortedKeys.map(key => {
        const arcData = allArcs[key] || { name: '', color: 'slate' };
        const count = getArcEntryCount(key);
        const range = getArcNumberRange(key);
        const rangeStr = range.min !== '' && range.max !== '' ? `${range.min} to ${range.max}` : '';
        const infoStr = rangeStr ? `${count} entries // ${rangeStr}` : `${count} entries`;
        const displayName = arcData.name.trim() || 'Untitled';
        const colorClass = arcData.color === 'amber' ? 'orange-red' : arcData.color === 'green' ? 'lime' : arcData.color === 'teal' ? 'aqua' : arcData.color === 'pink' ? 'magenta' : arcData.color;
        return `
            <div class="arc-item" data-arc-key="${key}" draggable="true">
                <div class="arc-item-header">
                    <span class="arc-number" title="Drag to reorder">
                        <svg class="icon" aria-hidden="true">
                            <use href="img/sprites/regular.svg#grip-vertical"></use>
                        </svg>
                        Arc ${key}
                    </span>
                    <div class="arc-color-selector">
                        ${renderArcColorBtns(key, arcData.color)}
                    </div>
                </div>
                <div class="arc-title" data-arc-key="${key}" role="button" tabindex="0">
                    <div class="arc-color-indicator arc-color--${colorClass}"></div>
                    <span class="arc-title-text">${escapeHtml(displayName)}</span>
                </div>
                <div class="arc-number-info">${infoStr}</div>
            </div>
        `;
    }).join('');

    setupArcListDelegation();
    setupArcListDragDrop();
}

function renderArcColorBtns(key, selectedColor) {
    const colors = ['pink', 'amber', 'orange', 'green', 'teal', 'blue', 'purple', 'slate'];
    return colors.map(color => `
        <button type="button" 
            class="arc-color-btn tag-color ${color === 'amber' ? 'orange-red' : color === 'green' ? 'lime' : color === 'teal' ? 'aqua' : color === 'pink' ? 'magenta' : color} ${color === selectedColor ? 'selected' : ''}" 
            title="${color}"
            onclick="updateArcColor('${key}', '${color}')"></button>
    `).join('');
}

function updateArcName(key, name) {
    if (!allArcs[key]) allArcs[key] = { name: '', color: 'slate' };
    allArcs[key].name = (name || '').trim();
    saveLoreToFirebase();
    if (typeof renderDatabase === 'function') renderDatabase();
}

function updateArcColor(key, color) {
    if (!allArcs[key]) allArcs[key] = { name: '', color: 'slate' };
    allArcs[key].color = color;
    saveLoreToFirebase();
    renderArcList();
    if (typeof renderDatabase === 'function') renderDatabase();
}

function enterArcTitleEdit(arcKey, titleEl) {
    const arcData = allArcs[arcKey] || { name: '', color: 'slate' };
    const colorClass = arcData.color === 'amber' ? 'orange-red' : arcData.color === 'green' ? 'lime' : arcData.color === 'teal' ? 'aqua' : arcData.color === 'pink' ? 'magenta' : arcData.color;
    const currentName = arcData.name || '';
    titleEl.classList.add('arc-title--editing');
    titleEl.setAttribute('data-editing-key', arcKey);
    titleEl.innerHTML = `
        <div class="arc-color-indicator arc-color--${colorClass}"></div>
        <input type="text" class="arc-title-input" value="${escapeHtml(currentName)}" data-arc-key="${arcKey}" autocomplete="off">
        <button type="button" class="arc-title-confirm" title="Save name" aria-label="Save name" data-arc-key="${arcKey}">
            <svg class="icon" aria-hidden="true">
                <use href="img/sprites/light.svg#floppy-disk"></use>
            </svg>
        </button>
    `;
    const input = titleEl.querySelector('.arc-title-input');
    if (input) {
        input.focus();
        input.select();
        input.addEventListener('blur', function onBlur() {
            setTimeout(() => {
                if (titleEl.getAttribute('data-arc-confirm-pending') === '1') return;
                if (titleEl.classList.contains('arc-title--editing')) {
                    exitArcTitleEdit(arcKey, titleEl, false);
                }
                input.removeEventListener('blur', onBlur);
            }, 0);
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                exitArcTitleEdit(arcKey, titleEl, true);
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                exitArcTitleEdit(arcKey, titleEl, false);
            }
        });
    }
    const btn = titleEl.querySelector('.arc-title-confirm');
    if (btn) {
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            titleEl.setAttribute('data-arc-confirm-pending', '1');
        });
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            titleEl.removeAttribute('data-arc-confirm-pending');
            exitArcTitleEdit(arcKey, titleEl, true);
        });
    }
}

function exitArcTitleEdit(arcKey, titleEl, save) {
    if (!titleEl || !titleEl.classList.contains('arc-title--editing')) return;
    titleEl.removeAttribute('data-arc-confirm-pending');
    const input = titleEl.querySelector('.arc-title-input');
    const newName = input ? input.value.trim() : '';
    if (save && input) {
        updateArcName(arcKey, newName);
    }
    const arcData = allArcs[arcKey] || { name: '', color: 'slate' };
    const colorClass = arcData.color === 'amber' ? 'orange-red' : arcData.color === 'green' ? 'lime' : arcData.color === 'teal' ? 'aqua' : arcData.color === 'pink' ? 'magenta' : arcData.color;
    const displayName = (save ? newName : (arcData.name || '').trim()) || 'Untitled';
    titleEl.classList.remove('arc-title--editing');
    titleEl.removeAttribute('data-editing-key');
    titleEl.innerHTML = `
        <div class="arc-color-indicator arc-color--${colorClass}"></div>
        <span class="arc-title-text">${escapeHtml(displayName)}</span>
    `;
}

function setupArcListDelegation() {
    const arcList = document.getElementById('arcList');
    if (!arcList || arcList._arcDelegation) return;
    arcList._arcDelegation = true;

    arcList.addEventListener('click', (e) => {
        const title = e.target.closest('.arc-title');
        if (!title || title.classList.contains('arc-title--editing')) return;
        if (e.target.closest('.arc-title-input') || e.target.closest('.arc-title-confirm')) return;
        const key = title.getAttribute('data-arc-key');
        if (key) enterArcTitleEdit(key, title);
    });

    arcList.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const title = e.target.closest('.arc-title');
        if (!title || title.classList.contains('arc-title--editing')) return;
        const key = title.getAttribute('data-arc-key');
        if (key) {
            e.preventDefault();
            enterArcTitleEdit(key, title);
        }
    });
}

function setupArcListDragDrop() {
    const arcList = document.getElementById('arcList');
    if (!arcList) return;

    let draggedKey = null;

    arcList.querySelectorAll('.arc-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            const key = item.getAttribute('data-arc-key');
            if (!key) return;
            draggedKey = key;
            e.dataTransfer.setData('text/plain', key);
            e.dataTransfer.effectAllowed = 'move';
            item.classList.add('arc-item--dragging');
        });
        item.addEventListener('dragend', () => {
            item.classList.remove('arc-item--dragging');
            draggedKey = null;
        });
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const key = item.getAttribute('data-arc-key');
            if (key && key !== draggedKey) {
                item.classList.add('arc-item--drag-over');
            }
        });
        item.addEventListener('dragleave', () => {
            item.classList.remove('arc-item--drag-over');
        });
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('arc-item--drag-over');
            const dropKey = item.getAttribute('data-arc-key');
            if (!draggedKey || !dropKey || draggedKey === dropKey) return;
            const items = Array.from(arcList.querySelectorAll('.arc-item'));
            const keys = items.map(el => el.getAttribute('data-arc-key'));
            const fromIndex = keys.indexOf(draggedKey);
            const toIndex = keys.indexOf(dropKey);
            if (fromIndex === -1 || toIndex === -1) return;
            const newOrder = keys.slice();
            newOrder.splice(fromIndex, 1);
            newOrder.splice(toIndex, 0, draggedKey);
            reorderArcs(newOrder);
        });
    });
}

function reorderArcs(newOrder) {
    if (!newOrder || newOrder.length === 0) return;
    // newOrder[i] is the old arc key that should become arc number (i+1)
    const oldKeyToNewNum = {};
    newOrder.forEach((oldKey, index) => {
        oldKeyToNewNum[oldKey] = index + 1;
    });
    allData.forEach(entry => {
        const n = parseFloat(entry.Number);
        if (isNaN(n)) return;
        const oldKey = Math.floor(n).toString();
        const newNum = oldKeyToNewNum[oldKey];
        if (newNum === undefined) return;
        const decimal = n % 1;
        entry.Number = newNum + decimal;
        if (decimal === 0) entry.Number = newNum;
    });
    allData.sort((a, b) => parseFloat(a.Number) - parseFloat(b.Number));
    const newArcs = {};
    newOrder.forEach((oldKey, index) => {
        const newKey = String(index + 1);
        newArcs[newKey] = allArcs[oldKey] || { name: '', color: 'slate' };
    });
    for (const k of Object.keys(allArcs)) {
        if (!newArcs[k]) delete allArcs[k];
    }
    Object.assign(allArcs, newArcs);
    saveLoreToFirebase();
    renderArcList();
    if (typeof renderDatabase === 'function') renderDatabase();
}

// Setup event listeners
document.addEventListener('DOMContentLoaded', () => {
    const arcBtn = document.getElementById('arcEditorBtn');
    if (arcBtn) {
        arcBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openArcEditor();
        });
    }

    const closeBtn = document.getElementById('arcEditorSidesheetClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeArcEditor);
    }
});
