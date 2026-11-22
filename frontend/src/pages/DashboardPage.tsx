import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { api } from '../api'
import { DashboardCharts } from '../components/DashboardCharts'
import { ErrorMessage, Panel, fieldClass, primaryButtonClass, secondaryButtonClass } from '../components/ui'
import { dateLabel, speciesLabel } from '../format'
import type { Center, DashboardFilters, DashboardStatisticsResponse, Species } from '../types'

const unfiltered: DashboardFilters = {
  species: null, centerId: null, available: null, startDate: null, endDate: null,
}

const counts = new Intl.NumberFormat('pt-BR')
const measures = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 })
const percentages = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 })
const labelClass = 'grid min-w-0 gap-1.5 text-[0.8125rem] font-semibold text-ink'

interface DashboardPageProps {
  appliedFilters: DashboardFilters | null
  onApply: (filters: DashboardFilters) => void
  refreshVersion: number
  onRefresh: () => void
  onConnectionChange: (connected: boolean) => void
}

type StatisticsResult = { data: DashboardStatisticsResponse } | { error: string }

function availabilityLabel(available: boolean | null) {
  if (available === null) return 'Todas'
  return available ? 'Disponíveis' : 'Indisponíveis'
}

function interestPeriod({ startDate, endDate }: DashboardFilters): string {
  if (startDate && endDate) return `${dateLabel(startDate)} a ${dateLabel(endDate)}`
  if (startDate) return `A partir de ${dateLabel(startDate)}`
  if (endDate) return `Até ${dateLabel(endDate)}`
  return 'Todo o período'
}

