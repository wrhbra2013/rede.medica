const pages = ['dashboard', 'agendamentos', 'medicos', 'pacientes', 'servicos'];
let currentPage = 'dashboard';
let editId = null;
let currentEntity = '';

const ENTITIES = {
  agendamentos: { label: 'Agendamento', labelPlural: 'Agendamentos' },
  medicos: { label: 'Médico', labelPlural: 'Médicos' },
  pacientes: { label: 'Paciente', labelPlural: 'Pacientes' },
  servicos: { label: 'Serviço', labelPlural: 'Serviços' },
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const page = el.dataset.page;
      navegar(page);
      fecharSidebarMobile();
    });
  });
  API.checkStatus().then(online => {
    const dot = document.querySelector('.status-dot');
    const text = document.querySelector('.status-text');
    if (online) {
      dot.className = 'status-dot online';
      text.textContent = 'API Online';
    } else {
      dot.className = 'status-dot offline';
      text.textContent = 'API Offline';
    }
  });
  navegar('dashboard');
});

function navegar(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  document.getElementById('pageTitle').textContent = page === 'dashboard' ? 'Dashboard' : ENTITIES[page]?.labelPlural || page;
  const btnNovo = document.getElementById('btnNovo');
  btnNovo.style.display = page === 'dashboard' ? 'none' : 'inline-flex';
  btnNovo.onclick = () => abrirModal(page);
  carregarPagina(page);
}

async function carregarPagina(page) {
  const container = document.getElementById('pageContent');
  container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8">Carregando...</div>';

  if (page === 'dashboard') return carregarDashboard(container);
  return carregarTabela(page, container);
}

async function carregarDashboard(container) {
  try {
    const [agendamentos, medicos, pacientes, servicos] = await Promise.all([
      API.get('agendamentos'),
      API.get('medicos'),
      API.get('pacientes'),
      API.get('servicos'),
    ]);

    const data = agendamentos || [];
    const pendentes = data.filter(a => a.status === 'PENDENTE' || !a.status).length;
    const hoje = new Date().toISOString().split('T')[0];
    const hojeCount = data.filter(a => a.data && a.data.startsWith(hoje)).length;

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><span class="stat-label">Total Agendamentos</span><span class="stat-value">${data.length}</span></div>
        <div class="stat-card"><span class="stat-label">Pendentes</span><span class="stat-value">${pendentes}</span></div>
        <div class="stat-card"><span class="stat-label">Hoje</span><span class="stat-value">${hojeCount}</span></div>
        <div class="stat-card"><span class="stat-label">Médicos</span><span class="stat-value">${(medicos || []).length}</span></div>
        <div class="stat-card"><span class="stat-label">Pacientes</span><span class="stat-value">${(pacientes || []).length}</span></div>
        <div class="stat-card"><span class="stat-label">Serviços</span><span class="stat-value">${(servicos || []).length}</span></div>
      </div>
      ${gerarTabelaAgendamentos(data.slice(0, 10))}
    `;
  } catch (err) {
    container.innerHTML = `<div class="card"><div class="card-body"><p style="color:var(--danger)">Erro ao carregar: ${err.message}</p></div></div>`;
  }
}

async function carregarTabela(entity, container) {
  currentEntity = entity;
  try {
    const data = await API.get(entity) || [];
    container.innerHTML = `
      <div class="search-bar"><input type="text" placeholder="Buscar..." id="searchInput" oninput="filtrarTabela()"></div>
      <div class="card"><div class="card-body" id="tableContainer">${gerarTabela(entity, data)}</div></div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card"><div class="card-body"><p style="color:var(--danger)">Erro ao carregar: ${err.message}</p></div></div>`;
  }
}

