// Main app initialization and event setup

let currentSort = 'entry-asc';
let eventListenersInitialized = false;

function setupEventListeners() {
    if (eventListenersInitialized) return;
    eventListenersInitialized = true;

    // Setup search input
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');

    function updateSearchClearVisibility() {
        searchClear.classList.toggle('show', searchInput.value.length > 0);
    }

    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        updateSearchClearVisibility();
        filterData();
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchTerm = '';
        updateSearchClearVisibility();
        filterData();
        searchInput.focus();
    });

    // Setup filters button
    document.getElementById('filtersBtn').addEventListener('click', () => {
        filtersVisible = !filtersVisible;
        document.getElementById('tagFilterContainer').classList.toggle('show', filtersVisible);
        document.getElementById('filtersBtn').classList.toggle('active', filtersVisible);
    });

    // Setup sort by dropdown
    document.getElementById('sortBy').addEventListener('change', (e) => {
        currentSort = e.target.value;
        filterData();
    });

    // Setup refresh button
    document.getElementById('refreshData').addEventListener('click', () => {
        document.getElementById('dataSource').textContent = 'loading...';
        allData = [];
        selectedTags.clear();
        selectedCustomTags.clear();
        searchTerm = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('tagFilter').innerHTML = '';
        document.querySelectorAll('#tagFilter .tag').forEach(el => el.classList.remove('active'));
        loadData();
    });

    // Setup add entry button
    document.getElementById('addEntryBtn').addEventListener('click', openAddEntryModal);

    // Setup tag editor button
    document.getElementById('tagEditorBtn').addEventListener('click', openTagEditor);

    // Tag editor color selector
    document.getElementById('tagEditorModal')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-form-color-btn')) {
            tagEditorSelectedColor = e.target.getAttribute('data-color');
            updateTagFormColorSelector();
        }
    });

    // Setup modal event listeners
    const modalElement = document.getElementById('modal');
    if (modalElement) {
        modalElement.addEventListener('click', (e) => {
            if (e.target.id === 'modal') closeModal();
        });
    }

    const editEntryTagInput = document.getElementById('editEntryTagInput');
    if (editEntryTagInput) {
        editEntryTagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTagToEditEntry();
            }
        });
    }

    const addEntryTagInput = document.getElementById('addEntryTagInput');
    if (addEntryTagInput) {
        addEntryTagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTagToAddEntry();
            }
        });
    }

    const addEntryContent = document.getElementById('addEntryContent');
    if (addEntryContent) {
        addEntryContent.addEventListener('input', () => {
            if (document.getElementById('addEntryModal').classList.contains('active')) {
                updateAddEntrySuggestedTags();
            }
        });
    }

    const addEntryModalElement = document.getElementById('addEntryModal');
    if (addEntryModalElement) {
        addEntryModalElement.addEventListener('click', (e) => {
            if (e.target.id === 'addEntryModal') closeAddEntryModal();

            if (e.target.classList.contains('tag__remove')) {
                const tagIndex = parseInt(e.target.getAttribute('data-tag-index'), 10);
                removeAddEntryTag(tagIndex);
                e.stopPropagation();
            }

            const addSuggestedTag = e.target.closest('#addEntryModal .tag--suggested');
            if (addSuggestedTag) {
                const idx = parseInt(addSuggestedTag.getAttribute('data-suggested-index'), 10);
                addSuggestedTagToAddEntry(idx);
                e.stopPropagation();
            }

            if (e.target.id === 'addEntryAddAllSuggested') {
                addAllSuggestedTagsToAddEntry();
                e.stopPropagation();
            }

            if (e.target.classList.contains('edit-entry-color-btn')) {
                addingEntrySelectedColor = e.target.getAttribute('data-color');
                updateAddEntryColorSelector();
                e.stopPropagation();
            }

            if (e.target.id === 'addEntryAddTagBtn' || (e.target.closest('#addEntryAddTagBtn'))) {
                addTagToAddEntry();
                e.stopPropagation();
            }

            if (e.target.getAttribute('data-action') === 'cancel-add') {
                closeAddEntryModal();
                e.stopPropagation();
            }

            if (e.target.getAttribute('data-action') === 'submit-add') {
                submitAddEntry();
                e.stopPropagation();
            }
        });
    }

    const editEntryModalElement = document.getElementById('editEntryModal');
    if (editEntryModalElement) {
        editEntryModalElement.addEventListener('click', (e) => {
            if (e.target.id === 'editEntryModal') closeEditEntryModal();

            if (e.target.classList.contains('tag__remove')) {
                const tagIndex = parseInt(e.target.getAttribute('data-tag-index'), 10);
                removeEditEntryTag(tagIndex);
                e.stopPropagation();
            }

            const suggestedTag = e.target.closest('.tag--suggested');
            if (suggestedTag) {
                const idx = parseInt(suggestedTag.getAttribute('data-suggested-index'), 10);
                addSuggestedTagToEditEntry(idx);
                e.stopPropagation();
            }

            if (e.target.id === 'editEntryAddAllSuggested') {
                addAllSuggestedTagsToEditEntry();
                e.stopPropagation();
            }

            if (e.target.classList.contains('edit-entry-color-btn')) {
                editingEntrySelectedColor = e.target.getAttribute('data-color');
                updateEditEntryColorSelector();
                e.stopPropagation();
            }

            if (e.target.id === 'editEntryAddTagBtn' || e.target.classList.contains('edit-entry-add-btn')) {
                addTagToEditEntry();
                e.stopPropagation();
            }

            if (e.target.getAttribute('data-action') === 'cancel-edit') {
                closeEditEntryModal();
                e.stopPropagation();
            }

            if (e.target.getAttribute('data-action') === 'update-edit') {
                updateEditEntry();
                e.stopPropagation();
            }

            if (e.target.getAttribute('data-action') === 'delete-edit') {
                deleteEditEntry();
                e.stopPropagation();
            }
        });
    }
}