export function DashboardPage({ appliedFilters, onApply, refreshVersion, onRefresh, onConnectionChange }: DashboardPageProps) {
  const requested = appliedFilters ?? unfiltered
  const [draft, setDraft] = useState(requested)
  const [dateError, setDateError] = useState(false)
  const [{ centers, centerError, centersVersion }, setCenterOptions] = useState<{
    centers: Center[]
    centerError: string
    centersVersion: number | null
  }>({ centers: [], centerError: '', centersVersion: null })
  const [settled, setSettled] = useState<{
    filters: DashboardFilters
    version: number
    result: StatisticsResult
  }>()

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    api.listCenters(signal).then((centers) => {
      if (signal.aborted) return
      setCenterOptions({ centers, centerError: '', centersVersion: refreshVersion })
    }).catch((cause: unknown) => {
      if (signal.aborted) return
      const centerError = cause instanceof Error ? cause.message : 'Não foi possível carregar os centros.'
      setCenterOptions((previous) => ({ ...previous, centerError, centersVersion: refreshVersion }))
    })
    return () => controller.abort()
  }, [refreshVersion])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    function complete(result: StatisticsResult) {
      if (signal.aborted) return
      setSettled({ filters: requested, version: refreshVersion, result })
      onConnectionChange('data' in result)
    }

    api.dashboardStatistics(requested, signal).then((data) => {
      complete({ data })
    }).catch((cause: unknown) => {
      complete({ error: cause instanceof Error ? cause.message : 'Não foi possível carregar os números do painel.' })
    })
    return () => controller.abort()
  }, [requested, refreshVersion, onConnectionChange])

  const current = settled?.filters === requested && settled.version === refreshVersion ? settled.result : null
  const data = current && 'data' in current ? current.data : null
  const filters = data?.filters
  const selectedCenter = data?.series.animalsByCenter.find((row) => row.centerId === filters?.centerId)?.centerName
  const hasDraftChanges = draft.species !== requested.species || draft.centerId !== requested.centerId ||
    draft.available !== requested.available || draft.startDate !== requested.startDate || draft.endDate !== requested.endDate

  function centerLabel(id: number | null) {
    return id === null ? 'Todos' : centers.find((center) => center.id === id)?.name ?? `Centro #${id}`
  }

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const invalid = Boolean(draft.startDate && draft.endDate && draft.startDate > draft.endDate)
    setDateError(invalid)
    if (!invalid) onApply({ ...draft })
  }

  function clear() {
    setDraft(unfiltered)
    setDateError(false)
    onApply({ ...unfiltered })
  }

  return (
    <div className="space-y-5">
      <Panel tone="sand" title="Filtros" detail="Filtre os animais por espécie, centro e situação. O período vale para os interesses registrados.">
        <form onSubmit={apply} className="space-y-3 px-5 pt-1 pb-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className={labelClass}>
              <label htmlFor="dashboard-species">Espécie</label>
              <select id="dashboard-species" className={fieldClass} value={draft.species ?? ''} onChange={(event) => {
                const value = event.target.value
                const species: Species | null = value === 'Cao' || value === 'Gato' ? value : null
                setDraft({ ...draft, species })
              }}>
                <option value="">Todas</option>
                <option value="Cao">Cães</option>
                <option value="Gato">Gatos</option>
              </select>
            </div>
            <div className={labelClass}>
              <label htmlFor="dashboard-center">Centro</label>
              <select id="dashboard-center" className={fieldClass} value={draft.centerId ?? ''} onChange={(event) =>
                setDraft({ ...draft, centerId: event.target.value ? Number(event.target.value) : null })}>
                <option value="">Todos</option>
                {draft.centerId !== null && !centers.some((center) => center.id === draft.centerId) && (
                  <option value={draft.centerId}>{centerLabel(draft.centerId)}</option>
                )}
                {centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
              </select>
            </div>
            <div className={labelClass}>
              <label htmlFor="dashboard-availability">Situação</label>
              <select id="dashboard-availability" className={fieldClass} value={draft.available === null ? '' : String(draft.available)} onChange={(event) =>
                setDraft({ ...draft, available: event.target.value ? event.target.value === 'true' : null })}>
                <option value="">Todas</option>
                <option value="true">Disponíveis</option>
                <option value="false">Indisponíveis</option>
              </select>
            </div>
            <label className={labelClass}>
              Data inicial
              <input type="date" min="0001-01-01" max="9999-12-31" className={fieldClass} value={draft.startDate ?? ''}
                aria-invalid={dateError} aria-describedby={dateError ? 'dashboard-date-error' : undefined}
                onChange={(event) => {
                  setDraft({ ...draft, startDate: event.target.value || null })
                  setDateError(false)
                }} />
            </label>
            <label className={labelClass}>
              Data final
              <input type="date" min="0001-01-01" max="9999-12-31" className={fieldClass} value={draft.endDate ?? ''}
                aria-invalid={dateError} aria-describedby={dateError ? 'dashboard-date-error' : undefined}
                onChange={(event) => {
                  setDraft({ ...draft, endDate: event.target.value || null })
                  setDateError(false)
                }} />
            </label>
          </div>
          {dateError && <div id="dashboard-date-error"><ErrorMessage message="A data inicial deve ser anterior ou igual à data final." /></div>}
          {centersVersion !== refreshVersion && <p role="status" className="text-xs text-muted">Carregando opções de centros…</p>}
          {centersVersion === refreshVersion && centerError && <ErrorMessage message={`Opções de centros: ${centerError}`} />}
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className={primaryButtonClass}>Aplicar filtros</button>
            <button type="button" onClick={clear} className={secondaryButtonClass}>Limpar filtros</button>
            {hasDraftChanges && <p className="text-xs text-sky-strong">Clique em Aplicar filtros para atualizar os números.</p>}
          </div>
        </form>
      </Panel>

      <div className="space-y-5">
        {!current && (
          <Panel title="Resumo">
            <p role="status" className="p-5 text-sm text-muted">{settled ? 'Atualizando números…' : 'Carregando números…'}</p>
          </Panel>
        )}
        {current && 'error' in current && (
          <Panel title="Resumo">
            <div className="space-y-3 px-5 pt-1 pb-5">
              <ErrorMessage message={current.error} />
              <button type="button" onClick={onRefresh} className={secondaryButtonClass}>Tentar novamente</button>
            </div>
          </Panel>
        )}
        {data && filters && (
          <>
            <DashboardIndicators data={data}>
              <div className="mt-1 space-y-0.5 text-[0.8125rem] text-muted" role="status">
                <p><span className="font-semibold text-ink">Mostrando:</span> Espécie: {filters.species ? speciesLabel(filters.species) : 'Todas'} · Centro: {selectedCenter ?? centerLabel(filters.centerId)} · Situação: {availabilityLabel(filters.available)}</p>
                <p>Interesses: {interestPeriod(filters)} · Idades calculadas em {dateLabel(data.referenceDate)}</p>
              </div>
            </DashboardIndicators>
            <DashboardCharts series={data.series} />
          </>
        )}
      </div>
    </div>
  )
}

