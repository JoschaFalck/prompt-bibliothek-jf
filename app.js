// ========================================
// PROMPT-BIBLIOTHEK - App Logic
// ========================================

// State
let prompts = [];
let categories = ['Unterricht', 'Feedback', 'Differenzierung', 'Schulentwicklung', 'Überarbeitung eigener Texte'];
let selectedCategory = null;
let currentPromptForVariables = null;
let lastBackupDate = null;
let autoSaveTimeout = null;
let isSyncing = false;

// API Base URL (wird automatisch erkannt)
const API_URL = '/.netlify/functions/prompts';

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    // Erst lokale Daten laden (als Fallback)
    loadFromLocalStorage();
    renderCategories();
    renderPrompts();
    updateBackupStatus();

    // Dann aus Cloud laden (überschreibt lokale Daten)
    await loadFromCloud(true); // true = silent mode (kein Toast)

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
});

// ========================================
// LOCAL STORAGE
// ========================================

function loadFromLocalStorage() {
    const savedPrompts = localStorage.getItem('prompts');
    const savedCategories = localStorage.getItem('categories');
    const savedBackupDate = localStorage.getItem('lastBackupDate');

    if (savedPrompts) {
        prompts = JSON.parse(savedPrompts);
    }
    if (savedCategories) {
        categories = JSON.parse(savedCategories);
    }
    if (savedBackupDate) {
        lastBackupDate = new Date(savedBackupDate);
    }
}

function saveToLocalStorage() {
    localStorage.setItem('prompts', JSON.stringify(prompts));
    localStorage.setItem('categories', JSON.stringify(categories));
    if (lastBackupDate) {
        localStorage.setItem('lastBackupDate', lastBackupDate.toISOString());
    }
}

// ========================================
// AUTO-SAVE
// ========================================

function triggerAutoSave() {
    // Bestehenden Timer löschen
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }

    // Neuen Timer starten (1.5 Sekunden Verzögerung)
    autoSaveTimeout = setTimeout(() => {
        saveToCloud(true); // true = silent mode
    }, 1500);
}

// ========================================
// CLOUD SYNC
// ========================================

async function saveToCloud(silent = false) {
    if (isSyncing) return;
    isSyncing = true;

    try {
        if (!silent) {
            showToast('Speichere in Cloud...');
        }
        updateSyncStatus('syncing');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompts: prompts,
                categories: categories,
                lastModified: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error('Fehler beim Speichern');
        }

        lastBackupDate = new Date();
        saveToLocalStorage();
        updateBackupStatus();
        updateSyncStatus('synced');

        if (!silent) {
            showToast('Erfolgreich in Cloud gespeichert!');
        }
    } catch (error) {
        console.error('Cloud save error:', error);
        updateSyncStatus('error');
        if (!silent) {
            showToast('Fehler beim Speichern in Cloud. Lokale Kopie ist sicher.');
        }
    } finally {
        isSyncing = false;
    }
}

async function loadFromCloud(silent = false) {
    if (isSyncing) return;
    isSyncing = true;

    try {
        if (!silent) {
            showToast('Lade aus Cloud...');
        }
        updateSyncStatus('syncing');

        const response = await fetch(API_URL);

        if (!response.ok) {
            if (response.status === 404) {
                if (!silent) {
                    showToast('Keine Cloud-Daten gefunden. Starte neu.');
                }
                updateSyncStatus('synced');
                return;
            }
            throw new Error('Fehler beim Laden');
        }

        const data = await response.json();

        if (data.prompts && data.prompts.length > 0) {
            prompts = data.prompts;
        }
        if (data.categories && data.categories.length > 0) {
            categories = data.categories;
        }

        lastBackupDate = new Date();
        saveToLocalStorage();
        renderCategories();
        renderPrompts();
        updateBackupStatus();
        updateSyncStatus('synced');

        if (!silent) {
            showToast('Erfolgreich aus Cloud geladen!');
        }
    } catch (error) {
        console.error('Cloud load error:', error);
        updateSyncStatus('error');
        if (!silent) {
            showToast('Fehler beim Laden aus Cloud. Nutze lokale Daten.');
        }
    } finally {
        isSyncing = false;
    }
}

