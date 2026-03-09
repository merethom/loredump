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

    // Setup global clicks for dropdowns and sidesheet
    document.addEventListener('click', (e) => {
        // Close dropdowns if clicking outside
        if (!e.target.closest('.generic-ui-btn') && !e.target.closest('.controls-dropdown')) {
            const editContainer = document.getElementById('editEntryContainer');
            if (editContainer?.classList.contains('show')) {
                closeEditEntryModal();
            }
            document.querySelectorAll('.controls-dropdown').forEach(d => d.classList.remove('show'));
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
                tagFilterSearch.blur();
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

    // Setup sort logic (sortBy kept in DOM for sidesheet sync; header sort UI removed)
    const sortBy = document.getElementById('sortBy');
    const sortBtnText = document.getElementById('sortBtnText');

    function updateSortUI(val) {
        if (sortBtnText) sortBtnText.textContent = val === 'entry-desc' ? 'Newest First' : 'Oldest First';
        document.querySelectorAll('.sort-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.value === val);
        });
    }

    sortBy?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        updateSortUI(currentSort);
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
        updateSortUI(currentSort);
    }

    // Filter sidesheet open/close
    window.openFilterSidesheet = function () {
        if (typeof closeTagEditor === 'function') closeTagEditor();
        if (typeof closeArcEditor === 'function') closeArcEditor();
        if (typeof closeSyncSidesheet === 'function') closeSyncSidesheet();
        filtersVisible = true;
        document.getElementById('filterSidesheet').classList.add('open');
        document.getElementById('filterSidesheet').setAttribute('aria-hidden', 'false');
        document.getElementById('filterSidesheetBtn')?.classList.add('active');
        const searchEl = document.getElementById('tagFilterSearch');
        if (searchEl) {
            searchEl.value = '';
            tagFilterSearchTerm = '';
        }
        document.getElementById('tagFilterSearchClear')?.classList.remove('show');
        syncSidesheetSort();
        if (typeof refreshTagFilter === 'function') refreshTagFilter();
    };

    window.closeFilterSidesheet = function () {
        filtersVisible = false;
        document.getElementById('filterSidesheet').classList.remove('open');
        document.getElementById('filterSidesheet').setAttribute('aria-hidden', 'true');
        document.getElementById('filterSidesheetBtn')?.classList.remove('active');
    };

    document.getElementById('filterSidesheetClose')?.addEventListener('click', closeFilterSidesheet);
    document.getElementById('tagEditorSidesheetClose')?.addEventListener('click', closeTagEditor);

    // Sidesheet scrollbar visible only while scrolling (same as command palette)
    document.querySelectorAll('.sidesheet-content').forEach((el) => {
        let scrollHideTimer;
        el.addEventListener('scroll', () => {
            el.classList.add('is-scrolling');
            clearTimeout(scrollHideTimer);
            scrollHideTimer = setTimeout(() => el.classList.remove('is-scrolling'), 400);
        });
    });

    // Clear all tags button
    document.getElementById('tagFilterClearAll')?.addEventListener('click', () => {
        selectedTags.clear();
        refreshTagFilter();
        filterData();
    });

    // Setup add entry button (toggle) — side-nav is the only add-entry trigger
    const addEntryBtn = document.getElementById('addEntryBtn');
    if (addEntryBtn) {
        addEntryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (document.getElementById('addEntryContainer').classList.contains('active')) {
                closeAddEntryModal();
            } else {
                closeEditEntryModal();
                openAddEntryModal();
            }
        });
    }

    // Setup tag editor button (side nav)
    document.getElementById('tagEditorBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        openTagEditor();
    });

    document.getElementById('downloadEntriesBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof downloadLoreJson === 'function') downloadLoreJson();
    });

    document.getElementById('filterSidesheetBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof openFilterSidesheet === 'function') openFilterSidesheet();
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
            document.getElementById('tagEditorColorWrapper')?.classList.remove('open');
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

    // Scroll controls (bottom-right buttons)
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    const scrollToEndBtn = document.getElementById('scrollToEndBtn');

    function scrollMainContentTo(position) {
        const scrollEl = document.querySelector('.app-main-content');
        if (!scrollEl) return;
        if (position === 'top') {
            scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (position === 'end') {
            scrollEl.scrollTo({ top: scrollEl.scrollHeight - scrollEl.clientHeight, behavior: 'smooth' });
        }
    }

    if (scrollToTopBtn) {
        scrollToTopBtn.addEventListener('click', function(e) {
            e.preventDefault();
            scrollMainContentTo('top');
        });
    }

    if (scrollToEndBtn) {
        scrollToEndBtn.addEventListener('click', function(e) {
            e.preventDefault();
            scrollMainContentTo('end');
        });
    }

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

            if (e.target.closest('[data-action="cancel-add"]')) {
                closeAddEntryModal();
                e.stopPropagation();
            }

            if (e.target.closest('[data-action="submit-add"]')) {
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

            if (e.target.closest('[data-action="cancel-edit"]')) {
                closeEditEntryModal();
                e.stopPropagation();
            }

            if (e.target.closest('[data-action="update-edit"]')) {
                updateEditEntry();
                e.stopPropagation();
            }

            if (e.target.closest('[data-action="delete-edit"]')) {
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

    // Live Arc Indicator updates
    document.getElementById('editEntryNumber')?.addEventListener('input', () => {
        if (typeof updateArcIndicator === 'function') updateArcIndicator('edit');
    });
    document.getElementById('addEntryNumber')?.addEventListener('input', () => {
        if (typeof updateArcIndicator === 'function') updateArcIndicator('add');
    });
}

var tagFilterSearchTerm = '';

var TAG_COLOR_ORDER = ['purple', 'green', 'blue', 'orange', 'teal', 'pink', 'amber', 'slate'];

function refreshTagFilter() {
    /* Only show tags that appear on entries matching the current selection (dynamic filtering) */
    const tagsSet = new Set();

    // Determine which entries match the current selected tags
    let matchingEntries = allData;
    if (selectedTags.size > 0) {
        matchingEntries = allData.filter(entry => {
            const entryTags = getEntryTagNames(entry);
            return Array.from(selectedTags).every(tag => entryTags.has(tag));
        });
    }

    matchingEntries.forEach(entry => {
        getEntryTagNames(entry).forEach(name => tagsSet.add(name));
    });

    // Always include selected tags so they can be deselected
    selectedTags.forEach(tag => tagsSet.add(tag));

    const tagColorMap = getTagColorMap();
    const allTagNames = Array.from(tagsSet);
    const searchLower = tagFilterSearchTerm.toLowerCase().trim();

    // Update count and clear button
    const countEl = document.getElementById('tagFilterCount');
    const clearBtn = document.getElementById('tagFilterClearAll');
    if (countEl && clearBtn) {
        if (selectedTags.size > 0) {
            countEl.textContent = selectedTags.size.toString();
            countEl.style.display = 'inline';
            clearBtn.style.display = 'inline-block';
        } else {
            countEl.style.display = 'none';
            clearBtn.style.display = 'none';
        }
    }

    // Hide the active filters section (we're keeping tags in place now)
    const activeSection = document.getElementById('tagFilterActive');
    if (activeSection) {
        activeSection.style.display = 'none';
    }

    // All tags in alphabetical order (including selected ones)
    const tagFilterDiv = document.getElementById('tagFilter');
    if (!tagFilterDiv) return;
    tagFilterDiv.innerHTML = '';

    // Filter and collect all tags
    const displayTags = [];
    allTagNames.forEach(tagName => {
        const matchesSearch = !searchLower || tagName.toLowerCase().includes(searchLower);
        if (!matchesSearch) return;
        const color = tagColorMap.get(tagName) || 'slate';
        const isSelected = selectedTags.has(tagName);
        displayTags.push({ name: tagName, color: color, selected: isSelected });
    });

    // Sort: Selected first, then alphabetical
    displayTags.sort((a, b) => {
        if (a.selected && !b.selected) return -1;
        if (!a.selected && b.selected) return 1;
        return a.name.localeCompare(b.name);
    });

    displayTags.forEach(({ name, color, selected }) => {
        const span = document.createElement('span');
        span.className = `tag tag--${color}${selected ? ' active' : ''}`;
        span.setAttribute('data-name', name);
        span.textContent = name;
        span.setAttribute('role', 'button');
        span.setAttribute('tabindex', '0');
        tagFilterDiv.appendChild(span);
    });

    if (!tagFilterDiv._hasDelegator) {
        tagFilterDiv.addEventListener('click', (e) => {
            const tagEl = e.target.closest('.tag[data-name]');
            if (!tagEl) return;
            const tagName = tagEl.getAttribute('data-name');
            if (tagName) {
                e.preventDefault();
                e.stopPropagation();
                toggleTag(tagName, tagEl);
            }
        });
        tagFilterDiv.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const tagEl = e.target.closest('.tag[data-name]');
                if (!tagEl) return;
                const tagName = tagEl.getAttribute('data-name');
                if (tagName) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleTag(tagName, tagEl);
                }
            }
        });
        tagFilterDiv._hasDelegator = true;
    }

}

