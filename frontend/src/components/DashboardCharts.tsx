import type { ReactNode } from 'react'
import type { DashboardStatisticsResponse, SpeciesAgeBoxplot } from '../types'
import { ageGroupLabel, speciesLabel } from '../format'
import { EmptyState, Panel } from './ui'

type Series = DashboardStatisticsResponse['series']

const counts = new Intl.NumberFormat('pt-BR')
const ages = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const blue = 'bg-[#76b7db]'
const slate = 'bg-[#8293a8]'
const amber = 'bg-[#e5ae72]'

export function DashboardCharts({ series }: { series: Series }) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Panel title="Animais por espécie" detail="Quantidade de animais por disponibilidade no recorte." className="min-w-0">
        <CountColumns rows={series.animalsBySpecies.map((row) => ({
          label: speciesLabel(row.species), total: row.total, available: row.available, unavailable: row.unavailable,
        }))} />
      </Panel>
      <Panel title="Faixas etárias" detail="Quantidade de animais. Nascimento ausente ou futuro conta como idade desconhecida." className="min-w-0">
        <CountColumns rows={series.ageGroups.map((row) => ({ label: ageGroupLabel(row.ageGroup), total: row.total }))} />
        {series.ageGroups.length > 0 && series.ageGroups.every((row) => row.total === 0) && (
          <p className="px-4 pb-4 text-center text-xs text-[#9bb0bf]">Nenhum animal no recorte.</p>
        )}
      </Panel>
      <Panel title="Animais por centro" detail="Quantidade de animais por disponibilidade no recorte." className="min-w-0">
        <AnimalsByCenter rows={series.animalsByCenter} />
      </Panel>
      <Panel
        title="Oferta e demanda por raça"
        detail="A espécie limita as raças exibidas. As preferências são globais, independentemente de centro, disponibilidade ou período."
        className="min-w-0"
      >
        <SupplyDemand rows={series.supplyDemandByBreed} />
      </Panel>
      <Panel title="Interesses por mês" detail="Quantidade de interesses dos animais no recorte e período selecionados." className="min-w-0">
        <MonthlyInterests rows={series.interestsByMonth} />
      </Panel>
      <Panel title="Boxplot de idades por espécie" detail="Idade em anos. Os bigodes marcam o mínimo e o máximo. A linha mais alta marca a mediana." className="min-w-0">
        <AgeBoxplots rows={series.ageBoxplotBySpecies} />
      </Panel>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-2"><span aria-hidden="true" className={`size-2.5 shrink-0 ${color}`} />{label}</span>
}

function AvailabilityLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#c0d6e4]">
      <LegendItem color={blue} label="Disponíveis" />
      <LegendItem color={slate} label="Indisponíveis" />
    </div>
  )
}

type Column = { label: string; total: number; available?: number; unavailable?: number }

