// Backend - Lista de Tarefas (Node.js + Express + Supabase)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const clean = (v) => (v || '').trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
const SUPABASE_URL = clean(process.env.SUPABASE_URL);
const SUPABASE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente.');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const app = express();
app.use(express.json({ limit: '20kb' }));

// CORS: FRONTEND_ORIGIN = URL do frontend na Vercel (vários separados por vírgula). Vazio = libera tudo.
const origins = (process.env.FRONTEND_ORIGIN || '').split(',').map((o) => clean(o)).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));

const fail = (res, error, status = 500) => {
  console.error('[erro]', error.message || error);
  res.status(status).json({ error: 'Erro ao processar a solicitação' });
};

app.get('/', (req, res) => res.json({ api: 'ok', rotas: '/api/tarefas' }));

// GET - listar
app.get('/api/tarefas', async (req, res) => {
  const { data, error } = await supabase.from('tarefas').select('*').order('created_at', { ascending: false });
  if (error) return fail(res, error);
  res.json(data);
});

// POST - criar
app.post('/api/tarefas', async (req, res) => {
  const titulo = String(req.body.titulo || '').trim();
  const descricao = String(req.body.descricao || '').trim();
  if (!titulo) return res.status(400).json({ error: 'Informe o título da tarefa' });
  const { data, error } = await supabase.from('tarefas').insert({ titulo, descricao }).select().single();
  if (error) return fail(res, error);
  res.status(201).json(data);
});

// PUT - editar / concluir
app.put('/api/tarefas/:id', async (req, res) => {
  const campos = {};
  if (req.body.titulo !== undefined) {
    campos.titulo = String(req.body.titulo).trim();
    if (!campos.titulo) return res.status(400).json({ error: 'Título não pode ficar vazio' });
  }
  if (req.body.descricao !== undefined) campos.descricao = String(req.body.descricao).trim();
  if (req.body.concluida !== undefined) campos.concluida = Boolean(req.body.concluida);
  const { data, error } = await supabase.from('tarefas').update(campos).eq('id', req.params.id).select().maybeSingle();
  if (error) return fail(res, error);
  if (!data) return res.status(404).json({ error: 'Tarefa não encontrada' });
  res.json(data);
});

// DELETE - excluir
app.delete('/api/tarefas/:id', async (req, res) => {
  const { data, error } = await supabase.from('tarefas').delete().eq('id', req.params.id).select('id').maybeSingle();
  if (error) return fail(res, error);
  if (!data) return res.status(404).json({ error: 'Tarefa não encontrada' });
  res.status(204).end();
});

module.exports = app; // a Vercel detecta o Express exportado
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`API em http://localhost:${PORT}`));
}
