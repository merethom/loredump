/**
 * Arc Manager - handles renaming and coloring of entry arcs
 */

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

    // Get all unique arcs present in the data
    const arcKeys = new Set();
    allData.forEach(entry => {
        const arc = Math.floor(parseFloat(entry.Number));
        if (!isNaN(arc)) arcKeys.add(arc.toString());
    });

    const sortedKeys = Array.from(arcKeys).sort((a, b) => parseInt(a) - parseInt(b));

    arcList.innerHTML = sortedKeys.map(key => {
        const arcData = allArcs[key] || { name: '', color: 'slate' };
        return `
            <div class="arc-item" data-arc-key="${key}">
                <div class="arc-item-header">
                    <span class="arc-number">Arc ${key}</span>
                    <div class="arc-color-selector">
                        ${renderArcColorBtns(key, arcData.color)}
                    </div>
                </div>
                <input type="text" class="arc-name-input" 
                    placeholder="Set arc name..." 
                    value="${escapeHtml(arcData.name)}"
                    onchange="updateArcName('${key}', this.value)">
            </div>
        `;
    }).join('');
}

function renderArcColorBtns(key, selectedColor) {
    const colors = ['purple', 'green', 'blue', 'orange', 'teal', 'pink', 'amber', 'slate'];
    return colors.map(color => `
        <button type="button" 
            class="arc-color-btn tag-color ${color === 'amber' ? 'orange-red' : color === 'green' ? 'lime' : color === 'teal' ? 'aqua' : color === 'pink' ? 'magenta' : color} ${color === selectedColor ? 'selected' : ''}" 
            title="${color}"
            onclick="updateArcColor('${key}', '${color}')"></button>
    `).join('');
}

function updateArcName(key, name) {
    if (!allArcs[key]) allArcs[key] = { name: '', color: 'slate' };
    allArcs[key].name = name.trim();
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

// Setup event listeners
document.addEventListener('DOMContentLoaded', () => {
    const arcBtn = document.getElementById('arcEditorBtn');
    if (arcBtn) {
        arcBtn.addEventListener('click', openArcEditor);
    }

    const closeBtn = document.getElementById('arcEditorSidesheetClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeArcEditor);
    }
});
