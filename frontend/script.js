// API configuration
const API = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api'  
  : 'https://formulario-web-backend.onrender.com/api'; // URL de tu backend en Render

// DOM Elements
const form = document.getElementById('formulario');
const lista = document.getElementById('lista');
const loading = document.getElementById('loading');
const noRecords = document.getElementById('no-records');
const searchInput = document.getElementById('searchInput');
const notification = document.getElementById('notification');

// State
let personas = [];
let editingId = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', initialize);
form.addEventListener('submit', handleSubmit);
searchInput.addEventListener('input', handleSearch);

// Initialize the application
function initialize() {
  cargarRegistros();
}

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();
  
  // Show loading state on button
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
  submitBtn.disabled = true;
  
  try {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    if (editingId) {
      // Update existing record
      await fetch(`${API}/actualizar/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      showNotification('Registro actualizado correctamente');
      resetEditState();
    } else {
      // Create new record
      await fetch(`${API}/crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      showNotification('Registro creado correctamente');
    }
    
    form.reset();
    await cargarRegistros();
  } catch (error) {
    console.error('Error:', error);
    showNotification('Error al procesar el formulario', true);
  } finally {
    // Restore button state
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// Load records from API
async function cargarRegistros() {
  try {
    showLoading(true);
    
    const res = await fetch(`${API}/personas`);
    personas = await res.json();
    
    renderPersonas(personas);
  } catch (error) {
    console.error('Error al cargar registros:', error);
    showNotification('Error al cargar los registros', true);
    noRecords.classList.remove('hidden');
  } finally {
    showLoading(false);
  }
}

// Render persons list
function renderPersonas(personasToRender) {
  lista.innerHTML = '';
  
  if (personasToRender.length === 0) {
    noRecords.classList.remove('hidden');
    return;
  }
  
  noRecords.classList.add('hidden');
  
  personasToRender.forEach(persona => {
    const li = document.createElement('li');
    li.className = 'fade-in';
    
    // Create record info container
    const infoDiv = document.createElement('div');
    infoDiv.className = 'record-info';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'record-name';
    nameDiv.textContent = `${persona.nombre} ${persona.apellido}`;
    
    const contactDiv = document.createElement('div');
    contactDiv.className = 'record-contact';
    contactDiv.innerHTML = `
      ${persona.telefono ? `<i class="fas fa-phone"></i> ${persona.telefono}` : ''}
      ${persona.correo ? `<i class="fas fa-envelope"></i> ${persona.correo}` : ''}
    `;
    
    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(contactDiv);
    
    // Create actions container
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'record-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn edit';
    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
    editBtn.title = 'Editar';
    editBtn.addEventListener('click', () => editPersona(persona));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn delete';
    deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
    deleteBtn.title = 'Eliminar';
    deleteBtn.addEventListener('click', () => deletePersona(persona.id));
    
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    
    // Append all elements to list item
    li.appendChild(infoDiv);
    li.appendChild(actionsDiv);
    
    lista.appendChild(li);
  });
}

// Edit a person record
function editPersona(persona) {
  // Set form values
  form.nombre.value = persona.nombre;
  form.apellido.value = persona.apellido;
  form.telefono.value = persona.telefono;
  form.direccion.value = persona.direccion || '';
  form.correo.value = persona.correo || '';
  form.nota.value = persona.nota || '';
  
  // Update UI for edit mode
  editingId = persona.id;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar';
  
  // Scroll to form
  form.scrollIntoView({ behavior: 'smooth' });
  
  // Add cancel button if not exists
  if (!document.getElementById('cancelEdit')) {
    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'cancelEdit';
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn secondary';
    cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancelar';
    cancelBtn.addEventListener('click', resetEditState);
    
    const resetBtn = form.querySelector('button[type="reset"]');
    resetBtn.style.display = 'none';
    
    form.querySelector('.form-actions').appendChild(cancelBtn);
  }
}

// Reset edit state
function resetEditState() {
  editingId = null;
  form.reset();
  
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar';
  
  const cancelBtn = document.getElementById('cancelEdit');
  if (cancelBtn) {
    cancelBtn.remove();
    form.querySelector('button[type="reset"]').style.display = '';
  }
}

// Delete a person record
async function deletePersona(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) {
    return;
  }
  
  try {
    await fetch(`${API}/eliminar/${id}`, {
      method: 'DELETE'
    });
    
    showNotification('Registro eliminado correctamente');
    await cargarRegistros();
  } catch (error) {
    console.error('Error al eliminar:', error);
    showNotification('Error al eliminar el registro', true);
  }
}

// Handle search input
function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  
  if (!searchTerm) {
    renderPersonas(personas);
    return;
  }
  
  const filteredPersonas = personas.filter(persona => 
    persona.nombre.toLowerCase().includes(searchTerm) ||
    persona.apellido.toLowerCase().includes(searchTerm) ||
    persona.telefono.toLowerCase().includes(searchTerm) ||
    (persona.correo && persona.correo.toLowerCase().includes(searchTerm)) ||
    (persona.direccion && persona.direccion.toLowerCase().includes(searchTerm))
  );
  
  renderPersonas(filteredPersonas);
}

// Show/hide loading indicator
function showLoading(show) {
  if (show) {
    loading.classList.remove('hidden');
    lista.innerHTML = '';
  } else {
    loading.classList.add('hidden');
  }
}

// Show notification
function showNotification(message, isError = false) {
  notification.textContent = message;
  notification.className = `notification ${isError ? 'error' : ''}`;
  
  // Add show class after a small delay to trigger animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Hide notification after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Initialize the app
initialize();
