(() => {
  'use strict';

  /* ============================================================
     CONFIGURAÇÃO
  ============================================================ */
  const config = window.APP_CONFIG || {};
  const supabaseUrl = String(config.supabaseUrl || '').trim();
  const supabaseKey = String(config.supabaseKey || '').trim();
  const isConfigured = Boolean(supabaseUrl && supabaseKey && window.supabase);
  const supabaseClient = isConfigured ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

  const STATUS = ['Backlog', 'Planejado', 'Em andamento', 'Em risco', 'Concluído', 'Cancelado'];
  const PRIORITIES = ['Baixa', 'Média', 'Alta', 'Urgente'];
  const PROJECT_COLORS = ['#0C68E8', '#2F80ED', '#0EA5E9', '#F5C400', '#66778A'];
  const STATUS_CLASS = {
    'Backlog': 'status-backlog',
    'Planejado': 'status-planejado',
    'Em andamento': 'status-andamento',
    'Em risco': 'status-risco',
    'Concluído': 'status-concluido',
    'Cancelado': 'status-cancelado'
  };
  const PRIORITY_CLASS = {
    'Baixa': 'priority-baixa',
    'Média': 'priority-media',
    'Alta': 'priority-alta',
    'Urgente': 'priority-urgente'
  };
  const STATUS_COLOR = {
    'Backlog': '#9AA9B7',
    'Planejado': '#4F88BC',
    'Em andamento': '#0EA5E9',
    'Em risco': '#BE3E52',
    'Concluído': '#218357',
    'Cancelado': '#9DA3A9'
  };

  const state = {
    user: null,
    session: null,
    projects: [],
    currentProjectId: null,
    deleteProjectId: null,
    projectView: 'board',
    steps: [],
    toastTimer: null
  };

  /* ============================================================
     DOM
  ============================================================ */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const refs = {
    toast: $('#toast'),
    authView: $('#authView'),
    appView: $('#appView'),
    loginForm: $('#loginForm'),
    loginEmail: $('#loginEmail'),
    loginPassword: $('#loginPassword'),
    loginButton: $('#loginButton'),
    loginMessage: $('#loginMessage'),
    togglePassword: $('#togglePassword'),
    forgotPasswordBtn: $('#forgotPasswordBtn'),
    resetDialog: $('#resetDialog'),
    resetRequestForm: $('#resetRequestForm'),
    resetEmail: $('#resetEmail'),
    resetMessage: $('#resetMessage'),
    cancelResetDialog: $('#cancelResetDialog'),
    closeResetDialog: $('#closeResetDialog'),
    newPasswordDialog: $('#newPasswordDialog'),
    newPasswordForm: $('#newPasswordForm'),
    newPassword: $('#newPassword'),
    newPasswordConfirm: $('#newPasswordConfirm'),
    newPasswordMessage: $('#newPasswordMessage'),
    pageTitle: $('#pageTitle'),
    sidebar: $('#sidebar'),
    sidebarOverlay: $('#sidebarOverlay'),
    openSidebar: $('#openSidebar'),
    closeSidebar: $('#closeSidebar'),
    userAvatar: $('#userAvatar'),
    userName: $('#userName'),
    userEmail: $('#userEmail'),
    logoutButton: $('#logoutButton'),
    newProjectButton: $('#newProjectButton'),
    dashboardView: $('#dashboardView'),
    projectsView: $('#projectsView'),
    settingsView: $('#settingsView'),
    metricTotal: $('#metricTotal'),
    metricInProgress: $('#metricInProgress'),
    metricAtRisk: $('#metricAtRisk'),
    metricDone: $('#metricDone'),
    upcomingProjects: $('#upcomingProjects'),
    statusBreakdown: $('#statusBreakdown'),
    dashboardTimeline: $('#dashboardTimeline'),
    refreshDashboardButton: $('#refreshDashboardButton'),
    seeAllProjectsButton: $('#seeAllProjectsButton'),
    projectSearch: $('#projectSearch'),
    statusFilter: $('#statusFilter'),
    priorityFilter: $('#priorityFilter'),
    categoryFilter: $('#categoryFilter'),
    projectsBoard: $('#projectsBoard'),
    projectsTimeline: $('#projectsTimeline'),
    emptyProjects: $('#emptyProjects'),
    projectViewButtons: $$('[data-project-view]'),
    projectDialog: $('#projectDialog'),
    closeProjectDialog: $('#closeProjectDialog'),
    cancelProjectButton: $('#cancelProjectButton'),
    dialogTitle: $('#dialogTitle'),
    dialogSubtitle: $('#dialogSubtitle'),
    projectForm: $('#projectForm'),
    projectFormMessage: $('#projectFormMessage'),
    projectId: $('#projectId'),
    projectTitle: $('#projectTitle'),
    projectDescription: $('#projectDescription'),
    projectStatus: $('#projectStatus'),
    projectPriority: $('#projectPriority'),
    projectCategory: $('#projectCategory'),
    projectTags: $('#projectTags'),
    projectColor: $('#projectColor'),
    projectColorPicker: $('#projectColorPicker'),
    projectStartDate: $('#projectStartDate'),
    projectDueDate: $('#projectDueDate'),
    stepBuilder: $('#stepBuilder'),
    addStep: $('#addStep'),
    saveProjectButton: $('#saveProjectButton'),
    detailDialog: $('#detailDialog'),
    projectDetailContent: $('#projectDetailContent'),
    deleteDialog: $('#deleteDialog'),
    deleteProjectText: $('#deleteProjectText'),
    closeDeleteDialog: $('#closeDeleteDialog'),
    cancelDeleteButton: $('#cancelDeleteButton'),
    confirmDeleteButton: $('#confirmDeleteButton'),
    projectFolderDialog: $('#projectFolderDialog'),
    closeProjectFolderDialog: $('#closeProjectFolderDialog'),
    projectFolderTitle: $('#projectFolderTitle'),
    projectFolderSubtitle: $('#projectFolderSubtitle'),
    projectFolderContent: $('#projectFolderContent'),
    themeToggle: $('#themeToggle'),
    themeLabel: $('#themeLabel'),
    contactLink: $('#contactLink')
  };

  /* ============================================================
     UTILITÁRIOS
  ============================================================ */
  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function showToast(message, type = 'success') {
    clearTimeout(state.toastTimer);
    refs.toast.textContent = message;
    refs.toast.className = `toast show ${type}`;
    state.toastTimer = setTimeout(() => {
      refs.toast.className = 'toast';
    }, 2800);
  }

  function setMessage(element, message = '', type = 'error') {
    element.textContent = message;
    element.className = `form-message${message && type === 'success' ? ' success' : ''}`;
  }

  function setButtonLoading(button, loading) {
    button.disabled = loading;
    button.dataset.originalText ??= button.textContent;
    button.textContent = loading ? 'Salvando...' : button.dataset.originalText;
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(date);
  }

  function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function todayIso() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function isOverdue(project) {
    return Boolean(
      project?.due_date &&
      project.due_date < todayIso() &&
      project.status !== 'Concluído' &&
      project.status !== 'Cancelado'
    );
  }

  function deadlineLabel(project) {
    if (project.status === 'Concluído') return project.completed_at ? 'Concluído' : 'Concluído';
    if (!project.due_date) return 'Sem prazo';
    if (isOverdue(project)) return 'Atrasado';
    const today = new Date(`${todayIso()}T00:00:00`);
    const due = new Date(`${project.due_date}T00:00:00`);
    const days = Math.round((due - today) / 86400000);
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Amanhã';
    return `em ${days}d`;
  }

  function getDisplayName(user) {
    return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';
  }

  function initials(name) {
    const parts = String(name || 'U').trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]).join('').toUpperCase() || 'U';
  }

  function getRedirectUrl() {
    const path = window.location.pathname.endsWith('/') ? window.location.pathname : `${window.location.pathname}/`;
    return `${window.location.origin}${path}`;
  }

  function safeColor(color) {
    return PROJECT_COLORS.includes(color) ? color : PROJECT_COLORS[0];
  }

  function parseTags(value) {
    return [...new Set(
      String(value || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    )].slice(0, 12);
  }

  function tagsText(tags) {
    return Array.isArray(tags) ? tags.join(', ') : '';
  }

  function normalizeChecklist(value) {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item) => item && String(item.title || '').trim())
      .map((item, index) => ({
        id: String(item.id || cryptoRandomId(`step-${index + 1}`)),
        title: String(item.title).trim(),
        done: Boolean(item.done)
      }));
  }

  function cryptoRandomId(prefix = 'id') {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function projectById(id) {
    return state.projects.find((project) => project.id === id) || null;
  }

  function checklistStats(project) {
    const items = normalizeChecklist(project?.checklist);
    const total = items.length;
    const done = items.filter((item) => item.done).length;
    return { items, total, done };
  }

  function timelineDate(project) {
    if (project.status === 'Concluído' && project.completed_at) return project.completed_at.slice(0, 10);
    return project.due_date || project.start_date || project.updated_at?.slice(0, 10) || '';
  }

  function setAccent(element, color) {
    element.style.setProperty('--accent', safeColor(color));
  }

  /* ============================================================
     APARÊNCIA
  ============================================================ */
  function applyTheme(theme) {
    const dark = theme === 'dark';
    document.body.dataset.theme = dark ? 'dark' : 'light';
    if (refs.themeToggle) {
      refs.themeToggle.setAttribute('aria-checked', String(dark));
      refs.themeToggle.classList.toggle('active', dark);
    }
    if (refs.themeLabel) refs.themeLabel.textContent = dark ? 'Escuro' : 'Claro';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#071B33' : '#0C68E8');
  }

  function initTheme() {
    const stored = localStorage.getItem('master-projects-theme');
    const preferred = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    applyTheme(stored || (preferred ? 'dark' : 'light'));
  }

  function toggleTheme() {
    const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('master-projects-theme', next);
    applyTheme(next);
  }

  /* ============================================================
     AUTENTICAÇÃO
  ============================================================ */
  function showAuth() {
    refs.authView.classList.remove('hidden');
    refs.appView.classList.add('hidden');
  }

  function showApp() {
    refs.authView.classList.add('hidden');
    refs.appView.classList.remove('hidden');
  }

  function renderUser(user) {
    const name = getDisplayName(user);
    refs.userName.textContent = name;
    refs.userEmail.textContent = user?.email || '—';
    refs.userAvatar.textContent = initials(name);
  }

  async function applySession(session) {
    state.session = session;
    state.user = session?.user || null;

    if (state.user) {
      renderUser(state.user);
      showApp();
      await loadProjects();
    } else {
      showAuth();
      state.projects = [];
      renderAll();
    }
  }

  async function initAuth() {
    if (!isConfigured) {
      setMessage(refs.loginMessage, 'Configure config.js com a Project URL e a Publishable key do Supabase.');
      refs.loginButton.disabled = true;
      refs.loginEmail.disabled = true;
      refs.loginPassword.disabled = true;
      refs.forgotPasswordBtn.disabled = true;
      return;
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
      window.setTimeout(async () => {
        if (event === 'PASSWORD_RECOVERY') {
          refs.newPasswordDialog.showModal();
          return;
        }
        await applySession(session);
      }, 0);
    });

    const { data } = await supabaseClient.auth.getSession();
    await applySession(data.session);
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (!supabaseClient) return;

    const email = refs.loginEmail.value.trim();
    const password = refs.loginPassword.value;
    setMessage(refs.loginMessage, '');
    setButtonLoading(refs.loginButton, true);

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    setButtonLoading(refs.loginButton, false);

    if (error) {
      setMessage(refs.loginMessage, error.message);
      return;
    }

    refs.loginPassword.value = '';
  }

  async function handleLogout() {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signOut();
    if (error) showToast(error.message, 'error');
  }

  async function requestPasswordReset(event) {
    event.preventDefault();
    if (!supabaseClient) return;

    setMessage(refs.resetMessage, '');
    const { error } = await supabaseClient.auth.resetPasswordForEmail(
      refs.resetEmail.value.trim(),
      { redirectTo: getRedirectUrl() }
    );

    if (error) {
      setMessage(refs.resetMessage, error.message);
      return;
    }

    setMessage(refs.resetMessage, 'Link enviado para seu e-mail.', 'success');
  }

  async function handleNewPassword(event) {
    event.preventDefault();
    if (!supabaseClient) return;

    const password = refs.newPassword.value;
    const confirmation = refs.newPasswordConfirm.value;
    setMessage(refs.newPasswordMessage, '');

    if (password !== confirmation) {
      setMessage(refs.newPasswordMessage, 'As senhas não conferem.');
      return;
    }

    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) {
      setMessage(refs.newPasswordMessage, error.message);
      return;
    }

    refs.newPasswordDialog.close();
    refs.newPasswordForm.reset();
    showToast('Senha atualizada.');
  }

  /* ============================================================
     NAVEGAÇÃO
  ============================================================ */
  function setView(view) {
    const views = {
      dashboard: refs.dashboardView,
      projects: refs.projectsView,
      settings: refs.settingsView
    };

    Object.entries(views).forEach(([key, element]) => {
      element.classList.toggle('hidden', key !== view);
    });

    refs.pageTitle.textContent = {
      dashboard: 'Visão geral',
      projects: 'Projetos',
      settings: 'Configurações'
    }[view] || 'Visão geral';

    $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === view));
    closeSidebar();
  }

  function setProjectView(view) {
    state.projectView = view;
    refs.projectsBoard.classList.toggle('hidden', view !== 'board');
    refs.projectsTimeline.classList.toggle('hidden', view !== 'timeline');
    refs.projectViewButtons.forEach((button) => button.classList.toggle('active', button.dataset.projectView === view));
    renderProjects();
  }

  function closeSidebar() {
    refs.sidebar.classList.remove('open');
    refs.sidebarOverlay.classList.remove('show');
  }

  /* ============================================================
     PROJETOS — DADOS
  ============================================================ */
  async function loadProjects() {
    if (!supabaseClient || !state.user) return;

    refs.refreshDashboardButton.disabled = true;
    const { data, error } = await supabaseClient
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });
    refs.refreshDashboardButton.disabled = false;

    if (error) {
      showToast(`Erro ao carregar projetos: ${error.message}`, 'error');
      return;
    }

    state.projects = (data || []).map((project) => ({
      ...project,
      checklist: normalizeChecklist(project.checklist),
      tags: Array.isArray(project.tags) ? project.tags : []
    }));

    populateCategoryFilter();
    renderAll();
  }

  async function deleteProject(id) {
    const attachments = await loadAttachments(id);
    const storagePaths = attachments.map((item) => item.storage_path).filter(Boolean);
    if (storagePaths.length) await supabaseClient.storage.from('project-files').remove(storagePaths);

    const { error } = await supabaseClient.from('projects').delete().eq('id', id);
    if (error) throw error;
  }

  /* ============================================================
     PROJETOS — RENDER
  ============================================================ */
  function renderAll() {
    renderMetrics();
    renderUpcomingProjects();
    renderStatusBreakdown();
    renderDashboardTimeline();
    renderProjects();
  }

  function renderMetrics() {
    const total = state.projects.length;
    const inProgress = state.projects.filter((p) => p.status === 'Em andamento').length;
    const attention = state.projects.filter((p) => p.status === 'Em risco' || isOverdue(p)).length;
    const done = state.projects.filter((p) => p.status === 'Concluído').length;

    refs.metricTotal.textContent = total;
    refs.metricInProgress.textContent = inProgress;
    refs.metricAtRisk.textContent = attention;
    refs.metricDone.textContent = done;
  }

  function renderUpcomingProjects() {
    const upcoming = [...state.projects]
      .filter((project) => project.status !== 'Concluído' && project.status !== 'Cancelado')
      .sort((a, b) => (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31'))
      .slice(0, 6);

    if (!upcoming.length) {
      refs.upcomingProjects.innerHTML = '<div class="detail-empty">Nenhuma entrega pendente.</div>';
      return;
    }

    refs.upcomingProjects.innerHTML = upcoming.map((project) => {
      const stats = checklistStats(project);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'list-item';
      item.dataset.openProject = project.id;
      setAccent(item, project.accent_color);
      item.innerHTML = `
        <span class="list-main">
          <span class="title-line"><span class="project-dot"></span><span class="title-text">${escapeHtml(project.title)}</span></span>
          <span class="subtext">${escapeHtml(project.category || 'Sem categoria')} • ${stats.done}/${stats.total} etapas</span>
        </span>
        <span class="deadline ${isOverdue(project) ? 'overdue' : ''}">${escapeHtml(deadlineLabel(project))}</span>
      `;
      return item.outerHTML;
    }).join('');
  }

  function renderStatusBreakdown() {
    const total = state.projects.length;
    refs.statusBreakdown.innerHTML = STATUS.map((status) => {
      const count = state.projects.filter((project) => project.status === status).length;
      const width = total ? Math.round((count / total) * 100) : 0;
      const color = STATUS_COLOR[status];
      return `
        <div class="status-row">
          <div class="status-row-head">
            <span class="status-name"><span class="status-dot" style="--status-color:${color}"></span>${escapeHtml(status)}</span>
            <span class="status-count">${count}</span>
          </div>
          <div class="status-track"><div class="status-fill" style="--status-color:${color};--width:${width}%"></div></div>
        </div>
      `;
    }).join('');
  }

  function renderDashboardTimeline() {
    const projects = [...state.projects]
      .filter((project) => timelineDate(project))
      .sort((a, b) => timelineDate(b).localeCompare(timelineDate(a)))
      .slice(0, 14);

    if (!projects.length) {
      refs.dashboardTimeline.innerHTML = '<div class="detail-empty">Nenhuma data registrada para o portfólio.</div>';
      return;
    }

    refs.dashboardTimeline.innerHTML = projects.map((project) => renderTimelineItem(project)).join('');
  }

  function renderTimelineItem(project) {
    const date = timelineDate(project);
    const label = project.status === 'Concluído' && project.completed_at
      ? `Concluído em ${formatDate(date)}`
      : project.due_date
        ? `Entrega ${formatDate(project.due_date)}`
        : `Atualizado ${formatDate(date)}`;
    const stats = checklistStats(project);
    const card = document.createElement('div');
    card.className = 'timeline-card';
    card.dataset.openProject = project.id;
    setAccent(card, project.accent_color);
    card.innerHTML = `
      <div class="timeline-title">${escapeHtml(project.title)}</div>
      <div class="timeline-meta">
        <span class="status-pill ${STATUS_CLASS[project.status] || 'status-backlog'}">${escapeHtml(project.status)}</span>
        <span class="category-pill">${escapeHtml(project.category || 'Sem categoria')}</span>
        <span class="category-pill">${stats.done}/${stats.total} etapas</span>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.className = 'timeline-item';
    wrapper.innerHTML = `<div class="timeline-date">${escapeHtml(label)}</div>`;
    wrapper.appendChild(card);
    return wrapper.outerHTML;
  }

  function getFilteredProjects() {
    const search = refs.projectSearch.value.trim().toLowerCase();
    const status = refs.statusFilter.value;
    const priority = refs.priorityFilter.value;
    const category = refs.categoryFilter.value;

    return state.projects.filter((project) => {
      const haystack = [project.title, project.description, project.category, ...(Array.isArray(project.tags) ? project.tags : [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (!search || haystack.includes(search))
        && (status === 'all' || project.status === status)
        && (priority === 'all' || project.priority === priority)
        && (category === 'all' || project.category === category);
    });
  }

  function populateCategoryFilter() {
    const current = refs.categoryFilter.value || 'all';
    const categories = [...new Set(
      state.projects.map((project) => String(project.category || '').trim()).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    refs.categoryFilter.innerHTML = '<option value="all">Todas as categorias</option>';
    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      refs.categoryFilter.appendChild(option);
    });
    refs.categoryFilter.value = categories.includes(current) ? current : 'all';
  }

  function renderProjects() {
    const projects = getFilteredProjects();
    const showBoard = state.projectView === 'board';
    const showTimeline = state.projectView === 'timeline';

    refs.emptyProjects.classList.toggle('hidden', projects.length > 0);
    refs.projectsBoard.classList.toggle('hidden', !showBoard || projects.length === 0);
    refs.projectsTimeline.classList.toggle('hidden', !showTimeline || projects.length === 0);

    if (!projects.length) return;
    if (showBoard) renderBoard(projects);
    if (showTimeline) renderPortfolioTimeline(projects);
  }

  function renderBoard(projects) {
    refs.projectsBoard.innerHTML = STATUS.map((status) => {
      const items = projects
        .filter((project) => project.status === status)
        .sort((a, b) => (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31'));
      const preview = items.slice(0, 3);
      const remaining = Math.max(items.length - preview.length, 0);

      return `
        <section class="board-folder" data-open-folder="${escapeHtml(status)}" tabindex="0" role="button" aria-label="Abrir ${escapeHtml(status)}">
          <header class="folder-header">
            <div class="folder-title-wrap">
              <span class="folder-dot" style="--folder-color:${STATUS_COLOR[status]}"></span>
              <span class="folder-title">${escapeHtml(status)}</span>
            </div>
            <span class="board-count">${items.length}</span>
          </header>
          <div class="folder-preview">
            ${preview.length ? preview.map((project) => renderProjectCard(project, true)).join('') : '<div class="folder-empty">—</div>'}
          </div>
          ${remaining ? `<div class="folder-more">+${remaining} projetos</div>` : ''}
        </section>
      `;
    }).join('');
  }

  function renderProjectCard(project, compact = false) {
    const stats = checklistStats(project);
    const overdue = isOverdue(project);
    const doneRatio = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
    const card = document.createElement('article');
    card.className = `project-card${compact ? ' compact' : ''}`;
    if (!compact) card.dataset.openProject = project.id;
    setAccent(card, project.accent_color);

    if (compact) {
      card.innerHTML = `
        <div class="project-card-title">${escapeHtml(project.title)}</div>
        <div class="project-card-meta">
          <span>${stats.done}/${stats.total} etapas</span>
          <span class="${overdue ? 'overdue-mark' : ''}">${project.due_date ? escapeHtml(formatDate(project.due_date)) : 'Sem prazo'}</span>
        </div>
        <div class="card-progress"><span style="--width:${doneRatio}%"></span></div>
      `;
      return card.outerHTML;
    }

    const tags = Array.isArray(project.tags) ? project.tags : [];
    card.innerHTML = `
      <div class="project-card-title">${escapeHtml(project.title)}</div>
      <p class="project-card-description">${escapeHtml(project.description || 'Sem descrição cadastrada.')}</p>
      <div class="card-tags">
        <span class="priority-pill ${PRIORITY_CLASS[project.priority] || 'priority-media'}">${escapeHtml(project.priority)}</span>
        ${project.category ? `<span class="category-pill">${escapeHtml(project.category)}</span>` : ''}
      </div>
      <div class="card-footer">
        <span class="card-step-count">${stats.done}/${stats.total} etapas</span>
        ${overdue ? '<span class="overdue-mark">Atrasado</span>' : `<span class="card-step-count">${project.due_date ? escapeHtml(formatDate(project.due_date)) : 'Sem prazo'}</span>`}
      </div>
      ${tags.length ? `<div class="card-tags">${tags.slice(0, 3).map((tag) => `<span class="category-pill">#${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
    `;
    return card.outerHTML;
  }

  function openProjectFolder(status) {
    const items = getFilteredProjects()
      .filter((project) => project.status === status)
      .sort((a, b) => (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31'));

    refs.projectFolderTitle.textContent = status;
    refs.projectFolderSubtitle.textContent = `${items.length} projeto${items.length === 1 ? '' : 's'}`;
    refs.projectFolderContent.innerHTML = items.length
      ? items.map((project) => renderProjectCard(project)).join('')
      : '<div class="detail-empty">Nenhum projeto nesta categoria.</div>';
    refs.projectFolderDialog.showModal();
  }

  function renderPortfolioTimeline(projects) {
    const sorted = [...projects].sort((a, b) => {
      const dateA = timelineDate(a) || '0000-00-00';
      const dateB = timelineDate(b) || '0000-00-00';
      return dateB.localeCompare(dateA);
    });

    refs.projectsTimeline.innerHTML = sorted.map((project) => {
      const card = document.createElement('article');
      card.className = 'portfolio-card';
      card.dataset.openProject = project.id;
      setAccent(card, project.accent_color);
      const date = timelineDate(project);
      const stats = checklistStats(project);
      card.innerHTML = `
        <div class="portfolio-card-head">
          <span class="portfolio-title">${escapeHtml(project.title)}</span>
          <span class="status-pill ${STATUS_CLASS[project.status] || 'status-backlog'}">${escapeHtml(project.status)}</span>
        </div>
        <p class="portfolio-description">${escapeHtml(project.description || 'Sem descrição cadastrada.')}</p>
        <div class="portfolio-meta">
          <span class="category-pill">${escapeHtml(project.category || 'Sem categoria')}</span>
          <span class="priority-pill ${PRIORITY_CLASS[project.priority] || 'priority-media'}">${escapeHtml(project.priority)}</span>
          <span class="category-pill">${stats.done}/${stats.total} etapas</span>
          <span class="category-pill">${date ? escapeHtml(formatDate(date)) : 'Sem data'}</span>
        </div>
      `;

      const row = document.createElement('div');
      row.className = 'portfolio-row';
      row.innerHTML = `<div class="portfolio-date"><strong>${escapeHtml(date ? formatDate(date) : '—')}</strong><span>${escapeHtml(project.status)}</span></div>`;
      row.appendChild(card);
      return row.outerHTML;
    }).join('');
  }

  /* ============================================================
     PROJETOS — FORMULÁRIO
  ============================================================ */
  function setColorPicker(color) {
    const chosen = safeColor(color);
    refs.projectColor.value = chosen;
    $$('.color-option', refs.projectColorPicker).forEach((button) => {
      button.classList.toggle('selected', button.dataset.color === chosen);
    });
  }

  function renderStepBuilder() {
    refs.stepBuilder.innerHTML = state.steps.map((step, index) => `
      <div class="step-builder-row" data-builder-step="${escapeHtml(step.id)}">
        <span class="step-number">${index + 1}</span>
        <input class="step-builder-input" data-step-input="${escapeHtml(step.id)}" value="${escapeHtml(step.title)}" placeholder="Ex.: Validar requisitos">
        <button class="remove-step" type="button" data-remove-step="${escapeHtml(step.id)}" aria-label="Remover etapa">×</button>
      </div>
    `).join('');
  }

  function resetProjectForm() {
    refs.projectForm.reset();
    refs.projectId.value = '';
    refs.projectStatus.value = 'Backlog';
    refs.projectPriority.value = 'Média';
    refs.projectColor.value = PROJECT_COLORS[0];
    setColorPicker(PROJECT_COLORS[0]);
    state.steps = [];
    renderStepBuilder();
    setMessage(refs.projectFormMessage, '');
  }

  function openNewProjectDialog() {
    resetProjectForm();
    refs.dialogTitle.textContent = 'Novo projeto';
    refs.dialogSubtitle.textContent = 'Cadastre as informações principais.';
    refs.projectDialog.showModal();
    setTimeout(() => refs.projectTitle.focus(), 50);
  }

  function openEditProjectDialog(id) {
    const project = projectById(id);
    if (!project) return;

    refs.dialogTitle.textContent = 'Editar projeto';
    refs.dialogSubtitle.textContent = 'Atualize os dados e as etapas do projeto.';
    refs.projectId.value = project.id;
    refs.projectTitle.value = project.title || '';
    refs.projectDescription.value = project.description || '';
    refs.projectStatus.value = project.status || 'Backlog';
    refs.projectPriority.value = project.priority || 'Média';
    refs.projectCategory.value = project.category || '';
    refs.projectTags.value = tagsText(project.tags);
    refs.projectStartDate.value = project.start_date || '';
    refs.projectDueDate.value = project.due_date || '';
    setColorPicker(project.accent_color || PROJECT_COLORS[0]);
    state.steps = normalizeChecklist(project.checklist);
    renderStepBuilder();
    setMessage(refs.projectFormMessage, '');
    refs.projectDialog.showModal();
  }

  function collectBuilderSteps() {
    return state.steps
      .map((step) => ({
        id: step.id,
        title: String($(`[data-step-input="${CSS.escape(step.id)}"]`, refs.stepBuilder)?.value || step.title).trim(),
        done: Boolean(step.done)
      }))
      .filter((step) => step.title);
  }

  async function saveProject(event) {
    event.preventDefault();
    if (!supabaseClient || !state.user) return;

    const id = refs.projectId.value || null;
    const title = refs.projectTitle.value.trim();
    if (!title) {
      setMessage(refs.projectFormMessage, 'Informe o nome do projeto.');
      return;
    }

    let checklist = collectBuilderSteps();
    let status = refs.projectStatus.value;

    if (status === 'Concluído') {
      checklist = checklist.map((step) => ({ ...step, done: true }));
    }

    const payload = {
      title,
      description: refs.projectDescription.value.trim() || null,
      category: refs.projectCategory.value.trim() || null,
      status,
      priority: refs.projectPriority.value,
      start_date: refs.projectStartDate.value || null,
      due_date: refs.projectDueDate.value || null,
      tags: parseTags(refs.projectTags.value),
      accent_color: safeColor(refs.projectColor.value),
      checklist
    };

    setMessage(refs.projectFormMessage, '');
    setButtonLoading(refs.saveProjectButton, true);

    const query = id
      ? supabaseClient.from('projects').update(payload).eq('id', id).select('*').single()
      : supabaseClient.from('projects').insert(payload).select('*').single();
    const { data, error } = await query;

    setButtonLoading(refs.saveProjectButton, false);
    if (error) {
      setMessage(refs.projectFormMessage, error.message);
      return;
    }

    refs.projectDialog.close();
    await loadProjects();
    showToast(id ? 'Projeto atualizado.' : 'Projeto criado.');
    if (data?.id) openProjectDetail(data.id);
  }

  /* ============================================================
     CHECKLIST — DETALHES
  ============================================================ */
  function renderChecklist(project) {
    const { items, total, done } = checklistStats(project);
    if (!items.length) return '<div class="detail-empty">Nenhuma etapa cadastrada.</div>';

    return `
      <div class="checklist-list">
        ${items.map((item) => `
          <div class="check-item ${item.done ? 'done' : ''}">
            <input type="checkbox" id="check-${escapeHtml(item.id)}" data-check-step="${escapeHtml(item.id)}" ${item.done ? 'checked' : ''}>
            <label for="check-${escapeHtml(item.id)}">${escapeHtml(item.title)}</label>
          </div>
        `).join('')}
      </div>
      <div class="detail-progress-summary">${done} de ${total} etapas concluídas.</div>
    `;
  }

  async function updateChecklistStep(stepId, checked) {
    const project = projectById(state.currentProjectId);
    if (!project) return;

    const checklist = normalizeChecklist(project.checklist).map((item) => (
      item.id === stepId ? { ...item, done: checked } : item
    ));
    const allDone = checklist.length > 0 && checklist.every((item) => item.done);
    const nextStatus = allDone
      ? 'Concluído'
      : project.status === 'Concluído'
        ? 'Em andamento'
        : project.status;

    const { data, error } = await supabaseClient
      .from('projects')
      .update({ checklist, status: nextStatus })
      .eq('id', project.id)
      .select('*')
      .single();

    if (error) {
      showToast(error.message, 'error');
      renderProjectDetail(project);
      return;
    }

    replaceProject(data);
    renderAll();
    renderProjectDetail(data);
    showToast(allDone ? 'Projeto concluído automaticamente.' : 'Etapa atualizada.');
  }

  async function addDetailStep() {
    const input = $('#newDetailStep', refs.projectDetailContent);
    const title = input?.value.trim();
    if (!title) return;

    const project = projectById(state.currentProjectId);
    if (!project) return;

    const checklist = [
      ...normalizeChecklist(project.checklist),
      { id: cryptoRandomId('step'), title, done: false }
    ];

    const status = project.status === 'Concluído' ? 'Em andamento' : project.status;
    const { data, error } = await supabaseClient
      .from('projects')
      .update({ checklist, status })
      .eq('id', project.id)
      .select('*')
      .single();

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    replaceProject(data);
    renderAll();
    renderProjectDetail(data);
    showToast('Etapa adicionada.');
  }

  /* ============================================================
     DETALHES — ANEXOS
  ============================================================ */
  async function loadAttachments(projectId) {
    const { data, error } = await supabaseClient
      .from('project_attachments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      showToast(`Erro ao carregar arquivos: ${error.message}`, 'error');
      return [];
    }
    return data || [];
  }

  function safeFileName(name) {
    return String(name || 'arquivo')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120) || 'arquivo';
  }

  function fileMark(mime, name, isLink = false) {
    if (isLink) return 'LINK';
    const lowerName = String(name || '').toLowerCase();
    if ((mime || '').startsWith('image/')) return 'IMG';
    if (mime === 'application/pdf' || lowerName.endsWith('.pdf')) return 'PDF';
    if (/\.(js|ts|jsx|tsx|html|css|sql|py|json|php|java|cs|cpp|c|sh)$/i.test(lowerName)) return 'CODE';
    if (/\.(zip|rar|7z)$/i.test(lowerName)) return 'ZIP';
    return 'FILE';
  }

  async function uploadFiles(event) {
    const files = [...(event.target.files || [])];
    if (!files.length || !state.currentProjectId) return;

    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        showToast(`${file.name} ultrapassa 50 MB.`, 'error');
        continue;
      }

      const path = `${state.currentProjectId}/${Date.now()}-${safeFileName(file.name)}`;
      const upload = await supabaseClient.storage
        .from('project-files')
        .upload(path, file, { upsert: false, contentType: file.type || undefined });

      if (upload.error) {
        showToast(`Erro ao enviar ${file.name}: ${upload.error.message}`, 'error');
        continue;
      }

      const insert = await supabaseClient.from('project_attachments').insert({
        project_id: state.currentProjectId,
        attachment_type: 'arquivo',
        name: file.name,
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size
      });

      if (insert.error) {
        await supabaseClient.storage.from('project-files').remove([path]);
        showToast(`Erro ao registrar ${file.name}.`, 'error');
      }
    }

    event.target.value = '';
    await renderCurrentDetail();
    showToast('Arquivos associados.');
  }

  async function addProjectLink() {
    const name = $('#newLinkName', refs.projectDetailContent)?.value.trim();
    const url = $('#newLinkUrl', refs.projectDetailContent)?.value.trim();
    if (!name || !url) {
      showToast('Informe nome e URL.', 'error');
      return;
    }

    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('URL inválida');
    } catch {
      showToast('Informe uma URL válida.', 'error');
      return;
    }

    const { error } = await supabaseClient.from('project_attachments').insert({
      project_id: state.currentProjectId,
      attachment_type: 'link',
      name,
      external_url: url
    });

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    await renderCurrentDetail();
    showToast('Link adicionado.');
  }

  async function openAttachment(id) {
    const { data, error } = await supabaseClient.from('project_attachments').select('*').eq('id', id).single();
    if (error || !data) {
      showToast('Anexo não encontrado.', 'error');
      return;
    }

    if (data.attachment_type === 'link') {
      window.open(data.external_url, '_blank', 'noopener,noreferrer');
      return;
    }

    const { data: signed, error: signedError } = await supabaseClient.storage
      .from('project-files')
      .createSignedUrl(data.storage_path, 3600);

    if (signedError || !signed?.signedUrl) {
      showToast('Não foi possível abrir o arquivo.', 'error');
      return;
    }

    window.open(signed.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function deleteAttachment(id) {
    const { data, error } = await supabaseClient.from('project_attachments').select('*').eq('id', id).single();
    if (error || !data) return;

    if (!window.confirm(`Excluir "${data.name}"?`)) return;
    if (data.storage_path) await supabaseClient.storage.from('project-files').remove([data.storage_path]);

    const result = await supabaseClient.from('project_attachments').delete().eq('id', id);
    if (result.error) {
      showToast(result.error.message, 'error');
      return;
    }

    await renderCurrentDetail();
    showToast('Anexo removido.');
  }

  /* ============================================================
     DETALHES — RENDER
  ============================================================ */
  async function openProjectDetail(id) {
    const project = projectById(id);
    if (!project) return;
    state.currentProjectId = id;
    refs.detailDialog.showModal();
    renderProjectDetail(project, []);
    const attachments = await loadAttachments(id);
    if (state.currentProjectId === id && refs.detailDialog.open) renderProjectDetail(projectById(id) || project, attachments);
  }

  async function renderCurrentDetail() {
    const project = projectById(state.currentProjectId);
    if (!project) return;
    const attachments = await loadAttachments(project.id);
    renderProjectDetail(project, attachments);
  }

  function renderProjectDetail(project, attachments = []) {
    const stats = checklistStats(project);
    const tags = Array.isArray(project.tags) ? project.tags : [];
    const overdue = isOverdue(project);
    const attachmentMarkup = attachments.length
      ? attachments.map(renderAttachment).join('')
      : '<div class="detail-empty">Nenhum arquivo ou link associado.</div>';

    refs.projectDetailContent.innerHTML = `
      <div class="detail-shell">
        <header class="detail-top">
          <div>
            <div class="detail-kicker">
              <span class="status-pill ${STATUS_CLASS[project.status] || 'status-backlog'}">${escapeHtml(project.status)}</span>
              <span class="priority-pill ${PRIORITY_CLASS[project.priority] || 'priority-media'}">${escapeHtml(project.priority)}</span>
              ${project.category ? `<span class="category-pill">${escapeHtml(project.category)}</span>` : ''}
            </div>
            <h2 class="detail-title">${escapeHtml(project.title)}</h2>
            <p class="detail-description">${escapeHtml(project.description || 'Sem descrição cadastrada.')}</p>
          </div>
          <div class="detail-actions">
            <button class="ghost-button" type="button" data-detail-action="edit" data-id="${escapeHtml(project.id)}">Editar</button>
            <button class="danger-button" type="button" data-detail-action="delete" data-id="${escapeHtml(project.id)}">Excluir</button>
            <button class="icon-button" type="button" data-detail-action="close" aria-label="Fechar">×</button>
          </div>
        </header>

        <div class="detail-content">
          <div class="detail-main">
            <section class="detail-panel">
              <div class="detail-panel-title">
                <h3>Etapas</h3>
                <span class="category-pill">${stats.done} de ${stats.total}</span>
              </div>
              ${renderChecklist(project)}
              <div class="add-detail-step">
                <input id="newDetailStep" type="text" maxlength="180" placeholder="Adicionar nova etapa...">
                <button class="secondary-button" type="button" data-detail-action="add-step">Adicionar</button>
              </div>
            </section>

            <section class="detail-panel">
              <div class="detail-panel-title"><h3>Arquivos e links</h3></div>
              <div class="attachments">${attachmentMarkup}</div>
              <div class="upload-row">
                <input id="detailFileInput" class="file-input" type="file" multiple>
                <div class="add-detail-step">
                  <input id="newLinkName" type="text" maxlength="100" placeholder="Nome do link">
                  <input id="newLinkUrl" type="url" maxlength="1000" placeholder="https://...">
                </div>
                <button class="secondary-button" type="button" data-detail-action="add-link">Adicionar link</button>
              </div>
            </section>
          </div>

          <aside class="detail-side">
            <section class="detail-panel">
              <div class="detail-panel-title"><h3>Datas</h3></div>
              <div class="detail-meta-grid">
                <div class="detail-meta-item"><span>Início</span><strong>${escapeHtml(formatDate(project.start_date))}</strong></div>
                <div class="detail-meta-item"><span>Entrega</span><strong class="${overdue ? 'overdue-mark' : ''}">${escapeHtml(formatDate(project.due_date))}</strong></div>
                <div class="detail-meta-item"><span>Concluído em</span><strong>${escapeHtml(project.completed_at ? formatDateTime(project.completed_at) : '—')}</strong></div>
                <div class="detail-meta-item"><span>Última alteração</span><strong>${escapeHtml(formatDateTime(project.updated_at))}</strong></div>
              </div>
            </section>

            <section class="detail-panel">
              <div class="detail-panel-title"><h3>Tags</h3></div>
              <div class="detail-tags">
                ${tags.length ? tags.map((tag) => `<span class="detail-tag">#${escapeHtml(tag)}</span>`).join('') : '<span class="detail-empty">Nenhuma tag cadastrada.</span>'}
              </div>
            </section>
          </aside>
        </div>
      </div>
    `;

    setAccent($('.detail-shell', refs.projectDetailContent), project.accent_color);

    $('#detailFileInput', refs.projectDetailContent)?.addEventListener('change', uploadFiles);
  }

  function renderAttachment(attachment) {
    const isLink = attachment.attachment_type === 'link';
    const mark = fileMark(attachment.mime_type, attachment.name, isLink);
    const meta = isLink ? attachment.external_url : (attachment.mime_type || 'Arquivo');
    return `
      <div class="attachment-row">
        <div class="attachment-mark">${mark}</div>
        <div class="attachment-copy">
          <div class="attachment-name" title="${escapeHtml(attachment.name)}">${escapeHtml(attachment.name)}</div>
          <div class="attachment-meta" title="${escapeHtml(meta)}">${escapeHtml(meta)}</div>
        </div>
        <div class="attachment-actions">
          <button class="mini-button" type="button" data-attachment-action="open" data-id="${escapeHtml(attachment.id)}">Abrir</button>
          <button class="mini-button delete" type="button" data-attachment-action="delete" data-id="${escapeHtml(attachment.id)}">Excluir</button>
        </div>
      </div>
    `;
  }

  /* ============================================================
     EXCLUSÃO / ESTADO
  ============================================================ */
  function replaceProject(project) {
    const index = state.projects.findIndex((item) => item.id === project.id);
    const normalized = { ...project, checklist: normalizeChecklist(project.checklist), tags: Array.isArray(project.tags) ? project.tags : [] };
    if (index >= 0) state.projects[index] = normalized;
    else state.projects.unshift(normalized);
  }

  function openDeleteDialog(id) {
    const project = projectById(id);
    if (!project) return;
    state.deleteProjectId = id;
    refs.deleteProjectText.textContent = `O projeto “${project.title}” será excluído junto com seus registros de arquivos e links.`;
    refs.deleteDialog.showModal();
  }

  async function confirmDelete() {
    const id = state.deleteProjectId;
    if (!id) return;

    refs.confirmDeleteButton.disabled = true;
    try {
      await deleteProject(id);
      refs.confirmDeleteButton.disabled = false;
      refs.deleteDialog.close();
      if (state.currentProjectId === id) refs.detailDialog.close();
      state.currentProjectId = null;
      state.deleteProjectId = null;
      await loadProjects();
      showToast('Projeto excluído.');
    } catch (error) {
      refs.confirmDeleteButton.disabled = false;
      showToast(error.message || 'Não foi possível excluir o projeto.', 'error');
    }
  }

  /* ============================================================
     EVENTOS
  ============================================================ */
  function wireEvents() {
    refs.loginForm.addEventListener('submit', handleLogin);
    refs.togglePassword.addEventListener('click', () => {
      const show = refs.loginPassword.type === 'password';
      refs.loginPassword.type = show ? 'text' : 'password';
      refs.togglePassword.textContent = show ? 'Ocultar' : 'Mostrar';
      refs.togglePassword.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
    });

    refs.forgotPasswordBtn.addEventListener('click', () => {
      refs.resetEmail.value = refs.loginEmail.value.trim();
      setMessage(refs.resetMessage, '');
      refs.resetDialog.showModal();
    });

    refs.resetRequestForm.addEventListener('submit', requestPasswordReset);
    refs.cancelResetDialog.addEventListener('click', () => refs.resetDialog.close());
    refs.closeResetDialog.addEventListener('click', () => refs.resetDialog.close());
    refs.newPasswordForm.addEventListener('submit', handleNewPassword);

    $$('.nav-item').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
    refs.newProjectButton.addEventListener('click', openNewProjectDialog);
    refs.refreshDashboardButton.addEventListener('click', loadProjects);
    refs.seeAllProjectsButton.addEventListener('click', () => setView('projects'));
    refs.logoutButton.addEventListener('click', handleLogout);
    refs.openSidebar.addEventListener('click', () => {
      refs.sidebar.classList.add('open');
      refs.sidebarOverlay.classList.add('show');
    });
    refs.closeSidebar.addEventListener('click', closeSidebar);
    refs.sidebarOverlay.addEventListener('click', closeSidebar);

    [refs.projectSearch, refs.statusFilter, refs.priorityFilter, refs.categoryFilter].forEach((control) => {
      control.addEventListener('input', renderProjects);
      control.addEventListener('change', renderProjects);
    });
    refs.projectViewButtons.forEach((button) => button.addEventListener('click', () => setProjectView(button.dataset.projectView)));

    [refs.projectsTimeline, refs.upcomingProjects, refs.dashboardTimeline].forEach((container) => {
      container.addEventListener('click', (event) => {
        const openTarget = event.target.closest('[data-open-project]');
        if (openTarget) openProjectDetail(openTarget.dataset.openProject);
      });
    });

    refs.projectsBoard.addEventListener('click', (event) => {
      const projectTarget = event.target.closest('[data-open-project]');
      if (projectTarget) {
        openProjectDetail(projectTarget.dataset.openProject);
        return;
      }
      const folderTarget = event.target.closest('[data-open-folder]');
      if (folderTarget) openProjectFolder(folderTarget.dataset.openFolder);
    });

    refs.projectsBoard.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const folderTarget = event.target.closest('[data-open-folder]');
      if (!folderTarget) return;
      event.preventDefault();
      openProjectFolder(folderTarget.dataset.openFolder);
    });

    refs.projectForm.addEventListener('submit', saveProject);
    refs.closeProjectDialog.addEventListener('click', () => refs.projectDialog.close());
    refs.cancelProjectButton.addEventListener('click', () => refs.projectDialog.close());

    refs.addStep.addEventListener('click', () => {
      state.steps.push({ id: cryptoRandomId('step'), title: '', done: false });
      renderStepBuilder();
      const last = refs.stepBuilder.querySelector('.step-builder-input:last-of-type');
      if (last) last.focus();
    });

    refs.stepBuilder.addEventListener('input', (event) => {
      const input = event.target.closest('[data-step-input]');
      if (!input) return;
      const step = state.steps.find((item) => item.id === input.dataset.stepInput);
      if (step) step.title = input.value;
    });

    refs.stepBuilder.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-remove-step]');
      if (!remove) return;
      state.steps = state.steps.filter((step) => step.id !== remove.dataset.removeStep);
      renderStepBuilder();
    });

    refs.projectColorPicker.addEventListener('click', (event) => {
      const button = event.target.closest('.color-option');
      if (button) setColorPicker(button.dataset.color);
    });

    refs.projectDetailContent.addEventListener('change', (event) => {
      const checkbox = event.target.closest('[data-check-step]');
      if (checkbox) updateChecklistStep(checkbox.dataset.checkStep, checkbox.checked);
    });

    refs.projectDetailContent.addEventListener('click', (event) => {
      const detailAction = event.target.closest('[data-detail-action]');
      if (detailAction) {
        const action = detailAction.dataset.detailAction;
        const id = detailAction.dataset.id || state.currentProjectId;
        if (action === 'close') refs.detailDialog.close();
        if (action === 'edit') {
          refs.detailDialog.close();
          openEditProjectDialog(id);
        }
        if (action === 'delete') {
          refs.detailDialog.close();
          openDeleteDialog(id);
        }
        if (action === 'add-step') addDetailStep();
        if (action === 'add-link') addProjectLink();
        return;
      }

      const attachmentAction = event.target.closest('[data-attachment-action]');
      if (!attachmentAction) return;
      if (attachmentAction.dataset.attachmentAction === 'open') openAttachment(attachmentAction.dataset.id);
      if (attachmentAction.dataset.attachmentAction === 'delete') deleteAttachment(attachmentAction.dataset.id);
    });

    refs.detailDialog.addEventListener('close', () => {
      state.currentProjectId = null;
    });

    refs.closeProjectFolderDialog.addEventListener('click', () => refs.projectFolderDialog.close());
    refs.projectFolderContent.addEventListener('click', (event) => {
      const openTarget = event.target.closest('[data-open-project]');
      if (!openTarget) return;
      refs.projectFolderDialog.close();
      openProjectDetail(openTarget.dataset.openProject);
    });
    refs.themeToggle.addEventListener('click', toggleTheme);

    refs.closeDeleteDialog.addEventListener('click', () => refs.deleteDialog.close());
    refs.cancelDeleteButton.addEventListener('click', () => refs.deleteDialog.close());
    refs.confirmDeleteButton.addEventListener('click', confirmDelete);
  }

  /* ============================================================
     INÍCIO
  ============================================================ */
  initTheme();
  wireEvents();
  initAuth();
})();
