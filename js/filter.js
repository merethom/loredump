// Filtering and tag management

function toggleTag(tag, element) {
    if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
    } else {
        selectedTags.add(tag);
    }
    if (typeof refreshTagFilter === 'function') refreshTagFilter();
    filterData();
}

function getEntryTagNames(entry) {
    return new Set(parseEntryTags(entry.Tags).map(t => t.name));
}

function getTagColorMap() {
    const map = new Map();
    if (typeof allTags !== 'undefined' && Array.isArray(allTags)) {
        allTags.forEach(tag => {
            if (tag && tag.name && !map.has(tag.name)) {
                map.set(tag.name, tag.color || 'slate');
            }
        });
    }
    allData.forEach(entry => {
        getEntryTagsForDisplay(entry).forEach(t => {
            if (!map.has(t.name)) map.set(t.name, t.color);
        });
    });
    return map;
}

function filterData() {
    filteredData = allData.filter(entry => {
        if (searchTerm) {
            if (!entry.Description.toLowerCase().includes(searchTerm)) return false;
        }

        if (selectedTags.size > 0) {
            const entryTagNames = getEntryTagNames(entry);
            const hasAllSelected = Array.from(selectedTags).every(tag => entryTagNames.has(tag));
            if (!hasAllSelected) return false;
        }

        return true;
    });

    // Apply sorting
    if (currentSort === 'entry-desc') {
        filteredData.sort((a, b) => parseFloat(b.Number) - parseFloat(a.Number));
    } else {
        // entry-asc (default)
        filteredData.sort((a, b) => parseFloat(a.Number) - parseFloat(b.Number));
    }

    renderDatabase();
    updateStats();
}

function filterByTag(event, tag) {
    event.stopPropagation();
    searchTerm = '';
    document.getElementById('searchInput').value = '';
    /* Add tag to current selection (supports multi-tag filter) instead of replacing */
    selectedTags.add(tag);
    if (typeof selectedCustomTags !== 'undefined') selectedCustomTags.clear();

    if (typeof refreshTagFilter === 'function') refreshTagFilter();

    // Open filter sidesheet when filtering by tag
    filtersVisible = true;
    if (typeof openFilterSidesheet === 'function') openFilterSidesheet();

    filterData();
    if (typeof closeModal === 'function') closeModal();
}