function initializeApp() {
    refreshTagFilter();
    filtersVisible = false;

    setupEventListeners();

    // Set up event delegation for database cards (prevents memory leaks)
    if (typeof setupDatabaseEventDelegation === 'function') {
        setupDatabaseEventDelegation();
    }

    // Initial render
    filterData();
}

// Close modals on Escape key (bubble phase; command-palette handles its own via capture)
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('cmdPaletteOverlay')?.classList.contains('active')) return;
    if (document.getElementById('tagEditContainer')?.classList.contains('show')) {
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
    } else if (document.getElementById('tagEditorSidesheet')?.classList.contains('open')) {
        const tagEditorColorWrapper = document.getElementById('tagEditorColorWrapper');
        if (tagEditorColorWrapper?.classList.contains('open')) {
            tagEditorColorWrapper.classList.remove('open');
            return;
        }
        const tagForm = document.getElementById('tagForm');
        if (tagForm?.style.display === 'block') {
            typeof cancelTagForm === 'function' && cancelTagForm();
            return;
        }
        closeTagEditor();
    } else if (document.getElementById('arcEditorSidesheet')?.classList.contains('open')) {
        closeArcEditor();
    } else if (document.getElementById('modal')?.classList.contains('active')) {
        closeModal();
    } else if (document.getElementById('syncSidesheet')?.classList.contains('open')) {
        typeof closeSyncSidesheet === 'function' && closeSyncSidesheet();
    }
});

// Setup tag click event delegation - filter by tag name (cards only, not filter panel)
document.addEventListener('click', (e) => {
    const tagEl = e.target.closest('.tag[data-name]');
    if (!tagEl) return;
    if (e.target.closest('.tag__remove')) return;
    if (e.target.closest('#editEntryContainer') || e.target.closest('#addEntryContainer')) return;
    if (e.target.closest('#tagFilter') || e.target.closest('#filterSidesheet') || e.target.closest('#tagEditorSidesheet')) return;

    const tagName = tagEl.getAttribute('data-name');
    if (!tagName) return;

    e.stopPropagation();
    filterByTag(e, tagName);
});

// Data loading is triggered by auth.js when user signs in