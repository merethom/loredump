// Tag editor UI

let tagEditorSelectedColor = 'slate';
let tagEditorSearchTerm = '';
let tagEditDropdownTargetTagId = null;
let tagEditDropdownSelectedColor = 'slate';
let tagContextMenuTargetTagName = null;
let longPressTimer = null;

function openTagEditor() {
    const modal = document.getElementById('tagEditorModal');
    document.getElementById('tagEditorSearch').value = '';
    tagEditorSearchTerm = '';
    renderTagList();
    modal.classList.add('active');
}

function closeTagEditor() {
    document.getElementById('tagEditorModal').classList.remove('active');
}

// Tag editor search - runs once when script loads
(function initTagEditorSearch() {
    const searchInput = document.getElementById('tagEditorSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            tagEditorSearchTerm = e.target.value;
            renderTagList();
        });
    }
})();

function updateTagFormColorSelector() {
    document.querySelectorAll('#tagEditorModal .tag-form-color-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-color') === tagEditorSelectedColor);
    });
}

function renderTagList() {
    const container = document.getElementById('tagList');
    const form = document.getElementById('tagForm');
    const home = document.getElementById('tagFormHome');
    if (form && home && form.parentElement === container) {
        home.appendChild(form);
        form.style.display = 'none';
    }
    const term = tagEditorSearchTerm.toLowerCase().trim();

    let filteredTags = term
        ? allTags.filter(tag => {
            const nameMatch = tag.name.toLowerCase().includes(term);
            const termsMatch = tag.terms.some(t => t.toLowerCase().includes(term));
            return nameMatch || termsMatch;
        })
        : [...allTags];

    filteredTags.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    if (filteredTags.length === 0) {
        container.innerHTML = allTags.length === 0
            ? '<p style="color: #B0A8C9; padding: 20px; text-align: center;">No tags yet. Create one to get started.</p>'
            : '<p style="color: #B0A8C9; padding: 20px; text-align: center;">No tags match your search.</p>';
        return;
    }

    container.innerHTML = filteredTags.map(tag => {
        const color = getTagColor(tag);
        const tagClass = getTagClass(color);
        return `
        <div class="tag-item" data-tag-id="${escapeHtml(tag.id)}">
            <div class="tag-item-header">
                <div class="tag-item-name-row">
                    <span class="${tagClass}">${escapeHtml(tag.name)}</span>
                </div>
                <div class="tag-item-actions">
                    <button class="tag-edit-btn" data-action="edit">Edit</button>
                    <button class="tag-delete-btn" data-action="delete">Delete</button>
                </div>
            </div>
            <div class="tag-item-terms">
                <strong>Terms:</strong> ${escapeHtml(tag.terms.join(', '))}
            </div>
        </div>
    `;
    }).join('');

    if (!container._hasDelegator) {
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const item = btn.closest('.tag-item');
            if (!item) return;
            const tagId = item.dataset.tagId;
            const action = btn.dataset.action;
            if (tagId && action === 'edit') {
                editTag(tagId);
            } else if (tagId && action === 'delete') {
                deleteTagConfirm(tagId);
            }
        });
        container._hasDelegator = true;
    }
}

function getTagColor(tag) {
    if (tag.color && TAG_COLORS[tag.color]) return tag.color;
    const typeMap = { character: 'purple', place: 'green', theme: 'blue', person: 'slate' };
    return typeMap[tag.type] || 'slate';
}

