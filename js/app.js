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
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchTerm = '';
            updateSearchClearVisibility();
            filterData();
            e.preventDefault();
            e.stopPropagation();
        }
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchTerm = '';
        updateSearchClearVisibility();
        filterData();
        searchInput.focus();
    });

    // Setup filters button - toggles sidesheet (use delegation so it works even if element isn't ready)
    document.addEventListener('click', (e) => {
        if (e.target.closest('#filtersBtn')) {
            const sidesheet = document.getElementById('filterSidesheet');
            if (sidesheet?.classList.contains('open')) {
                closeFilterSidesheet();
            } else {
                openFilterSidesheet();
            }
        }
    });

    // Tag filter search
    const tagFilterSearch = document.getElementById('tagFilterSearch');
    const tagFilterSearchClear = document.getElementById('tagFilterSearchClear');
    if (tagFilterSearch) {
        function updateTagFilterSearchClearVisibility() {
            if (tagFilterSearchClear) tagFilterSearchClear.classList.toggle('show', tagFilterSearch.value.length > 0);
        }
        tagFilterSearch.addEventListener('input', () => {
            tagFilterSearchTerm = tagFilterSearch.value;
            updateTagFilterSearchClearVisibility();
            refreshTagFilter();
        });
        tagFilterSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                tagFilterSearch.value = '';
                tagFilterSearchTerm = '';
                updateTagFilterSearchClearVisibility();
                refreshTagFilter();
                e.preventDefault();
                e.stopPropagation();
            }
        });
        if (tagFilterSearchClear) {
            tagFilterSearchClear.addEventListener('click', () => {
                tagFilterSearch.value = '';
                tagFilterSearchTerm = '';
                updateTagFilterSearchClearVisibility();
                refreshTagFilter();
                tagFilterSearch.focus();
            });
        }
    }

    // Setup sort (sidesheet radio buttons)
    const sortBy = document.getElementById('sortBy');
    sortBy?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        filterData();
    });

    document.querySelectorAll('input[name="sidesheetSort"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value;
            if (sortBy && val) {
                sortBy.value = val;
                sortBy.dispatchEvent(new Event('change'));
            }
        });
    });

    // Sync sidesheet sort with currentSort on open
    function syncSidesheetSort() {
        const radio = document.querySelector(`input[name="sidesheetSort"][value="${currentSort}"]`);
        if (radio) radio.checked = true;
    }

    // Filter sidesheet open/close
    window.openFilterSidesheet = function() {
        filtersVisible = true;
        document.getElementById('filterSidesheet').classList.add('open');
        document.getElementById('filterSidesheet').setAttribute('aria-hidden', 'false');
        document.getElementById('filtersBtn').classList.add('active');
        const searchEl = document.getElementById('tagFilterSearch');
        if (searchEl) {
            searchEl.value = '';
            tagFilterSearchTerm = '';
        }
        document.getElementById('tagFilterSearchClear')?.classList.remove('show');
        syncSidesheetSort();
        if (typeof refreshTagFilter === 'function') refreshTagFilter();
    };

    window.closeFilterSidesheet = function() {
        filtersVisible = false;
        document.getElementById('filterSidesheet').classList.remove('open');
        document.getElementById('filterSidesheet').setAttribute('aria-hidden', 'true');
        document.getElementById('filtersBtn').classList.remove('active');
    };

    document.getElementById('filterSidesheetClose')?.addEventListener('click', closeFilterSidesheet);

    // Setup add entry button (toggle)
    document.getElementById('addEntryBtn').addEventListener('click', () => {
        if (document.getElementById('addEntryContainer').classList.contains('active')) {
            closeAddEntryModal();
        } else {
            closeEditEntryModal();
            openAddEntryModal();
        }
    });

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
            if (document.getElementById('addEntryContainer').classList.contains('active')) {
                updateAddEntrySuggestedTags();
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.edit-entry-color-wrapper')) {
            document.getElementById('editEntryColorWrapper')?.classList.remove('open');
            document.getElementById('addEntryColorWrapper')?.classList.remove('open');
        }
        // Clear tag input when clicking outside of it
        if (document.getElementById('addEntryContainer')?.classList.contains('active')) {
            if (!e.target.closest('#addEntryContainer .tag-input-wrapper')) {
                const addInput = document.getElementById('addEntryTagInput');
                if (addInput) addInput.value = '';
                typeof hideTagAutocompleteIfVisible === 'function' && hideTagAutocompleteIfVisible('addEntryTagAutocomplete');
            }
        }
        if (document.getElementById('editEntryContainer')?.classList.contains('show')) {
            if (!e.target.closest('#editEntryContainer .tag-input-wrapper')) {
                const editInput = document.getElementById('editEntryTagInput');
                if (editInput) editInput.value = '';
                typeof hideTagAutocompleteIfVisible === 'function' && hideTagAutocompleteIfVisible('editEntryTagAutocomplete');
            }
        }
    });

    const addEntryContainerEl = document.getElementById('addEntryContainer');
    if (addEntryContainerEl) {
        addEntryContainerEl.addEventListener('click', (e) => {
            if (!e.target.closest('.modal-content')) {
                closeAddEntryModal();
                return;
            }
            if (e.target.classList.contains('tag__remove')) {
                const tagIndex = parseInt(e.target.getAttribute('data-tag-index'), 10);
                removeAddEntryTag(tagIndex);
                e.stopPropagation();
            }

            const addSuggestedTag = e.target.closest('#addEntryContainer .tag--suggested');
            if (addSuggestedTag) {
                const idx = parseInt(addSuggestedTag.getAttribute('data-suggested-index'), 10);
                addSuggestedTagToAddEntry(idx);
                e.stopPropagation();
            }

            if (e.target.id === 'addEntryAddAllSuggested') {
                addAllSuggestedTagsToAddEntry();
                e.stopPropagation();
            }

            const colorBtn = e.target.closest('.edit-entry-color-btn');
            if (colorBtn) {
                addingEntrySelectedColor = colorBtn.getAttribute('data-color') || 'slate';
                updateAddEntryColorSelector();
                document.getElementById('addEntryColorWrapper')?.classList.remove('open');
                e.stopPropagation();
            }

            if (e.target.classList.contains('edit-entry-color-swatch') || e.target.closest('.edit-entry-color-swatch')) {
                document.getElementById('addEntryColorWrapper')?.classList.toggle('open');
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

        addEntryContainerEl.addEventListener('keydown', (e) => {
            const addSuggestedTag = e.target.closest('#addEntryContainer .tag--suggested');
            if (addSuggestedTag && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                const idx = parseInt(addSuggestedTag.getAttribute('data-suggested-index'), 10);
                addSuggestedTagToAddEntry(idx);
            }
        });
    }

    const editEntryContainerEl = document.getElementById('editEntryContainer');
    if (editEntryContainerEl) {
        editEntryContainerEl.addEventListener('click', (e) => {
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

            const colorBtn = e.target.closest('.edit-entry-color-btn');
            if (colorBtn) {
                editingEntrySelectedColor = colorBtn.getAttribute('data-color') || 'slate';
                updateEditEntryColorSelector();
                document.getElementById('editEntryColorWrapper')?.classList.remove('open');
                e.stopPropagation();
            }

            if (e.target.classList.contains('edit-entry-color-swatch') || e.target.closest('.edit-entry-color-swatch')) {
                document.getElementById('editEntryColorWrapper')?.classList.toggle('open');
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

        editEntryContainerEl.addEventListener('keydown', (e) => {
            const suggestedTag = e.target.closest('.tag--suggested');
            if (suggestedTag && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                const idx = parseInt(suggestedTag.getAttribute('data-suggested-index'), 10);
                addSuggestedTagToEditEntry(idx);
            }
        });
    }
}

var tagFilterSearchTerm = '';

var TAG_COLOR_ORDER = ['purple', 'green', 'blue', 'orange', 'teal', 'pink', 'amber', 'slate'];

function refreshTagFilter() {
    /* Only show tags that appear on at least one entry (hide unused tags) */
    const tagsSet = new Set();
    allData.forEach(entry => {
        getEntryTagNames(entry).forEach(name => tagsSet.add(name));
    });
    const tagColorMap = getTagColorMap();
    const allTagNames = Array.from(tagsSet).sort();
    const searchLower = tagFilterSearchTerm.toLowerCase().trim();

    // Active filters section
    const activeSection = document.getElementById('tagFilterActive');
    const activeList = document.getElementById('tagFilterActiveList');
    if (activeSection && activeList) {
        activeList.innerHTML = '';
        if (selectedTags.size > 0) {
            activeSection.classList.remove('hidden');
            Array.from(selectedTags).sort().forEach(tagName => {
                const color = tagColorMap.get(tagName) || DEFAULT_TAG_COLOR;
                const span = document.createElement('span');
                span.className = `tag tag--${color}`;
                span.setAttribute('data-name', tagName);
                span.setAttribute('role', 'button');
                span.setAttribute('tabindex', '0');
                const text = document.createTextNode(tagName);
                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'tag-filter-remove';
                removeBtn.setAttribute('aria-label', 'Remove filter');
                removeBtn.innerHTML = '&times;';
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    toggleTag(tagName, span);
                };
                span.appendChild(text);
                span.appendChild(removeBtn);
                span.onclick = (e) => {
                    if (!e.target.classList.contains('tag-filter-remove')) toggleTag(tagName, span);
                };
                span.onkeydown = (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleTag(tagName, span);
                    }
                };
                activeList.appendChild(span);
            });
        } else {
            activeSection.classList.add('hidden');
        }
    }

    // Available tags grouped by color
    const tagFilterDiv = document.getElementById('tagFilter');
    if (!tagFilterDiv) return;
    tagFilterDiv.innerHTML = '';

    const byColor = {};
    allTagNames.forEach(tagName => {
        if (selectedTags.has(tagName)) return;
        const matchesSearch = !searchLower || tagName.toLowerCase().includes(searchLower);
        if (!matchesSearch) return;
        const color = tagColorMap.get(tagName) || DEFAULT_TAG_COLOR;
        if (!byColor[color]) byColor[color] = [];
        byColor[color].push(tagName);
    });

    function addColorGroup(color, tags) {
        if (!tags || tags.length === 0) return;
        const group = document.createElement('div');
        group.className = 'tag-filter-color-group';
        const label = document.createElement('div');
        label.className = 'tag-filter-color-group-label';
        label.textContent = color;
        group.appendChild(label);
        tags.forEach(tagName => {
            const span = document.createElement('span');
            span.className = `tag tag--${color}`;
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
            group.appendChild(span);
        });
        tagFilterDiv.appendChild(group);
    }

    TAG_COLOR_ORDER.forEach(color => addColorGroup(color, byColor[color]));
    Object.keys(byColor).filter(c => !TAG_COLOR_ORDER.includes(c)).forEach(color => addColorGroup(color, byColor[color]));
}

function initializeApp() {
    refreshTagFilter();
    filtersVisible = false;

    setupEventListeners();

    // Initial render
    filterData();
}

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('tagContextMenu')?.classList.contains('show')) {
        typeof hideTagContextMenu === 'function' && hideTagContextMenu();
    } else if (document.getElementById('tagEditContainer')?.classList.contains('show')) {
        typeof closeTagEditDropdown === 'function' && closeTagEditDropdown();
    } else if (document.getElementById('addEntryContainer')?.classList.contains('active')) {
        const addColorWrapper = document.getElementById('addEntryColorWrapper');
        if (addColorWrapper?.classList.contains('open')) {
            addColorWrapper.classList.remove('open');
            return;
        }
        const addInput = document.getElementById('addEntryTagInput');
        const addAutocompleteVisible = typeof hideTagAutocompleteIfVisible === 'function' && hideTagAutocompleteIfVisible('addEntryTagAutocomplete');
        if (addAutocompleteVisible || (addInput && addInput.value.trim())) {
            if (addInput) addInput.value = '';
            return;
        }
        closeAddEntryModal();
    } else if (document.getElementById('editEntryContainer')?.classList.contains('show')) {
        const editColorWrapper = document.getElementById('editEntryColorWrapper');
        if (editColorWrapper?.classList.contains('open')) {
            editColorWrapper.classList.remove('open');
            return;
        }
        const editInput = document.getElementById('editEntryTagInput');
        const editAutocompleteVisible = typeof hideTagAutocompleteIfVisible === 'function' && hideTagAutocompleteIfVisible('editEntryTagAutocomplete');
        if (editAutocompleteVisible || (editInput && editInput.value.trim())) {
            if (editInput) editInput.value = '';
            return;
        }
        closeEditEntryModal();
    } else if (document.getElementById('filterSidesheet')?.classList.contains('open')) {
        const searchEl = document.getElementById('tagFilterSearch');
        if (searchEl && document.activeElement === searchEl) {
            searchEl.value = '';
            tagFilterSearchTerm = '';
            document.getElementById('tagFilterSearchClear')?.classList.remove('show');
            refreshTagFilter();
            return; /* clear input, don't close sidesheet */
        }
        typeof closeFilterSidesheet === 'function' && closeFilterSidesheet();
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
    if (e.target.closest('#editEntryContainer') || e.target.closest('#addEntryContainer')) return;
    if (e.target.closest('#tagFilter') || e.target.closest('#filterSidesheet')) return;

    const tagName = tagEl.getAttribute('data-name');
    if (!tagName) return;

    e.stopPropagation();
    filterByTag(e, tagName);
});

// Data loading is triggered by auth.js when user signs in