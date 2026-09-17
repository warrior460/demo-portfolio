/* =========================================================
   ADMIN PANEL LOGIC
   Handles: login/session, all section editors, image uploads
   (stored as base64 data URLs), projects/certifications CRUD,
   theme switching, account settings, backup/restore, reset.
   Every save writes straight to the shared Store, which the
   public site reads from (live, via localStorage + the
   'storage' event when the site is open in another tab).
   ========================================================= */

const SESSION_KEY = 'abk_admin_session_v1';

// ---------------------------------------------------------
// SAFE STORAGE ACCESS
// Some browsers (notably Safari, and Chrome in some modes)
// block localStorage/sessionStorage when a page is opened
// directly as a file (file:///...) instead of served over
// http(s). Without this, every click would just silently do
// nothing. These wrappers catch that and surface a clear
// message instead of failing invisibly.
// ---------------------------------------------------------

let memorySessionFallback = false; // used only if sessionStorage itself is blocked

function storageIsBlocked() {
  try {
    const testKey = '__abk_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return false;
  } catch (e) {
    return true;
  }
}

function setSession(loggedIn) {
  try {
    if (loggedIn) sessionStorage.setItem(SESSION_KEY, '1');
    else sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {
    memorySessionFallback = loggedIn; // at least keep the panel open for this page load
  }
}

function getSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch (e) {
    return memorySessionFallback;
  }
}

function showStorageBlockedNotice(context) {
  const el = document.getElementById(context === 'login' ? 'loginError' : 'accountMsg');
  const message = "Your browser is blocking local storage on this page — this happens when the file is opened directly (address bar starts with file://) instead of through a web server. Nothing you do here will save. Fix: either open this folder through a local server (e.g. run 'python -m http.server' in the project folder and visit http://localhost:8000/admin/), or upload the files to your real hosting and use it there — this issue does not happen on normal hosting.";
  if (el) {
    el.textContent = message;
    el.hidden = false;
    el.className = context === 'login' ? 'login-error' : 'form-msg error';
  } else {
    alert(message);
  }
}

let content = null;          // working copy of site content
let editingProjectId = null; // null = "add new"
let editingCertId = null;

// temp holders for images picked but not yet saved
let pendingHeroImage = undefined;   // undefined = unchanged, null = removed, string = new dataURL
let pendingAboutPhoto = undefined;
let pendingProjectImage = undefined;
let pendingResumeFile = undefined;  // {fileName, fileData} or null or undefined

// ---------------------------------------------------------
// AUTH
// ---------------------------------------------------------

function isLoggedIn() {
  return getSession();
}

function showLogin() {
  document.getElementById('loginScreen').hidden = false;
  document.getElementById('dashboard').hidden = true;
}

function showDashboard() {
  document.getElementById('loginScreen').hidden = true;
  document.getElementById('dashboard').hidden = false;
  initDashboard();
}

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const errEl = document.getElementById('loginError');
  errEl.className = 'login-error';

  if (storageIsBlocked()) {
    showStorageBlockedNotice('login');
    return;
  }

  try {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value;
    const auth = Store.getAuth();

    if (u === auth.username && p === auth.password) {
      setSession(true);
      errEl.hidden = true;
      showDashboard();
    } else {
      errEl.textContent = 'Incorrect username or password.';
      errEl.hidden = false;
    }
  } catch (err) {
    console.error('Login failed unexpectedly:', err);
    errEl.textContent = 'Something went wrong logging in (' + err.message + '). Please try reloading the page.';
    errEl.hidden = false;
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  setSession(false);
  showLogin();
});

// ---------------------------------------------------------
// SIDEBAR / PANEL NAVIGATION
// ---------------------------------------------------------

function goToPanel(name) {
  document.querySelectorAll('.side-link').forEach(b => b.classList.toggle('active', b.dataset.panel === name));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
  try { document.querySelector('.admin-main').scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* older browsers */ }
}

document.getElementById('sidebarNav').addEventListener('click', (e) => {
  const btn = e.target.closest('.side-link');
  if (btn) goToPanel(btn.dataset.panel);
});

document.addEventListener('click', (e) => {
  const goto = e.target.closest('[data-goto]');
  if (goto) goToPanel(goto.dataset.goto);
});

// ---------------------------------------------------------
// TOAST
// ---------------------------------------------------------

let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------

function fileToDataURL(file, cb) {
  const reader = new FileReader();
  reader.onload = () => cb(reader.result);
  reader.readAsDataURL(file);
}

