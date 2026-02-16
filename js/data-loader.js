// Data loading and CSV parsing

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT_mstImJihA42vSDO7VLfH1fowekBj_QSyUbFiCjXEgpgCBRqgjtXPhfCfX-qTbTbFXvfGrgnSPnn6/pub?output=csv';

async function loadData() {
    // Try Firebase first
    if (window.firebaseDb) {
        try {
            const data = await window.firebaseDb.loadLoreData();
            if (data !== null) {
                console.log('Loaded from Firebase');
                document.getElementById('dataSource').textContent = 'loaded from Firebase';
                document.getElementById('errorState').classList.remove('show');
                allData = data.entries || [];
                allTags = data.tags || [];
                syncTagsFromDocument();
                initializeApp();
                return;
            }
        } catch (e) {
            console.error('Firebase load failed:', e);
        }
    }

    // NO FALLBACK - Firebase is the single source of truth
    // If Firebase fails, show error instead of loading stale Google Sheets data
    console.error('Failed to load from Firebase');
    document.getElementById('dataSource').textContent = 'Error: Firebase unavailable';
    document.getElementById('database').style.display = 'none';
    document.getElementById('errorState').classList.add('show');
}

function saveLoreToFirebase() {
    if (!window.firebaseDb) return;
    window.firebaseDb.saveLoreData({
            entries: allData || [],
            tags: allTags || []
        })
        .then((ok) => {
            if (ok && window.githubBackup && typeof window.githubBackup.saveBackup === 'function') {
                window.githubBackup.saveBackup(allData || [], allTags || []);
            }
        })
        .catch(err => console.warn('Firebase save failed:', err));
}

function tryLoadURL(index, urls) {
    if (index >= urls.length) {
        console.error('Failed to load from all data sources');
        document.getElementById('dataSource').textContent = 'Error loading data';
        document.getElementById('database').style.display = 'none';
        document.getElementById('errorState').classList.add('show');
        return;
    }

    const {
        url,
        source
    } = urls[index];
    console.log(`Attempting to load from: ${source}`);

    fetch(url, {
            mode: 'cors',
            credentials: 'omit'
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
        })
        .then(csv => {
            console.log(`Successfully loaded from: ${source}`);
            document.getElementById('dataSource').textContent = `loaded from ${source}`;
            document.getElementById('errorState').classList.remove('show');
            allData = parseCSV(csv);
            loadTags().then(() => {
                syncTagsFromDocument();
                initializeApp();
                // Save to Firebase so next load uses it
                saveLoreToFirebase();
            });
        })
        .catch(error => {
            console.log(`Failed to load from ${source}: ${error.message}`);
            tryLoadURL(index + 1, urls);
        });
}

function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    return lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
            const cells = parseCSVLine(line);
            const entry = {};
            headers.forEach((header, index) => {
                entry[header] = cells[index] ? cells[index].trim().replace(/"/g, '') : '';
            });
            return entry;
        })
        .filter(entry => (entry.Number || entry.Name) && entry.Description && entry.Description.trim());
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}