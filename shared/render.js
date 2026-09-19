/* =========================================================
   SHARED RENDERING ENGINE
   Paints site content into a document. Takes `doc` as a
   parameter (defaults to the live `document`) so the exact
   same, single, tested rendering code can run against either:
     - the live page the visitor is looking at, or
     - a separate document fetched and parsed in memory
       (used by the Admin Panel's "Publish" feature to bake a
       finished, static index.html — no iframe, no framing
       restrictions, no timing/loading race conditions).
   ========================================================= */

(function (global) {

  function dashboardPlaceholderSVG() {
    return `
    <svg viewBox="0 0 560 380" class="dash-svg" role="img" aria-label="Placeholder dashboard preview">
      <g class="dash-kpi"><rect x="16" y="16" width="120" height="64" rx="10"/><rect x="28" y="30" width="46" height="8" rx="4" class="mut"/><rect x="28" y="48" width="70" height="14" rx="4" class="acc"/></g>
      <g class="dash-kpi"><rect x="148" y="16" width="120" height="64" rx="10"/><rect x="160" y="30" width="46" height="8" rx="4" class="mut"/><rect x="160" y="48" width="58" height="14" rx="4" class="acc2"/></g>
      <g class="dash-kpi"><rect x="280" y="16" width="120" height="64" rx="10"/><rect x="292" y="30" width="46" height="8" rx="4" class="mut"/><rect x="292" y="48" width="64" height="14" rx="4" class="acc"/></g>
      <g class="dash-kpi"><rect x="412" y="16" width="132" height="64" rx="10"/><rect x="424" y="30" width="46" height="8" rx="4" class="mut"/><rect x="424" y="48" width="50" height="14" rx="4" class="acc2"/></g>
      <rect x="16" y="100" width="330" height="180" rx="10" class="panel"/>
      <g class="bars">
        <rect x="40" y="220" width="24" height="40"/><rect x="76" y="190" width="24" height="70"/>
        <rect x="112" y="160" width="24" height="100" class="hi"/><rect x="148" y="205" width="24" height="55"/>
        <rect x="184" y="175" width="24" height="85"/><rect x="220" y="150" width="24" height="110" class="hi"/>
        <rect x="256" y="200" width="24" height="60"/><rect x="292" y="230" width="24" height="30"/>
      </g>
      <line x1="40" y1="262" x2="316" y2="262" class="axis"/>
      <rect x="362" y="100" width="182" height="180" rx="10" class="panel"/>
      <polyline points="378,240 400,220 422,232 444,190 466,205 488,160 510,175 528,140" class="line"/>
      <circle cx="528" cy="140" r="4" class="dotend"/>
      <rect x="16" y="296" width="528" height="68" rx="10" class="panel"/>
      <rect x="32" y="312" width="90" height="8" rx="4" class="mut"/>
      <rect x="32" y="330" width="140" height="8" rx="4" class="mut2"/>
      <rect x="32" y="346" width="70" height="8" rx="4" class="mut2"/>
      <rect x="420" y="318" width="110" height="28" rx="6" class="acc-soft"/>
    </svg>
    <span class="dash-caption">Preview placeholder — swap via Admin Panel</span>`;
  }

  function photoPlaceholderSVG() {
    return `
    <svg viewBox="0 0 320 380" class="photo-svg" role="img" aria-label="Placeholder profile photo">
      <rect x="0" y="0" width="320" height="380" fill="url(#photoGrad)"/>
      <defs><linearGradient id="photoGrad" x1="0" y1="0" x2="320" y2="380" gradientUnits="userSpaceOnUse">
        <stop offset="0" class="pg1"/><stop offset="1" class="pg2"/>
      </linearGradient></defs>
      <circle cx="160" cy="150" r="56" class="ph-fill"/>
      <path d="M60 340 C60 260 260 260 260 340 L260 380 L60 380 Z" class="ph-fill"/>
    </svg>
    <span class="photo-caption">Photo placeholder — add yours in Admin Panel</span>`;
  }

  function projectThumbSVG(style) {
    if (style === 'line') {
      return `<svg viewBox="0 0 400 240" class="thumb-svg" aria-hidden="true"><rect width="400" height="240" class="thumb-bg"/>
        <polyline points="30,180 90,140 150,160 210,90 270,110 330,50" class="thumb-line"/>
        <circle cx="30" cy="180" r="4" class="thumb-dotpt"/><circle cx="90" cy="140" r="4" class="thumb-dotpt"/>
        <circle cx="150" cy="160" r="4" class="thumb-dotpt"/><circle cx="210" cy="90" r="4" class="thumb-dotpt"/>
        <circle cx="270" cy="110" r="4" class="thumb-dotpt"/><circle cx="330" cy="50" r="4" class="thumb-dotpt"/></svg>`;
    }
    if (style === 'donut') {
      return `<svg viewBox="0 0 400 240" class="thumb-svg" aria-hidden="true"><rect width="400" height="240" class="thumb-bg"/>
        <circle cx="140" cy="120" r="70" class="thumb-donut-bg"/>
        <circle cx="140" cy="120" r="70" class="thumb-donut-fg" stroke-dasharray="260 440" transform="rotate(-90 140 120)"/>
        <rect x="250" y="80" width="110" height="10" rx="5" class="tbline mut"/><rect x="250" y="105" width="80" height="10" rx="5" class="tbline mut2"/>
        <rect x="250" y="130" width="95" height="10" rx="5" class="tbline mut"/><rect x="250" y="155" width="60" height="10" rx="5" class="tbline mut2"/></svg>`;
    }
    return `<svg viewBox="0 0 400 240" class="thumb-svg" aria-hidden="true"><rect width="400" height="240" class="thumb-bg"/>
      <rect x="30" y="150" width="30" height="60" class="tb1"/><rect x="80" y="110" width="30" height="100" class="tb2"/>
      <rect x="130" y="70" width="30" height="140" class="tb1"/><rect x="180" y="130" width="30" height="80" class="tb2"/>
      <rect x="230" y="90" width="30" height="120" class="tb1"/><rect x="280" y="160" width="30" height="50" class="tb2"/>
      <line x1="20" y1="210" x2="330" y2="210" class="thumb-axis"/></svg>`;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatWhatsapp(num) {
    const digits = String(num || '').replace(/[^0-9]/g, '');
    return digits ? `+${digits}` : '';
  }

  function shortUrl(url) {
    try {
      const u = new URL(url);
      return u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : u.hostname;
    } catch (e) {
      return url;
    }
  }

  function renderTags(doc, id, tags) {
    const el = doc.getElementById(id);
    if (!el) return;
    el.innerHTML = (tags || []).map(t => `<span class="tag mono">${escapeHtml(t)}</span>`).join('');
  }

  // doc defaults to the live document so existing calls (renderContent(content))
  // keep working unchanged on the public site.
  function renderContent(content, doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    doc.getElementById('heroEyebrow').textContent = content.hero.eyebrow;
    doc.getElementById('heroTitle').innerHTML = escapeHtml(content.hero.title).replace(/\n/g, '<br>');
    doc.getElementById('heroTagline').textContent = content.hero.tagline;

    const heroSlot = doc.getElementById('heroImageSlot');
    let heroMediaHTML;
    if (content.hero.video) {
      const posterAttr = content.hero.image ? ` poster="${escapeHtml(content.hero.image)}"` : '';
      heroMediaHTML = `<video class="dash-media" autoplay muted loop playsinline${posterAttr}><source src="${escapeHtml(content.hero.video)}">Your browser doesn't support embedded video.</video>`;
    } else if (content.hero.image) {
      heroMediaHTML = `<img class="dash-media" src="${content.hero.image}" alt="Project dashboard preview">`;
    } else {
      heroMediaHTML = dashboardPlaceholderSVG();
    }
    heroSlot.innerHTML = content.hero.link
      ? `<a href="${escapeHtml(content.hero.link)}" class="dash-media-link" target="_blank" rel="noopener" aria-label="View project on GitHub">${heroMediaHTML}</a>`
      : heroMediaHTML;

    doc.getElementById('aboutTitle').innerHTML = escapeHtml(content.about.title).replace(/\n/g, '<br>');
    const photoSlot = doc.getElementById('aboutPhotoSlot');
    photoSlot.innerHTML = content.about.photo
      ? `<img src="${content.about.photo}" alt="Profile photo" style="width:100%;height:auto;display:block;">`
      : photoPlaceholderSVG();

    const storyList = doc.getElementById('storyList');
    storyList.innerHTML = content.about.steps.map(step => `
      <div class="story-item">
        <span class="story-dot"></span>
        <div><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.text)}</p></div>
      </div>`).join('');

    const grid = doc.getElementById('projectGrid');
    grid.innerHTML = content.projects.map(p => `
      <article class="project-card reveal">
        <div class="project-thumb">
          ${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.title)} thumbnail" style="width:100%;height:auto;display:block;">` : projectThumbSVG(p.thumbStyle)}
        </div>
        <div class="project-body">
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.desc)}</p>
          <div class="tag-row">${(p.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
          <a href="${escapeHtml(p.link || '#')}" class="project-link" target="_blank" rel="noopener">
            View Full Project
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 11L11 3M11 3H5M11 3V9" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>
      </article>`).join('');

    renderTags(doc, 'tagsDataAnalysis', content.skills.dataAnalysis);
    renderTags(doc, 'tagsVisualization', content.skills.visualization);
    renderTags(doc, 'tagsDatabase', content.skills.database);
    renderTags(doc, 'tagsCore', content.skills.core);

    doc.getElementById('eduDegree').textContent = content.education.degree;
    doc.getElementById('eduMeta').innerHTML = `${escapeHtml(content.education.university)} &nbsp;·&nbsp; Passing Year: ${escapeHtml(content.education.year)}`;
    doc.getElementById('eduNote').textContent = content.education.note;

    const certList = doc.getElementById('certList');
    if (!content.certifications || content.certifications.length === 0) {
      certList.innerHTML = `<div class="cert-empty"><p>Certificates will appear here soon — add them anytime through the Admin Panel.</p></div>`;
    } else {
      certList.innerHTML = `<div class="cert-list">${content.certifications.map(c => `
        <div class="cert-item">
          <div class="cert-item-title">${escapeHtml(c.title)}</div>
          <div class="cert-item-meta">${escapeHtml(c.issuer || '')}${c.issuer && c.year ? ' · ' : ''}${escapeHtml(c.year || '')}</div>
          ${c.note ? `<div class="cert-item-note">${escapeHtml(c.note)}</div>` : ''}
        </div>`).join('')}</div>`;
    }

    const resumeBtn = doc.getElementById('resumeBtn');
    if (content.resume.fileData) {
      resumeBtn.href = content.resume.fileData;
      resumeBtn.setAttribute('download', content.resume.fileName || 'resume.pdf');
    } else {
      resumeBtn.href = content.resume.link || '#';
      resumeBtn.removeAttribute('download');
    }

    doc.getElementById('contactEmailValue').textContent = content.contact.email;
    doc.getElementById('contactEmailCard').href = `mailto:${content.contact.email}`;

    doc.getElementById('contactWhatsappValue').textContent = formatWhatsapp(content.contact.whatsapp);
    doc.getElementById('contactWhatsappCard').href = `https://wa.me/${content.contact.whatsapp.replace(/[^0-9]/g, '')}`;

    doc.getElementById('contactLinkedinValue').textContent = shortUrl(content.contact.linkedin);
    doc.getElementById('contactLinkedinCard').href = content.contact.linkedin;

    doc.getElementById('contactGithubValue').textContent = shortUrl(content.contact.github);
    doc.getElementById('contactGithubCard').href = content.contact.github;

    doc.getElementById('footerRole').textContent = content.footer.role;
    doc.getElementById('footerLinkedin').href = content.contact.linkedin;
    doc.getElementById('footerGithub').href = content.contact.github;
    doc.getElementById('footerEmail').href = `mailto:${content.contact.email}`;
  }

  // Applies a theme's CSS variables directly onto a given document's <html>
  // element (used for baking a theme into a published export where the
  // normal Store.applyTheme(), which only touches the live `document`,
  // wouldn't reach a separate parsed document).
  function applyThemeTo(doc, themeVars) {
    const root = doc.documentElement;
    Object.entries(themeVars).forEach(([k, v]) => root.style.setProperty(k, v));
  }

  global.SiteRenderer = {
    renderContent,
    renderTags,
    applyThemeTo,
    dashboardPlaceholderSVG,
    photoPlaceholderSVG,
    projectThumbSVG,
    escapeHtml,
    formatWhatsapp,
    shortUrl
  };

})(window);