function setPreview(el, dataUrl, placeholderText) {
  el.innerHTML = dataUrl ? `<img src="${dataUrl}" alt="">` : placeholderText;
}

function csvToList(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

function persist() {
  const ok = Store.saveContent(content);
  if (!ok) {
    showToast("⚠ Couldn't save — your browser is blocking local storage on this page. See the note below for how to fix this.");
  }
  return ok;
}

// ---------------------------------------------------------
// INIT DASHBOARD
// ---------------------------------------------------------

function initDashboard() {
  content = Store.getContent();

  checkDefaultPasswordBanner();
  loadHeroForm();
  loadAboutForm();
  renderProjectsList();
  loadSkillsForm();
  loadEducationForm();
  renderCertsList();
  loadContactForm();
  renderThemeGrid();
}

function checkDefaultPasswordBanner() {
  const auth = Store.getAuth();
  const banner = document.getElementById('defaultPwBanner');
  banner.hidden = !(auth.username === 'admin' && auth.password === 'Admin@123');
}

// ---------------------------------------------------------
// HERO
// ---------------------------------------------------------

function loadHeroForm() {
  document.getElementById('heroEyebrowInput').value = content.hero.eyebrow;
  document.getElementById('heroTitleInput').value = content.hero.title;
  document.getElementById('heroTaglineInput').value = content.hero.tagline;
  pendingHeroImage = undefined;
  setPreview(document.getElementById('heroImagePreview'), content.hero.image, 'No image');
}

document.getElementById('heroImageInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  fileToDataURL(file, (dataUrl) => {
    pendingHeroImage = dataUrl;
    setPreview(document.getElementById('heroImagePreview'), dataUrl, 'No image');
  });
});
document.getElementById('heroImageRemove').addEventListener('click', () => {
  pendingHeroImage = null;
  setPreview(document.getElementById('heroImagePreview'), null, 'No image');
});

document.getElementById('saveHero').addEventListener('click', () => {
  content.hero.eyebrow = document.getElementById('heroEyebrowInput').value.trim() || content.hero.eyebrow;
  content.hero.title = document.getElementById('heroTitleInput').value.trim() || content.hero.title;
  content.hero.tagline = document.getElementById('heroTaglineInput').value.trim();
  if (pendingHeroImage !== undefined) content.hero.image = pendingHeroImage;
  persist();
  showToast('Portfolio section saved — your live site is updated.');
});

// ---------------------------------------------------------
// ABOUT
// ---------------------------------------------------------

function loadAboutForm() {
  document.getElementById('aboutTitleInput').value = content.about.title;
  pendingAboutPhoto = undefined;
  setPreview(document.getElementById('aboutPhotoPreview'), content.about.photo, 'No photo');

  const wrap = document.getElementById('storyFields');
  wrap.innerHTML = content.about.steps.map((step, i) => `
    <div class="edit-card" style="margin-top:14px;">
      <label class="field"><span>Step ${i + 1} title</span><input type="text" class="storyTitle" data-i="${i}" value="${escapeAttr(step.title)}"></label>
      <label class="field"><span>Step ${i + 1} text</span><textarea class="storyText" data-i="${i}" rows="3">${escapeHtml(step.text)}</textarea></label>
    </div>`).join('');
}

document.getElementById('aboutPhotoInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  fileToDataURL(file, (dataUrl) => {
    pendingAboutPhoto = dataUrl;
    setPreview(document.getElementById('aboutPhotoPreview'), dataUrl, 'No photo');
  });
});
document.getElementById('aboutPhotoRemove').addEventListener('click', () => {
  pendingAboutPhoto = null;
  setPreview(document.getElementById('aboutPhotoPreview'), null, 'No photo');
});

document.getElementById('saveAbout').addEventListener('click', () => {
  content.about.title = document.getElementById('aboutTitleInput').value.trim() || content.about.title;
  if (pendingAboutPhoto !== undefined) content.about.photo = pendingAboutPhoto;

  document.querySelectorAll('.storyTitle').forEach(inp => {
    content.about.steps[+inp.dataset.i].title = inp.value.trim();
  });
  document.querySelectorAll('.storyText').forEach(ta => {
    content.about.steps[+ta.dataset.i].text = ta.value.trim();
  });

  persist();
  showToast('About section saved — your live site is updated.');
});

// ---------------------------------------------------------
// PROJECTS
// ---------------------------------------------------------

