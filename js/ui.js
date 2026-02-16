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

    // Event delegation is set up once in setupDatabaseEventDelegation()
    // No need to add listeners here anymore!
}

/**
 * Handles clicking on an entry number - clears all filters and highlights the entry
 * @param {HTMLElement} card - The card element that was clicked
 * @param {Event} event - The click event
 */
function handleEntryNumberClick(card, event) {
    event.stopPropagation();
    
    const entryNumber = card.getAttribute('data-entry-number');
    if (!entryNumber) return;
    
    // Clear all filters and search
    searchTerm = '';
    selectedTags.clear();
    
    // Update UI elements
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        const searchClear = document.getElementById('searchClear');
        if (searchClear) searchClear.classList.remove('show');
    }
    
    // Refresh tag filter UI and re-render data
    if (typeof refreshTagFilter === 'function') refreshTagFilter();
    filterData();
    
    // Wait for render, then scroll to and highlight the entry
    requestAnimationFrame(() => {
        const targetCard = document.querySelector(`.card[data-entry-number="${entryNumber}"]`);
        if (!targetCard) return;
        
        // Clear any existing highlights and selections
        document.querySelectorAll('.card.card--highlighted').forEach(c => {
            c.classList.remove('card--highlighted');
        });
        document.querySelectorAll('.card.card--selected').forEach(c => {
            c.classList.remove('card--selected');
        });
        
        // Update goto entry field for keyboard navigation sync
        const gotoEntry = document.getElementById('gotoEntry');
        if (gotoEntry) {
            gotoEntry.value = entryNumber;
        }
        
        // Scroll and add temporary highlight
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetCard.classList.add('card--highlighted');
        
        // After temporary highlight fades, keep persistent selection
        setTimeout(() => {
            targetCard.classList.remove('card--highlighted');
            targetCard.classList.add('card--selected');
        }, 3000);
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
        // Find the card that was clicked
        const card = e.target.closest('.card');
        if (!card) return;

        // Check if clicking on entry number specifically
        if (e.target.closest('.card-number')) {
            handleEntryNumberClick(card, e);
            return;
        }

        // Don't open modal if clicking on a tag
        if (e.target.closest('.card-tags .tag')) return;

        // Get entry number and open modal
        const entryNumber = card.getAttribute('data-entry-number');
        if (entryNumber) {
            e.stopPropagation();
            openEditEntryModal(entryNumber);
        }
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

    // Clear input and set default color
    document.getElementById('editEntryTagInput').value = '';
    editingEntrySelectedColor = 'slate';
    updateEditEntryColorSelector();

    // Render tags and suggested
    renderEditEntryTags();
    renderEditEntrySuggestedTags();

    const editContainer = document.getElementById('editEntryContainer');
    const card = document.querySelector(`.card[data-entry-number="${entryNumber}"]`);
    const controls = document.querySelector('.controls');
    if (card && editContainer && controls && card.parentNode) {
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
    const controls = document.querySelector('.controls');
    if (editContainer && controls) {
        editContainer.classList.remove('show');
        if (editContainer.parentNode !== controls) {
            editContainer.remove();
            controls.appendChild(editContainer);
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
    if (typeof filtersVisible !== 'undefined' && filtersVisible && typeof closeFilterSidesheet === 'function') {
        closeFilterSidesheet();
    }
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
}

function closeAddEntryModal() {
    document.getElementById('addEntryContainer').classList.remove('active');
    document.getElementById('addEntryBtn')?.classList.remove('active');
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