function CountColumns({ rows }: { rows: Column[] }) {
  if (!rows.length) return <EmptyState>Nenhum animal no recorte.</EmptyState>
  const max = rows.reduce((highest, row) => Math.max(highest, row.total), 0)

  return (
    <div className="space-y-3 p-4">
      {rows[0].available !== undefined && <AvailabilityLegend />}
      <div className="grid gap-x-2 text-center" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
        {rows.map(({ label, total, available, unavailable }) => (
          <div key={label} className="min-w-0">
            <div aria-hidden="true" className="flex h-32 flex-col items-center justify-end border-b border-[#52718a] bg-[#0d1b2b]">
              {unavailable !== undefined && <div className={`w-1/2 ${slate}`} style={{ height: scaledPercent(unavailable, max) }} />}
              <div className={`w-1/2 ${blue}`} style={{ height: scaledPercent(available ?? total, max) }} />
            </div>
            <p className="mt-2 wrap-break-word text-xs font-medium text-[#e4f1fa]">{label}</p>
            <p className="font-mono text-sm text-[#b7dbf0]">{counts.format(total)}</p>
            {available !== undefined && unavailable !== undefined && (
              <p className="mt-1 text-xs text-[#a5bdcd]">{counts.format(available)} disponíveis · {counts.format(unavailable)} indisponíveis</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function scaledPercent(value: number, max: number) {
  return `${max > 0 ? (value / max) * 100 : 0}%`
}

function CountAxis({ max }: { max: number }) {
  return (
    <div aria-hidden="true" className="flex justify-between border-t border-[#52718a] pt-1 font-mono text-xs text-[#a5bdcd]">
      <span>0</span>
      {max > 0 && <span>{counts.format(max)}</span>}
    </div>
  )
}

function BarList({ label, count, max, children }: { label: string; count: number; max: number; children: ReactNode }) {
  const scrollable = count > 4
  return (
    <>
      <p className="text-xs text-[#a5bdcd]">{counts.format(count)} {label.toLowerCase()}{scrollable && ' · Role a lista para consultar todos os valores.'}</p>
      <div role="region" aria-label={label} tabIndex={scrollable ? 0 : undefined}
        className={scrollable ? 'max-h-96 overflow-y-auto pr-2 focus-visible:outline-2 focus-visible:outline-[#76b7db]' : ''}>
        <div className="sticky top-0 z-10 bg-[#112438] pb-2"><CountAxis max={max} /></div>
        {children}
      </div>
    </>
  )
}

function AnimalsByCenter({ rows }: { rows: Series['animalsByCenter'] }) {
  if (!rows.length) return <EmptyState>Nenhum centro com animais no recorte.</EmptyState>
  const max = rows.reduce((highest, row) => Math.max(highest, row.total), 0)

  return (
    <div className="space-y-3 p-4">
      <AvailabilityLegend />
      <BarList label={rows.length === 1 ? 'Centro' : 'Centros'} count={rows.length} max={max}>
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.centerId}>
              <div className="flex justify-between gap-2 text-sm">
                <span className="min-w-0 wrap-break-word font-medium text-[#e4f1fa]">{row.centerName}</span>
                <span className="shrink-0 font-mono text-[#b7dbf0]">{counts.format(row.total)}</span>
              </div>
              <div aria-hidden="true" className="mt-1 flex h-3.5 bg-[#0d1b2b]">
                <div className={blue} style={{ width: scaledPercent(row.available, max) }} />
                <div className={slate} style={{ width: scaledPercent(row.unavailable, max) }} />
              </div>
              <p className="mt-1 text-xs text-[#a5bdcd]">{counts.format(row.available)} disponíveis · {counts.format(row.unavailable)} indisponíveis</p>
            </li>
          ))}
        </ul>
      </BarList>
    </div>
  )
}

function SupplyDemand({ rows }: { rows: Series['supplyDemandByBreed'] }) {
  if (!rows.length) return <EmptyState>Nenhuma raça correspondente à seleção de espécie.</EmptyState>
  const max = rows.reduce((highest, row) => Math.max(highest, row.availableSupply, row.globalExplicitBreedPreferences), 0)

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#c0d6e4]">
        <LegendItem color={blue} label="Oferta disponível no recorte" />
        <LegendItem color={amber} label="Preferências globais explícitas pela raça" />
      </div>
      <BarList label={rows.length === 1 ? 'Raça' : 'Raças'} count={rows.length} max={max}>
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.breedId} className="border-b border-[#29465b] pb-2 last:border-0">
              <p className="mb-1 wrap-break-word text-sm font-medium text-[#e4f1fa]">{row.breedName} · {speciesLabel(row.species)}</p>
              <div className="space-y-1 text-xs text-[#a5bdcd]">
                <BreedBar label="Oferta" color={blue} value={row.availableSupply} max={max} />
                <BreedBar label="Preferências" color={amber} value={row.globalExplicitBreedPreferences} max={max} />
              </div>
            </li>
          ))}
        </ul>
      </BarList>
    </div>
  )
}

function BreedBar({ label, color, value, max }: { label: string; color: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between gap-2"><span>{label}</span><span className="font-mono">{counts.format(value)}</span></div>
      <div aria-hidden="true" className="h-2.5 bg-[#0d1b2b]"><div className={`h-full ${color}`} style={{ width: scaledPercent(value, max) }} /></div>
    </div>
  )
}

function monthIndex(month: string) {
  const [year, number] = month.split('-').map(Number)
  return (year * 12) + number - 1
}

function monthLabel(month: string) {
  return monthFormat.format(new Date(`${month}-01T00:00:00Z`))
}

