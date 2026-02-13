// UI rendering functions

const TAG_COLORS = { purple: 1, green: 1, blue: 1, orange: 1, teal: 1, pink: 1, amber: 1, slate: 1 };

const DEFAULT_TAG_COLOR = 'slate';

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
    db.innerHTML = filteredData.map(entry => {
        const tags = getEntryTagsForDisplay(entry);
        const tagsHtml = tags.map(t =>
            `<span class="${getTagClass(t.color)}" data-name="${escapeHtml(t.name)}">${escapeHtml(t.name)}</span>`
        ).join('');

        return `
        <div class="card" data-entry-number="${entry.Number}">
            <div class="card-description">${escapeHtml(entry.Description)}</div>
            <div class="card-divider"></div>
            <div class="card-footer">
                <span class="card-number">${entry.Number}.0</span>
                <div class="card-tags">
                    ${tagsHtml}
                </div>
            </div>
        </div>
    `;
    }).join('');

    // Add click event listeners to cards
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', (e) => {
            const entryNumber = card.getAttribute('data-entry-number');
            if (entryNumber && !e.target.closest('.card-tags .tag')) {
                e.stopPropagation();
                openEditEntryModal(entryNumber);
            }
        });
    });
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

// Edit entry modal functions
let currentEditingEntryNumber = null;
let editingEntryTags = [];
let editingEntrySuggestedTags = [];
let editingEntrySelectedColor = 'slate';

function openEditEntryModal(entryNumber) {
    const entry = allData.find(e => e.Number === entryNumber);
    if (!entry) return;

    currentEditingEntryNumber = entryNumber;

    // Existing tags: only from entry.Tags (explicitly saved)
    editingEntryTags = parseEntryTags(entry.Tags).map(t => ({ name: t.name, color: t.color }));

    // Suggested tags: detected in content but not already in entry
    const existingNames = new Set(editingEntryTags.map(t => t.name));
    editingEntrySuggestedTags = findTagsInText(entry.Description)
        .filter(tag => !existingNames.has(tag.name))
        .map(tag => ({ name: tag.name, color: tag.color || DEFAULT_TAG_COLOR }));

    // Fill in content
    document.getElementById('editEntryContent').value = entry.Description;

    // Clear input and set default color
    document.getElementById('editEntryTagInput').value = '';
    editingEntrySelectedColor = 'slate';
    updateEditEntryColorSelector();

    // Render tags and suggested
    renderEditEntryTags();
    renderEditEntrySuggestedTags();

    document.getElementById('editEntryModal').classList.add('active');
}

function updateEditEntryColorSelector() {
    document.querySelectorAll('.edit-entry-color-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-color') === editingEntrySelectedColor);
    });
}

function closeEditEntryModal() {
    document.getElementById('editEntryModal').classList.remove('active');
    currentEditingEntryNumber = null;
}

function renderEditEntryTags() {
    const tagItems = editingEntryTags.map((tag, idx) =>
        `<span class="${getTagClass(tag.color)}" data-name="${escapeHtml(tag.name)}" data-index="${idx}">` +
        `${escapeHtml(tag.name)}` +
        `<button class="tag__remove" data-tag-index="${idx}">×</button></span>`
    ).join('');
    document.getElementById('editEntryTags').innerHTML = tagItems;
}

function addTagToEditEntry() {
    const inputElement = document.getElementById('editEntryTagInput');
    const value = inputElement.value.trim();

    if (value && !editingEntryTags.some(t => t.name === value)) {
        const existing = typeof allTags !== 'undefined' && allTags.find(t => t.name.toLowerCase() === value.toLowerCase());
        const color = existing ? (existing.color || 'slate') : editingEntrySelectedColor;
        editingEntryTags.push({ name: value, color });
        inputElement.value = '';
        renderEditEntryTags();
    }
}

function addSuggestedTagToEditEntry(suggestedIndex) {
    if (suggestedIndex < 0 || suggestedIndex >= editingEntrySuggestedTags.length) return;
    const tag = editingEntrySuggestedTags[suggestedIndex];
    editingEntryTags.push({ name: tag.name, color: tag.color });
    editingEntrySuggestedTags.splice(suggestedIndex, 1);
    renderEditEntryTags();
    renderEditEntrySuggestedTags();
}

function addAllSuggestedTagsToEditEntry() {
    editingEntrySuggestedTags.forEach(tag => editingEntryTags.push({ name: tag.name, color: tag.color }));
    editingEntrySuggestedTags = [];
    renderEditEntryTags();
    renderEditEntrySuggestedTags();
}

