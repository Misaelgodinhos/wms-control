import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import './style.css'

type Profile = { id: string; full_name: string | null; role: string; workspace_id: string | null; active: boolean }
type PendingProfile = { id: string; full_name: string | null; created_at: string }
const modules = [
  ['products', 'Produtos'], ['warehouses', 'Armazéns'], ['locations', 'Endereços'],
  ['stock_balances', 'Estoque'], ['receipts', 'Recebimento'], ['picking_tasks', 'Picking'],
  ['replenishments', 'Abastecimento'], ['shipments', 'Expedição'],
  ['cycle_counts', 'Inventário'], ['stock_movements', 'Movimentações']
] as const
const roleNames: Record<string, string> = { admin: 'Administrador', supervisor: 'Supervisor', operator: 'Operador', checker: 'Conferente', viewer: 'Consulta' }
const formFields: Record<string, { key: string; label: string; required?: boolean; type?: string }[]> = {
  products: [{ key: 'sku', label: 'SKU', required: true }, { key: 'name', label: 'Nome do produto', required: true }, { key: 'category', label: 'Categoria' }, { key: 'barcode', label: 'Código de barras' }, { key: 'unit', label: 'Unidade', required: true }, { key: 'min_stock', label: 'Estoque mínimo', type: 'number' }],
  warehouses: [{ key: 'code', label: 'Código', required: true }, { key: 'name', label: 'Nome', required: true }, { key: 'address', label: 'Endereço' }],
  locations: [{ key: 'warehouse_id', label: 'ID do armazém', required: true }, { key: 'code', label: 'Código do endereço', required: true }, { key: 'zone', label: 'Zona' }, { key: 'location_type', label: 'Tipo', required: true }],
  receipts: [{ key: 'warehouse_id', label: 'ID do armazém', required: true }, { key: 'receipt_code', label: 'Código recebimento', required: true }, { key: 'supplier_name', label: 'Fornecedor', required: true }],
  picking_tasks: [{ key: 'warehouse_id', label: 'ID do armazém', required: true }, { key: 'task_code', label: 'Código tarefa', required: true }, { key: 'order_code', label: 'Pedido', required: true }],
  replenishments: [{ key: 'warehouse_id', label: 'ID do armazém', required: true }, { key: 'replenishment_code', label: 'Código reposição', required: true }, { key: 'product_id', label: 'ID do produto', required: true }, { key: 'from_location_id', label: 'ID endereço origem', required: true }, { key: 'to_location_id', label: 'ID endereço destino', required: true }, { key: 'quantity', label: 'Quantidade', type: 'number', required: true }],
  shipments: [{ key: 'warehouse_id', label: 'ID do armazém', required: true }, { key: 'shipment_code', label: 'Código expedição', required: true }, { key: 'order_code', label: 'Pedido', required: true }],
  cycle_counts: [{ key: 'warehouse_id', label: 'ID do armazém', required: true }, { key: 'count_code', label: 'Código inventário', required: true }, { key: 'area_code', label: 'Área', required: true }]
}
export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signup, setSignup] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [page, setPage] = useState('dashboard')
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([])
  const [approvingId, setApprovingId] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setProfile(null) })
    return () => subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!session) { setProfile(null); return }
    supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      .then(({ data, error: profileError }) => { if (profileError) setMessage(profileError.message); setProfile(data as Profile | null) })
  }, [session])
  useEffect(() => {
    if (profile?.role !== 'admin' || !profile.active || !profile.workspace_id) { setPendingProfiles([]); return }
    let cancelled = false
    async function loadPendingProfiles() {
      const { data, error: pendingError } = await supabase.from('profiles').select('id, full_name, created_at').is('workspace_id', null).eq('active', false).order('created_at', { ascending: true })
      if (!cancelled) {
        if (pendingError) setMessage(pendingError.message)
        setPendingProfiles((data || []) as PendingProfile[])
      }
    }
    void loadPendingProfiles()
    return () => { cancelled = true }
  }, [profile])

  async function approveProfile(id: string) {
    setApprovingId(id)
    const { error: approvalError } = await supabase.rpc('wms_approve_user', { target_user_id: id, target_role: 'operator' })
    setApprovingId('')
    if (approvalError) setMessage(approvalError.message)
    else {
      setMessage('Conta aprovada e vinculada ao workspace como operador.')
      setPendingProfiles(current => current.filter(item => item.id !== id))
    }
  }

  useEffect(() => {
    if (!profile?.active || !profile.workspace_id) return
    let cancelled = false
    async function load() {
      setBusy(true); setMessage('')
      if (page === 'dashboard') {
        const results = await Promise.all(modules.map(async ([table]) => {
          const { count, error: queryError } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('workspace_id', profile!.workspace_id)
          return [table, queryError ? 0 : count || 0] as const
        }))
        if (!cancelled) { setCounts(Object.fromEntries(results)); setRows([]) }
      } else {
        const { data, error: queryError } = await supabase.from(page).select('*').eq('workspace_id', profile!.workspace_id).order('created_at', { ascending: false }).limit(200)
        if (!cancelled) { if (queryError) setMessage(queryError.message); setRows((data || []) as Record<string, unknown>[]) }
      }
      if (!cancelled) setBusy(false)
    }
    void load()
    return () => { cancelled = true }
  }, [page, profile])
  async function authenticate(event: FormEvent) {
    event.preventDefault(); setError('')
    const result = signup
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: email.split('@')[0] } } })
      : await supabase.auth.signInWithPassword({ email, password })
    if (result.error) setError(result.error.message)
    else if (signup && !result.data.session) setError('Cadastro criado. O acesso ao WMS dependerá da aprovação de um administrador. Entre quando sua conta estiver disponível.')
  }
  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile?.workspace_id) return
    const formData = new FormData(event.currentTarget)
    const record: Record<string, unknown> = { workspace_id: profile.workspace_id }
    for (const [key, value] of formData.entries()) {
      const field = formFields[page]?.find(item => item.key === key)
      record[key] = field?.type === 'number' ? Number(value) : String(value).trim() || null
    }
    const { error: saveError } = await supabase.from(page).insert(record)
    if (saveError) setMessage(saveError.message)
    else { setMessage('Registro salvo no Supabase.'); setShowForm(false); setPage('dashboard'); setPage(page) }
  }
  if (loading) return <div className="center">Carregando WMS Control…</div>
  if (!session) return <div className="login-shell"><div className="login-card"><div className="brandmark">W</div><h1>WMS Control</h1><p>Gestão inteligente de armazém</p><form onSubmit={authenticate}><label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label><label>Senha<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={signup ? 'new-password' : 'current-password'} /></label>{error && <div className="alert">{error}</div>}<button className="primary full">{signup ? 'Criar conta' : 'Entrar'}</button></form><button className="text-button" onClick={() => { setSignup(!signup); setError('') }}>{signup ? 'Já possui conta? Entrar' : 'Primeiro acesso? Criar conta'}</button><small>O administrador precisa atribuir o perfil e o armazém.</small></div></div>
  if (profile && !profile.active) return <div className="center"><div className="setup-card"><div className="brandmark">W</div><h2>Cadastro aguardando aprovação</h2><p>Sua conta foi criada, mas ainda não tem acesso ao WMS. Um administrador precisa aprovar seu cadastro.</p><button className="secondary" onClick={() => void supabase.auth.signOut()}>Sair</button></div></div>
  if (!profile || !profile.workspace_id) return <div className="center"><div className="setup-card"><div className="brandmark">W</div><h2>Conta aguardando configuração</h2><p>Seu login foi reconhecido. O administrador precisa atribuir um workspace e perfil.</p><button className="secondary" onClick={() => void supabase.auth.signOut()}>Sair</button></div></div>
  if (!profile.active) return <div className="center"><div className="setup-card"><h2>Acesso desativado</h2><p>Fale com o administrador do WMS.</p><button className="secondary" onClick={() => void supabase.auth.signOut()}>Sair</button></div></div>
  const visibleRows = rows.filter(row => Object.values(row).some(value => String(value ?? '').toLowerCase().includes(search.toLowerCase())))
  const title = page === 'dashboard' ? 'Dashboard' : modules.find(([key]) => key === page)?.[1] || page
  return <div className="app"><aside className="sidebar"><div className="brand"><div className="brandmark">W</div><div><b>WMS Control</b><small>Warehouse operations</small></div></div><div className="nav-label">Operação</div><button className={page === 'dashboard' ? 'nav active' : 'nav'} onClick={() => setPage('dashboard')}>▦ Dashboard</button>{modules.map(([key, label]) => <button key={key} className={page === key ? 'nav active' : 'nav'} onClick={() => setPage(key)}>{label}</button>)}<div className="sidebar-foot">Conectado ao Supabase<br />v1.0 · {roleNames[profile.role] || profile.role}</div></aside><main className="main"><header className="topbar"><b>{title}</b><div className="userbox"><span>{profile.full_name || session.user.email}</span><button className="secondary small" onClick={() => void supabase.auth.signOut()}>Sair</button></div></header><section className="content"><div className="pagehead"><div><h1>{title}</h1><p>Operação conectada ao banco de dados do Supabase.</p></div>{formFields[page] && profile.role !== 'viewer' && <button className="primary" onClick={() => setShowForm(true)}>＋ Novo registro</button>}</div>{message && <div className="notice">{message}<button onClick={() => setMessage('')}>×</button></div>}{profile.role === 'admin' && <section className="panel" style={{ marginBottom: 20, padding: 18 }}><div className="toolbar" style={{ justifyContent: 'space-between' }}><div><h2 style={{ margin: 0 }}>Aprovação de cadastros</h2><p className="muted">Novas contas só acessam a operação depois da aprovação.</p></div><span className="muted">{pendingProfiles.length} pendente(s)</span></div>{pendingProfiles.length === 0 ? <div className="empty">Nenhum cadastro aguardando aprovação.</div> : <div className="table-wrap"><table><thead><tr><th>Nome</th><th>Solicitado em</th><th>Ação</th></tr></thead><tbody>{pendingProfiles.map(item => <tr key={item.id}><td>{item.full_name || 'Sem nome informado'}</td><td>{new Date(item.created_at).toLocaleString('pt-BR')}</td><td><button className="primary small" disabled={approvingId === item.id} onClick={() => void approveProfile(item.id)}>{approvingId === item.id ? 'Aprovando…' : 'Aprovar como operador'}</button></td></tr>)}</tbody></table></div>}</section>}{page === 'dashboard' ? <div className="stats">{modules.map(([key, label]) => <button className="stat" key={key} onClick={() => setPage(key)}><small>{label}</small><strong>{counts[key] ?? '—'}</strong><em>Ver registros →</em></button>)}</div> : <div className="panel"><div className="toolbar"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nos registros…" /><button className="secondary" onClick={() => setPage(page)}>↻ Atualizar</button><span className="muted">{visibleRows.length} registros</span></div>{busy ? <div className="empty">Carregando…</div> : visibleRows.length === 0 ? <div className="empty">Nenhum registro encontrado.</div> : <div className="table-wrap"><table><thead><tr>{Object.keys(visibleRows[0]).filter(key => key !== 'workspace_id').slice(0, 9).map(key => <th key={key}>{key.replaceAll('_', ' ')}</th>)}</tr></thead><tbody>{visibleRows.map((row, index) => <tr key={String(row.id || index)}>{Object.keys(row).filter(key => key !== 'workspace_id').slice(0, 9).map(key => <td key={key}>{String(row[key] ?? '—')}</td>)}</tr>)}</tbody></table></div>}</div>}<footer>WMS Control · Azul, branco e preto · Dados persistidos no Supabase</footer></section></main>{showForm && formFields[page] && <div className="modal-backdrop" onClick={() => setShowForm(false)}><div className="modal" onClick={event => event.stopPropagation()}><div className="modal-head"><h2>Novo registro · {title}</h2><button className="secondary small" onClick={() => setShowForm(false)}>✕</button></div><form onSubmit={saveRecord}><div className="form-grid">{formFields[page].map(field => <label key={field.key}>{field.label}<input name={field.key} type={field.type || 'text'} min={field.type === 'number' ? 0 : undefined} required={!!field.required} /></label>)}</div><div className="modal-actions"><button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="primary">Salvar no banco</button></div></form></div></div>}</div>
}
