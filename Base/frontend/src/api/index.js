import client from './client';

export const authApi = {
  register: (name, email, password) =>
    client.post('/api/auth/register', { name, email, password }).then((r) => r.data),
  login: (email, password) =>
    client.post('/api/auth/login', { email, password }).then((r) => r.data),
  me: () => client.get('/api/auth/me').then((r) => r.data),
  logout: (refreshToken) => client.post('/api/auth/logout', { refresh_token: refreshToken }).then((r) => r.data),
};

export const projectApi = {
  list: () => client.get('/api/projects').then((r) => r.data.projects || []),
  create: (name, language) =>
    client.post('/api/projects', { name, language }).then((r) => r.data.project),
  get: (id) => client.get(`/api/projects/${id}`).then((r) => r.data.project),
  remove: (id) => client.delete(`/api/projects/${id}`).then((r) => r.data),
  status: (id) => client.get(`/api/projects/${id}/status`).then((r) => r.data),
  start: (id) => client.post(`/api/projects/${id}/start`).then((r) => r.data),
  stop: (id) => client.post(`/api/projects/${id}/stop`).then((r) => r.data),
};

export const fileApi = {
  tree: (projectId, path = '') =>
    client.get(`/api/projects/${projectId}/files`, { params: { path } }).then((r) => r.data.files || []),
  read: (projectId, path) =>
    client.get(`/api/projects/${projectId}/file`, { params: { path } }).then((r) => r.data.content),
  write: (projectId, path, content) =>
    client.put(`/api/projects/${projectId}/file`, { path, content }).then((r) => r.data),
  createFolder: (projectId, path) =>
    client.post(`/api/projects/${projectId}/folder`, { path }).then((r) => r.data),
};