function renderProjectsList() {
  const list = document.getElementById('projectsList');
  if (content.projects.length === 0) {
    list.innerHTML = '<p class="list-empty">No projects yet — add your first one below.</p>';
    return;
  }
  list.innerHTML = content.projects.map(p => `
    <div class="list-item">
      <div class="list-item-thumb">${p.image ? `<img src="${p.image}" alt="">` : ''}</div>
      <div class="list-item-info">
        <div class="list-item-title">${escapeHtml(p.title)}</div>
        <div class="list-item-meta">${escapeHtml((p.tags || []).join(', '))}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-ghost btn-sm" data-edit-project="${p.id}" type="button">Edit</button>
        <button class="btn btn-outline-danger btn-sm" data-del-project="${p.id}" type="button">Delete</button>
      </div>
    </div>`).join('');
}

document.getElementById('projectsList').addEventListener('click', (e) => {
  const editBtn = e.target.closest('[data-edit-project]');
  const delBtn = e.target.closest('[data-del-project]');
  if (editBtn) openProjectForm(editBtn.dataset.editProject);
  if (delBtn) {
    if (confirm('Delete this project? This cannot be undone.')) {
      content.projects = content.projects.filter(p => p.id !== delBtn.dataset.delProject);
      persist();
      renderProjectsList();
      showToast('Project deleted — your live site is updated.');
    }
  }
});

document.getElementById('addProjectBtn').addEventListener('click', () => openProjectForm(null));

function openProjectForm(id) {
  editingProjectId = id;
  pendingProjectImage = undefined;
  const form = document.getElementById('projectForm');
  form.hidden = false;
  try { form.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* older browsers */ }

  if (id) {
    const p = content.projects.find(x => x.id === id);
    document.getElementById('projectFormTitle').textContent = 'Edit project';
    document.getElementById('projectId').value = p.id;
    document.getElementById('projectTitle').value = p.title;
    document.getElementById('projectDesc').value = p.desc;
    document.getElementById('projectTags').value = (p.tags || []).join(', ');
    document.getElementById('projectLink').value = p.link || '';
    setPreview(document.getElementById('projectImagePreview'), p.image, 'No image');
  } else {
    document.getElementById('projectFormTitle').textContent = 'Add project';
    document.getElementById('projectId').value = '';
    document.getElementById('projectTitle').value = '';
    document.getElementById('projectDesc').value = '';
    document.getElementById('projectTags').value = '';
    document.getElementById('projectLink').value = '';
    setPreview(document.getElementById('projectImagePreview'), null, 'No image');
  }
}

document.getElementById('projectImageInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  fileToDataURL(file, (dataUrl) => {
    pendingProjectImage = dataUrl;
    setPreview(document.getElementById('projectImagePreview'), dataUrl, 'No image');
  });
});
document.getElementById('projectImageRemove').addEventListener('click', () => {
  pendingProjectImage = null;
  setPreview(document.getElementById('projectImagePreview'), null, 'No image');
});

document.getElementById('cancelProjectBtn').addEventListener('click', () => {
  document.getElementById('projectForm').hidden = true;
});

document.getElementById('saveProjectBtn').addEventListener('click', () => {
  const title = document.getElementById('projectTitle').value.trim();
  if (!title) { showToast('Please enter a project title.'); return; }

  const data = {
    title,
    desc: document.getElementById('projectDesc').value.trim(),
    tags: csvToList(document.getElementById('projectTags').value),
    link: document.getElementById('projectLink').value.trim() || '#'
  };

  const existingId = document.getElementById('projectId').value;
  if (existingId) {
    const p = content.projects.find(x => x.id === existingId);
    Object.assign(p, data);
    if (pendingProjectImage !== undefined) p.image = pendingProjectImage;
  } else {
    const styles = ['bars', 'line', 'donut'];
    content.projects.push({
      id: 'p' + Date.now(),
      ...data,
      image: pendingProjectImage || null,
      thumbStyle: styles[content.projects.length % styles.length]
    });
  }

  persist();
  renderProjectsList();
  document.getElementById('projectForm').hidden = true;
  showToast('Project saved — your live site is updated.');
});

// ---------------------------------------------------------
// SKILLS
// ---------------------------------------------------------

function loadSkillsForm() {
  document.getElementById('skillsDataAnalysis').value = content.skills.dataAnalysis.join(', ');
  document.getElementById('skillsVisualization').value = content.skills.visualization.join(', ');
  document.getElementById('skillsDatabase').value = content.skills.database.join(', ');
  document.getElementById('skillsCore').value = content.skills.core.join(', ');
}

