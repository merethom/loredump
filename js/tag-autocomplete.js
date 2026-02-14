/**
 * Tag autocomplete - shows existing tags as user types.
 * Isolated module - only runs on input, does not affect load/auth flow.
 */
(function() {
    function getMatchingTags(typed, excludeNames) {
        if (!typed || typeof allTags === 'undefined' || !Array.isArray(allTags)) return [];
        var lower = typed.toLowerCase();
        var exclude = new Set((excludeNames || []).map(function(n) { return n.toLowerCase(); }));
        return allTags.filter(function(t) {
            return t.name && t.name.toLowerCase().indexOf(lower) !== -1 && !exclude.has(t.name.toLowerCase());
        }).sort(function(a, b) { return a.name.localeCompare(b.name); });
    }

    function showAutocomplete(inputId, listId, getCurrentTags) {
        var input = document.getElementById(inputId);
        var list = document.getElementById(listId);
        if (!input || !list) return;
        var typed = (input.value || '').trim();
        var current = (getCurrentTags && getCurrentTags()) || [];
        var matches = getMatchingTags(typed, current.map(function(t) { return t.name; }));
        if (matches.length === 0) {
            list.style.display = 'none';
            list.innerHTML = '';
            return;
        }
        list.innerHTML = matches.slice(0, 8).map(function(tag) {
            var tagClass = typeof getTagClass === 'function' ? getTagClass(tag.color) : 'tag';
            var loreClass = typeof getLoreTagColorClass === 'function' ? getLoreTagColorClass(tag.color || 'slate') : '';
            var cls = tagClass + ' lore-tag tag-autocomplete-item' + (loreClass ? ' ' + loreClass : '');
            var name = tag.name || '';
            var safeName = name.replace(/"/g, '&quot;');
            var displayName = (typeof escapeHtml === 'function' ? escapeHtml(name) : name);
            return '<span class="' + cls + '" data-tag-name="' + safeName + '" data-tag-color="' + (tag.color || 'slate') + '">' + displayName + '</span>';
        }).join('');
        list.style.display = 'block';
    }

    function hideAutocomplete(listId) {
        var list = document.getElementById(listId);
        if (list) {
            list.style.display = 'none';
        }
    }

    function setupAutocomplete(inputId, listId, getCurrentTags, onSelect) {
        var input = document.getElementById(inputId);
        var list = document.getElementById(listId);
        if (!input || !list) return;
        input.addEventListener('input', function() {
            try { showAutocomplete(inputId, listId, getCurrentTags); } catch (e) { console.warn('Autocomplete error:', e); }
        });
        input.addEventListener('blur', function() {
            setTimeout(function() { hideAutocomplete(listId); }, 150);
        });
        list.addEventListener('mousedown', function(e) {
            var item = e.target.closest('.tag-autocomplete-item');
            if (item && onSelect) {
                e.preventDefault();
                var name = item.getAttribute('data-tag-name');
                var color = item.getAttribute('data-tag-color') || 'slate';
                if (name) onSelect(name, color);
                input.value = '';
                hideAutocomplete(listId);
            }
        });
    }

    function init() {
        setupAutocomplete(
            'addEntryTagInput',
            'addEntryTagAutocomplete',
            function() { return typeof addingEntryTags !== 'undefined' ? addingEntryTags : []; },
            function(name, color) {
                if (typeof addTagToAddEntryFromAutocomplete === 'function') {
                    addTagToAddEntryFromAutocomplete(name, color);
                }
            }
        );
        setupAutocomplete(
            'editEntryTagInput',
            'editEntryTagAutocomplete',
            function() { return typeof editingEntryTags !== 'undefined' ? editingEntryTags : []; },
            function(name, color) {
                if (typeof addTagToEditEntryFromAutocomplete === 'function') {
                    addTagToEditEntryFromAutocomplete(name, color);
                }
            }
        );
    }

    function hideTagAutocompleteIfVisible(listId) {
        var list = document.getElementById(listId);
        if (!list || list.style.display === 'none') return false;
        list.style.display = 'none';
        return true;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.hideTagAutocompleteIfVisible = hideTagAutocompleteIfVisible;
})();
