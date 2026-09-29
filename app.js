(() => {
  'use strict';

  const config = window.APP_CONFIG || {};
  const isConfigured = Boolean(
    config.supabaseUrl &&
    config.supabaseKey &&
    !String(config.supabaseUrl).includes('SEU-PROJETO') &&
    !String(config.supabaseKey).includes('SUA_PUBLISHABLE_KEY')
  );

  const sb = isConfigured
    ? window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      })
    : null;

  const state = {
    user: null,
    projects: [],
    currentView: 'dashboard',
    projectView: 'board',
    currentProjectId: null,
    deleteProjectId: null,
    toastTimer: null,
    attachmentLoading: false
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const refs = {
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
    newPasswordDialog: $('#newPasswordDialog'),
    newPasswordForm: $('#newPasswordForm'),
    newPassword: $('#newPassword'),
    newPasswordConfirm: $('#newPasswordConfirm'),
    newPasswordMessage: $('#newPasswordMessage'),
    pageTitle: $('#pageTitle'),
    userName: $('#userName'),
    userEmail: $('#userEmail'),
    userAvatar: $('#userAvatar'),
    logoutButton: $('#logoutButton'),
    newProjectTopButton: $('#newProjectTopButton'),
    heroNewProjectButton: $('#heroNewProjectButton'),
    heroProjectsButton: $('#heroProjectsButton'),
    dashboardView: $('#dashboardView'),
    projectsView: $('#projectsView'),
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
    newProjectButton: $('#newProjectButton'),
    emptyNewProjectButton: $('#emptyNewProjectButton'),
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
    projectProgress: $('#projectProgress'),
    projectStartDate: $('#projectStartDate'),
    projectDueDate: $('#projectDueDate'),
    saveProjectButton: $('#saveProjectButton'),
    detailDialog: $('#detailDialog'),
    projectDetailContent: $('#projectDetailContent'),
    deleteDialog: $('#deleteDialog'),
    deleteProjectText: $('#deleteProjectText'),
    closeDeleteDialog: $('#closeDeleteDialog'),
    cancelDeleteButton: $('#cancelDeleteButton'),
    confirmDeleteButton: $('#confirmDeleteButton'),
    sidebar: $('#sidebar'),
    sidebarOverlay: $('#sidebarOverlay'),
    openSidebar: $('#openSidebar'),
    closeSidebar: $('#closeSidebar'),
    toast: $('#toast')
  };

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

  const STATUS_COLORS = {
    'Backlog': '#91A0AF',
    'Planejado': '#2F80ED',
    'Em andamento': '#0EA5E9',
    'Em risco': '#D0AA00',
    'Concluído': '#2A9A69',
    'Cancelado': '#8B7D82'
  };

  const PROJECT_COLORS = new Set(['#0C68E8', '#2F80ED', '#0EA5E9', '#F5C400', '#66778A']);

  function showToast(message, type = 'success') {
    refs.toast.textContent = message;
    refs.toast.className = `toast show ${type}`;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => { refs.toast.className = 'toast'; }, 3300);
  }

  function setMessage(element, message = '', type = 'error') {
    element.textContent = message;
    element.dataset.type = type;
    element.style.color = type === 'success' ? 'var(--success)' : 'var(--danger)';
  }

  function setButtonLoading(button, loading) {
    button.classList.toggle('button-loading', loading);
    button.disabled = loading;
  }

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatDate(value, options = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
    if (!value) return 'Sem data';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 'Sem data';
    return new Intl.DateTimeFormat('pt-BR', options).format(date);
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

  function formatFileSize(bytes) {
    const size = Number(bytes || 0);
    if (!size) return '—';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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

  function getDeadlineLabel(project) {
    if (project.status === 'Concluído') return 'Concluído';
    if (!project.due_date) return 'Sem prazo';
    if (isOverdue(project)) return 'Atrasado';
    const today = new Date(`${todayIso()}T00:00:00`);
    const due = new Date(`${project.due_date}T00:00:00`);
    const diff = Math.round((due - today) / 86400000);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Amanhã';
    if (diff < 0) return 'Atrasado';
    return `em ${diff}d`;
  }

  function getDisplayName(user) {
    return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';
  }

  function getRedirectUrl() {
    const cleanPath = window.location.pathname.endsWith('/') ? window.location.pathname : `${window.location.pathname}/`;
    return `${window.location.origin}${cleanPath}`;
  }

  function requireConfigured() {
    if (!isConfigured) {
      setMessage(refs.loginMessage, 'Configure config.js com a Project URL e a Publishable key do Supabase.');
      [refs.loginButton, refs.loginEmail, refs.loginPassword, refs.forgotPasswordBtn].forEach((el) => { el.disabled = true; });
      return false;
    }
    return true;
  }

  function setView(viewName) {
    state.currentView = viewName;
    const isDashboard = viewName === 'dashboard';
    refs.dashboardView.classList.toggle('hidden', !isDashboard);
    refs.projectsView.classList.toggle('hidden', isDashboard);
    refs.pageTitle.textContent = isDashboard ? 'Visão geral' : 'Projetos';
    $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === viewName));
    closeSidebar();
  }

  function setProjectView(viewName) {
    state.projectView = viewName;
    refs.projectsBoard.classList.toggle('hidden', viewName !== 'board');
    refs.projectsTimeline.classList.toggle('hidden', viewName !== 'timeline');
    refs.projectViewButtons.forEach((button) => button.classList.toggle('active', button.dataset.projectView === viewName));
    renderProjects();
  }

  function renderUser(user) {
    const name = getDisplayName(user);
    refs.userName.textContent = name;
    refs.userEmail.textContent = user?.email || '—';
    refs.userAvatar.textContent = name.slice(0, 1).toUpperCase();
  }

  function showApp(user) {
    state.user = user;
    refs.authView.classList.add('hidden');
    refs.appView.classList.remove('hidden');
    renderUser(user);
    setView('dashboard');
  }

  function showAuth() {
    state.user = null;
    state.projects = [];
    refs.appView.classList.add('hidden');
    refs.authView.classList.remove('hidden');
  }

  async function applySession(session) {
    if (session?.user) {
      showApp(session.user);
      await loadProjects();
    } else {
      showAuth();
    }
  }

  async function initAuth() {
    if (!requireConfigured()) return;

    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMessage(refs.newPasswordMessage, '');
        refs.newPasswordDialog.showModal();
        return;
      }
      setTimeout(() => { applySession(session); }, 0);
    });

    const { data, error } = await sb.auth.getSession();
    if (error) {
      setMessage(refs.loginMessage, translateAuthError(error.message));
      return;
    }
    await applySession(data.session);
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (!requireConfigured()) return;

    const email = refs.loginEmail.value.trim();
    const password = refs.loginPassword.value;
    setMessage(refs.loginMessage, '');
    setButtonLoading(refs.loginButton, true);

    const { error } = await sb.auth.signInWithPassword({ email, password });

    setButtonLoading(refs.loginButton, false);
    if (error) {
      setMessage(refs.loginMessage, translateAuthError(error.message));
      return;
    }
    refs.loginForm.reset();
  }

  async function handleLogout() {
    if (!sb) return;
    const { error } = await sb.auth.signOut();
    if (error) {
      showToast('Não foi possível sair da conta.', 'error');
      return;
    }
    showAuth();
  }

  async function loadProjects() {
    if (!sb || !state.user) return;
    refs.refreshDashboardButton.disabled = true;

    const { data, error } = await sb
      .from('projects')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('updated_at', { ascending: false });

    refs.refreshDashboardButton.disabled = false;

    if (error) {
      showToast(`Erro ao carregar projetos: ${error.message}`, 'error');
      state.projects = [];
      renderAll();
      return;
    }

    state.projects = data || [];
    renderAll();
  }

  function renderAll() {
    renderMetrics();
    renderUpcomingProjects();
    renderStatusBreakdown();
    renderDashboardTimeline();
    populateCategoryFilter();
    renderProjects();
  }

  function renderMetrics() {
    const total = state.projects.length;
    const inProgress = state.projects.filter((p) => p.status === 'Em andamento').length;
    const atRisk = state.projects.filter((p) => p.status === 'Em risco' || isOverdue(p)).length;
    const done = state.projects.filter((p) => p.status === 'Concluído').length;

    refs.metricTotal.textContent = total;
    refs.metricInProgress.textContent = inProgress;
    refs.metricAtRisk.textContent = atRisk;
    refs.metricDone.textContent = done;
  }

  function renderUpcomingProjects() {
    const upcoming = [...state.projects]
      .filter((p) => p.status !== 'Concluído' && p.status !== 'Cancelado')
      .sort((a, b) => (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31'))
      .slice(0, 6);

    if (!upcoming.length) {
      refs.upcomingProjects.innerHTML = `<div class="empty-state" style="padding:32px 10px"><div class="empty-icon">✓</div><h3>Nenhuma entrega pendente</h3><p>Cadastre um projeto para começar o acompanhamento.</p></div>`;
      return;
    }

    refs.upcomingProjects.innerHTML = upcoming.map((project) => {
      const deadlineClass = isOverdue(project) ? 'overdue' : '';
      const category = project.category ? ` • ${project.category}` : '';
      return `
        <button class="upcoming-item" type="button" data-open-project="${project.id}" style="--project-accent:${safeProjectColor(project.accent_color)}; text-align:left; background:transparent; border-left:0; border-right:0; width:100%">
          <div class="upcoming-info">
            <div class="upcoming-title"><span class="project-dot"></span><span class="project-title-line">${escapeHtml(project.title)}</span><span class="status-pill ${STATUS_CLASS[project.status] || 'status-backlog'}">${escapeHtml(project.status)}</span></div>
            <div class="project-subline">${escapeHtml(project.progress ?? 0)}% concluído${escapeHtml(category)}${project.due_date ? ` • entrega ${escapeHtml(formatDate(project.due_date))}` : ''}</div>
          </div>
          <div class="deadline-chip ${deadlineClass}">${escapeHtml(getDeadlineLabel(project))}</div>
        </button>`;
    }).join('');
  }

  function renderStatusBreakdown() {
    const total = state.projects.length;
    const statuses = ['Backlog', 'Planejado', 'Em andamento', 'Em risco', 'Concluído', 'Cancelado'];
    refs.statusBreakdown.innerHTML = statuses.map((status) => {
      const count = state.projects.filter((p) => p.status === status).length;
      const percent = total ? Math.round((count / total) * 100) : 0;
      return `
        <div class="breakdown-row">
          <div class="breakdown-head"><div class="breakdown-label"><span class="breakdown-dot" style="background:${STATUS_COLORS[status]}"></span>${escapeHtml(status)}</div><strong>${count}</strong></div>
          <div class="breakdown-track"><div class="breakdown-fill" style="width:${percent}%;background:${STATUS_COLORS[status]}"></div></div>
        </div>`;
    }).join('');
  }

  function renderDashboardTimeline() {
    const items = [...state.projects]
      .sort((a, b) => getTimelineDate(b).localeCompare(getTimelineDate(a)))
      .slice(0, 8);

    if (!items.length) {
      refs.dashboardTimeline.innerHTML = `<div class="detail-empty">A linha do tempo aparecerá quando os primeiros projetos forem cadastrados.</div>`;
      return;
    }

    refs.dashboardTimeline.innerHTML = items.map((project) => {
      const date = getTimelineDate(project);
      const dateLabel = date ? formatDate(date) : 'Sem data';
      const dueInfo = project.due_date ? `Entrega ${formatDate(project.due_date)}` : 'Sem prazo definido';
      return `
        <button class="timeline-item" type="button" data-open-project="${project.id}" style="--project-accent:${safeProjectColor(project.accent_color)}; width:100%; background:transparent; border:0; text-align:left">
          <div class="timeline-date"><strong>${escapeHtml(dateLabel)}</strong><span>${escapeHtml(project.status)}</span></div>
          <div class="timeline-card">
            <div class="timeline-card-header"><h4>${escapeHtml(project.title)}</h4><span class="status-pill ${STATUS_CLASS[project.status] || 'status-backlog'}">${escapeHtml(project.status)}</span></div>
            <p>${escapeHtml(project.description || 'Sem descrição cadastrada.')}</p>
            <div class="timeline-card-meta"><span class="category-pill">${escapeHtml(project.category || 'Sem categoria')}</span><span class="priority-pill ${PRIORITY_CLASS[project.priority] || 'priority-media'}">${escapeHtml(project.priority)}</span><span class="category-pill">${escapeHtml(dueInfo)}</span><span class="category-pill">${Math.max(0, Math.min(100, Number(project.progress || 0)))}%</span></div>
          </div>
        </button>`;
    }).join('');
  }

  function getTimelineDate(project) {
    return project.status === 'Concluído'
      ? (project.completed_at ? project.completed_at.slice(0, 10) : project.due_date || project.start_date || '')
      : (project.start_date || project.due_date || '');
  }

  function getFilteredProjects() {
    const search = refs.projectSearch.value.trim().toLowerCase();
    const status = refs.statusFilter.value;
    const priority = refs.priorityFilter.value;
    const category = refs.categoryFilter.value;

    return state.projects.filter((project) => {
      const haystack = [
        project.title,
        project.description,
        project.category,
        ...(Array.isArray(project.tags) ? project.tags : [])
      ].filter(Boolean).join(' ').toLowerCase();

      return (!search || haystack.includes(search)) &&
        (status === 'all' || project.status === status) &&
        (priority === 'all' || project.priority === priority) &&
        (category === 'all' || project.category === category);
    });
  }

  function populateCategoryFilter() {
    const current = refs.categoryFilter.value || 'all';
    const categories = [...new Set(state.projects.map((p) => String(p.category || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    refs.categoryFilter.innerHTML = `<option value="all">Todas as categorias</option>${categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}`;
    refs.categoryFilter.value = categories.includes(current) ? current : 'all';
  }

  function renderProjects() {
    const filtered = getFilteredProjects();
    const hasProjects = filtered.length > 0;
    refs.emptyProjects.classList.toggle('hidden', hasProjects);

    if (state.projectView === 'board') renderBoard(filtered);
    else renderPortfolioTimeline(filtered);
  }

  function renderBoard(projects) {
    const columns = ['Backlog', 'Planejado', 'Em andamento', 'Em risco', 'Concluído', 'Cancelado'];
    refs.projectsBoard.innerHTML = `<div class="board-grid">${columns.map((status) => {
      const items = projects.filter((p) => p.status === status);
      return `
        <section class="board-column">
          <div class="board-column-header"><div class="board-column-title"><span class="breakdown-dot" style="background:${STATUS_COLORS[status]}"></span>${escapeHtml(status)}</div><span class="board-column-count">${items.length}</span></div>
          <div class="board-stack">${items.length ? items.map(renderProjectCard).join('') : `<div class="detail-empty">Sem projetos nesta etapa.</div>`}</div>
        </section>`;
    }).join('')}</div>`;
  }

  function renderProjectCard(project) {
    const progress = Math.max(0, Math.min(100, Number(project.progress ?? 0)));
    const overdue = isOverdue(project);
    const tagCount = Array.isArray(project.tags) ? project.tags.length : 0;
    return `
      <article class="project-card" data-open-project="${project.id}" style="--project-accent:${safeProjectColor(project.accent_color)}">
        <div class="project-card-top"><span class="project-card-category">${escapeHtml(project.category || 'PROJETO')}</span><span class="priority-pill ${PRIORITY_CLASS[project.priority] || 'priority-media'}">${escapeHtml(project.priority)}</span></div>
        <h3 class="project-card-title">${escapeHtml(project.title)}</h3>
        <p class="project-card-description">${escapeHtml(project.description || 'Sem descrição cadastrada.')}</p>
        <div class="progress-area"><div class="progress-top"><span>Progresso</span><strong>${progress}%</strong></div><div class="progress-track"><div class="progress-bar" style="width:${progress}%"></div></div></div>
        <div class="project-card-bottom"><span class="project-card-date ${overdue ? 'due-date overdue' : 'project-card-date'}">${escapeHtml(project.status === 'Concluído' && project.completed_at ? `Concluído em ${formatDate(project.completed_at.slice(0,10))}` : project.due_date ? `Entrega ${formatDate(project.due_date)}` : 'Sem prazo')}</span><span class="card-file-count">${tagCount ? `#${tagCount} tags` : 'Sem tags'}</span></div>
      </article>`;
  }

  function renderPortfolioTimeline(projects) {
    if (!projects.length) {
      refs.projectsTimeline.innerHTML = '';
      return;
    }
    const sorted = [...projects].sort((a, b) => getTimelineDate(b).localeCompare(getTimelineDate(a)));
    refs.projectsTimeline.innerHTML = `<div class="portfolio-timeline-list">${sorted.map((project) => {
      const date = getTimelineDate(project);
      const dateLabel = date ? formatDate(date) : 'Sem data';
      const secondary = project.status === 'Concluído' && project.completed_at
        ? `Finalizado em ${formatDate(project.completed_at.slice(0,10))}`
        : project.due_date ? `Entrega ${formatDate(project.due_date)}` : 'Prazo não definido';
      return `
        <div class="portfolio-timeline-row">
          <div class="portfolio-date"><strong>${escapeHtml(dateLabel)}</strong><span>${escapeHtml(project.status)}</span></div>
          <article class="portfolio-timeline-card" data-open-project="${project.id}" style="--project-accent:${safeProjectColor(project.accent_color)}">
            <div class="portfolio-timeline-header"><span class="portfolio-timeline-title">${escapeHtml(project.title)}</span><span class="status-pill ${STATUS_CLASS[project.status] || 'status-backlog'}">${escapeHtml(project.status)}</span></div>
            <p class="portfolio-timeline-text">${escapeHtml(project.description || 'Sem descrição cadastrada.')}</p>
            <div class="portfolio-timeline-meta"><span class="category-pill">${escapeHtml(project.category || 'Sem categoria')}</span><span class="priority-pill ${PRIORITY_CLASS[project.priority] || 'priority-media'}">${escapeHtml(project.priority)}</span><span class="category-pill">${escapeHtml(secondary)}</span><span class="category-pill">${Math.max(0, Math.min(100, Number(project.progress || 0)))}% concluído</span></div>
          </article>
        </div>`;
    }).join('')}</div>`;
  }

  function safeProjectColor(color) {
    return PROJECT_COLORS.has(color) ? color : '#0C68E8';
  }

  function parseTags(value) {
    return [...new Set(String(value || '').split(',').map((item) => item.trim()).filter(Boolean))].slice(0, 12);
  }

  function tagsToInput(tags) {
    return Array.isArray(tags) ? tags.join(', ') : '';
  }

  function resetProjectForm() {
    refs.projectForm.reset();
    refs.projectId.value = '';
    refs.projectStatus.value = 'Backlog';
    refs.projectPriority.value = 'Média';
    refs.projectProgress.value = '0';
    refs.projectCategory.value = '';
    refs.projectTags.value = '';
    refs.projectColor.value = '#0C68E8';
    setColorPicker('#0C68E8');
    setMessage(refs.projectFormMessage, '');
  }

  function setColorPicker(color) {
    const safeColor = safeProjectColor(color);
    refs.projectColor.value = safeColor;
    refs.projectColorPicker.querySelectorAll('.color-option').forEach((button) => button.classList.toggle('selected', button.dataset.color === safeColor));
  }

  function openNewProjectDialog() {
    resetProjectForm();
    refs.dialogTitle.textContent = 'Novo projeto';
    refs.dialogSubtitle.textContent = 'Cadastre as informações principais da entrega.';
    refs.projectDialog.showModal();
    setTimeout(() => refs.projectTitle.focus(), 50);
  }

  function openEditProjectDialog(id) {
    const project = state.projects.find((p) => p.id === id);
    if (!project) return;
    refs.dialogTitle.textContent = 'Editar projeto';
    refs.dialogSubtitle.textContent = 'Atualize o projeto; a última alteração será registrada automaticamente.';
    refs.projectId.value = project.id;
    refs.projectTitle.value = project.title || '';
    refs.projectDescription.value = project.description || '';
    refs.projectStatus.value = project.status || 'Backlog';
    refs.projectPriority.value = project.priority || 'Média';
    refs.projectCategory.value = project.category || '';
    refs.projectTags.value = tagsToInput(project.tags);
    refs.projectProgress.value = String(project.progress ?? 0);
    refs.projectStartDate.value = project.start_date || '';
    refs.projectDueDate.value = project.due_date || '';
    setColorPicker(project.accent_color || '#0C68E8');
    setMessage(refs.projectFormMessage, '');
    refs.projectDialog.showModal();
  }

  async function handleProjectSave(event) {
    event.preventDefault();
    if (!sb || !state.user) return;

    const id = refs.projectId.value || null;
    const status = refs.projectStatus.value;
    const progress = Math.max(0, Math.min(100, Number(refs.projectProgress.value || 0)));
    const payload = {
      title: refs.projectTitle.value.trim(),
      description: refs.projectDescription.value.trim() || null,
      category: refs.projectCategory.value.trim() || null,
      status,
      priority: refs.projectPriority.value,
      progress,
      start_date: refs.projectStartDate.value || null,
      due_date: refs.projectDueDate.value || null,
      tags: parseTags(refs.projectTags.value),
      accent_color: safeProjectColor(refs.projectColor.value)
    };

    if (!payload.title) {
      setMessage(refs.projectFormMessage, 'Informe o nome do projeto.');
      return;
    }

    setMessage(refs.projectFormMessage, '');
    setButtonLoading(refs.saveProjectButton, true);

    const query = id
      ? sb.from('projects').update(payload).eq('id', id).select('*').single()
      : sb.from('projects').insert(payload).select('*').single();

    const { data, error } = await query;

    setButtonLoading(refs.saveProjectButton, false);
    if (error) {
      setMessage(refs.projectFormMessage, error.message);
      return;
    }

    refs.projectDialog.close();
    await loadProjects();
    const savedId = data?.id || id;
    showToast(id ? 'Projeto atualizado.' : 'Projeto criado.');
    if (savedId) await openProjectDetail(savedId);
  }

  async function openProjectDetail(id) {
    const project = state.projects.find((p) => p.id === id);
    if (!project) return;
    state.currentProjectId = id;
    refs.detailDialog.showModal();
    renderDetailShell(project, []);
    const attachments = await loadAttachments(id);
    if (state.currentProjectId === id && refs.detailDialog.open) renderDetailShell(project, attachments);
  }

  function renderDetailShell(project, attachments) {
    const progress = Math.max(0, Math.min(100, Number(project.progress ?? 0)));
    const tags = Array.isArray(project.tags) ? project.tags : [];
    const overdue = isOverdue(project);
    const attachmentList = attachments.length
      ? attachments.map((item) => renderAttachmentItem(item)).join('')
      : '<div class="detail-empty">Nenhum arquivo ou link associado a este projeto.</div>';

    refs.projectDetailContent.innerHTML = `
      <div class="detail-header" style="--project-accent:${safeProjectColor(project.accent_color)}">
        <div class="detail-title-block">
          <div class="detail-title-row"><span class="category-pill">${escapeHtml(project.category || 'Projeto')}</span><span class="status-pill ${STATUS_CLASS[project.status] || 'status-backlog'}">${escapeHtml(project.status)}</span><span class="priority-pill ${PRIORITY_CLASS[project.priority] || 'priority-media'}">${escapeHtml(project.priority)}</span></div>
          <h2 class="detail-title">${escapeHtml(project.title)}</h2>
          <p class="detail-description">${escapeHtml(project.description || 'Sem descrição cadastrada.')}</p>
        </div>
        <div class="detail-header-actions">
          <button type="button" class="ghost-button" data-detail-action="edit" data-id="${project.id}">Editar</button>
          <button type="button" class="danger-button" data-detail-action="delete" data-id="${project.id}">Excluir</button>
          <button type="button" class="icon-button" data-detail-action="close" aria-label="Fechar">×</button>
        </div>
      </div>

      <div class="detail-body">
        <div class="detail-main">
          <section class="detail-panel">
            <div class="detail-panel-title"><h3>Andamento</h3><span class="category-pill">${progress}%</span></div>
            <div class="detail-progress"><div class="detail-progress-top"><span>${overdue ? 'Prazo ultrapassado' : project.status === 'Concluído' ? 'Entrega finalizada' : 'Progresso do projeto'}</span><strong>${progress}%</strong></div><div class="progress-track"><div class="progress-bar" style="width:${progress}%;--project-accent:${safeProjectColor(project.accent_color)}"></div></div></div>
          </section>

          <section class="detail-panel">
            <div class="detail-panel-title"><h3>Datas</h3></div>
            <div class="detail-grid">
              <div class="detail-stat"><span>Início</span><strong>${escapeHtml(formatDate(project.start_date))}</strong></div>
              <div class="detail-stat"><span>Entrega</span><strong class="${overdue ? 'due-date overdue' : ''}">${escapeHtml(formatDate(project.due_date))}</strong></div>
              <div class="detail-stat"><span>Concluído em</span><strong>${escapeHtml(project.completed_at ? formatDateTime(project.completed_at) : '—')}</strong></div>
              <div class="detail-stat"><span>Última alteração</span><strong>${escapeHtml(formatDateTime(project.updated_at))}</strong></div>
            </div>
          </section>

          <section class="detail-panel">
            <div class="detail-panel-title"><h3>Tags</h3><span class="category-pill">${tags.length} ${tags.length === 1 ? 'tag' : 'tags'}</span></div>
            <div class="detail-tags">${tags.length ? tags.map((tag) => `<span class="detail-tag">#${escapeHtml(tag)}</span>`).join('') : '<span class="detail-empty">Nenhuma tag cadastrada.</span>'}</div>
          </section>
        </div>

        <aside class="detail-side">
          <section class="detail-panel">
            <div class="detail-panel-title"><h3>Arquivos associados</h3><span class="category-pill">${attachments.length}</span></div>
            <label class="attachment-dropzone" for="attachmentInput">
              <strong>Adicionar arquivos</strong>
              <span>PDF, imagens, código, ZIP e outros • máximo 50 MB por arquivo</span>
              <input id="attachmentInput" type="file" multiple>
            </label>
            <div class="attachment-list">${attachmentList}</div>
          </section>

          <section class="detail-panel">
            <div class="detail-panel-title"><h3>Adicionar link</h3></div>
            <div class="add-link-form">
              <input id="attachmentLinkName" type="text" maxlength="120" placeholder="Nome do link">
              <input id="attachmentLinkUrl" type="url" placeholder="https://...">
            </div>
            <div class="attachment-actions"><button class="secondary-button" type="button" data-detail-action="add-link" data-id="${project.id}">Adicionar link</button></div>
          </section>
        </aside>
      </div>`;

    refs.projectDetailContent.querySelector('#attachmentInput')?.addEventListener('change', handleAttachmentUpload);
  }

  async function loadAttachments(projectId) {
    if (!sb) return [];
    const { data, error } = await sb
      .from('project_attachments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      showToast(`Erro ao carregar anexos: ${error.message}`, 'error');
      return [];
    }
    return data || [];
  }

  function renderAttachmentItem(item) {
    const isLink = item.attachment_type === 'link';
    const icon = isLink ? '↗' : getFileIcon(item.mime_type, item.name);
    const meta = isLink ? (item.external_url || 'Link externo') : `${item.mime_type || 'Arquivo'} • ${formatFileSize(item.size_bytes)}`;
    return `
      <div class="attachment-item" data-attachment-id="${item.id}">
        <div class="attachment-icon ${isLink ? 'link' : ''}">${escapeHtml(icon)}</div>
        <div><div class="attachment-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div><div class="attachment-meta" title="${escapeHtml(meta)}">${escapeHtml(meta)}</div></div>
        <div class="attachment-item-actions">
          <button type="button" data-attachment-action="open" data-id="${item.id}" aria-label="Abrir">↗</button>
          <button type="button" class="attachment-delete" data-attachment-action="delete" data-id="${item.id}" aria-label="Excluir">⌫</button>
        </div>
      </div>`;
  }

  function getFileIcon(mime, name) {
    const lower = String(name || '').toLowerCase();
    if (String(mime || '').startsWith('image/')) return 'IMG';
    if (mime === 'application/pdf' || lower.endsWith('.pdf')) return 'PDF';
    if (/\.(js|ts|jsx|tsx|html|css|sql|py|json|php|java|cs|cpp|c|sh)$/i.test(lower)) return '{}';
    if (/\.(zip|rar|7z)$/i.test(lower)) return 'ZIP';
    return 'ARQ';
  }

  function sanitizeFileName(name) {
    return String(name || 'arquivo')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 140) || 'arquivo';
  }

  async function handleAttachmentUpload(event) {
    if (!sb || !state.currentProjectId) return;
    const files = [...(event.target.files || [])];
    if (!files.length) return;

    state.attachmentLoading = true;
    let added = 0;
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        showToast(`${file.name} ultrapassa 50 MB.`, 'error');
        continue;
      }

      const safeName = sanitizeFileName(file.name);
      const storagePath = `${state.currentProjectId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await sb.storage.from('project-files').upload(storagePath, file, { upsert: false, contentType: file.type || undefined });
      if (uploadError) {
        showToast(`Não foi possível enviar ${file.name}: ${uploadError.message}`, 'error');
        continue;
      }

      const { error: insertError } = await sb.from('project_attachments').insert({
        project_id: state.currentProjectId,
        attachment_type: 'arquivo',
        name: file.name,
        storage_path: storagePath,
        mime_type: file.type || null,
        size_bytes: file.size
      });

      if (insertError) {
        await sb.storage.from('project-files').remove([storagePath]);
        showToast(`Erro ao registrar ${file.name}: ${insertError.message}`, 'error');
        continue;
      }
      added += 1;
    }

    event.target.value = '';
    state.attachmentLoading = false;
    if (added) showToast(`${added} arquivo(s) associado(s) ao projeto.`);

    const project = state.projects.find((p) => p.id === state.currentProjectId);
    if (project) renderDetailShell(project, await loadAttachments(project.id));
  }

  async function addProjectLink(id) {
    if (!sb) return;
    const nameInput = refs.projectDetailContent.querySelector('#attachmentLinkName');
    const urlInput = refs.projectDetailContent.querySelector('#attachmentLinkUrl');
    const name = nameInput?.value.trim();
    const url = urlInput?.value.trim();

    if (!name || !url) {
      showToast('Informe o nome e a URL do link.', 'error');
      return;
    }

    let parsed;
    try { parsed = new URL(url); } catch { parsed = null; }
    if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) {
      showToast('Informe uma URL válida iniciando com http:// ou https://.', 'error');
      return;
    }

    const { error } = await sb.from('project_attachments').insert({
      project_id: id,
      attachment_type: 'link',
      name,
      external_url: url
    });
    if (error) {
      showToast(`Não foi possível adicionar o link: ${error.message}`, 'error');
      return;
    }

    showToast('Link associado ao projeto.');
    const project = state.projects.find((p) => p.id === id);
    if (project) renderDetailShell(project, await loadAttachments(id));
  }

  async function openAttachment(id) {
    if (!sb) return;
    const { data, error } = await sb.from('project_attachments').select('*').eq('id', id).single();
    if (error || !data) {
      showToast('Anexo não encontrado.', 'error');
      return;
    }
    if (data.attachment_type === 'link') {
      window.open(data.external_url, '_blank', 'noopener,noreferrer');
      return;
    }

    const { data: signed, error: signedError } = await sb.storage.from('project-files').createSignedUrl(data.storage_path, 3600);
    if (signedError || !signed?.signedUrl) {
      showToast(`Não foi possível abrir o arquivo: ${signedError?.message || 'URL inválida'}`, 'error');
      return;
    }
    window.open(signed.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function deleteAttachment(id) {
    if (!sb) return;
    const { data, error } = await sb.from('project_attachments').select('*').eq('id', id).single();
    if (error || !data) {
      showToast('Anexo não encontrado.', 'error');
      return;
    }

    if (!window.confirm(`Excluir "${data.name}"?`)) return;

    if (data.storage_path) {
      const { error: storageError } = await sb.storage.from('project-files').remove([data.storage_path]);
      if (storageError) {
        showToast(`Não foi possível excluir o arquivo do Storage: ${storageError.message}`, 'error');
        return;
      }
    }

    const { error: deleteError } = await sb.from('project_attachments').delete().eq('id', id);
    if (deleteError) {
      showToast(`Não foi possível remover o registro do anexo: ${deleteError.message}`, 'error');
      return;
    }

    showToast('Anexo removido.');
    const project = state.projects.find((p) => p.id === state.currentProjectId);
    if (project) renderDetailShell(project, await loadAttachments(project.id));
  }

  function openDeleteDialog(id) {
    const project = state.projects.find((p) => p.id === id);
    if (!project) return;
    state.deleteProjectId = id;
    refs.deleteProjectText.innerHTML = `O projeto <strong>${escapeHtml(project.title)}</strong> será excluído junto com os registros de anexos. Os arquivos armazenados também serão removidos.`;
    refs.deleteDialog.showModal();
  }

  async function confirmDelete() {
    const id = state.deleteProjectId;
    if (!id || !sb) return;

    refs.confirmDeleteButton.disabled = true;
    const attachments = await loadAttachments(id);
    const paths = attachments.map((item) => item.storage_path).filter(Boolean);
    if (paths.length) await sb.storage.from('project-files').remove(paths);

    const { error } = await sb.from('projects').delete().eq('id', id);
    refs.confirmDeleteButton.disabled = false;
    if (error) {
      showToast(`Não foi possível excluir o projeto: ${error.message}`, 'error');
      return;
    }

    refs.deleteDialog.close();
    if (state.currentProjectId === id && refs.detailDialog.open) refs.detailDialog.close();
    state.currentProjectId = null;
    state.deleteProjectId = null;
    await loadProjects();
    showToast('Projeto excluído.');
  }

  async function requestPasswordReset(event) {
    event.preventDefault();
    if (!sb) return;
    const email = refs.resetEmail.value.trim();
    setMessage(refs.resetMessage, '');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: getRedirectUrl() });
    if (error) {
      setMessage(refs.resetMessage, translateAuthError(error.message));
      return;
    }
    setMessage(refs.resetMessage, 'Link enviado. Verifique sua caixa de entrada.', 'success');
  }

  async function handleNewPassword(event) {
    event.preventDefault();
    if (!sb) return;
    const password = refs.newPassword.value;
    const confirm = refs.newPasswordConfirm.value;
    setMessage(refs.newPasswordMessage, '');
    if (password !== confirm) {
      setMessage(refs.newPasswordMessage, 'As senhas não conferem.');
      return;
    }
    const { error } = await sb.auth.updateUser({ password });
    if (error) {
      setMessage(refs.newPasswordMessage, translateAuthError(error.message));
      return;
    }
    refs.newPasswordDialog.close();
    refs.newPasswordForm.reset();
    showToast('Senha atualizada com sucesso.');
  }

  function translateAuthError(message = '') {
    const normalized = String(message).toLowerCase();
    if (normalized.includes('invalid login credentials')) return 'E-mail ou senha inválidos.';
    if (normalized.includes('email not confirmed')) return 'Seu e-mail ainda não foi confirmado.';
    if (normalized.includes('too many requests')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    return message;
  }

  function openResetDialog() {
    refs.resetEmail.value = refs.loginEmail.value.trim();
    setMessage(refs.resetMessage, '');
    refs.resetDialog.showModal();
    setTimeout(() => refs.resetEmail.focus(), 50);
  }

  function closeSidebar() {
    refs.sidebar.classList.remove('open');
    refs.sidebarOverlay.classList.remove('show');
  }

  function wireEvents() {
    refs.loginForm.addEventListener('submit', handleLogin);
    refs.logoutButton.addEventListener('click', handleLogout);
    refs.togglePassword.addEventListener('click', () => {
      const isPassword = refs.loginPassword.type === 'password';
      refs.loginPassword.type = isPassword ? 'text' : 'password';
      refs.togglePassword.textContent = isPassword ? '◌' : '◉';
      refs.togglePassword.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
    });

    refs.forgotPasswordBtn.addEventListener('click', openResetDialog);
    refs.resetRequestForm.addEventListener('submit', requestPasswordReset);
    refs.newPasswordForm.addEventListener('submit', handleNewPassword);
    $('#closeResetDialog').addEventListener('click', () => refs.resetDialog.close());

    $$('.nav-item').forEach((item) => item.addEventListener('click', () => setView(item.dataset.view)));
    [refs.newProjectButton, refs.newProjectTopButton, refs.heroNewProjectButton, refs.emptyNewProjectButton]
      .forEach((button) => button.addEventListener('click', openNewProjectDialog));
    refs.heroProjectsButton.addEventListener('click', () => setView('projects'));
    refs.refreshDashboardButton.addEventListener('click', loadProjects);
    refs.seeAllProjectsButton.addEventListener('click', () => setView('projects'));

    [refs.projectSearch, refs.statusFilter, refs.priorityFilter, refs.categoryFilter]
      .forEach((control) => control.addEventListener('input', renderProjects));

    refs.projectViewButtons.forEach((button) => button.addEventListener('click', () => setProjectView(button.dataset.projectView)));

    [refs.projectsBoard, refs.projectsTimeline, refs.upcomingProjects, refs.dashboardTimeline].forEach((container) => {
      container.addEventListener('click', (event) => {
        const target = event.target.closest('[data-open-project]');
        if (target) openProjectDetail(target.dataset.openProject);
      });
    });

    refs.projectForm.addEventListener('submit', handleProjectSave);
    refs.closeProjectDialog.addEventListener('click', () => refs.projectDialog.close());
    refs.cancelProjectButton.addEventListener('click', () => refs.projectDialog.close());
    refs.closeDeleteDialog.addEventListener('click', () => refs.deleteDialog.close());
    refs.cancelDeleteButton.addEventListener('click', () => refs.deleteDialog.close());
    refs.confirmDeleteButton.addEventListener('click', confirmDelete);

    refs.projectColorPicker.addEventListener('click', (event) => {
      const button = event.target.closest('.color-option');
      if (button) setColorPicker(button.dataset.color);
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
          openDeleteDialog(id);
          refs.detailDialog.close();
        }
        if (action === 'add-link') addProjectLink(id);
        return;
      }

      const attachmentAction = event.target.closest('[data-attachment-action]');
      if (!attachmentAction) return;
      const action = attachmentAction.dataset.attachmentAction;
      if (action === 'open') openAttachment(attachmentAction.dataset.id);
      if (action === 'delete') deleteAttachment(attachmentAction.dataset.id);
    });

    refs.openSidebar.addEventListener('click', () => {
      refs.sidebar.classList.add('open');
      refs.sidebarOverlay.classList.add('show');
    });
    refs.closeSidebar.addEventListener('click', closeSidebar);
    refs.sidebarOverlay.addEventListener('click', closeSidebar);
  }

  wireEvents();
  initAuth();
})();
