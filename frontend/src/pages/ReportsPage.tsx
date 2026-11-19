import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import { ageGroupLabel, speciesLabel } from '../format'
import type { Animal, DashboardData } from '../types'
import {
  Availability,
  EmptyState,
  ErrorMessage,
  Panel,
  fieldClass,
  labelClass,
  primaryButtonClass,
  tableClass,
  tableHeadClass,
  tableRowClass,
} from '../components/ui'

const reports = [
  { id: 1, title: 'Animais e centros', detail: 'JOIN com centros de adoção e raças' },
  { id: 2, title: 'Resumo por espécie', detail: 'Totais por espécie e situação' },
  { id: 3, title: 'Faixas etárias', detail: 'Distribuição por idade e espécie' },
  { id: 4, title: 'Recomendações', detail: 'Animais conforme preferências do usuário' },
] as const

type ReportId = typeof reports[number]['id']

export function ReportsPage({ data }: { data: DashboardData }) {
  const [activeReport, setActiveReport] = useState<ReportId>(1)
  const [userId, setUserId] = useState('1')
  const [recommended, setRecommended] = useState<Animal[]>([])
  const [recommendationStatus, setRecommendationStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [recommendationError, setRecommendationError] = useState('')

  useEffect(() => {
    let active = true
    api.recommendedAnimals(1)
      .then((animals) => {
        if (active) {
          setRecommended(animals)
          setRecommendationStatus('ready')
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setRecommendationError(cause instanceof Error ? cause.message : 'Não foi possível carregar as recomendações.')
          setRecommendationStatus('error')
        }
      })
    return () => { active = false }
  }, [])

  async function searchRecommendations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedId = Number(userId)
    if (!Number.isInteger(parsedId) || parsedId < 1) return

    setRecommendationStatus('loading')
    setRecommendationError('')
    try {
      setRecommended(await api.recommendedAnimals(parsedId))
      setRecommendationStatus('ready')
    } catch (cause) {
      setRecommendationError(cause instanceof Error ? cause.message : 'Não foi possível carregar as recomendações.')
      setRecommendationStatus('error')
    }
  }

  return (
    <div className="space-y-5">
      <Panel title="Consultas SQL" detail="Resultados das quatro consultas disponíveis na API">
        <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-4">
          {reports.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => setActiveReport(report.id)}
              aria-current={activeReport === report.id ? 'page' : undefined}
              className={`min-h-24 rounded-[12px] border p-4 text-left transition-colors ${activeReport === report.id ? 'border-action bg-action text-on-action' : 'border-line bg-paper text-ink hover:bg-sky-soft'}`}
            >
              <span className={`font-mono text-xs ${activeReport === report.id ? 'text-on-action-muted' : 'text-link'}`}>0{report.id}</span>
              <span className="mt-1 block text-sm font-semibold">{report.title}</span>
              <span className="mt-1 block text-xs leading-5 text-muted">{report.detail}</span>
            </button>
          ))}
        </div>
      </Panel>

      {activeReport === 1 && (
        <Panel title="01 · Animais e centros" detail={`${data.animals.length} registros; JOIN entre Animal, Centro_Adocao e Raca`}>
          {data.animals.length === 0 ? <EmptyState>Nenhum animal cadastrado.</EmptyState> : <AnimalResults animals={data.animals} />}
        </Panel>
      )}

      {activeReport === 2 && (
        <Panel title="02 · Resumo por espécie" detail="Quantidade total, disponível e indisponível por espécie">
          {data.speciesSummary.length === 0 ? <EmptyState>Não há dados para esta consulta.</EmptyState> : (
            <div className="overflow-x-auto"><table className={tableClass}>
              <thead className={tableHeadClass}><tr><th className="px-5 py-3">Espécie</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Disponíveis</th><th className="px-5 py-3">Indisponíveis</th></tr></thead>
              <tbody>{data.speciesSummary.map((row) => <tr key={row.species} className={tableRowClass}>
                <td className="px-5 py-3 text-ink">{speciesLabel(row.species)}</td>
                <td className="px-5 py-3 font-mono">{row.total}</td>
                <td className="px-5 py-3 font-mono">{row.available}</td>
                <td className="px-5 py-3 font-mono">{row.unavailable}</td>
              </tr>)}</tbody>
            </table></div>
          )}
        </Panel>
      )}

      {activeReport === 3 && (
        <Panel title="03 · Faixas etárias" detail="Idade calculada no banco a partir da data de nascimento">
          {data.ageGroupSummary.length === 0 ? <EmptyState>Não há dados para esta consulta.</EmptyState> : (
            <div className="overflow-x-auto"><table className={tableClass}>
              <thead className={tableHeadClass}><tr><th className="px-5 py-3">Espécie</th><th className="px-5 py-3">Faixa etária</th><th className="px-5 py-3">Animais</th></tr></thead>
              <tbody>{data.ageGroupSummary.map((row) => <tr key={`${row.species}-${row.ageGroup}`} className={tableRowClass}>
                <td className="px-5 py-3 text-ink">{speciesLabel(row.species)}</td>
                <td className="px-5 py-3">{ageGroupLabel(row.ageGroup)}</td>
                <td className="px-5 py-3 font-mono">{row.total}</td>
              </tr>)}</tbody>
            </table></div>
          )}
        </Panel>
      )}

      {activeReport === 4 && (
        <Panel title="04 · Recomendações" detail="Animais disponíveis que atendem às preferências do usuário informado">
          <form onSubmit={(event) => void searchRecommendations(event)} className="flex flex-wrap items-end gap-3 border-y border-sand-line bg-sand-wash px-5 py-4">
            <label className={`${labelClass} w-48`}>ID do usuário
              <input className={`${fieldClass} mt-1.5`} type="number" min="1" step="1" required value={userId} onChange={(event) => setUserId(event.target.value)} />
            </label>
            <button type="submit" disabled={recommendationStatus === 'loading'} className={primaryButtonClass}>Buscar recomendações</button>
          </form>
          <div aria-live="polite">
            {recommendationStatus === 'loading' && <EmptyState>Carregando recomendações...</EmptyState>}
            {recommendationStatus === 'error' && <div className="px-5 py-4"><ErrorMessage message={recommendationError} /></div>}
            {recommendationStatus === 'ready' && (recommended.length === 0
              ? <EmptyState>Nenhum animal corresponde às preferências deste usuário.</EmptyState>
              : <AnimalResults animals={recommended} />)}
          </div>
        </Panel>
      )}
    </div>
  )
}

function AnimalResults({ animals }: { animals: Animal[] }) {
  return (
    <div className="overflow-x-auto"><table className={tableClass}>
      <thead className={tableHeadClass}><tr><th className="px-5 py-3">ID</th><th className="px-5 py-3">Animal</th><th className="px-5 py-3">Espécie</th><th className="px-5 py-3">Raça</th><th className="px-5 py-3">Centro de adoção</th><th className="px-5 py-3">Situação</th></tr></thead>
      <tbody>{animals.map((animal) => <tr key={animal.id} className={tableRowClass}>
        <td className="px-5 py-3 font-mono text-xs text-subtle">#{animal.id}</td>
        <td className="px-5 py-3 font-semibold text-ink">{animal.name}</td>
        <td className="px-5 py-3">{speciesLabel(animal.species)}</td>
        <td className="px-5 py-3">{animal.breedName || '—'}</td>
        <td className="px-5 py-3">{animal.centerName}<span className="ml-1 font-mono text-xs text-subtle">#{animal.centerId}</span></td>
        <td className="px-5 py-3"><Availability available={animal.available} /></td>
      </tr>)}</tbody>
    </table></div>
  )
}