function DashboardIndicators({ data, children }: { data: DashboardStatisticsResponse; children: ReactNode }) {
  const { indicators, ageStatistics: ages } = data

  function ageMeasure(value: number | null, unit: string) {
    if (value === null) return ages.validAgeCount === 0 ? 'Sem dados' : '—'
    return `${measures.format(value)} ${unit === 'anos' && value === 1 ? 'ano' : unit}`
  }

  return (
    <>
      <MetricSection title="Resumo" detail={children}>
        <div className={metricGridClass}>
          <Metric label="Total de animais" value={counts.format(indicators.totalAnimals)} wide>
            <AvailabilityTide available={indicators.availableAnimals} unavailable={indicators.unavailableAnimals} />
          </Metric>
          <Metric label="Disponíveis" value={counts.format(indicators.availableAnimals)} />
          <Metric label="Indisponíveis" value={counts.format(indicators.unavailableAnimals)} />
          <Metric label="Percentual disponível" value={indicators.availablePercentage === null
            ? '—' : percentages.format(indicators.availablePercentage / 100)} />
          <Metric label="Centros com animais" value={counts.format(indicators.centersWithAnimals)} />
          <Metric label="Centros na rede" value={counts.format(indicators.globalRegisteredCenters)} />
          <Metric label="Interesses registrados" value={counts.format(indicators.totalInterests)} />
        </div>
      </MetricSection>
      <MetricSection title="Idade dos animais" detail={<p className="mt-0.5 text-[0.8125rem] text-muted">{ages.validAgeCount
        ? 'Em anos completos, considerando os animais com data de nascimento.'
        : 'Nenhum animal filtrado tem data de nascimento cadastrada.'}</p>}>
        <div className={metricGridClass}>
          <Metric label="Idade média" value={ageMeasure(ages.mean, 'anos')} />
          <Metric label="Idade mediana" value={ageMeasure(ages.median, 'anos')} />
          <Metric label="Idade mais comum" value={ages.validAgeCount === 0 ? 'Sem dados' : ages.modes.length === 0 ? 'Nenhuma se repete'
            : ages.modes.map((age) => ageMeasure(age, 'anos')).join(' · ')} />
          <Metric label="Variância" value={ageMeasure(ages.populationVariance, 'anos²')} />
          <Metric label="Desvio padrão" value={ageMeasure(ages.populationStandardDeviation, 'anos')} />
          <Metric label="Com data de nascimento" value={counts.format(ages.validAgeCount)} />
          <Metric label="Sem data de nascimento" value={counts.format(ages.excludedAgeCount)} />
        </div>
      </MetricSection>
    </>
  )
}

// Os indicadores ficam sobre o fundo, sem caixa: a caixa fica reservada aos filtros e aos gráficos.
function MetricSection({ title, detail, children }: { title: string; detail: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="px-1">
        <h2 className="text-[1.0625rem] font-bold tracking-[-0.01em] text-ink">{title}</h2>
        {detail}
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-paper shadow-card">{children}</div>
    </section>
  )
}

const metricGridClass = '-mt-px -ml-px grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4'

function Metric({ label, value, wide = false, children }: { label: string; value: string; wide?: boolean; children?: ReactNode }) {
  return (
    <dl className={`min-w-0 border-t border-l border-line px-5 py-4 ${wide ? 'col-span-2' : ''}`}>
      <dt className="text-[0.8125rem] text-muted">{label}</dt>
      <dd className={`mt-1 wrap-break-word font-bold tracking-[-0.01em] text-ink tabular-nums ${wide ? 'text-[2.125rem] leading-tight' : 'text-xl leading-snug sm:text-[1.375rem]'}`}>{value}</dd>
      {children}
    </dl>
  )
}

function AvailabilityTide({ available, unavailable }: { available: number; unavailable: number }) {
  const total = available + unavailable
  return (
    <dd className="mt-3">
      <div aria-hidden="true" className="flex h-2.5 overflow-hidden rounded-full bg-track">
        {total > 0 && <div className="bg-series-available" style={{ width: `${(available / total) * 100}%` }} />}
        {total > 0 && <div className="bg-series-unavailable" style={{ width: `${(unavailable / total) * 100}%` }} />}
      </div>
      <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-series-available" />{counts.format(available)} disponíveis</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-series-unavailable" />{counts.format(unavailable)} indisponíveis</span>
      </p>
    </dd>
  )
}
