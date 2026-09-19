/* =========================================================
   SHARED DATA LAYER
   Used by both the public website (js/main.js) and the
   Admin Panel (admin/js/admin.js). Everything is persisted
   in the browser's localStorage so edits survive refreshes
   and sync live between open tabs on this device.
   ========================================================= */

(function (global) {

  const KEYS = {
    content: 'abk_site_content_v1',
    theme: 'abk_site_theme_v1',
    auth: 'abk_admin_auth_v1'
  };

  const DEFAULT_THEME = 'midnight-blue';

  const THEMES = {
    'midnight-blue': {
      label: 'Midnight Blue',
      swatch: ['#0B1220', '#E8A33D', '#4F7CFF'],
      vars: {
        '--bg': '#0B1220', '--bg-alt': '#0E1626',
        '--surface': '#121B2E', '--surface-2': '#17223A',
        '--border': 'rgba(234,238,245,0.09)', '--border-strong': 'rgba(234,238,245,0.16)',
        '--text': '#EAEEF5', '--text-muted': '#94A0B8', '--text-faint': '#5C6A85',
        '--accent': '#E8A33D', '--accent-dim': '#B87F2C', '--accent-soft': 'rgba(232,163,61,0.14)',
        '--accent-2': '#4F7CFF', '--accent-2-soft': 'rgba(79,124,255,0.14)'
      }
    },
    'charcoal-orange': {
      label: 'Charcoal Orange',
      swatch: ['#17171A', '#FF7A45', '#6B7A99'],
      vars: {
        '--bg': '#17171A', '--bg-alt': '#1C1C20',
        '--surface': '#222226', '--surface-2': '#2A2A2F',
        '--border': 'rgba(255,255,255,0.08)', '--border-strong': 'rgba(255,255,255,0.15)',
        '--text': '#F2F1EE', '--text-muted': '#A4A2A0', '--text-faint': '#6C6A69',
        '--accent': '#FF7A45', '--accent-dim': '#CC5F34', '--accent-soft': 'rgba(255,122,69,0.15)',
        '--accent-2': '#6FA8FF', '--accent-2-soft': 'rgba(111,168,255,0.14)'
      }
    },
    'slate-purple': {
      label: 'Slate Purple',
      swatch: ['#141220', '#9B7BFF', '#5EEAD4'],
      vars: {
        '--bg': '#141220', '--bg-alt': '#191729',
        '--surface': '#1E1B32', '--surface-2': '#26223D',
        '--border': 'rgba(234,230,245,0.09)', '--border-strong': 'rgba(234,230,245,0.17)',
        '--text': '#EEECF7', '--text-muted': '#A29DBE', '--text-faint': '#655F82',
        '--accent': '#9B7BFF', '--accent-dim': '#7B5DDB', '--accent-soft': 'rgba(155,123,255,0.16)',
        '--accent-2': '#5EEAD4', '--accent-2-soft': 'rgba(94,234,212,0.14)'
      }
    },
    'emerald-dark': {
      label: 'Emerald Dark',
      swatch: ['#0B1712', '#34D399', '#F2C14E'],
      vars: {
        '--bg': '#0B1712', '--bg-alt': '#0E1D16',
        '--surface': '#122A1F', '--surface-2': '#163527',
        '--border': 'rgba(232,245,238,0.09)', '--border-strong': 'rgba(232,245,238,0.16)',
        '--text': '#E9F5EF', '--text-muted': '#93AFA4', '--text-faint': '#5B7A6D',
        '--accent': '#34D399', '--accent-dim': '#22A876', '--accent-soft': 'rgba(52,211,153,0.15)',
        '--accent-2': '#F2C14E', '--accent-2-soft': 'rgba(242,193,78,0.14)'
      }
    }
  };

  const DEFAULT_CONTENT = {
    hero: {
      eyebrow: 'Aspiring Data Analyst',
      title: 'Adnan Bin Abdul Khaleque',
      tagline: 'Making sense of data, driving better decisions.',
      image: null,
      video: null,
      link: null
    },
    about: {
      title: 'From thesis research to data-driven decisions.',
      photo: null,
      steps: [
        {
          title: 'Thesis research',
          text: "My path into data started during my undergraduate thesis, where I worked on time-series forecasting for Bangladesh's energy transition — building models to understand how the country's power landscape is likely to shift in the years ahead."
        },
        {
          title: 'IEEE publication',
          text: 'That research was later published as a conference paper with IEEE, which became the real turning point for me — the moment data analysis stopped being coursework and became the direction I wanted to build a career around.'
        },
        {
          title: 'Self-driven mastery',
          text: "Since then, I've been learning deliberately and by doing: cleaning and structuring data in Excel with formulas and Power Query, visualizing it in Power BI and Tableau, and querying and analyzing it with SQL and Python — one personal project at a time."
        }
      ]
    },
    projects: [
      {
        id: 'p1', title: 'Energy Demand Forecasting',
        desc: 'A time-series model exploring national energy demand trends, extending the forecasting approach from my published thesis work into an interactive analysis.',
        tags: ['Python', 'Pandas', 'Forecasting'],
        link: '#', image: null, thumbStyle: 'bars'
      },
      {
        id: 'p2', title: 'Retail Sales Dashboard',
        desc: 'An interactive Power BI dashboard breaking down regional retail performance — revenue trends, category mix, and store-level KPIs for faster decisions.',
        tags: ['Power BI', 'DAX', 'SQL'],
        link: '#', image: null, thumbStyle: 'line'
      },
      {
        id: 'p3', title: 'Customer Churn Analysis',
        desc: 'An exploratory analysis identifying key drivers behind customer churn, using SQL for data prep and Python for statistical testing and visualization.',
        tags: ['SQL', 'Python', 'EDA'],
        link: '#', image: null, thumbStyle: 'donut'
      }
    ],
    skills: {
      dataAnalysis: ['Excel', 'SQL', 'Python', 'Pandas'],
      visualization: ['Power BI', 'Tableau', 'Matplotlib'],
      database: ['MySQL', 'Power Query', 'DAX'],
      core: ['Data Cleaning', 'EDA', 'Descriptive Stats', 'Dashboard Design']
    },
    education: {
      degree: 'BSc in Electrical & Electronic Engineering',
      university: '[Your University Name]',
      year: '[20XX]',
      note: "CGPA available on request — add here if you'd like it displayed."
    },
    certifications: [],
    resume: { link: '#', fileName: null, fileData: null },
    contact: {
      email: 'your@email.com',
      whatsapp: '8800000000',
      linkedin: 'https://linkedin.com/in/yourprofile',
      github: 'https://github.com/yourprofile'
    },
    footer: {
      role: 'Data Analyst · EEE Graduate'
    }
  };

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function deepMerge(target, source) {
    const out = Array.isArray(target) ? target.slice() : { ...target };
    if (Array.isArray(source)) return source;
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && target[key]) {
        out[key] = deepMerge(target[key], source[key]);
      } else if (source[key] !== undefined) {
        out[key] = source[key];
      }
    }
    return out;
  }

  function getContent() {
    try {
      const raw = localStorage.getItem(KEYS.content);
      if (!raw) return deepClone(DEFAULT_CONTENT);
      const parsed = JSON.parse(raw);
      return deepMerge(deepClone(DEFAULT_CONTENT), parsed);
    } catch (e) {
      console.error('Store: failed to read content, using defaults', e);
      return deepClone(DEFAULT_CONTENT);
    }
  }

  function saveContent(content) {
    try {
      localStorage.setItem(KEYS.content, JSON.stringify(content));
      return true;
    } catch (e) {
      console.error('Store: failed to save content', e);
      return false;
    }
  }

  function resetContent() {
    try {
      localStorage.removeItem(KEYS.content);
      return true;
    } catch (e) {
      console.error('Store: failed to reset content', e);
      return false;
    }
  }

  function getTheme() {
    try {
      return localStorage.getItem(KEYS.theme) || DEFAULT_THEME;
    } catch (e) {
      return DEFAULT_THEME;
    }
  }

  function saveTheme(themeKey) {
    if (!THEMES[themeKey]) return false;
    try {
      localStorage.setItem(KEYS.theme, themeKey);
      applyTheme(themeKey);
      return true;
    } catch (e) {
      console.error('Store: failed to save theme', e);
      applyTheme(themeKey); // still preview it for this page view even if it can't persist
      return false;
    }
  }

  function applyTheme(themeKey) {
    const theme = THEMES[themeKey] || THEMES[DEFAULT_THEME];
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }

  function getAuth() {
    try {
      const raw = localStorage.getItem(KEYS.auth);
      if (!raw) return { username: 'admin', password: 'Admin@123' };
      return JSON.parse(raw);
    } catch (e) {
      return { username: 'admin', password: 'Admin@123' };
    }
  }

  function saveAuth(auth) {
    try {
      localStorage.setItem(KEYS.auth, JSON.stringify(auth));
      return true;
    } catch (e) {
      console.error('Store: failed to save auth', e);
      return false;
    }
  }

  global.Store = {
    KEYS,
    THEMES,
    DEFAULT_THEME,
    DEFAULT_CONTENT,
    getContent,
    saveContent,
    resetContent,
    getTheme,
    saveTheme,
    applyTheme,
    getAuth,
    saveAuth,
    deepClone
  };

})(window);
