// Utility functions

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeJsString(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