function renderEditEntrySuggestedTags() {
    const container = document.getElementById('editEntrySuggestedTags');
    const list = document.getElementById('editEntrySuggestedTagsList');
    const addAllBtn = document.getElementById('editEntryAddAllSuggested');

    if (editingEntrySuggestedTags.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    addAllBtn.style.display = editingEntrySuggestedTags.length >= 1 ? 'inline-block' : 'none';

    const tagItems = editingEntrySuggestedTags.map((tag, idx) =>
        `<span class="${getTagClass(tag.color)} tag--suggested" data-suggested-index="${idx}" role="button">${escapeHtml(tag.name)}</span>`
    ).join('');
    list.innerHTML = tagItems;
}

function removeEditEntryTag(index) {
    if (index >= 0 && index < editingEntryTags.length) {
        editingEntryTags.splice(index, 1);
        renderEditEntryTags();
    }
}

function updateEditEntry() {
    if (!currentEditingEntryNumber) return;

    const entry = allData.find(e => e.Number === currentEditingEntryNumber);
    if (!entry) return;

    entry.Description = document.getElementById('editEntryContent').value.trim();
    entry.Tags = serializeEntryTags(editingEntryTags);
    syncTagsFromDocument();
    if (typeof saveLoreToFirebase === 'function') saveLoreToFirebase();
    filterData();
    closeEditEntryModal();
}

function deleteEditEntry() {
    if (!currentEditingEntryNumber) return;

    const entry = allData.find(e => e.Number === currentEditingEntryNumber);
    if (!entry) return;

    if (!confirm(`Delete Entry #${entry.Number}?`)) return;

    const index = allData.findIndex(e => e.Number === currentEditingEntryNumber);
    allData.splice(index, 1);
    if (typeof saveLoreToFirebase === 'function') saveLoreToFirebase();
    filterData();
    closeEditEntryModal();
}

// Add entry modal functions
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
    document.getElementById('addEntryNumber').value = getNextEntryNumber();
    document.getElementById('addEntryContent').value = '';
    document.getElementById('addEntryTagInput').value = '';
    addingEntryTags = [];
    addingEntrySuggestedTags = [];
    addingEntrySelectedColor = 'slate';
    updateAddEntryColorSelector();
    renderAddEntryTags();
    renderAddEntrySuggestedTags();
    document.getElementById('addEntryModal').classList.add('active');
}

function closeAddEntryModal() {
    document.getElementById('addEntryModal').classList.remove('active');
}

function updateAddEntryColorSelector() {
    document.querySelectorAll('#addEntryModal .edit-entry-color-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-color') === addingEntrySelectedColor);
    });
}

function renderAddEntryTags() {
    const tagItems = addingEntryTags.map((tag, idx) =>
        `<span class="${getTagClass(tag.color)}" data-name="${escapeHtml(tag.name)}" data-index="${idx}">` +
        `${escapeHtml(tag.name)}` +
        `<button class="tag__remove" data-tag-index="${idx}">×</button></span>`
    ).join('');
    document.getElementById('addEntryTags').innerHTML = tagItems;
}

function addTagToAddEntry() {
    const inputElement = document.getElementById('addEntryTagInput');
    const value = inputElement.value.trim();

    if (value && !addingEntryTags.some(t => t.name === value)) {
        const existing = typeof allTags !== 'undefined' && allTags.find(t => t.name.toLowerCase() === value.toLowerCase());
        const color = existing ? (existing.color || 'slate') : addingEntrySelectedColor;
        addingEntryTags.push({ name: value, color });
        inputElement.value = '';
        renderAddEntryTags();
        updateAddEntrySuggestedTags();
    }
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
    if (suggestedIndex < 0 || suggestedIndex >= addingEntrySuggestedTags.length) return;
    const tag = addingEntrySuggestedTags[suggestedIndex];
    addingEntryTags.push({ name: tag.name, color: tag.color });
    addingEntrySuggestedTags.splice(suggestedIndex, 1);
    renderAddEntryTags();
    renderAddEntrySuggestedTags();
}

function addAllSuggestedTagsToAddEntry() {
    addingEntrySuggestedTags.forEach(tag => addingEntryTags.push({ name: tag.name, color: tag.color }));
    addingEntrySuggestedTags = [];
    renderAddEntryTags();
    renderAddEntrySuggestedTags();
}

function renderAddEntrySuggestedTags() {
    const container = document.getElementById('addEntrySuggestedTags');
    const list = document.getElementById('addEntrySuggestedTagsList');
    const addAllBtn = document.getElementById('addEntryAddAllSuggested');

    if (!container) return;

    if (addingEntrySuggestedTags.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    addAllBtn.style.display = addingEntrySuggestedTags.length >= 1 ? 'inline-block' : 'none';

    const tagItems = addingEntrySuggestedTags.map((tag, idx) =>
        `<span class="${getTagClass(tag.color)} tag--suggested" data-suggested-index="${idx}" role="button">${escapeHtml(tag.name)}</span>`
    ).join('');
    list.innerHTML = tagItems;
}

function removeAddEntryTag(index) {
    if (index >= 0 && index < addingEntryTags.length) {
        addingEntryTags.splice(index, 1);
        renderAddEntryTags();
        updateAddEntrySuggestedTags();
    }
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
    filterData();
    closeAddEntryModal();
}