function editTag(tagId) {
    const tag = allTags.find(t => t.id === tagId);
    if (!tag) return;

    document.getElementById('tagFormTitle').textContent = 'Edit Tag';
    document.getElementById('tagName').value = tag.name;
    tagEditorSelectedColor = getTagColor(tag);
    updateTagFormColorSelector();
    document.getElementById('tagTerms').value = tag.terms.join('\n');
    document.getElementById('tagFormSubmit').textContent = 'Update Tag';
    document.getElementById('tagFormSubmit').dataset.tagId = tagId;

    const form = document.getElementById('tagForm');
    form.style.display = 'block';

    // Move form directly below the tag being edited
    const tagItem = Array.from(document.querySelectorAll('#tagList .tag-item')).find(el => el.dataset.tagId === tagId);
    const home = document.getElementById('tagFormHome');
    if (tagItem && home) {
        tagItem.insertAdjacentElement('afterend', form);
        form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function showNewTagForm() {
    document.getElementById('tagFormTitle').textContent = 'Create New Tag';
    document.getElementById('tagName').value = '';
    tagEditorSelectedColor = 'slate';
    updateTagFormColorSelector();
    document.getElementById('tagTerms').value = '';
    document.getElementById('tagFormSubmit').textContent = 'Create Tag';
    delete document.getElementById('tagFormSubmit').dataset.tagId;

    const form = document.getElementById('tagForm');
    const home = document.getElementById('tagFormHome');
    if (home && form.parentElement !== home) {
        home.appendChild(form);
    }
    form.style.display = 'block';
}

function cancelTagForm() {
    const form = document.getElementById('tagForm');
    const home = document.getElementById('tagFormHome');
    if (home && form.parentElement !== home) {
        home.appendChild(form);
    }
    form.style.display = 'none';
}

function submitTagForm() {
    const name = document.getElementById('tagName').value.trim();
    const color = tagEditorSelectedColor;
    const termsText = document.getElementById('tagTerms').value.trim();
    const terms = termsText.split('\n').map(t => t.trim()).filter(t => t);

    if (!name || terms.length === 0) {
        alert('Please enter a name and at least one term');
        return;
    }

    const submit = document.getElementById('tagFormSubmit');
    const tagId = submit.dataset.tagId;

    if (tagId) {
        updateTag(tagId, { name, color, terms });
    } else {
        addTag(name, color, terms);
    }

    cancelTagForm();
    renderTagList();
    if (typeof saveLoreToFirebase === 'function') saveLoreToFirebase();
    if (typeof refreshTagFilter === 'function') refreshTagFilter();
    filterData();
}

function deleteTagConfirm(tagId) {
    if (confirm('Are you sure you want to delete this tag?')) {
        deleteTag(tagId);
        renderTagList();
        if (typeof saveLoreToFirebase === 'function') saveLoreToFirebase();
        filterData();
    }
}

// Tag editor UI - context menu and dropdown edit

function openTagEditDropdown(tagName) {
    const tag = allTags.find(t => t.name.toLowerCase() === (tagName || '').toLowerCase());
    if (!tag) return;
    tagEditDropdownTargetTagId = tag.id;
    tagEditDropdownSelectedColor = getTagColor(tag);
    document.getElementById('tagEditName').value = tag.name;
    document.getElementById('tagEditTerms').value = tag.terms.join('\n');
    updateTagEditDropdownColorSelector();
    document.getElementById('tagEditContainer').classList.add('show');
}

function closeTagEditDropdown() {
    document.getElementById('tagEditContainer').classList.remove('show');
    tagEditDropdownTargetTagId = null;
}

function updateTagEditDropdownColorSelector() {
    document.querySelectorAll('#tagEditContainer .tag-form-color-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-color') === tagEditDropdownSelectedColor);
    });
}

function submitTagEditDropdown() {
    if (!tagEditDropdownTargetTagId) return;
    const name = document.getElementById('tagEditName').value.trim();
    const termsText = document.getElementById('tagEditTerms').value.trim();
    const terms = termsText.split('\n').map(t => t.trim()).filter(t => t);
    if (!name || terms.length === 0) {
        alert('Please enter a name and at least one term');
        return;
    }
    updateTag(tagEditDropdownTargetTagId, { name, color: tagEditDropdownSelectedColor, terms });
    closeTagEditDropdown();
    if (typeof saveLoreToFirebase === 'function') saveLoreToFirebase();
    if (typeof refreshTagFilter === 'function') refreshTagFilter();
    if (typeof filterData === 'function') filterData();
}

