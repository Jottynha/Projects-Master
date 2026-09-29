(() => {
  'use strict';

  const config = window.APP_CONFIG || {};
  const isConfigured = config.supabaseUrl &&
    config.supabaseKey &&
    !config.supabaseUrl.includes('SEU-PROJETO') &&
    !config.supabaseKey.includes('SUA_PUBLISHABLE_KEY');

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
    deleteProjectId: null,
    toastTimer: null
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
    dashboardView: $('#dashboardView'),
    projectsView: $('#projectsView'),
    metricTotal: $('#metricTotal'),
    metricInProgress: $('#metricInProgress'),
    metricAtRisk: $('#metricAtRisk'),
    metricDone: $('#metricDone'),
    upcomingProjects: $('#upcomingProjects'),
    statusBreakdown: $('#statusBreakdown'),
    refreshDashboardButton: $('#refreshDashboardButton'),
    seeAllProjectsButton: $('#seeAllProjectsButton'),
    projectSearch: $('#projectSearch'),
    statusFilter: $('#statusFilter'),
    priorityFilter: $('#priorityFilter'),
    projectsTableBody: $('#projectsTableBody'),
    emptyProjects: $('#emptyProjects'),
    newProjectButton: $('#newProjectButton'),
    emptyNewProjectButton: $('#emptyNewProjectButton'),
    projectDialog: $('#projectDialog'),
    closeProjectDialog: $('#closeProjectDialog'),
    cancelProjectButton: $('#cancelProjectButton'),
    dialogTitle: $('#dialogTitle'),
    projectForm: $('#projectForm'),
    projectFormMessage: $('#projectFormMessage'),
    projectId: $('#projectId'),
    projectTitle: $('#projectTitle'),
    projectDescription: $('#projectDescription'),
    projectStatus: $('#projectStatus'),
    projectPriority: $('#projectPriority'),
    projectResponsible: $('#projectResponsible'),
    projectProgress: $('#projectProgress'),
    projectStartDate: $('#projectStartDate'),
    projectDueDate: $('#projectDueDate'),
    saveProjectButton: $('#saveProjectButton'),
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
    'Backlog': '#91A0AD',
    'Planejado': '#4E8CC9',
    'Em andamento': '#18A4CF',
    'Em risco': '#D5A21A',
    'Concluído': '#1A8F5B',
    'Cancelado': '#8B7C80'
  };

  function showToast(message, type = 'success') {
    refs.toast.textContent = message;
    refs.toast.className = `toast show ${type}`;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      refs.toast.className = 'toast';
    }, 3200);
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

  function formatDate(value) {
    if (!value) return 'Sem prazo';
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return 'Sem prazo';
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .format(new Date(year, month - 1, day));
  }

  function formatShortDate(value) {
    if (!value) return 'Sem prazo';
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return 'Sem prazo';
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
      .format(new Date(year, month - 1, day))
      .replace('.', '');
  }

  function todayIso() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function isOverdue(project) {
    return Boolean(project.due_date && project.due_date < todayIso() && project.status !== 'Concluído' && project.status !== 'Cancelado');
  }

  function getDeadlineLabel(project) {
    if (!project.due_date) return 'Sem prazo';
    if (isOverdue(project)) return 'Atrasado';
    if (project.status === 'Concluído') return 'Concluído';

    const today = new Date(`${todayIso()}T00:00:00`);
    const due = new Date(`${project.due_date}T00:00:00`);
    const diff = Math.ceil((due - today) / 86400000);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Amanhã';
    return `em ${diff}d`;
  }

  function getDisplayName(user) {
    return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';
  }

  function getRedirectUrl() {
    const path = window.location.pathname.endsWith('/')
      ? window.location.pathname
      : `${window.location.pathname}/`;
    return `${window.location.origin}${path}`;
  }

  function requireConfigured() {
    if (!isConfigured) {
      setMessage(refs.loginMessage, 'Configure o arquivo config.js com a Project URL e a Publishable key do Supabase.');
      refs.loginButton.disabled = true;
      refs.loginEmail.disabled = true;
      refs.loginPassword.disabled = true;
      refs.forgotPasswordBtn.disabled = true;
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

    $$('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    closeSidebar();
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
    refs.appView.classList.add('hidden');
    refs.authView.classList.remove('hidden');
  }

  async function handleSession(session) {
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
        refs.newPasswordMessage.textContent = '';
        refs.newPasswordDialog.showModal();
      }
      setTimeout(() => { handleSession(session); }, 0);
    });

    const { data, error } = await sb.auth.getSession();
    if (error) {
      setMessage(refs.loginMessage, error.message);
      return;
    }
    await handleSession(data.session);
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
    state.projects = [];
    showAuth();
  }

  async function loadProjects() {
    if (!sb || !state.user) return;
    refs.refreshDashboardButton.disabled = true;

    const { data, error } = await sb
      .from('projects')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    refs.refreshDashboardButton.disabled = false;

    if (error) {
      state.projects = [];
      renderAll();
      showToast(`Erro ao carregar projetos: ${error.message}`, 'error');
      return;
    }

    state.projects = data || [];
    renderAll();
  }

  function renderAll() {
    renderMetrics();
    renderUpcomingProjects();
    renderStatusBreakdown();
    renderProjectsTable();
  }

  function renderMetrics() {
    const total = state.projects.length;
    const inProgress = state.projects.filter(p => p.status === 'Em andamento').length;
    const atRisk = state.projects.filter(p => p.status === 'Em risco' || isOverdue(p)).length;
    const done = state.projects.filter(p => p.status === 'Concluído').length;

    refs.metricTotal.textContent = total;
    refs.metricInProgress.textContent = inProgress;
    refs.metricAtRisk.textContent = atRisk;
    refs.metricDone.textContent = done;
  }

  function renderUpcomingProjects() {
    const upcoming = state.projects
      .filter(p => p.status !== 'Concluído' && p.status !== 'Cancelado')
      .sort((a, b) => {
        const da = a.due_date || '9999-12-31';
        const db = b.due_date || '9999-12-31';
        return da.localeCompare(db);
      })
      .slice(0, 5);

    if (!upcoming.length) {
      refs.upcomingProjects.innerHTML = `
        <div class="empty-state" style="padding: 35px 10px;">
          <div class="empty-icon">✓</div>
          <h3>Nenhuma entrega pendente</h3>
          <p>Cadastre um projeto para acompanhar seus prazos.</p>
        </div>`;
      return;
    }

    refs.upcomingProjects.innerHTML = upcoming.map(project => `
      <div class="upcoming-item">
        <div>
          <div class="project-main-line">
            <span class="status-pill ${STATUS_CLASS[project.status] || 'status-backlog'}">${escapeHtml(project.status)}</span>
            <span class="project-title-line">${escapeHtml(project.title)}</span>
          </div>
          <div class="project-subline">${escapeHtml(project.responsible || 'Sem responsável')} • ${project.progress ?? 0}% concluído</div>
        </div>
        <div class="deadline-chip ${isOverdue(project) ? 'overdue' : ''}">${escapeHtml(getDeadlineLabel(project))}</div>
      </div>
    `).join('');
  }

  function renderStatusBreakdown() {
    const total = state.projects.length;
    const statuses = ['Backlog', 'Planejado', 'Em andamento', 'Em risco', 'Concluído', 'Cancelado'];
    refs.statusBreakdown.innerHTML = statuses.map(status => {
      const count = state.projects.filter(p => p.status === status).length;
      const percent = total ? Math.round((count / total) * 100) : 0;
      const color = STATUS_COLORS[status];
      return `
        <div class="breakdown-row">
          <div class="breakdown-head">
            <div class="breakdown-label"><span class="breakdown-dot" style="background:${color}"></span>${escapeHtml(status)}</div>
            <strong>${count}</strong>
          </div>
          <div class="breakdown-track"><div class="breakdown-fill" style="width:${percent}%; background:${color}"></div></div>
        </div>`;
    }).join('');
  }

  function getFilteredProjects() {
    const search = refs.projectSearch.value.trim().toLowerCase();
    const status = refs.statusFilter.value;
    const priority = refs.priorityFilter.value;

    return state.projects.filter(project => {
      const haystack = [project.title, project.description, project.responsible]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (!search || haystack.includes(search)) &&
        (status === 'all' || project.status === status) &&
        (priority === 'all' || project.priority === priority);
    });
  }

  function renderProjectsTable() {
    const filtered = getFilteredProjects();
    refs.projectsTableBody.innerHTML = filtered.map(project => {
      const progress = Math.max(0, Math.min(100, Number(project.progress ?? 0)));
      const overdue = isOverdue(project);
      return `
        <tr>
          <td>
            <div class="project-cell-title" title="${escapeHtml(project.title)}">${escapeHtml(project.title)}</div>
            <div class="project-cell-sub" title="${escapeHtml(project.description || '')}">${escapeHtml(project.description || 'Sem descrição')}</div>
          </td>
          <td><span class="status-pill ${STATUS_CLASS[project.status] || 'status-backlog'}">${escapeHtml(project.status)}</span></td>
          <td><span class="priority-pill ${PRIORITY_CLASS[project.priority] || 'priority-media'}">${escapeHtml(project.priority)}</span></td>
          <td>${escapeHtml(project.responsible || '—')}</td>
          <td><span class="due-date ${overdue ? 'overdue' : ''}">${escapeHtml(formatDate(project.due_date))}</span></td>
          <td>
            <div class="progress-wrap">
              <div class="progress-top"><span>Andamento</span><strong>${progress}%</strong></div>
              <div class="progress-track"><div class="progress-bar" style="width:${progress}%"></div></div>
            </div>
          </td>
          <td>
            <div class="row-actions">
              <button class="table-action" type="button" data-action="edit" data-id="${project.id}" title="Editar">✎</button>
              <button class="table-action delete" type="button" data-action="delete" data-id="${project.id}" title="Excluir">⌫</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    refs.emptyProjects.classList.toggle('hidden', filtered.length > 0);
  }

  function resetProjectForm() {
    refs.projectForm.reset();
    refs.projectId.value = '';
    refs.projectStatus.value = 'Backlog';
    refs.projectPriority.value = 'Média';
    refs.projectProgress.value = '0';
    setMessage(refs.projectFormMessage, '');
  }

  function openNewProjectDialog() {
    resetProjectForm();
    refs.dialogTitle.textContent = 'Novo projeto';
    refs.projectDialog.showModal();
    setTimeout(() => refs.projectTitle.focus(), 50);
  }

  function openEditProjectDialog(id) {
    const project = state.projects.find(p => p.id === id);
    if (!project) return;

    refs.dialogTitle.textContent = 'Editar projeto';
    refs.projectId.value = project.id;
    refs.projectTitle.value = project.title || '';
    refs.projectDescription.value = project.description || '';
    refs.projectStatus.value = project.status || 'Backlog';
    refs.projectPriority.value = project.priority || 'Média';
    refs.projectResponsible.value = project.responsible || '';
    refs.projectProgress.value = String(project.progress ?? 0);
    refs.projectStartDate.value = project.start_date || '';
    refs.projectDueDate.value = project.due_date || '';
    setMessage(refs.projectFormMessage, '');
    refs.projectDialog.showModal();
  }

  async function handleProjectSave(event) {
    event.preventDefault();
    if (!sb || !state.user) return;

    const id = refs.projectId.value || null;
    const progress = Math.max(0, Math.min(100, Number(refs.projectProgress.value || 0)));
    const status = refs.projectStatus.value;
    const payload = {
      title: refs.projectTitle.value.trim(),
      description: refs.projectDescription.value.trim() || null,
      status,
      priority: refs.projectPriority.value,
      responsible: refs.projectResponsible.value.trim() || null,
      progress: status === 'Concluído' ? 100 : progress,
      start_date: refs.projectStartDate.value || null,
      due_date: refs.projectDueDate.value || null
    };

    if (!payload.title) {
      setMessage(refs.projectFormMessage, 'Informe o nome do projeto.');
      return;
    }

    setButtonLoading(refs.saveProjectButton, true);
    setMessage(refs.projectFormMessage, '');

    let response;
    if (id) {
      response = await sb.from('projects').update(payload).eq('id', id).select().single();
    } else {
      response = await sb.from('projects').insert({ ...payload, created_by: state.user.id }).select().single();
    }

    setButtonLoading(refs.saveProjectButton, false);

    if (response.error) {
      setMessage(refs.projectFormMessage, response.error.message);
      return;
    }

    refs.projectDialog.close();
    showToast(id ? 'Projeto atualizado.' : 'Projeto criado.');
    await loadProjects();
  }

  function openDeleteDialog(id) {
    const project = state.projects.find(p => p.id === id);
    if (!project) return;
    state.deleteProjectId = id;
    refs.deleteProjectText.textContent = `Você está prestes a excluir “${project.title}”. Essa ação não poderá ser desfeita.`;
    refs.deleteDialog.showModal();
  }

  async function confirmDelete() {
    if (!sb || !state.deleteProjectId) return;
    setButtonLoading(refs.confirmDeleteButton, true);

    const { error } = await sb.from('projects').delete().eq('id', state.deleteProjectId);

    setButtonLoading(refs.confirmDeleteButton, false);
    if (error) {
      showToast(`Erro ao excluir: ${error.message}`, 'error');
      return;
    }

    refs.deleteDialog.close();
    state.deleteProjectId = null;
    showToast('Projeto excluído.');
    await loadProjects();
  }

  async function requestPasswordReset(event) {
    event.preventDefault();
    if (!sb) return;
    const email = refs.resetEmail.value.trim();
    setMessage(refs.resetMessage, '');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: getRedirectUrl() });
    if (error) {
      setMessage(refs.resetMessage, error.message);
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
      setMessage(refs.newPasswordMessage, error.message);
      return;
    }

    refs.newPasswordDialog.close();
    refs.newPasswordForm.reset();
    showToast('Senha atualizada com sucesso.');
  }

  function translateAuthError(message = '') {
    const normalized = message.toLowerCase();
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

    $$('.nav-item').forEach(item => item.addEventListener('click', () => setView(item.dataset.view)));

    [refs.newProjectButton, refs.newProjectTopButton, refs.emptyNewProjectButton]
      .forEach(button => button.addEventListener('click', openNewProjectDialog));

    refs.refreshDashboardButton.addEventListener('click', loadProjects);
    refs.seeAllProjectsButton.addEventListener('click', () => setView('projects'));

    [refs.projectSearch, refs.statusFilter, refs.priorityFilter]
      .forEach(control => control.addEventListener('input', renderProjectsTable));

    refs.projectsTableBody.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const { action, id } = button.dataset;
      if (action === 'edit') openEditProjectDialog(id);
      if (action === 'delete') openDeleteDialog(id);
    });

    refs.projectForm.addEventListener('submit', handleProjectSave);
    refs.closeProjectDialog.addEventListener('click', () => refs.projectDialog.close());
    refs.cancelProjectButton.addEventListener('click', () => refs.projectDialog.close());
    refs.closeDeleteDialog.addEventListener('click', () => refs.deleteDialog.close());
    refs.cancelDeleteButton.addEventListener('click', () => refs.deleteDialog.close());
    refs.confirmDeleteButton.addEventListener('click', confirmDelete);
    $('#closeResetDialog').addEventListener('click', () => refs.resetDialog.close());

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