function gerarTabela(entity, data) {
  if (!data || data.length === 0) {
    return `<div class="empty-state"><div class="empty-icon">📭</div><p>Nenhum registro encontrado</p></div>`;
  }
  const cols = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
  const headers = cols.map(c => `<th>${rotuloColuna(c)}</th>`).join('');
  const rows = data.map(row => {
    const cells = cols.map(c => `<td>${formatarCelula(c, row[c], row)}</td>`).join('');
    return `<tr><td class="actions-cell">
      <button class="btn btn-sm btn-secondary" onclick="editarRegistro('${entity}','${row.id}')">✏️</button>
      <button class="btn btn-sm btn-danger" onclick="excluirRegistro('${entity}','${row.id}')">🗑️</button>
    </td>${cells}</tr>`;
  }).join('');
  return `<div style="overflow-x:auto"><table><thead><tr><th style="width:80px">Ações</th>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function gerarTabelaAgendamentos(data) {
  if (!data || data.length === 0) {
    return `<div class="card"><div class="card-body"><p style="text-align:center;color:var(--gray-400)">Nenhum agendamento</p></div></div>`;
  }
  const headers = ['Paciente', 'Telefone', 'Data', 'Hora', 'Status'];
  const rows = data.map(a => {
    const statusClass = `badge-${(a.status || 'pendente').toLowerCase()}`;
    return `<tr>
      <td>${a.cliente || '-'}</td>
      <td>${a.telefone || '-'}</td>
      <td>${formatarData(a.data)}</td>
      <td>${a.hora || '-'}</td>
      <td><span class="badge ${statusClass}">${a.status || 'PENDENTE'}</span></td>
    </tr>`;
  }).join('');
  return `<div class="card"><div class="card-header">Últimos Agendamentos</div><div class="card-body" style="padding:0"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function rotuloColuna(key) {
  const map = {
    cliente: 'Paciente', telefone: 'Telefone', data: 'Data', hora: 'Hora',
    status: 'Status', observacoes: 'Observações', servico_nome: 'Serviço',
    servico: 'Serviço', valor: 'Valor', pago: 'Pago', nome: 'Nome',
    email: 'Email', especialidade: 'Especialidade', medico_id: 'Médico',
    paciente_id: 'Paciente', data_nascimento: 'Nascimento', preco: 'Preço',
    descricao: 'Descrição', duracao_minutos: 'Duração (min)', ativo: 'Ativo',
    categoria: 'Categoria', servico_id: 'Serviço',
  };
  return map[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}

function formatarCelula(col, val, row) {
  if (val === null || val === undefined) return '-';
  if (col === 'data' || col === 'data_nascimento') return formatarData(val);
  if (col === 'pago' || col === 'ativo') return val ? '✅ Sim' : '❌ Não';
  if (col === 'status') {
    const cls = `badge-${val.toLowerCase()}`;
    return `<span class="badge ${cls}">${val}</span>`;
  }
  if (col === 'valor' || col === 'preco') {
    const n = parseFloat(val);
    return isNaN(n) ? val : `R$ ${n.toFixed(2)}`;
  }
  if (col === 'medico_id' || col === 'paciente_id' || col === 'servico_id' || col === 'servico') {
    return val?.substring(0, 8) + '...' || '-';
  }
  return val;
}

function formatarData(str) {
  if (!str) return '-';
  const d = new Date(str);
  return isNaN(d.getTime()) ? str : d.toLocaleDateString('pt-BR');
}

function filtrarTabela() {
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  document.querySelectorAll('#tableContainer tbody tr').forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

async function abrirModal(entity) {
  const entityName = entity || currentPage;
  if (entityName === 'dashboard') return;
  editId = null;
  document.getElementById('modalTitle').textContent = `Novo ${ENTITIES[entityName]?.label || 'Registro'}`;
  document.getElementById('modalBody').innerHTML = await gerarFormulario(entityName);
  document.getElementById('modalOverlay').classList.add('open');
}

async function editarRegistro(entity, id) {
  editId = id;
  try {
    const data = await API.get(entity, id);
    const row = Array.isArray(data) ? data[0] : data;
    document.getElementById('modalTitle').textContent = `Editar ${ENTITIES[entity]?.label || 'Registro'}`;
    document.getElementById('modalBody').innerHTML = await gerarFormulario(entity, row);
    document.getElementById('modalOverlay').classList.add('open');
  } catch (err) {
    mostrarToast('Erro ao carregar registro: ' + err.message, 'error');
  }
}

function fecharModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  editId = null;
}

async function gerarFormulario(entity, data = {}) {
  const fields = getFormFields(entity);
  const selects = await getSelectData(entity);
  const html = fields.map(f => {
    const val = data[f.key] || '';
    if (f.type === 'select') {
      const options = (selects[f.selectKey] || []).map(s =>
        `<option value="${s.id}" ${val === s.id ? 'selected' : ''}>${s.nome || s.label || s.id}</option>`
      ).join('');
      return `
        <div class="form-group">
          <label>${f.label}</label>
          <select name="${f.key}" ${f.required ? 'required' : ''}>
            <option value="">Selecione...</option>
            ${options}
          </select>
        </div>`;
    }
    if (f.type === 'textarea') {
      return `
        <div class="form-group">
          <label>${f.label}</label>
          <textarea name="${f.key}" ${f.required ? 'required' : ''}>${val}</textarea>
        </div>`;
    }
    return `
      <div class="form-group">
        <label>${f.label}</label>
        <input type="${f.type}" name="${f.key}" value="${val}" ${f.required ? 'required' : ''}>
      </div>`;
  }).join('');
  return `<form id="formRegistro" onsubmit="return false">${html}</form>`;
}

function getFormFields(entity) {
  const base = [
    { key: 'nome', label: 'Nome', type: 'text', required: true },
    { key: 'telefone', label: 'Telefone', type: 'text', required: false },
    { key: 'email', label: 'Email', type: 'email', required: false },
  ];
  const fields = {
    agendamentos: [
      { key: 'cliente', label: 'Nome do Paciente', type: 'text', required: true },
      { key: 'telefone', label: 'Telefone', type: 'text', required: true },
      { key: 'data', label: 'Data', type: 'date', required: true },
      { key: 'hora', label: 'Hora', type: 'time', required: true },
      { key: 'servico', label: 'Serviço', type: 'select', selectKey: 'servicos', required: false },
      {
        key: 'status', label: 'Status', type: 'select', selectKey: 'status', required: false,
      },
      { key: 'observacoes', label: 'Observações', type: 'textarea', required: false },
    ],
    medicos: [
      { key: 'nome', label: 'Nome', type: 'text', required: true },
      { key: 'especialidade', label: 'Especialidade', type: 'text', required: true },
      { key: 'telefone', label: 'Telefone', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
    ],
    pacientes: [
      { key: 'nome', label: 'Nome', type: 'text', required: true },
      { key: 'telefone', label: 'Telefone', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'data_nascimento', label: 'Data de Nascimento', type: 'date' },
    ],
    servicos: [
      { key: 'nome', label: 'Nome', type: 'text', required: true },
      { key: 'descricao', label: 'Descrição', type: 'textarea' },
      { key: 'preco', label: 'Preço', type: 'number', step: '0.01' },
      { key: 'duracao_minutos', label: 'Duração (min)', type: 'number' },
      { key: 'categoria', label: 'Categoria', type: 'text' },
    ],
  };
  return fields[entity] || base;
}

async function getSelectData(entity) {
  const map = {};
  if (entity === 'agendamentos') {
    try {
      const servicos = await API.get('servicos') || [];
      const servicosOpts = servicos.map(s => ({ id: s.id, nome: s.nome }));
      map.servicos = servicosOpts;
    } catch {}
    map.status = [
      { id: 'PENDENTE', nome: 'Pendente' },
      { id: 'CONFIRMADO', nome: 'Confirmado' },
      { id: 'REALIZADO', nome: 'Realizado' },
      { id: 'CANCELADO', nome: 'Cancelado' },
    ];
  }
  return map;
}

async function salvarRegistro() {
  const entity = editId ? currentEntity : (currentEntity || currentPage);
  if (entity === 'dashboard') return;
  const form = document.getElementById('formRegistro');
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());

  try {
    if (editId) {
      await API.update(entity, editId, data);
      mostrarToast('Registro atualizado com sucesso!', 'success');
    } else {
      await API.create(entity, data);
      mostrarToast('Registro criado com sucesso!', 'success');
    }
    fecharModal();
    carregarPagina(entity);
  } catch (err) {
    mostrarToast('Erro ao salvar: ' + err.message, 'error');
  }
}

async function excluirRegistro(entity, id) {
  if (!confirm('Tem certeza que deseja excluir este registro?')) return;
  try {
    await API.delete(entity, id);
    mostrarToast('Registro excluído com sucesso!', 'success');
    carregarPagina(entity);
  } catch (err) {
    mostrarToast('Erro ao excluir: ' + err.message, 'error');
  }
}

function mostrarToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.querySelector('.sidebar-backdrop').classList.toggle('open');
}

function fecharSidebarMobile() {
  if (window.innerWidth < 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.querySelector('.sidebar-backdrop').classList.remove('open');
  }
}
