// Tag management system

let allTags = [];

const TYPE_TO_COLOR = { character: 'purple', place: 'green', theme: 'blue', person: 'slate' };

async function loadTags() {
    try {
        const response = await fetch('tags.json');
        const data = await response.json();
        allTags = (data.tags || []).map(tag => {
            if (!tag.color && tag.type) {
                tag.color = TYPE_TO_COLOR[tag.type] || 'slate';
            } else if (!tag.color) {
                tag.color = 'slate';
            }
            return tag;
        });
    } catch (error) {
        console.error('Failed to load tags.json:', error);
        allTags = [];
    }
}

function getAllTerms() {
    const termsMap = new Map();
    allTags.forEach(tag => {
        tag.terms.forEach(term => {
            termsMap.set(term.toLowerCase(), tag);
        });
    });
    return termsMap;
}

function findTagByTerm(term) {
    return allTags.find(tag =>
        tag.terms.some(t => t.toLowerCase() === term.toLowerCase())
    );
}

function findTagsInText(text) {
    const foundTags = [];
    const termsMap = getAllTerms();

    // Sort terms by length (longest first) to match multi-word terms first
    const sortedTerms = Array.from(termsMap.keys()).sort((a, b) => b.length - a.length);

    sortedTerms.forEach(term => {
        const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi');
        if (regex.test(text)) {
            const tag = termsMap.get(term.toLowerCase());
            if (!foundTags.find(t => t.id === tag.id)) {
                foundTags.push(tag);
            }
        }
    });

    return foundTags;
}

function addTag(name, color, terms) {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    const tag = {
        id,
        name,
        color: color || 'slate',
        terms: terms || [name]
    };
    allTags.push(tag);
    return tag;
}

function updateTag(id, updates) {
    const tag = allTags.find(t => t.id === id);
    if (!tag) return null;

    const oldName = tag.name;
    Object.assign(tag, updates);

    const nameChanged = updates.name && updates.name !== oldName;
    const colorChanged = updates.color !== undefined;

    if (nameChanged) {
        tag.id = updates.name.toLowerCase().replace(/\s+/g, '-');
    }

    if (nameChanged || colorChanged) {
        replaceTagInEntries(nameChanged ? oldName : tag.name, { name: tag.name, color: tag.color });
    }
    return tag;
}

function replaceTagInEntries(tagNameInEntries, newTag) {
    if (!allData || !Array.isArray(allData)) return;
    const nameLower = tagNameInEntries.toLowerCase();
    allData.forEach(entry => {
        const tags = parseEntryTags(entry.Tags);
        const updated = tags.map(t =>
            t.name.toLowerCase() === nameLower ? { name: newTag.name, color: newTag.color } : t
        );
        entry.Tags = serializeEntryTags(updated);
    });
}

function deleteTag(id) {
    const tag = allTags.find(t => t.id === id);
    if (!tag) return false;
    removeTagFromEntries(tag.name);
    const index = allTags.findIndex(t => t.id === id);
    if (index > -1) {
        allTags.splice(index, 1);
        return true;
    }
    return false;
}

function removeTagFromEntries(tagName) {
    if (!allData || !Array.isArray(allData)) return;
    const nameLower = tagName.toLowerCase();
    allData.forEach(entry => {
        const tags = parseEntryTags(entry.Tags);
        const updated = tags.filter(t => t.name.toLowerCase() !== nameLower);
        entry.Tags = serializeEntryTags(updated);
    });
}

function saveTags() {
    // This would normally save to server, but we'll provide UI for manual download
    return JSON.stringify({
        tags: allTags
    }, null, 2);
}

/**
 * One-time sync: add any tags from the document data (allData) into allTags if they don't exist.
 * Tags are extracted from entry.Tags (e.g. "Nox|purple, Voidlaw|lime").
 */
function syncTagsFromDocument() {
    if (!allData || allData.length === 0) return;
    const existingNames = new Set(allTags.map(t => t.name.toLowerCase()));
    const added = new Set();
    allData.forEach(entry => {
        const tags = parseEntryTags(entry.Tags);
        tags.forEach(({ name, color }) => {
            const key = name.toLowerCase();
            if (!existingNames.has(key) && !added.has(key)) {
                addTag(name, color, [name]);
                existingNames.add(key);
                added.add(key);
            }
        });
    });
    if (added.size > 0) {
        console.log(`Synced ${added.size} tag(s) from document: ${[...added].join(', ')}`);
    }
}