document.getElementById('saveSkills').addEventListener('click', () => {
  content.skills.dataAnalysis = csvToList(document.getElementById('skillsDataAnalysis').value);
  content.skills.visualization = csvToList(document.getElementById('skillsVisualization').value);
  content.skills.database = csvToList(document.getElementById('skillsDatabase').value);
  content.skills.core = csvToList(document.getElementById('skillsCore').value);
  persist();
  showToast('Skills section saved — your live site is updated.');
});

// ---------------------------------------------------------
// EDUCATION
// ---------------------------------------------------------

function loadEducationForm() {
  document.getElementById('eduDegreeInput').value = content.education.degree;
  document.getElementById('eduUniversityInput').value = content.education.university;
  document.getElementById('eduYearInput').value = content.education.year;
  document.getElementById('eduNoteInput').value = content.education.note;
}

document.getElementById('saveEducation').addEventListener('click', () => {
  content.education.degree = document.getElementById('eduDegreeInput').value.trim();
  content.education.university = document.getElementById('eduUniversityInput').value.trim();
  content.education.year = document.getElementById('eduYearInput').value.trim();
  content.education.note = document.getElementById('eduNoteInput').value.trim();
  persist();
  showToast('Education saved — your live site is updated.');
});

// ---------------------------------------------------------
// CERTIFICATIONS
// ---------------------------------------------------------

function renderCertsList() {
  const list = document.getElementById('certsList');
  if (!content.certifications || content.certifications.length === 0) {
    list.innerHTML = '<p class="list-empty">No certificates yet.</p>';
    return;
  }
  list.innerHTML = content.certifications.map(c => `
    <div class="list-item">
      <div class="list-item-info">
        <div class="list-item-title">${escapeHtml(c.title)}</div>
        <div class="list-item-meta">${escapeHtml(c.issuer || '')}${c.issuer && c.year ? ' · ' : ''}${escapeHtml(c.year || '')}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-ghost btn-sm" data-edit-cert="${c.id}" type="button">Edit</button>
        <button class="btn btn-outline-danger btn-sm" data-del-cert="${c.id}" type="button">Delete</button>
      </div>
    </div>`).join('');
}

document.getElementById('certsList').addEventListener('click', (e) => {
  const editBtn = e.target.closest('[data-edit-cert]');
  const delBtn = e.target.closest('[data-del-cert]');
  if (editBtn) openCertForm(editBtn.dataset.editCert);
  if (delBtn) {
    if (confirm('Delete this certificate?')) {
      content.certifications = content.certifications.filter(c => c.id !== delBtn.dataset.delCert);
      persist();
      renderCertsList();
      showToast('Certificate deleted — your live site is updated.');
    }
  }
});

document.getElementById('addCertBtn').addEventListener('click', () => openCertForm(null));

function openCertForm(id) {
  editingCertId = id;
  const form = document.getElementById('certForm');
  form.hidden = false;
  try { form.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* older browsers */ }

  if (id) {
    const c = content.certifications.find(x => x.id === id);
    document.getElementById('certFormTitle').textContent = 'Edit certificate';
    document.getElementById('certId').value = c.id;
    document.getElementById('certTitle').value = c.title;
    document.getElementById('certIssuer').value = c.issuer || '';
    document.getElementById('certYear').value = c.year || '';
    document.getElementById('certNote').value = c.note || '';
  } else {
    document.getElementById('certFormTitle').textContent = 'Add certificate';
    document.getElementById('certId').value = '';
    document.getElementById('certTitle').value = '';
    document.getElementById('certIssuer').value = '';
    document.getElementById('certYear').value = '';
    document.getElementById('certNote').value = '';
  }
}

document.getElementById('cancelCertBtn').addEventListener('click', () => {
  document.getElementById('certForm').hidden = true;
});

document.getElementById('saveCertBtn').addEventListener('click', () => {
  const title = document.getElementById('certTitle').value.trim();
  if (!title) { showToast('Please enter a certificate title.'); return; }

  const data = {
    title,
    issuer: document.getElementById('certIssuer').value.trim(),
    year: document.getElementById('certYear').value.trim(),
    note: document.getElementById('certNote').value.trim()
  };

  const existingId = document.getElementById('certId').value;
  if (existingId) {
    Object.assign(content.certifications.find(c => c.id === existingId), data);
  } else {
    content.certifications.push({ id: 'c' + Date.now(), ...data });
  }

  persist();
  renderCertsList();
  document.getElementById('certForm').hidden = true;
  showToast('Certificate saved — your live site is updated.');
});