function refreshTagFilter() {
    const tagsSet = new Set();
    allData.forEach(entry => {
        getEntryTagNames(entry).forEach(name => tagsSet.add(name));
    });
    const sortedTags = Array.from(tagsSet).sort();
    const tagFilterDiv = document.getElementById('tagFilter');
    if (!tagFilterDiv) return;
    tagFilterDiv.innerHTML = '';
    const tagColorMap = getTagColorMap();
    sortedTags.forEach(tagName => {
        const span = document.createElement('span');
        const color = tagColorMap.get(tagName) || DEFAULT_TAG_COLOR;
        span.className = `tag tag--${color}`;
        if (selectedTags.has(tagName)) span.classList.add('active');
        span.setAttribute('data-name', tagName);
        span.textContent = tagName;
        span.setAttribute('role', 'button');
        span.setAttribute('tabindex', '0');
        span.onclick = () => toggleTag(tagName, span);
        span.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTag(tagName, span);
            }
        };
        tagFilterDiv.appendChild(span);
    });
}

function initializeApp() {
    refreshTagFilter();

    // Hide tag filter container by default
    document.getElementById('tagFilterContainer').classList.remove('show');
    filtersVisible = false;

    setupEventListeners();

    // Initial render
    filterData();
}

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('addEntryModal')?.classList.contains('active')) {
        closeAddEntryModal();
    } else if (document.getElementById('editEntryModal')?.classList.contains('active')) {
        closeEditEntryModal();
    } else if (document.getElementById('tagEditorModal')?.classList.contains('active')) {
        closeTagEditor();
    } else if (document.getElementById('modal')?.classList.contains('active')) {
        closeModal();
    }
});

// Setup tag click event delegation - filter by tag name (cards only, not filter panel)
document.addEventListener('click', (e) => {
    const tagEl = e.target.closest('.tag[data-name]');
    if (!tagEl) return;
    if (e.target.closest('.tag__remove')) return;
    if (e.target.closest('#editEntryModal') || e.target.closest('#addEntryModal')) return;
    if (e.target.closest('#tagFilter') || e.target.closest('#tagFilterContainer')) return;

    const tagName = tagEl.getAttribute('data-name');
    if (!tagName) return;

    e.stopPropagation();
    filterByTag(e, tagName);
});

// Data loading is triggered by auth.js when user signs in