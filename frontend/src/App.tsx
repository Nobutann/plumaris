import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import {
  BuildingIcon, DashboardIcon, ErrorMessage, HeartIcon, MoonIcon, PawIcon, SearchIcon, SunIcon, TagIcon,
  secondaryButtonClass,
} from './components/ui'
import { Logo } from './components/Brand'
import { RefreshButton } from './components/RefreshButton'
import { AnimalsPage } from './pages/AnimalsPage'
import { BreedsPage } from './pages/BreedsPage'
import { CentersPage } from './pages/CentersPage'
import { PreferencesPage } from './pages/PreferencesPage'
import { DashboardPage } from './pages/DashboardPage'
import { AdvancedReportsPage } from './pages/AdvancedReportsPage'
import { useTheme } from './theme'
import type { Theme } from './theme'
import type { CatalogData, DashboardFilters } from './types'

type Page = 'dashboard' | 'animals' | 'breeds' | 'reports' | 'preferences' | 'centers'

const navigation: { id: Page; label: string; Icon: typeof PawIcon }[] = [
  { id: 'dashboard', label: 'Painel', Icon: DashboardIcon },
  { id: 'animals', label: 'Animais', Icon: PawIcon },
  { id: 'breeds', label: 'Raças', Icon: TagIcon },
  { id: 'centers', label: 'Centros', Icon: BuildingIcon },
  { id: 'preferences', label: 'Preferências', Icon: HeartIcon },
  { id: 'reports', label: 'Relatórios', Icon: SearchIcon },
]

const pageCopy: Record<Page, { title: string; description: string }> = {
  dashboard: { title: 'Visão geral', description: 'Um retrato da rede de adoção: animais, centros e pessoas interessadas.' },
  animals: { title: 'Animais', description: 'Cadastre os animais acolhidos e acompanhe quem está pronto para um novo lar.' },
  breeds: { title: 'Raças', description: 'Lista de raças de cães e gatos usada nos cadastros e nas preferências.' },
  centers: { title: 'Centros de adoção', description: 'As unidades da rede, com endereço e e-mail de contato.' },
  preferences: { title: 'Preferências', description: 'O que cada pessoa procura em um novo companheiro.' },
  reports: { title: 'Relatórios', description: 'Acompanhe a rede, encontre o animal certo para cada pessoa e registre adoções.' },
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
  const [theme, setTheme] = useTheme()

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
    if (page === 'reports' && refreshReports.current) return refreshReports.current()
    setLoading(true)
    return refresh()
  }

  function navigate(nextPage: Page) {
    if (nextPage !== 'dashboard' && nextPage !== 'preferences') setCatalogRequested(true)
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const showsCatalog = page !== 'dashboard' && page !== 'preferences'

  return (
    <div className="min-h-screen bg-ground text-ink lg:flex">
      <aside className="border-b border-rail-line bg-rail text-rail-ink lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[15.75rem] lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 lg:px-5 lg:pt-6 lg:pb-6">
          <Logo />
          <div className="lg:hidden"><ThemeToggle theme={theme} onChange={setTheme} /></div>
        </div>

        <nav aria-label="Navegação principal" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-0.5 lg:overflow-visible lg:pb-0">
          {navigation.map(({ id, label, Icon }) => {
            const active = page === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => navigate(id)}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex shrink-0 items-center gap-3 rounded-[0.625rem] px-3 py-2 text-left text-[0.9062rem] transition-colors lg:w-full ${active ? 'bg-rail-active font-semibold text-rail-active-ink' : 'text-rail-ink/80 hover:bg-rail-hover hover:text-rail-ink'}`}
              >
                {active && <span aria-hidden="true" className="absolute top-1/2 -left-3 hidden h-5 w-[0.1875rem] -translate-y-1/2 rounded-r-full bg-rail-accent lg:block" />}
                <Icon className={`size-[1.125rem] shrink-0 ${active ? 'text-rail-active-ink' : 'text-rail-muted group-hover:text-rail-ink'}`} />
                {label}
              </button>
            )
          })}
        </nav>

        <div className="hidden space-y-3 border-t border-rail-line px-5 py-4 lg:mt-auto lg:block">
          {connected !== null && (
            <p role="status" className="flex items-center gap-2 text-xs font-semibold text-rail-muted">
              <span aria-hidden="true" className="relative flex size-2">
                {connected && <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal opacity-50 motion-reduce:animate-none" />}
                <span className={`relative inline-flex size-2 rounded-full ${connected ? 'bg-teal' : 'bg-sand'}`} />
              </span>
              {connected ? 'Sistema online' : 'Conectando…'}
            </p>
          )}
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-[80rem] flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-9">
            <div className="min-w-0">
              <h1 className="text-[1.5rem] leading-tight font-bold tracking-[-0.02em] text-balance">{pageCopy[page].title}</h1>
              <p className="mt-1 text-sm text-muted">{pageCopy[page].description}</p>
            </div>
            {page === 'dashboard' && <RefreshButton key="dashboard" onRefresh={refreshDashboard} />}
            {page === 'preferences' && <RefreshButton key="preferences" onRefresh={() => refreshPreferences.current?.()} disabled={preferencesRefreshLocked} />}
            {showsCatalog && <RefreshButton key="catalog" onRefresh={refreshCurrentPage} busy={loading} />}
          </div>
        </header>

        <div className="mx-auto max-w-[80rem] space-y-5 px-5 py-7 sm:px-9">
          {page === 'preferences' && (
            <PreferencesPage refreshRef={refreshPreferences} onRefreshLockChange={setPreferencesRefreshLocked} onConnectionChange={setConnected} />
          )}
          {showsCatalog && error && (page !== 'reports' || !data) && <ErrorMessage message={error} />}
          {showsCatalog && loading && !data && <div role="status" className="rounded-2xl border border-line bg-paper p-10 text-center text-sm text-muted shadow-card">Carregando informações…</div>}
          {showsCatalog && !loading && !data && (
            <div className="rounded-2xl border border-line bg-paper p-8 text-center shadow-card">
              <p className="text-sm text-ink">Não foi possível carregar as informações agora. Verifique a conexão e tente novamente.</p>
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

        <footer className="mx-auto max-w-[80rem] px-5 sm:px-9">
          <p className="mt-8 flex items-center justify-between gap-3 border-t border-line py-6 text-[0.8125rem] text-muted">
            <span>Plumaris 1.0.0, gestão de adoções de cães e gatos</span>
          </p>
        </footer>
      </main>
    </div>
  )
}

const themeOptions: { value: Theme; label: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Claro', Icon: SunIcon },
  { value: 'dark', label: 'Escuro', Icon: MoonIcon },
]

function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  return (
    <fieldset className="flex shrink-0 rounded-[0.625rem] bg-rail-hover p-0.5 lg:w-full">
      <legend className="sr-only">Tema da interface</legend>
      {themeOptions.map(({ value, label, Icon }) => (
        <label key={value} className={`flex min-h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-rail-accent ${theme === value ? 'bg-rail-active text-rail-active-ink shadow-rest' : 'text-rail-muted hover:text-rail-ink'}`}>
          <input type="radio" name="tema" value={value} checked={theme === value} onChange={() => onChange(value)} className="sr-only" />
          <Icon className="size-3.5" />
          {label}
        </label>
      ))}
    </fieldset>
  )
}

export default App