function MonthlyInterests({ rows }: { rows: Series['interestsByMonth'] }) {
  if (!rows.length) return <EmptyState>Nenhum interesse no recorte e período selecionados.</EmptyState>

  const months = [...rows].sort((first, second) => first.month.localeCompare(second.month))
  const first = months[0].month
  const last = months[months.length - 1].month
  const span = monthIndex(last) - monthIndex(first)
  const max = months.reduce((highest, row) => Math.max(highest, row.total), 0)
  const points = months.map((row) => ({
    ...row,
    x: span ? ((monthIndex(row.month) - monthIndex(first)) / span) * 100 : 50,
    y: max ? (1 - row.total / max) * 100 : 100,
  }))
  const ticks = max > 2 ? [max, Math.floor(max / 2), 0] : max > 0 ? [max, 0] : [0]

  return (
    <div className="space-y-3 p-4">
      <div aria-hidden="true" className="flex gap-2 pt-2">
        <div className="relative h-36 min-w-[3ch] text-right font-mono text-xs text-[#a5bdcd]">
          {ticks.map((tick) => (
            <div key={tick} className="h-0 leading-none"><span className="relative block -translate-y-1/2"
              style={{ top: `${max ? (1 - tick / max) * 9 : 9}rem` }}>{counts.format(tick)}</span></div>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-36 border-l border-[#52718a] bg-[#0d1b2b]">
            {ticks.map((tick) => <div key={tick} className="absolute inset-x-0 border-t border-[#36536b]"
              style={{ top: max ? `${(1 - tick / max) * 100}%` : '100%' }} />)}
            {points.length > 1 && (
              <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
                  fill="none" stroke="#76b7db" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
            )}
            {points.map(({ month, total, x, y }) => (
              <span key={month} title={`${monthLabel(month)} · ${counts.format(total)}`}
                className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#b7dbf0]"
                style={{ left: `${x}%`, top: `${y}%` }} />
            ))}
          </div>
          <div className={`mt-2 flex gap-2 text-xs text-[#a5bdcd] ${span ? 'justify-between' : 'justify-center'}`}>
            <span>{monthLabel(first)}</span>
            {span > 0 && <span>{monthLabel(last)}</span>}
          </div>
        </div>
      </div>
      <details className="border-t border-[#29465b] pt-2 text-sm">
        <summary className="cursor-pointer text-[#b7dbf0] focus-visible:outline-2 focus-visible:outline-[#76b7db]">Valores por mês</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-[#a5bdcd]"><tr><th scope="col" className="p-2">Mês</th><th scope="col" className="p-2 text-right">Interesses</th></tr></thead>
          <tbody>
            {months.map((row) => (
              <tr key={row.month} className="border-t border-[#29465b]">
                <th scope="row" className="p-2 font-normal">{monthLabel(row.month)}</th>
                <td className="p-2 text-right font-mono">{counts.format(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

function AgeBoxplots({ rows }: { rows: SpeciesAgeBoxplot[] }) {
  if (!rows.length) return <EmptyState>Nenhuma idade válida no recorte.</EmptyState>
  const max = rows.reduce((highest, row) => Math.max(highest, row.maximum ?? 0), 0)

  return (
    <ul className="space-y-4 p-4">
      {rows.map((row) => (
        <li key={row.species}>
          <p className="text-sm font-medium text-[#e4f1fa]">{speciesLabel(row.species)} · {counts.format(row.count)} idades consideradas</p>
          <AgeBoxplot row={row} max={max} />
        </li>
      ))}
    </ul>
  )
}

function AgeBoxplot({ row, max }: { row: SpeciesAgeBoxplot; max: number }) {
  const { minimum, firstQuartile, median, thirdQuartile, maximum } = row
  if (minimum === null || firstQuartile === null || median === null || thirdQuartile === null || maximum === null) {
    return <p className="mt-1 text-xs text-[#a5bdcd]">Sem dados de idade válida.</p>
  }

  return (
    <>
      <div aria-hidden="true" className="relative mx-1 mt-2 h-9 bg-[#0d1b2b]">
        <div className="absolute top-1/2 border-t-2 border-[#b7dbf0]"
          style={{ left: scaledPercent(minimum, max), width: scaledPercent(maximum - minimum, max) }} />
        <div className="absolute inset-y-1.5 bg-[#3b779c] outline outline-[#76b7db]"
          style={{ left: scaledPercent(firstQuartile, max), width: scaledPercent(thirdQuartile - firstQuartile, max) }} />
        {[minimum, maximum].map((age, index) => <span key={index} className="absolute inset-y-3 border-l-2 border-[#b7dbf0]"
          style={{ left: scaledPercent(age, max) }} />)}
        <span className="absolute inset-y-1 border-l-2 border-[#e5ae72]" style={{ left: scaledPercent(median, max) }} />
      </div>
      <div className="mx-1"><CountAxis max={max} /></div>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs sm:grid-cols-5">
        {[
          { label: 'Mínimo', value: minimum },
          { label: '1º quartil', value: firstQuartile },
          { label: 'Mediana', value: median },
          { label: '3º quartil', value: thirdQuartile },
          { label: 'Máximo', value: maximum },
        ].map(({ label, value }) => (
          <div key={label}>
            <dt className="text-[#a5bdcd]">{label}</dt>
            <dd className="font-mono text-[#b7dbf0]">{ages.format(value)}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}
