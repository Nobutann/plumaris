import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
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
const labelClass = 'grid min-w-0 gap-1.5 text-sm text-[#d1e3ef]'

interface DashboardPageProps {
  appliedFilters: DashboardFilters | null
  onApply: (filters: DashboardFilters) => void
  refreshVersion: number
  onRefresh: () => void
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

export function DashboardPage({ appliedFilters, onApply, refreshVersion, onRefresh }: DashboardPageProps) {
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
      if (!signal.aborted) setSettled({ filters: requested, version: refreshVersion, result })
    }

    api.dashboardStatistics(requested, signal).then((data) => {
      complete({ data })
    }).catch((cause: unknown) => {
      complete({ error: cause instanceof Error ? cause.message : 'Não foi possível carregar as estatísticas.' })
    })
    return () => controller.abort()
  }, [requested, refreshVersion])

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
      <Panel title="Filtros" detail="Espécie, centro e disponibilidade recortam os animais. As datas afetam apenas os interesses.">
        <form onSubmit={apply} className="space-y-3 p-4">
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
              <label htmlFor="dashboard-availability">Disponibilidade</label>
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
          {centersVersion !== refreshVersion && <p role="status" className="text-xs text-[#9cb5c6]">Carregando opções de centros…</p>}
          {centersVersion === refreshVersion && centerError && <ErrorMessage message={`Opções de centros: ${centerError}`} />}
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className={primaryButtonClass}>Aplicar filtros</button>
            <button type="button" onClick={clear} className={secondaryButtonClass}>Limpar filtros</button>
            {hasDraftChanges && <p className="text-xs text-[#a8cce2]">Há alterações de filtros ainda não aplicadas.</p>}
          </div>
        </form>
      </Panel>

      <div className="space-y-5">
        {!current && (
          <Panel title="Estatísticas">
            <p role="status" className="p-5 text-sm text-[#b9d0df]">{settled ? 'Atualizando estatísticas…' : 'Carregando estatísticas…'}</p>
          </Panel>
        )}
        {current && 'error' in current && (
          <Panel title="Estatísticas">
            <div className="space-y-3 p-4">
              <ErrorMessage message={current.error} />
              <button type="button" onClick={onRefresh} className={secondaryButtonClass}>Tentar novamente</button>
            </div>
          </Panel>
        )}
        {data && filters && (
          <>
            <div className="space-y-1 border border-[#2b4961] bg-[#112438] px-4 py-3 text-sm" role="status">
              <p className="font-semibold text-[#e4f1fa]">Filtros aplicados</p>
              <p>Espécie: {filters.species ? speciesLabel(filters.species) : 'Todas'} · Centro: {selectedCenter ?? centerLabel(filters.centerId)} · Disponibilidade: {availabilityLabel(filters.available)}</p>
              <p>Período de interesses: {interestPeriod(filters)} · Data de referência: {dateLabel(data.referenceDate)}</p>
            </div>
            <DashboardIndicators data={data} />
            <DashboardCharts series={data.series} />
          </>
        )}
      </div>
    </div>
  )
}

function DashboardIndicators({ data }: { data: DashboardStatisticsResponse }) {
  const { indicators, ageStatistics: ages } = data

  function ageMeasure(value: number | null, unit: string) {
    if (value === null) return ages.validAgeCount === 0 ? 'Sem dados' : 'Indefinida'
    return `${measures.format(value)} ${unit === 'anos' && value === 1 ? 'ano' : unit}`
  }

  return (
    <>
      <Panel title="Indicadores">
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-4">
          <Metric label="Total de animais" value={counts.format(indicators.totalAnimals)} />
          <Metric label="Disponíveis" value={counts.format(indicators.availableAnimals)} />
          <Metric label="Indisponíveis" value={counts.format(indicators.unavailableAnimals)} />
          <Metric label="Percentual disponível" value={indicators.availablePercentage === null
            ? 'Indefinido (sem animais)' : percentages.format(indicators.availablePercentage / 100)} />
          <Metric label="Centros com animais no recorte" value={counts.format(indicators.centersWithAnimals)} />
          <Metric label="Centros cadastrados (global)" value={counts.format(indicators.globalRegisteredCenters)} />
          <Metric label="Interesses no recorte e período" value={counts.format(indicators.totalInterests)} />
        </div>
      </Panel>
      <Panel title="Estatísticas de idade" detail={ages.validAgeCount
        ? 'Idades válidas em anos completos no recorte.'
        : 'As medidas são indefinidas sem idades válidas.'}>
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-4">
          <Metric label="Média" value={ageMeasure(ages.mean, 'anos')} />
          <Metric label="Mediana" value={ageMeasure(ages.median, 'anos')} />
          <Metric label="Modas" value={ages.validAgeCount === 0 ? 'Sem dados' : ages.modes.length === 0 ? 'Sem moda'
            : ages.modes.map((age) => ageMeasure(age, 'anos')).join(' · ')} />
          <Metric label="Variância populacional" value={ageMeasure(ages.populationVariance, 'anos²')} />
          <Metric label="Desvio padrão populacional" value={ageMeasure(ages.populationStandardDeviation, 'anos')} />
          <Metric label="Idades válidas" value={counts.format(ages.validAgeCount)} />
          <Metric label="Idades excluídas" value={counts.format(ages.excludedAgeCount)} />
        </div>
      </Panel>
    </>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <dl className="min-w-0 border border-[#2b4961] bg-[#0d1b2b] p-3">
      <dt className="text-xs font-medium text-[#a8c3d4]">{label}</dt>
      <dd className="mt-1 wrap-break-word font-mono text-lg text-[#e7f3fb] sm:text-xl">{value}</dd>
    </dl>
  )
}
