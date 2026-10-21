import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { isSupabaseConfigured } from './lib/supabase'
import './style.css'

const root = createRoot(document.getElementById('root')!)

if (!isSupabaseConfigured) {
  root.render(
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 22, background: 'linear-gradient(135deg,#eef5ff,#f8fafc)' }}>
      <section style={{ width: 'min(600px,100%)', padding: 30, background: '#fff', border: '1px solid #dbe4f0', borderRadius: 18, boxShadow: '0 20px 60px #0f172a12' }}>
        <div className="brandmark" style={{ marginBottom: 22 }}>W</div>
        <p style={{ color: '#1565d8', fontSize: 11, fontWeight: 800, letterSpacing: 1.5 }}>WMS CONTROL · CONFIGURAÇÃO</p>
        <h1 style={{ margin: '8px 0', fontSize: 'clamp(24px,5vw,34px)', letterSpacing: '-.8px' }}>Conecte seu banco de dados</h1>
        <p style={{ color: '#64748b', lineHeight: 1.65 }}>O aplicativo foi carregado, mas as variáveis do Supabase não estão configuradas neste ambiente. Adicione as duas variáveis abaixo nas configurações do deploy e publique novamente.</p>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 16, background: '#111827', color: '#dbeafe', borderRadius: 10, fontSize: 12 }}><code>{'VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL'}</code></pre>
        <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.65 }}>Use somente a chave publicável do Supabase no navegador. Nunca coloque a chave service_role no frontend.</p>
        <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, color: '#1565d8', fontWeight: 700, textDecoration: 'none' }}>Abrir painel do Supabase ↗</a>
      </section>
    </div>
  )
} else {
  root.render(<StrictMode><App /></StrictMode>)
}