function updateSyncStatus(status) {
    const statusEl = document.getElementById('backupStatus');
    const dotEl = statusEl.querySelector('.backup-dot');
    const textEl = statusEl.querySelector('.backup-text');

    switch (status) {
        case 'syncing':
            dotEl.className = 'backup-dot syncing';
            textEl.textContent = 'Synchronisiere...';
            break;
        case 'synced':
            dotEl.className = 'backup-dot synced';
            textEl.textContent = 'Synchronisiert';
            break;
        case 'error':
            dotEl.className = 'backup-dot error';
            textEl.textContent = 'Sync-Fehler';
            break;
    }
}

function updateBackupStatus() {
    const statusEl = document.getElementById('backupStatus');
    const dotEl = statusEl.querySelector('.backup-dot');
    const textEl = statusEl.querySelector('.backup-text');

    if (!lastBackupDate) {
        dotEl.className = 'backup-dot warning';
        textEl.textContent = 'Noch kein Backup';
        return;
    }

    const now = new Date();
    const diffMs = now - lastBackupDate;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
        dotEl.className = 'backup-dot synced';
        textEl.textContent = 'Gerade synchronisiert';
    } else if (diffMins < 60) {
        dotEl.className = 'backup-dot synced';
        textEl.textContent = `Sync: vor ${diffMins} Min`;
    } else if (diffDays === 0) {
        dotEl.className = 'backup-dot synced';
        textEl.textContent = 'Sync: heute';
    } else if (diffDays === 1) {
        dotEl.className = 'backup-dot warning';
        textEl.textContent = 'Sync: gestern';
    } else {
        dotEl.className = 'backup-dot error';
        textEl.textContent = `Sync: vor ${diffDays} Tagen`;
    }
}

// ========================================
// CATEGORIES
// ========================================

