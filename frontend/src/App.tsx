import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { ErrorMessage, MoonIcon, RefreshIcon, SunIcon, secondaryButtonClass } from './components/ui'
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
      <aside className="bg-rail text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[236px] lg:shrink-0 lg:flex-col">
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2 lg:block lg:border-b lg:border-white/15 lg:px-6 lg:pt-7 lg:pb-5">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <span className="block text-xl leading-tight font-bold">Plumaris</span>
              <span className="block text-xs text-rail-muted">Gestão de adoções</span>
            </div>
          </div>
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>

        <nav aria-label="Navegação principal" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:overflow-visible lg:py-4">
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              aria-current={page === item.id ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[15px] transition-colors focus-visible:outline-white lg:w-full ${page === item.id ? 'bg-rail-active font-semibold text-rail-active-ink shadow-raised ring-1 ring-rail-active-edge ring-inset' : 'text-white hover:bg-white/12'}`}
            >
              <span className={`font-mono text-xs ${page === item.id ? 'text-rail-active-number' : 'text-rail-muted'}`}>{item.number}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <img src="/photos/cao-no-mar.webp" alt="" width={480} height={600} decoding="async"
          className="mt-auto hidden h-[clamp(9rem,calc(100vh-35rem),19rem)] w-full object-cover object-[50%_35%] lg:[@media(min-height:720px)]:block" />
        <div className="hidden border-t border-white/15 px-6 py-5 text-xs lg:mt-auto lg:block lg:[@media(min-height:720px)]:mt-0">
          {connected !== null && <p role="status" className="flex items-center gap-2 font-semibold">
            <span aria-hidden="true" className={`size-2 rounded-full ${connected ? 'bg-teal-line' : 'bg-sand'}`} />
            {connected ? 'API conectada' : 'Aguardando API'}
          </p>}
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
          <div className="mt-8 flex flex-col gap-4 border-t border-line py-6 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex shrink-0 gap-2">
              <img src="/photos/cao-no-mar.webp" alt="" width={480} height={600} loading="lazy" decoding="async"
                className="aspect-[4/3] w-32 rounded-[10px] object-cover object-[50%_35%] lg:[@media(min-height:720px)]:hidden" />
              <img src="/photos/gato-na-praia.webp" alt="" width={480} height={360} loading="lazy" decoding="async"
                className="aspect-[4/3] w-32 rounded-[10px] object-cover" />
            </div>
            <div className="max-w-[68ch] space-y-1 text-xs leading-5 text-muted">
              <p className="text-[13px] font-semibold text-ink">Plumaris 1.0.0, gestão de adoções de cães e gatos</p>
              <p>As fotografias são ilustrativas e não retratam animais cadastrados.</p>
              <p>
                Cão no mar: <a className={creditLinkClass} href="https://commons.wikimedia.org/wiki/File:Jack_Russell_Terrier_Eddi_in_the_Sea.JPG">Steve-65</a>,{' '}
                <a className={creditLinkClass} href="https://creativecommons.org/licenses/by-sa/3.0/deed.pt-br">CC BY-SA 3.0</a>, recortada.
                Gato na praia: <a className={creditLinkClass} href="https://commons.wikimedia.org/wiki/File:Beach_Cat_(4159138695).jpg">Jennifer C.</a>,{' '}
                <a className={creditLinkClass} href="https://creativecommons.org/licenses/by/2.0/deed.pt-br">CC BY 2.0</a>, recortada.
                Ambas via Wikimedia Commons.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

const creditLinkClass = 'underline decoration-line-strong underline-offset-2 hover:text-link-strong hover:decoration-current'

const themeOptions: { value: Theme; label: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Claro', Icon: SunIcon },
  { value: 'dark', label: 'Escuro', Icon: MoonIcon },
]

function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  return (
    <fieldset className="flex shrink-0 rounded-full border border-white/25 p-0.5 lg:mt-5 lg:w-full">
      <legend className="sr-only">Tema da interface</legend>
      {themeOptions.map(({ value, label, Icon }) => (
        <label key={value} className={`flex min-h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-white ${theme === value ? 'bg-rail-active text-rail-active-ink shadow-raised ring-1 ring-rail-active-edge ring-inset' : 'text-rail-muted hover:bg-white/12 hover:text-white'}`}>
          <input type="radio" name="tema" value={value} checked={theme === value} onChange={() => onChange(value)} className="sr-only" />
          <Icon className="size-3.5" />
          {label}
        </label>
      ))}
    </fieldset>
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
