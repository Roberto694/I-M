/* ============================================
   app.js — Controlador Principal de la SPA
   ============================================ */

/* ---- Estado global ---- */
const State = {
  currentPage:    'home',
  editingPostId:  null
};

/* ============================================
   NAVEGACIÓN entre páginas (SPA simple)
   ============================================ */
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pageId}`);
  if (target) {
    target.classList.add('active');
    State.currentPage = pageId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/* ============================================
   TOAST NOTIFICATIONS
   ============================================ */
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `show toast-${type}`;
  setTimeout(() => { toast.className = ''; }, 3500);
}

/* ============================================
   ACTUALIZAR NAVBAR según sesión
   ============================================ */
function updateNav() {
  const user = Auth.getCurrentUser();
  const guestNav   = document.getElementById('nav-guest');
  const authNav    = document.getElementById('nav-auth');
  const greeting   = document.getElementById('user-greeting');

  if (user) {
    guestNav.classList.add('hidden');
    authNav.classList.remove('hidden');
    greeting.textContent = `Hola, ${user.name} ✦`;
  } else {
    guestNav.classList.remove('hidden');
    authNav.classList.add('hidden');
  }
}

/* ============================================
   RENDERIZAR TARJETAS DE POSTS
   ============================================ */
function renderPostCard(post) {
  const user   = Auth.getCurrentUser();
  const isOwner = user && user.id === post.authorId;

  const excerpt = post.content.length > 150
    ? post.content.substring(0, 150) + '…'
    : post.content;

  const ownerActions = isOwner ? `
    <button class="btn-icon" onclick="openEditor('${post.id}')">✏️ Editar</button>
    <button class="btn-icon danger" onclick="deletePost('${post.id}')">🗑️ Eliminar</button>
  ` : '';

  return `
    <article class="post-card" id="card-${post.id}">
      <div class="post-card-body" onclick="viewPost('${post.id}')">
        <div class="post-card-date">${Posts.formatDateShort(post.createdAt)}</div>
        <h2 class="post-card-title">${escapeHTML(post.title)}</h2>
        <p class="post-card-excerpt">${escapeHTML(excerpt)}</p>
      </div>
      ${isOwner ? `<div class="post-card-footer">${ownerActions}</div>` : ''}
    </article>
  `;
}

/* ============================================
   HOME — lista de publicaciones
   ============================================ */
function loadHome() {
  const grid      = document.getElementById('posts-grid');
  const countEl   = document.getElementById('posts-count');
  const newBtnWrap = document.getElementById('new-post-btn-wrap');
  const user       = Auth.getCurrentUser();

  // Mostrar botón "Nueva publicación" solo si hay sesión
  newBtnWrap.innerHTML = user
    ? `<button class="btn btn-primary" onclick="openEditor(null)" style="width:auto;padding:.55rem 1.3rem">✦ Nueva publicación</button>`
    : '';

  const allPosts = Posts.list();
  countEl.textContent = `${allPosts.length} publicación${allPosts.length !== 1 ? 'es' : ''}`;

  if (allPosts.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="icon">📝</div>
        <h3>No hay publicaciones aún</h3>
        <p>¡Sé el primero en escribir algo!</p>
      </div>`;
  } else {
    grid.innerHTML = allPosts.map(renderPostCard).join('');
  }

  showPage('home');
}

/* ============================================
   VER POST INDIVIDUAL
   ============================================ */
function viewPost(id) {
  const post = Posts.getById(id);
  if (!post) { showToast('Publicación no encontrada.', 'error'); return; }

  const user    = Auth.getCurrentUser();
  const isOwner = user && user.id === post.authorId;

  const updated = post.updatedAt
    ? `<br><span style="color:var(--rust)">Editado: ${Posts.formatDate(post.updatedAt)}</span>`
    : '';

  const actions = isOwner ? `
    <button class="btn btn-secondary" onclick="openEditor('${post.id}')">✏️ Editar</button>
    <button class="btn btn-secondary" style="border-color:#e0a9a2;color:#c0392b" onclick="deletePost('${post.id}')">🗑️ Eliminar</button>
  ` : '';

  document.getElementById('post-detail-content').innerHTML = `
    <div class="back-link" onclick="loadHome()">← Volver al blog</div>
    <div class="post-detail-meta">${Posts.formatDate(post.createdAt)}${updated}</div>
    <h1 class="post-detail-title">${escapeHTML(post.title)}</h1>
    <div class="post-detail-author">Por <strong>${escapeHTML(post.authorName)}</strong></div>
    <div class="post-detail-content">${escapeHTML(post.content)}</div>
    ${actions ? `<div class="post-detail-actions">${actions}</div>` : ''}
  `;

  showPage('detail');
}

/* ============================================
   EDITOR — crear / editar publicación
   ============================================ */