// ---------------------------------------------------------
// CONTACT
// ---------------------------------------------------------

function loadContactForm() {
  document.getElementById('contactEmailInput').value = content.contact.email;
  document.getElementById('contactWhatsappInput').value = content.contact.whatsapp;
  document.getElementById('contactLinkedinInput').value = content.contact.linkedin;
  document.getElementById('contactGithubInput').value = content.contact.github;
  document.getElementById('footerRoleInput').value = content.footer.role;
  document.getElementById('resumeLinkInput').value = content.resume.link || '';

  pendingResumeFile = undefined;
  document.getElementById('resumeFileChip').textContent = content.resume.fileName
    ? `Uploaded: ${content.resume.fileName}` : 'No file uploaded';
}

document.getElementById('resumeFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  fileToDataURL(file, (dataUrl) => {
    pendingResumeFile = { fileName: file.name, fileData: dataUrl };
    document.getElementById('resumeFileChip').textContent = `Uploaded: ${file.name}`;
  });
});
document.getElementById('resumeFileRemove').addEventListener('click', () => {
  pendingResumeFile = null;
  document.getElementById('resumeFileChip').textContent = 'No file uploaded';
});

document.getElementById('saveContact').addEventListener('click', () => {
  content.contact.email = document.getElementById('contactEmailInput').value.trim();
  content.contact.whatsapp = document.getElementById('contactWhatsappInput').value.trim();
  content.contact.linkedin = document.getElementById('contactLinkedinInput').value.trim();
  content.contact.github = document.getElementById('contactGithubInput').value.trim();
  content.footer.role = document.getElementById('footerRoleInput').value.trim();
  content.resume.link = document.getElementById('resumeLinkInput').value.trim() || '#';

  if (pendingResumeFile === null) {
    content.resume.fileName = null;
    content.resume.fileData = null;
  } else if (pendingResumeFile) {
    content.resume.fileName = pendingResumeFile.fileName;
    content.resume.fileData = pendingResumeFile.fileData;
  }

  persist();
  showToast('Contact section saved — your live site is updated.');
});

// ---------------------------------------------------------
// APPEARANCE / THEME
// ---------------------------------------------------------

function renderThemeGrid() {
  const grid = document.getElementById('themeGrid');
  const current = Store.getTheme();
  grid.innerHTML = Object.entries(Store.THEMES).map(([key, t]) => `
    <div class="theme-card ${key === current ? 'selected' : ''}" data-theme="${key}">
      <div class="theme-swatches">
        <span style="background:${t.swatch[0]}"></span>
        <span style="background:${t.swatch[1]}"></span>
        <span style="background:${t.swatch[2]}"></span>
      </div>
      <div class="theme-card-name">${t.label} ${key === current ? '<span class="theme-check">✓ Active</span>' : ''}</div>
    </div>`).join('');
}

document.getElementById('themeGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.theme-card');
  if (!card) return;
  Store.saveTheme(card.dataset.theme);
  renderThemeGrid();
  showToast('Theme applied — your live site is updated.');
});

// ---------------------------------------------------------
// PUBLISH
// Bakes the current content + theme (currently only in this
// browser's local storage) into a real, finished index.html
// that works for every visitor, on any device, with no
// local storage dependency at all. This is the actual
// "publish" step for a static site with no backend.
//
// Implementation note: this fetches the raw index.html text
// and parses it into an in-memory document with DOMParser,
// then runs the exact same rendering code the live site uses
// (shared/render.js) against that document, entirely
// synchronously. Deliberately NOT using a hidden iframe here:
// framing a page (even same-origin) can be blocked by browser
// security rules in ways that are inconsistent across setups,
// while fetching a same-origin file's text is a much less
// restricted operation and has no loading/timing races at all.
// ---------------------------------------------------------