function getTagIdFromName(tagName) {
    const tag = allTags.find(t => t.name.toLowerCase() === (tagName || '').toLowerCase());
    return tag ? tag.id : null;
}

function deleteTagFromContext(tagName) {
    const tagId = getTagIdFromName(tagName);
    if (!tagId) return;
    const tag = allTags.find(t => t.id === tagId);
    if (!tag) return;
    const entryCount = typeof countEntriesWithTag === 'function' ? countEntriesWithTag(tag.name) : 0;
    const msg = entryCount > 0
        ? `Delete "${tag.name}"? This will remove it from ${entryCount} entr${entryCount === 1 ? 'y' : 'ies'}.`
        : `Delete "${tag.name}"?`;
    if (confirm(msg)) {
        deleteTag(tagId);
        if (typeof saveLoreToFirebase === 'function') saveLoreToFirebase();
        if (typeof refreshTagFilter === 'function') refreshTagFilter();
        if (typeof filterData === 'function') filterData();
    }
}

function countEntriesWithTag(tagName) {
    if (!allData || !Array.isArray(allData)) return 0;
    const nameLower = (tagName || '').toLowerCase();
    return allData.filter(entry => {
        const tags = parseEntryTags(entry.Tags || '');
        return tags.some(t => t.name.toLowerCase() === nameLower);
    }).length;
}

function showTagContextMenu(x, y, tagName) {
    tagContextMenuTargetTagName = tagName;
    const menu = document.getElementById('tagContextMenu');
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('show');
}

function hideTagContextMenu() {
    tagContextMenuTargetTagName = null;
    document.getElementById('tagContextMenu').classList.remove('show');
}

function handleTagContextMenuAction(action) {
    const tagName = tagContextMenuTargetTagName;
    hideTagContextMenu();
    if (!tagName) return;
    if (action === 'edit') {
        openTagEditDropdown(tagName);
    } else if (action === 'delete') {
        deleteTagFromContext(tagName);
    }
}

(function initTagContextMenu() {
    const menu = document.getElementById('tagContextMenu');
    if (!menu) return;

    document.addEventListener('contextmenu', (e) => {
        const tagEl = e.target.closest('.tag[data-name]');
        if (!tagEl) return;
        if (tagEl.closest('.tag__remove')) return;
        if (tagEl.closest('#editEntryContainer') || tagEl.closest('#addEntryContainer')) return;
        const tagName = tagEl.getAttribute('data-name');
        if (!tagName) return;
        e.preventDefault();
        showTagContextMenu(e.clientX, e.clientY, tagName);
    });

    menu.querySelectorAll('.tag-context-menu-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleTagContextMenuAction(btn.getAttribute('data-action'));
        });
    });

    document.addEventListener('click', () => hideTagContextMenu());
    document.addEventListener('scroll', () => hideTagContextMenu(), true);

    document.getElementById('tagEditContainer')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-form-color-btn')) {
            tagEditDropdownSelectedColor = e.target.getAttribute('data-color');
            updateTagEditDropdownColorSelector();
        }
    });

    document.getElementById('tagEditSubmit')?.addEventListener('click', submitTagEditDropdown);

    document.addEventListener('touchstart', (e) => {
        const tagEl = e.target.closest('.tag[data-name]');
        if (!tagEl || tagEl.closest('#editEntryContainer') || tagEl.closest('#addEntryContainer')) return;
        if (tagEl.closest('.tag__remove')) return;
        longPressTimer = setTimeout(() => {
            longPressTimer = null;
            const tagName = tagEl.getAttribute('data-name');
            if (tagName) {
                const rect = tagEl.getBoundingClientRect();
                showTagContextMenu(rect.left + rect.width / 2, rect.bottom, tagName);
            }
        }, 500);
    }, { passive: true });

    document.addEventListener('touchend', () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }, { passive: true });

    document.addEventListener('touchmove', () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }, { passive: true });
})();

function downloadTags() {
    const json = saveTags();
    const blob = new Blob([json], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tags.json';
    a.click();
    URL.revokeObjectURL(url);
}