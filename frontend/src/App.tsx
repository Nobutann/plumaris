import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { ErrorMessage, secondaryButtonClass } from './components/ui'
import { AnimalsPage } from './pages/AnimalsPage'
import { BreedsPage } from './pages/BreedsPage'
import { DashboardPage } from './pages/DashboardPage'
import { AdvancedReportsPage } from './pages/AdvancedReportsPage'
import type { DashboardData } from './types'

type Page = 'dashboard' | 'animals' | 'breeds' | 'reports'

const navigation: { id: Page; label: string; number: string }[] = [
  { id: 'dashboard', label: 'Painel', number: '01' },
  { id: 'animals', label: 'Animais', number: '02' },
  { id: 'breeds', label: 'Raças', number: '03' },
  { id: 'reports', label: 'Consultas', number: '04' },
]

const pageCopy: Record<Page, { title: string; description: string }> = {
  dashboard: { title: 'Visão geral', description: 'Panorama dos animais e centros de adoção cadastrados.' },
  animals: { title: 'Animais', description: 'Consulte, cadastre e mantenha os registros do catálogo.' },
  breeds: { title: 'Raças', description: 'Gerencie as raças disponíveis para cães e gatos.' },
  reports: { title: 'Consultas', description: 'Explore consultas SQL avançadas e visões gerenciais da aplicação.' },
}

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const nextData = await api.loadDashboard()
    setData(nextData)
    setError('')
  }, [])

  useEffect(() => {
    let active = true
    api.loadDashboard()
      .then((nextData) => {
        if (active) setData(nextData)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function retry() {
    setLoading(true)
    try {
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados.')
    } finally {
      setLoading(false)
    }
  }

  function navigate(nextPage: Page) {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#0b1929] text-[#c8d8e3]">
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col border-x border-[#253e53] lg:flex-row">
        <aside className="border-b border-[#2b4961] bg-[#101f30] lg:w-56 lg:shrink-0 lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between gap-3 border-b border-[#2b4961] px-5 py-5 lg:block lg:py-7">
            <div>
              <span className="block font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[#77b8dd]">Base de dados</span>
              <span className="mt-1 block text-2xl font-semibold tracking-tight text-[#e5f1f8]">adoção<span className="text-[#78b8db]">.</span></span>
            </div>
            <span className="border border-[#3a5b72] px-2 py-1 font-mono text-[10px] text-[#9bb9cc]">v0.1.0-beta.1</span>
          </div>

          <nav aria-label="Navegação principal" className="flex gap-1 overflow-x-auto px-3 py-3 lg:block lg:space-y-1 lg:px-3 lg:py-5">
            {navigation.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                aria-current={page === item.id ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-3 border-l-2 px-3 py-2.5 text-left text-sm transition-colors lg:w-full ${page === item.id ? 'border-[#8bc8e9] bg-[#203e57] font-semibold text-[#e5f2fa]' : 'border-transparent text-[#a2b8c7] hover:bg-[#182e43] hover:text-white'}`}
              >
                <span className="font-mono text-[11px] text-[#7ca8c0]">{item.number}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden border-t border-[#2b4961] px-5 py-5 lg:block">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7090a4]">Conexão</p>
            <p className="mt-2 flex items-center gap-2 text-xs text-[#a9c3d3]">
              <span className={`size-1.5 rounded-full ${data && !error ? 'bg-[#7bc69a]' : 'bg-[#d09383]'}`} />
              {data && !error ? 'API conectada' : 'Aguardando API'}
            </p>
            <p className="mt-2 text-xs leading-5 text-[#718fa3]">React · Spring Boot · MySQL</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2b4961] bg-[#12263a] px-5 py-5 sm:px-7">
            <div>
              <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#75a9c7]">
                <span>Catálogo</span><span className="text-[#55738b]">/</span><span>{navigation.find((item) => item.id === page)?.label}</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#eaf4fa]">{pageCopy[page].title}</h1>
              <p className="mt-1 text-sm text-[#9cb5c6]">{pageCopy[page].description}</p>
            </div>
            <button type="button" onClick={() => void retry()} disabled={loading} className={secondaryButtonClass}>
              {loading ? 'Atualizando...' : '↻ Atualizar dados'}
            </button>
          </header>

          <div className="space-y-5 p-5 sm:p-7">
            {error && <ErrorMessage message={error} />}
            {loading && !data && <div className="border border-[#2b4961] bg-[#112438] p-10 text-center text-sm text-[#9bb5c6]">Carregando dados do banco...</div>}
            {!loading && !data && (
              <div className="border border-[#2b4961] bg-[#112438] p-8 text-center">
                <p className="text-sm text-[#b9d0df]">Inicie a API Spring Boot na porta 8080 e tente novamente.</p>
                <button type="button" onClick={() => void retry()} className="mt-4 text-sm font-semibold text-[#91c9e9] hover:underline">Tentar novamente</button>
              </div>
            )}
            {data && page === 'dashboard' && <DashboardPage data={data} onNavigate={navigate} />}
            {data && page === 'animals' && <AnimalsPage animals={data.animals} breeds={data.breeds} centers={data.centers} refresh={refresh} />}
            {data && page === 'breeds' && <BreedsPage breeds={data.breeds} refresh={refresh} />}
            {data && page === 'reports' && <AdvancedReportsPage data={data} />}
          </div>

          <footer className="mx-5 mt-8 border-t border-[#27445a] py-5 text-xs text-[#6f8da1] sm:mx-7">
            Adoção · Interface de consulta e gerenciamento
          </footer>
        </main>
      </div>
    </div>
  )
}

export default App
