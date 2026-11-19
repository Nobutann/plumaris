import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { ErrorMessage, RefreshIcon, secondaryButtonClass } from './components/ui'
import { AnimalsPage } from './pages/AnimalsPage'
import { BreedsPage } from './pages/BreedsPage'
import { CentersPage } from './pages/CentersPage'
import { PreferencesPage } from './pages/PreferencesPage'
import { DashboardPage } from './pages/DashboardPage'
import { AdvancedReportsPage } from './pages/AdvancedReportsPage'
import type { CatalogData, DashboardFilters } from './types'

type Page = 'dashboard' | 'animals' | 'breeds' | 'reports' | 'preferences' | 'centers'

const navigation: { id: Page; label: string; number: string }[] = [
  { id: 'dashboard', label: 'Painel', number: '01' },
  { id: 'animals', label: 'Animais', number: '02' },
  { id: 'breeds', label: 'Raças', number: '03' },
  { id: 'reports', label: 'Consultas', number: '04' },
  { id: 'preferences', label: 'Preferências', number: '05' },
  { id: 'centers', label: 'Centros', number: '06' },
]

const pageCopy: Record<Page, { title: string; description: string }> = {
  dashboard: { title: 'Dashboard estatístico', description: 'Animais, centros de adoção e interesses em adoção.' },
  animals: { title: 'Animais', description: 'Consulte, cadastre e mantenha os registros do catálogo.' },
  breeds: { title: 'Raças', description: 'Gerencie as raças disponíveis para cães e gatos.' },
  centers: { title: 'Centros de adoção', description: 'Gerencie os centros, seus endereços e e-mails de conta.' },
  preferences: { title: 'Preferências', description: 'Gerencie os critérios de adoção dos usuários.' },
  reports: { title: 'Consultas', description: 'Explore consultas SQL avançadas, visões, funções, procedimentos e auditoria.' },
}

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters | null>(null)
  const [dashboardRefresh, setDashboardRefresh] = useState(0)
  const [catalogRequested, setCatalogRequested] = useState(false)
  const [data, setData] = useState<CatalogData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const catalogRequest = useRef<AbortController | null>(null)
  const refreshReports = useRef<(() => Promise<void>) | null>(null)
  const refreshPreferences = useRef<(() => void) | null>(null)
  const [preferencesRefreshLocked, setPreferencesRefreshLocked] = useState(true)
  const [connected, setConnected] = useState<boolean | null>(null)

  const refresh = useCallback(() => {
    catalogRequest.current?.abort()
    const controller = new AbortController()
    catalogRequest.current = controller
    const { signal } = controller

    return Promise.allSettled([api.animals({}, signal), api.listBreeds(signal), api.listCenters(signal)])
      .then(([animals, breeds, centers]) => {
        if (signal.aborted) return
        setLoading(false)
        const loaded = animals.status === 'fulfilled' && breeds.status === 'fulfilled' && centers.status === 'fulfilled'
        setConnected(loaded)
        if (loaded) {
          setData({ animals: animals.value, breeds: breeds.value, centers: centers.value })
          setError('')
          return
        }

        setData((previous) => previous && ({
          animals: animals.status === 'fulfilled' ? animals.value : previous.animals,
          breeds: breeds.status === 'fulfilled' ? breeds.value : previous.breeds,
          centers: centers.status === 'fulfilled' ? centers.value : previous.centers,
        }))
        const failure = [animals, breeds, centers].find((result) => result.status === 'rejected')
        const cause: unknown = failure?.reason
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados.')
        throw cause
      })
  }, [])

  useEffect(() => {
    if (!catalogRequested) return

    void refresh().catch(() => {})
    return () => catalogRequest.current?.abort()
  }, [catalogRequested, refresh])

  function refreshDashboard() {
    setDashboardRefresh((version) => version + 1)
  }

  function retry() {
    setLoading(true)
    void refresh().catch(() => {})
  }

  function refreshCurrentPage() {
    if (page === 'reports' && refreshReports.current) {
      void refreshReports.current()
    } else {
      retry()
    }
  }

  function navigate(nextPage: Page) {
    if (nextPage !== 'dashboard' && nextPage !== 'preferences') setCatalogRequested(true)
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const showsCatalog = page !== 'dashboard' && page !== 'preferences'

  return (
    <div className="min-h-screen bg-ground text-ink lg:flex">
      <aside className="bg-sky text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[236px] lg:shrink-0 lg:flex-col">
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2 lg:block lg:border-b lg:border-white/15 lg:px-6 lg:pt-7 lg:pb-6">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <span className="block text-xl leading-tight font-bold">Plumaris</span>
              <span className="block text-xs text-sky-mist">Gestão de adoções</span>
            </div>
          </div>
          <span className="rounded-full border border-white/30 px-2 py-0.5 font-mono text-[11px] text-sky-mist lg:mt-4 lg:inline-block">v1.0.0</span>
        </div>

        <nav aria-label="Navegação principal" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:overflow-visible lg:py-4">
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              aria-current={page === item.id ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[15px] transition-colors focus-visible:outline-white lg:w-full ${page === item.id ? 'bg-paper font-semibold text-ink shadow-[0_1px_3px_rgb(14_42_71/0.18)]' : 'text-white hover:bg-white/12'}`}
            >
              <span className={`font-mono text-xs ${page === item.id ? 'text-sky' : 'text-sky-mist'}`}>{item.number}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden border-t border-white/15 px-6 py-5 text-xs lg:mt-auto lg:block">
          {connected !== null && <p role="status" className="mb-2 flex items-center gap-2 font-semibold">
            <span aria-hidden="true" className={`size-2 rounded-full ${connected ? 'bg-teal-line' : 'bg-sand'}`} />
            {connected ? 'API conectada' : 'Aguardando API'}
          </p>}
          <p className="text-sky-mist">React · Spring Boot · MySQL</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="relative border-b border-line bg-paper">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-end justify-between gap-4 px-5 pt-6 pb-5 sm:px-9 sm:pt-7">
            <div className="min-w-0">
              <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em] text-balance">{pageCopy[page].title}</h1>
              <p className="mt-1 text-sm text-muted">{pageCopy[page].description}</p>
            </div>
            {page === 'dashboard' && <button type="button" onClick={refreshDashboard} className={secondaryButtonClass}>
              <RefreshIcon /> Atualizar dados
            </button>}
            {page === 'preferences' && <button type="button" onClick={() => refreshPreferences.current?.()} disabled={preferencesRefreshLocked} className={secondaryButtonClass}>
              <RefreshIcon /> Atualizar dados
            </button>}
            {showsCatalog && <button type="button" onClick={refreshCurrentPage} disabled={loading} className={secondaryButtonClass}>
              <RefreshIcon className={`size-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} />
              {loading ? 'Atualizando...' : 'Atualizar dados'}
            </button>}
          </div>
          <span aria-hidden="true" className="absolute -bottom-px left-5 h-[3px] w-14 rounded-full bg-teal sm:left-9" />
        </header>

        <div className="mx-auto max-w-[1280px] space-y-5 px-5 py-6 sm:px-9">
          {page === 'preferences' && (
            <PreferencesPage refreshRef={refreshPreferences} onRefreshLockChange={setPreferencesRefreshLocked} onConnectionChange={setConnected} />
          )}
          {showsCatalog && error && (page !== 'reports' || !data) && <ErrorMessage message={error} />}
          {showsCatalog && loading && !data && <div role="status" className="rounded-[14px] border border-line bg-paper p-10 text-center text-sm text-muted">Carregando dados do banco...</div>}
          {showsCatalog && !loading && !data && (
            <div className="rounded-[14px] border border-line bg-paper p-8 text-center">
              <p className="text-sm text-ink">Inicie a API Spring Boot na porta 8080 e tente novamente.</p>
              <button type="button" onClick={retry} className={`${secondaryButtonClass} mt-4`}>Tentar novamente</button>
            </div>
          )}
          {page === 'dashboard' && (
            <DashboardPage
              appliedFilters={dashboardFilters}
              onApply={setDashboardFilters}
              refreshVersion={dashboardRefresh}
              onRefresh={refreshDashboard}
              onConnectionChange={setConnected}
            />
          )}
          {data && page === 'animals' && <AnimalsPage animals={data.animals} breeds={data.breeds} centers={data.centers} refresh={refresh} />}
          {data && page === 'breeds' && <BreedsPage breeds={data.breeds} refresh={refresh} />}
          {data && page === 'centers' && <CentersPage centers={data.centers} refresh={refresh} />}
          {data && (
            <AdvancedReportsPage
              data={data}
              visible={page === 'reports'}
              refreshCatalog={refresh}
              refreshRef={refreshReports}
              onOperationCompleted={refreshDashboard}
            />
          )}
        </div>

        <footer className="mx-auto max-w-[1280px] px-5 sm:px-9">
          <p className="mt-6 border-t border-line py-5 text-xs text-muted">Adoção · Interface de consulta e gerenciamento</p>
        </footer>
      </main>
    </div>
  )
}

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="size-9 shrink-0">
      <rect width="32" height="32" rx="9" fill="#ffffff" />
      <path d="M0 19h32v4a9 9 0 0 1-9 9H9a9 9 0 0 1-9-9z" fill="#dcc48e" />
      <path d="M0 17.5c4 0 4-1.5 8-1.5s4 1.5 8 1.5 4-1.5 8-1.5 4 1.5 8 1.5V20H0z" fill="#14a39a" />
      <circle cx="22" cy="9.5" r="3.5" fill="#2a7cc4" />
    </svg>
  )
}

export default App