function openEditor(postId) {
  if (!Auth.isLoggedIn()) { showToast('Debes iniciar sesión.', 'error'); return; }

  State.editingPostId = postId;
  const titleEl   = document.getElementById('editor-title-input');
  const contentEl = document.getElementById('editor-content-input');
  const headingEl = document.getElementById('editor-heading');
  const errEl     = document.getElementById('editor-error');

  errEl.classList.add('hidden');

  if (postId) {
    const post = Posts.getById(postId);
    if (!post) { showToast('Publicación no encontrada.', 'error'); return; }
    headingEl.textContent = 'Editar publicación';
    titleEl.value   = post.title;
    contentEl.value = post.content;
  } else {
    headingEl.textContent = 'Nueva publicación';
    titleEl.value   = '';
    contentEl.value = '';
  }

  showPage('editor');
  titleEl.focus();
}

function submitPost() {
  const title   = document.getElementById('editor-title-input').value;
  const content = document.getElementById('editor-content-input').value;
  const errEl   = document.getElementById('editor-error');
  const user    = Auth.getCurrentUser();

  errEl.classList.add('hidden');

  let result;
  if (State.editingPostId) {
    result = Posts.update(State.editingPostId, title, content, user.id);
  } else {
    result = Posts.create(title, content, user.id, user.name);
  }

  if (!result.ok) {
    errEl.textContent = result.errors.join(' ');
    errEl.classList.remove('hidden');
    return;
  }

  showToast(State.editingPostId ? 'Publicación actualizada ✦' : 'Publicación creada ✦');
  loadHome();
}

/* ============================================
   ELIMINAR PUBLICACIÓN
   ============================================ */
function deletePost(id) {
  if (!confirm('¿Eliminar esta publicación? Esta acción no se puede deshacer.')) return;

  const user   = Auth.getCurrentUser();
  const result = Posts.remove(id, user.id);

  if (!result.ok) { showToast(result.errors[0], 'error'); return; }

  showToast('Publicación eliminada.');
  loadHome();
}

/* ============================================
   REGISTRO
   ============================================ */
function submitRegister() {
  const name     = document.getElementById('reg-name').value;
  const email    = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;
  const errEl    = document.getElementById('reg-error');
  const okEl     = document.getElementById('reg-ok');

  errEl.classList.add('hidden');
  okEl.classList.add('hidden');

  if (password !== confirm) {
    errEl.textContent = 'Las contraseñas no coinciden.';
    errEl.classList.remove('hidden');
    return;
  }

  const result = Auth.register(name, email, password);

  if (!result.ok) {
    errEl.textContent = result.errors.join(' ');
    errEl.classList.remove('hidden');
    return;
  }

  okEl.textContent = '¡Cuenta creada! Redirigiendo al inicio de sesión…';
  okEl.classList.remove('hidden');
  setTimeout(() => showPage('login'), 1400);
}

/* ============================================
   LOGIN
   ============================================ */
function submitLogin() {
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');

  errEl.classList.add('hidden');

  const result = Auth.login(email, password);

  if (!result.ok) {
    errEl.textContent = result.errors.join(' ');
    errEl.classList.remove('hidden');
    return;
  }

  updateNav();
  showToast(`Bienvenido/a, ${result.user.name} ✦`);
  loadHome();
}

/* ============================================
   LOGOUT
   ============================================ */
function doLogout() {
  Auth.logout();
  updateNav();
  showToast('Sesión cerrada.');
  loadHome();
}

/* ============================================
   UTILIDAD — escape HTML
   ============================================ */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================
   SOPORTE Enter en formularios
   ============================================ */
function addEnterSupport(inputId, handler) {
  const el = document.getElementById(inputId);
  if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handler(); });
}

/* ============================================
   INICIALIZACIÓN
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  updateNav();
  loadHome();

  // Enter en formularios
  addEnterSupport('login-password', submitLogin);
  addEnterSupport('reg-confirm',    submitRegister);
});


/* ============================================
   auth.js — Módulo de Autenticación
   Usa LocalStorage para persistir usuarios y sesión
   ============================================ */