function renderCategories() {
    const container = document.getElementById('categoryList');

    // "Alle Prompts" option
    let html = `
        <div class="category-item ${selectedCategory === null ? 'active' : ''}" onclick="selectCategory(null)">
            <span>Alle Prompts (${prompts.length})</span>
        </div>
    `;

    // Category items
    categories.forEach(cat => {
        const count = prompts.filter(p => p.category === cat).length;
        html += `
            <div class="category-item ${selectedCategory === cat ? 'active' : ''}" onclick="selectCategory('${cat}')">
                <span>${cat} (${count})</span>
                <div class="category-actions">
                    <button class="category-action-btn" onclick="event.stopPropagation(); deleteCategory('${cat}')" title="Löschen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Update category dropdown in modal
    updateCategoryDropdown();
}

function selectCategory(category) {
    selectedCategory = category;
    renderCategories();
    renderPrompts();
}

function openAddCategoryModal() {
    document.getElementById('categoryModal').classList.add('active');
    document.getElementById('newCategoryName').value = '';
    document.getElementById('newCategoryName').focus();
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}

function addCategory() {
    const name = document.getElementById('newCategoryName').value.trim();

    if (!name) {
        showToast('Bitte einen Namen eingeben');
        return;
    }

    if (categories.includes(name)) {
        showToast('Diese Kategorie existiert bereits');
        return;
    }

    categories.push(name);
    saveToLocalStorage();
    triggerAutoSave(); // Auto-Save
    renderCategories();
    closeCategoryModal();
    showToast('Kategorie hinzugefügt');
}

function deleteCategory(category) {
    if (!confirm(`Kategorie "${category}" wirklich löschen? Die Prompts bleiben erhalten, verlieren aber ihre Kategorie.`)) {
        return;
    }

    categories = categories.filter(c => c !== category);
    prompts = prompts.map(p => p.category === category ? { ...p, category: '' } : p);

    if (selectedCategory === category) {
        selectedCategory = null;
    }

    saveToLocalStorage();
    triggerAutoSave(); // Auto-Save
    renderCategories();
    renderPrompts();
    showToast('Kategorie gelöscht');
}

function updateCategoryDropdown() {
    const select = document.getElementById('promptCategory');
    select.innerHTML = '<option value="">Kategorie wählen</option>' +
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

// ========================================
// PROMPTS
// ========================================

function renderPrompts() {
    const container = document.getElementById('promptsList');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    // Filter prompts
    let filtered = prompts.filter(prompt => {
        const matchesCategory = !selectedCategory || prompt.category === selectedCategory;
        const matchesSearch = !searchTerm ||
            prompt.title.toLowerCase().includes(searchTerm) ||
            prompt.content.toLowerCase().includes(searchTerm) ||
            (prompt.tags && prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
        return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <h3>Keine Prompts gefunden</h3>
                <p>Erstelle deinen ersten Prompt oder passe deine Suchkriterien an.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(prompt => createPromptCard(prompt)).join('');
}

function createPromptCard(prompt) {
    const variables = extractVariables(prompt.content);
    const hasVersions = prompt.versions && prompt.versions.length > 0;

    return `
        <div class="prompt-card">
            <div class="prompt-header">
                <div>
                    <h3 class="prompt-title">${escapeHtml(prompt.title)}</h3>
                    <div class="prompt-meta">
                        ${prompt.category ? `<span class="prompt-category">${escapeHtml(prompt.category)}</span>` : ''}
                        ${(prompt.tags || []).map(tag => `
                            <span class="prompt-tag">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                                </svg>
                                ${escapeHtml(tag)}
                            </span>
                        `).join('')}
                    </div>
                </div>
                <div class="prompt-actions">
                    ${hasVersions ? `
                        <button class="prompt-action-btn" onclick="showVersionHistory('${prompt.id}')" title="${prompt.versions.length} Version(en)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </button>
                    ` : ''}
                    <button class="prompt-action-btn copy" onclick="copyPrompt('${prompt.id}')" title="Kopieren">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button class="prompt-action-btn" onclick="editPrompt('${prompt.id}')" title="Bearbeiten">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="prompt-action-btn delete" onclick="deletePrompt('${prompt.id}')" title="Löschen">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="prompt-content">${escapeHtml(prompt.content)}</div>
            <div class="prompt-footer">
                <div class="prompt-info">
                    <span>Lizenz: ${escapeHtml(prompt.license || 'CC BY 4.0')}</span>
                    ${prompt.author ? `<span>Autor: ${escapeHtml(prompt.author)}</span>` : ''}
                    ${variables.length > 0 ? `<span class="prompt-variables">Variablen: ${variables.join(', ')}</span>` : ''}
                </div>
                <span>Zuletzt geändert: ${formatDate(prompt.lastModified || prompt.created)}</span>
            </div>
        </div>
    `;
}

function filterPrompts() {
    renderPrompts();
}

// ========================================
// PROMPT CRUD
// ========================================

function openAddPromptModal() {
    document.getElementById('modalTitle').textContent = 'Neuer Prompt';
    document.getElementById('promptId').value = '';
    document.getElementById('promptTitle').value = '';
    document.getElementById('promptContent').value = '';
    document.getElementById('promptCategory').value = '';
    document.getElementById('promptTags').value = '';
    document.getElementById('promptLicense').value = 'CC BY 4.0';
    document.getElementById('promptAuthor').value = '';
    document.getElementById('metaTargetAudience').value = '';
    document.getElementById('metaSubject').value = '';
    document.getElementById('metaDifficulty').value = 'Mittel';
    document.getElementById('metaTimeRequired').value = '';

    document.getElementById('promptModal').classList.add('active');
    document.getElementById('promptTitle').focus();
}

function editPrompt(id) {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt) return;

    document.getElementById('modalTitle').textContent = 'Prompt bearbeiten';
    document.getElementById('promptId').value = prompt.id;
    document.getElementById('promptTitle').value = prompt.title;
    document.getElementById('promptContent').value = prompt.content;
    document.getElementById('promptCategory').value = prompt.category || '';
    document.getElementById('promptTags').value = (prompt.tags || []).join(', ');
    document.getElementById('promptLicense').value = prompt.license || 'CC BY 4.0';
    document.getElementById('promptAuthor').value = prompt.author || '';

    const meta = prompt.metadata || {};
    document.getElementById('metaTargetAudience').value = meta.targetAudience || '';
    document.getElementById('metaSubject').value = meta.subject || '';
    document.getElementById('metaDifficulty').value = meta.difficulty || 'Mittel';
    document.getElementById('metaTimeRequired').value = meta.timeRequired || '';

    document.getElementById('promptModal').classList.add('active');
}

function closePromptModal() {
    document.getElementById('promptModal').classList.remove('active');
}

function savePrompt() {
    const id = document.getElementById('promptId').value;
    const title = document.getElementById('promptTitle').value.trim();
    const content = document.getElementById('promptContent').value.trim();
    const category = document.getElementById('promptCategory').value;
    const tagsStr = document.getElementById('promptTags').value;
    const license = document.getElementById('promptLicense').value;
    const author = document.getElementById('promptAuthor').value.trim();

    const metadata = {
        targetAudience: document.getElementById('metaTargetAudience').value.trim(),
        subject: document.getElementById('metaSubject').value.trim(),
        difficulty: document.getElementById('metaDifficulty').value,
        timeRequired: document.getElementById('metaTimeRequired').value.trim()
    };

    if (!title) {
        showToast('Bitte einen Titel eingeben');
        return;
    }

    if (!content) {
        showToast('Bitte einen Prompt-Inhalt eingeben');
        return;
    }

    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    const timestamp = new Date().toISOString();

    if (id) {
        // Update existing
        const existingPrompt = prompts.find(p => p.id === id);
        const updatedPrompt = {
            ...existingPrompt,
            title,
            content,
            category,
            tags,
            license,
            author,
            metadata,
            lastModified: timestamp,
            versions: [
                ...(existingPrompt.versions || []),
                {
                    content: existingPrompt.content,
                    timestamp: existingPrompt.lastModified || existingPrompt.created,
                    title: existingPrompt.title
                }
            ]
        };
        prompts = prompts.map(p => p.id === id ? updatedPrompt : p);
        showToast('Prompt aktualisiert');
    } else {
        // Create new
        const newPrompt = {
            id: Date.now().toString(),
            title,
            content,
            category,
            tags,
            license,
            author,
            metadata,
            created: timestamp,
            lastModified: timestamp,
            versions: []
        };
        prompts.push(newPrompt);
        showToast('Prompt erstellt');
    }

    saveToLocalStorage();
    triggerAutoSave(); // Auto-Save
    renderCategories();
    renderPrompts();
    closePromptModal();
}

function deletePrompt(id) {
    if (!confirm('Diesen Prompt wirklich löschen?')) {
        return;
    }

    prompts = prompts.filter(p => p.id !== id);
    saveToLocalStorage();
    triggerAutoSave(); // Auto-Save
    renderCategories();
    renderPrompts();
    showToast('Prompt gelöscht');
}

// ========================================
// COPY WITH VARIABLES
// ========================================

function copyPrompt(id) {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt) return;

    const variables = extractVariables(prompt.content);

    if (variables.length > 0) {
        currentPromptForVariables = prompt;
        showVariablesModal(variables);
    } else {
        navigator.clipboard.writeText(prompt.content);
        showToast('Prompt kopiert!');
    }
}

function showVariablesModal(variables) {
    const container = document.getElementById('variablesForm');
    container.innerHTML = variables.map(v => `
        <div class="form-group">
            <label for="var_${v}">${v}</label>
            <input type="text" id="var_${v}" placeholder="Wert für ${v}">
        </div>
    `).join('');

    document.getElementById('variablesModal').classList.add('active');
    document.querySelector('#variablesForm input')?.focus();
}

function closeVariablesModal() {
    document.getElementById('variablesModal').classList.remove('active');
    currentPromptForVariables = null;
}

function copyWithVariables() {
    if (!currentPromptForVariables) return;

    let content = currentPromptForVariables.content;
    const variables = extractVariables(content);

    variables.forEach(v => {
        const value = document.getElementById(`var_${v}`).value || `{{${v}}}`;
        content = content.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), value);
    });

    navigator.clipboard.writeText(content);
    closeVariablesModal();
    showToast('Prompt mit Variablen kopiert!');
}

function extractVariables(content) {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...content.matchAll(regex)];
    return [...new Set(matches.map(m => m[1]))];
}

// ========================================
// VERSION HISTORY
// ========================================

function showVersionHistory(id) {
    const prompt = prompts.find(p => p.id === id);
    if (!prompt || !prompt.versions || prompt.versions.length === 0) {
        showToast('Keine Versionen vorhanden');
        return;
    }

    const container = document.getElementById('versionList');
    container.innerHTML = prompt.versions.map((version, index) => `
        <div class="version-item">
            <div class="version-header">
                <span class="version-date">Version ${index + 1} - ${formatDate(version.timestamp)}</span>
                <button class="btn btn-ghost" onclick="restoreVersion('${prompt.id}', ${index})">
                    Wiederherstellen
                </button>
            </div>
            <div class="version-content">${escapeHtml(version.content)}</div>
        </div>
    `).join('');

    document.getElementById('versionModal').classList.add('active');
}

function closeVersionModal() {
    document.getElementById('versionModal').classList.remove('active');
}

function restoreVersion(promptId, versionIndex) {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;

    const version = prompt.versions[versionIndex];
    if (!version) return;

    // Save current as new version before restoring
    const timestamp = new Date().toISOString();
    const updatedPrompt = {
        ...prompt,
        content: version.content,
        title: version.title || prompt.title,
        lastModified: timestamp,
        versions: [
            ...prompt.versions,
            {
                content: prompt.content,
                timestamp: prompt.lastModified,
                title: prompt.title
            }
        ]
    };

    prompts = prompts.map(p => p.id === promptId ? updatedPrompt : p);
    saveToLocalStorage();
    triggerAutoSave(); // Auto-Save
    renderPrompts();
    closeVersionModal();
    showToast('Version wiederhergestellt');
}

// ========================================
// IMPORT / EXPORT
// ========================================

function exportJSON() {
    const data = {
        prompts: prompts,
        categories: categories,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `prompts_${formatDateForFile(new Date())}.json`);
    showToast('JSON exportiert');
}

function exportMarkdown() {
    let md = '# Prompt-Bibliothek\n\n';
    md += `Exportiert am: ${formatDate(new Date().toISOString())}\n\n`;
    md += '---\n\n';

    prompts.forEach(prompt => {
        md += `## ${prompt.title}\n\n`;
        if (prompt.category) md += `**Kategorie:** ${prompt.category}\n\n`;
        if (prompt.tags && prompt.tags.length > 0) md += `**Tags:** ${prompt.tags.join(', ')}\n\n`;
        md += `**Lizenz:** ${prompt.license || 'CC BY 4.0'}\n\n`;
        if (prompt.author) md += `**Autor:** ${prompt.author}\n\n`;
        md += `### Prompt\n\n\`\`\`\n${prompt.content}\n\`\`\`\n\n`;
        md += '---\n\n';
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    downloadBlob(blob, `prompts_${formatDateForFile(new Date())}.md`);
    showToast('Markdown exportiert');
}

function importJSON() {
    document.getElementById('fileInput').click();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (data.prompts && Array.isArray(data.prompts)) {
                // Merge or replace?
                if (prompts.length > 0 && !confirm('Vorhandene Prompts überschreiben? (Abbrechen = Zusammenführen)')) {
                    // Merge - add only new prompts
                    const existingIds = new Set(prompts.map(p => p.id));
                    const newPrompts = data.prompts.filter(p => !existingIds.has(p.id));
                    prompts = [...prompts, ...newPrompts];
                    showToast(`${newPrompts.length} neue Prompts importiert`);
                } else {
                    // Replace
                    prompts = data.prompts;
                    showToast(`${prompts.length} Prompts importiert`);
                }
            }

            if (data.categories && Array.isArray(data.categories)) {
                // Merge categories
                categories = [...new Set([...categories, ...data.categories])];
            }

            saveToLocalStorage();
            triggerAutoSave(); // Auto-Save
            renderCategories();
            renderPrompts();
        } catch (error) {
            console.error('Import error:', error);
            showToast('Fehler beim Import. Ist die Datei gültiges JSON?');
        }
    };
    reader.readAsText(file);

    // Reset input
    event.target.value = '';
}

// ========================================
// HELPERS
// ========================================

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
    });
}

function formatDateForFile(date) {
    return date.toISOString().split('T')[0];
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('active');

    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

function closeAllModals() {
    document.getElementById('promptModal').classList.remove('active');
    document.getElementById('categoryModal').classList.remove('active');
    document.getElementById('variablesModal').classList.remove('active');
    document.getElementById('versionModal').classList.remove('active');
}
