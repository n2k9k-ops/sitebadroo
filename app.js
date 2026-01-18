document.addEventListener('DOMContentLoaded', function() {
    const noteTitle = document.getElementById('noteTitle');
    const noteContent = document.getElementById('noteContent');
    const saveBtn = document.getElementById('saveBtn');
    const notesList = document.getElementById('notesList');
    const userRole = window.userRole || 'reader';
    
    let editingId = null;
    
    loadNotes();
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveNote);
    }
    
    async function loadNotes() {
        try {
            const response = await fetch('/api/notes');
            if (response.status === 401) {
                window.location.reload();
                return;
            }
            const notes = await response.json();
            renderNotes(notes);
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    }
    
    function linkify(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, function(url) {
            return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
        });
    }
    
    function renderNotes(notes) {
        if (notes.length === 0) {
            notesList.innerHTML = '<div class="empty-state"><p>Aucune note pour le moment.</p></div>';
            return;
        }
        
        notesList.innerHTML = notes.map(note => {
            let actions = '';
            if (userRole === 'admin') {
                actions = `
                    <div class="note-actions">
                        <button class="edit-btn" onclick="editNote(${note.id})">Modifier</button>
                        <button class="delete-btn" onclick="deleteNote(${note.id})">Supprimer</button>
                    </div>
                `;
            }
            
            return `
                <div class="note-card" data-id="${note.id}">
                    ${actions}
                    <h3>${escapeHtml(note.title)}</h3>
                    <p>${linkify(escapeHtml(note.content))}</p>
                </div>
            `;
        }).join('');
    }
    
    async function saveNote() {
        const title = noteTitle.value.trim();
        const content = noteContent.value.trim();
        
        if (!title || !content) {
            alert('Veuillez remplir le titre et le contenu');
            return;
        }
        
        try {
            const url = editingId ? `/api/notes/${editingId}` : '/api/notes';
            const method = editingId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content })
            });
            
            if (response.ok) {
                noteTitle.value = '';
                noteContent.value = '';
                editingId = null;
                saveBtn.textContent = 'Ajouter une note';
                loadNotes();
            } else {
                const err = await response.json();
                alert(err.error || 'Erreur lors de la sauvegarde');
            }
        } catch (error) {
            console.error('Error saving note:', error);
        }
    }
    
    window.editNote = async function(id) {
        try {
            const response = await fetch('/api/notes');
            const notes = await response.json();
            const note = notes.find(n => n.id === id);
            
            if (note) {
                noteTitle.value = note.title;
                noteContent.value = note.content;
                editingId = id;
                saveBtn.textContent = 'Mettre à jour';
                noteTitle.focus();
            }
        } catch (error) {
            console.error('Error editing note:', error);
        }
    };
    
    window.deleteNote = async function(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette note?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
            if (response.ok) {
                loadNotes();
            } else {
                const err = await response.json();
                alert(err.error || 'Erreur lors de la suppression');
            }
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