const Auth = (() => {

  /* ---- Claves en LocalStorage ---- */
  const USERS_KEY   = 'blog_users';
  const SESSION_KEY = 'blog_session';

  /* ---- Helpers de almacenamiento ---- */
  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  /* ---- Hash simple (djb2) — para frontend sin backend ---- */
  function hashPassword(password) {
    let hash = 5381;
    for (let i = 0; i < password.length; i++) {
      hash = ((hash << 5) + hash) ^ password.charCodeAt(i);
    }
    return (hash >>> 0).toString(16); // unsigned hex
  }

  /* ---- Validaciones ---- */
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  function validatePassword(password) {
    return password.length >= 6;
  }

  /* ============================================
     REGISTRO
     ============================================ */
  function register(name, email, password) {
    const errors = [];

    if (!name.trim())              errors.push('El nombre es obligatorio.');
    if (!validateEmail(email))     errors.push('Email inválido.');
    if (!validatePassword(password)) errors.push('La contraseña debe tener al menos 6 caracteres.');

    if (errors.length) return { ok: false, errors };

    const users = getUsers();
    const exists = users.some(u => u.email === email.trim().toLowerCase());

    if (exists) return { ok: false, errors: ['Este correo ya está registrado.'] };

    const newUser = {
      id:       Date.now().toString(),
      name:     name.trim(),
      email:    email.trim().toLowerCase(),
      password: hashPassword(password),
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    return { ok: true, user: { id: newUser.id, name: newUser.name, email: newUser.email } };
  }

  /* ============================================
     LOGIN
     ============================================ */
  function login(email, password) {
    if (!email.trim() || !password) {
      return { ok: false, errors: ['Completa todos los campos.'] };
    }

    const users = getUsers();
    const user  = users.find(
      u => u.email === email.trim().toLowerCase() &&
           u.password === hashPassword(password)
    );

    if (!user) return { ok: false, errors: ['Correo o contraseña incorrectos.'] };

    const session = { id: user.id, name: user.name, email: user.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return { ok: true, user: session };
  }

  /* ============================================
     LOGOUT
     ============================================ */
  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  /* ============================================
     SESIÓN ACTIVA
     ============================================ */
  function getCurrentUser() {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function isLoggedIn() {
    return getCurrentUser() !== null;
  }

  /* ---- API pública ---- */
  return { register, login, logout, getCurrentUser, isLoggedIn };

})();

/* ============================================
   posts.js — Módulo CRUD de Publicaciones
   Persistencia en LocalStorage (simulando BD)
   ============================================ */

const Posts = (() => {

  const POSTS_KEY = 'blog_posts';

  /* ---- Helpers ---- */
  function getAll() {
    return JSON.parse(localStorage.getItem(POSTS_KEY) || '[]');
  }

  function saveAll(posts) {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  }

  function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  function formatDateShort(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  /* ============================================
     CREATE
     ============================================ */
  function create(title, content, authorId, authorName) {
    const errors = [];
    if (!title.trim())   errors.push('El título es obligatorio.');
    if (!content.trim()) errors.push('El contenido es obligatorio.');
    if (errors.length)   return { ok: false, errors };

    const posts = getAll();
    const post = {
      id:         Date.now().toString(),
      title:      title.trim(),
      content:    content.trim(),
      authorId,
      authorName,
      createdAt:  new Date().toISOString(),
      updatedAt:  null
    };

    posts.unshift(post); // más reciente primero
    saveAll(posts);
    return { ok: true, post };
  }

  /* ============================================
     READ
     ============================================ */
  function getById(id) {
    return getAll().find(p => p.id === id) || null;
  }

  /* Devuelve todos, opcionalmente filtrados por autor */
  function list(authorId = null) {
    const all = getAll();
    return authorId ? all.filter(p => p.authorId === authorId) : all;
  }

  /* ============================================
     UPDATE
     ============================================ */
  function update(id, title, content, requesterId) {
    const errors = [];
    if (!title.trim())   errors.push('El título es obligatorio.');
    if (!content.trim()) errors.push('El contenido es obligatorio.');
    if (errors.length)   return { ok: false, errors };

    const posts = getAll();
    const idx   = posts.findIndex(p => p.id === id);

    if (idx === -1) return { ok: false, errors: ['Publicación no encontrada.'] };
    if (posts[idx].authorId !== requesterId)
      return { ok: false, errors: ['No tienes permiso para editar esta publicación.'] };

    posts[idx].title     = title.trim();
    posts[idx].content   = content.trim();
    posts[idx].updatedAt = new Date().toISOString();

    saveAll(posts);
    return { ok: true, post: posts[idx] };
  }

  /* ============================================
     DELETE
     ============================================ */
  function remove(id, requesterId) {
    const posts = getAll();
    const post  = posts.find(p => p.id === id);

    if (!post) return { ok: false, errors: ['Publicación no encontrada.'] };
    if (post.authorId !== requesterId)
      return { ok: false, errors: ['No tienes permiso para eliminar esta publicación.'] };

    const updated = posts.filter(p => p.id !== id);
    saveAll(updated);
    return { ok: true };
  }

  /* ============================================
     Exportar datos como JSON (demo)
     ============================================ */
  function exportJSON() {
    return JSON.stringify(getAll(), null, 2);
  }

  /* ---- API pública ---- */
  return { create, getById, list, update, remove, exportJSON, formatDate, formatDateShort };

})();