document.getElementById('publishBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('publishStatus');
  statusEl.textContent = 'Generating your publish-ready file…';
  statusEl.className = 'publish-status';

  function finish(ok, message) {
    statusEl.textContent = message;
    statusEl.className = 'publish-status ' + (ok ? 'success' : 'error');
  }

  if (window.location.protocol === 'file:') {
    finish(false, "This can't run while the Admin Panel is opened directly as a file (your address bar starts with file://). Browsers block pages opened this way from reading their neighboring files. Fix: run a local server instead (e.g. type 'python -m http.server' in the project folder, then open http://localhost:8000/admin/), or upload everything to your real hosting and publish from there.");
    return;
  }

  let response;
  try {
    response = await fetch('../index.html', { cache: 'no-store' });
  } catch (err) {
    finish(false, "Couldn't reach index.html (" + err.message + "). Make sure index.html sits in the folder right above this admin folder, and that you're viewing this through a web server, not a double-clicked file.");
    return;
  }

  if (!response.ok) {
    finish(false, "Couldn't find index.html one folder up from here (server responded " + response.status + "). Double-check your folder structure: this admin folder should sit right inside the same folder as index.html.");
    return;
  }

  let html;
  try {
    html = await response.text();
  } catch (err) {
    finish(false, "Couldn't read index.html's contents (" + err.message + "). Please try again.");
    return;
  }

  try {
    const parser = new DOMParser();
    const pdoc = parser.parseFromString(html, 'text/html');

    if (!pdoc.getElementById('heroTitle')) {
      throw new Error("the fetched page didn't look like your portfolio site (couldn't find expected content) — its structure may not match what this Admin Panel expects");
    }

    const content = Store.getContent();
    const themeKey = Store.getTheme();
    const theme = Store.THEMES[themeKey] || Store.THEMES[Store.DEFAULT_THEME];

    SiteRenderer.renderContent(content, pdoc);
    SiteRenderer.applyThemeTo(pdoc, theme.vars);

    // Mark this copy as a finished, static export so it can never be
    // overwritten by an empty local storage on someone else's browser.
    pdoc.body.setAttribute('data-static', '1');

    const finalHtml = '<!DOCTYPE html>\n' + pdoc.documentElement.outerHTML;
    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    finish(true, 'Done — check your downloads for index.html, then follow the steps below.');
  } catch (err) {
    console.error('Publish failed:', err);
    finish(false, "Couldn't generate the file (" + err.message + "). Please try again, and if it persists, let me know the exact web address in your browser's address bar when this happens.");
  }
});

// ---------------------------------------------------------
// ACCOUNT & SECURITY
// ---------------------------------------------------------

document.getElementById('accountForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = document.getElementById('accountMsg');
  const auth = Store.getAuth();
  const current = document.getElementById('currentPassword').value;
  const newUser = document.getElementById('newUsername').value.trim();
  const newPass = document.getElementById('newPassword').value;
  const confirmPass = document.getElementById('confirmPassword').value;

  function fail(text) {
    msg.textContent = text; msg.className = 'form-msg error'; msg.hidden = false;
  }

  if (current !== auth.password) return fail('Current password is incorrect.');
  if (!newUser || !newPass) return fail('Please fill in all fields.');
  if (newPass !== confirmPass) return fail('New passwords do not match.');
  if (newPass.length < 6) return fail('New password should be at least 6 characters.');

  Store.saveAuth({ username: newUser, password: newPass });
  msg.textContent = 'Login details updated. Use these next time you log in.';
  msg.className = 'form-msg success';
  msg.hidden = false;
  document.getElementById('accountForm').reset();
  checkDefaultPasswordBanner();
  showToast('Login details updated.');
});

// ---------------------------------------------------------
// BACKUP / RESTORE / RESET
// ---------------------------------------------------------

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'portfolio-backup.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Backup downloaded.');
});

document.getElementById('importInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      Store.saveContent(parsed);
      initDashboard();
      showToast('Backup restored — your live site is updated.');
    } catch (err) {
      showToast('That file could not be read as a valid backup.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('This will erase all your edits and restore the original placeholder content. Continue?')) {
    Store.resetContent();
    initDashboard();
    showToast('Content reset to defaults.');
  }
});

// ---------------------------------------------------------
// SMALL ESCAPE HELPERS (module-local copies, admin panel only)
// ---------------------------------------------------------

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

// ---------------------------------------------------------
// BOOT
// ---------------------------------------------------------

Store.applyTheme(Store.getTheme());

if (storageIsBlocked()) {
  const w = document.getElementById('storageWarning');
  w.textContent = "Heads up: this browser is blocking local storage on this page — likely because you opened the file directly (file://) instead of through a web server. Logging in and saving won't work here. Try running a local server (e.g. 'python -m http.server' in the project folder) or upload the files to your real hosting and use it there.";
  w.hidden = false;
}

if (isLoggedIn()) { showDashboard(); } else { showLogin(); }
