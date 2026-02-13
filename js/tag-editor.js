// Tag editor UI

let tagEditorSelectedColor = 'slate';
let tagEditorSearchTerm = '';

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
                    <button onclick="editTag('${escapeHtml(tag.id)}')" class="tag-edit-btn">Edit</button>
                    <button onclick="deleteTagConfirm('${escapeHtml(tag.id)}')" class="tag-delete-btn">Delete</button>
                </div>
            </div>
            <div class="tag-item-terms">
                <strong>Terms:</strong> ${escapeHtml(tag.terms.join(', '))}
            </div>
        </div>
    `;
    }).join('');
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