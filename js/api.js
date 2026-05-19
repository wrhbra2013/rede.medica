const API = {
  baseURL: 'https://api.projetosdinamicos.com.br',
  project: 'rede.medica',

  async request(method, table, data = null, id = null) {
    let url = `${this.baseURL}/${this.project}/${table}`;
    if (id) url += `?id=${id}`;

    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (data && (method === 'POST' || method === 'PUT')) {
      opts.body = JSON.stringify(data);
    }

    const res = await fetch(url, opts);
    const text = await res.text();
    if (!res.ok) throw new Error(text || 'Erro na requisição');
    try { return JSON.parse(text); } catch { return text; }
  },

  get(table, id = null) { return this.request('GET', table, null, id); },
  create(table, data) { return this.request('POST', table, data); },
  update(table, id, data) { return this.request('PUT', table, data, id); },
  delete(table, id) { return this.request('DELETE', table, null, id); },

  async checkStatus() {
    try {
      const res = await fetch(`${this.baseURL}/health`);
      const data = await res.json();
      return data.projects && data.projects[this.project] === 'ok';
    } catch {
      return false;
    }
  },
};
