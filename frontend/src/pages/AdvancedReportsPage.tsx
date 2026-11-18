import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { FormEvent, ReactNode, Ref } from 'react'
import { api } from '../api'
import { ReportFilterForm } from './ReportFilterForm'
import { ageGroupLabel, dateLabel, sexLabel, sizeLabel, speciesLabel } from '../format'
import type {
  AdoptionCompletionResult,
  Animal,
  CatalogData,
  RedistributionResult,
  ReportFilters,
  UnmetPreferenceReport,
} from '../types'
import {
  Availability,
  EmptyState,
  ErrorMessage,
  Panel,
  fieldClass,
  primaryButtonClass,
  secondaryButtonClass,
  tableClass,
  tableHeadClass,
  tableRowClass,
} from '../components/ui'

const reports = [
  { id: 1, title: 'Animais e centros', detail: 'JOIN com centros e raças' },
  { id: 2, title: 'Resumo por espécie', detail: 'Totais por espécie e situação' },
  { id: 3, title: 'Faixas etárias', detail: 'Distribuição por idade' },
  { id: 4, title: 'Recomendações', detail: 'Preferências de um usuário' },
  { id: 5, title: 'Centros sem oferta', detail: 'Anti join' },
  { id: 6, title: 'Raças × animais', detail: 'Full outer join emulado' },
  { id: 7, title: 'Demanda não atendida', detail: 'Subconsulta NOT EXISTS' },
  { id: 8, title: 'Acima da média etária', detail: 'Subconsulta correlacionada' },
  { id: 9, title: 'Operação dos centros', detail: 'Visão com quatro joins' },
  { id: 10, title: 'Oferta × demanda', detail: 'Visão com três joins' },
  { id: 11, title: 'Prioridade de adoção', detail: 'Classificação por urgência' },
  { id: 12, title: 'Compatibilidade', detail: 'Pontuação por preferência' },
  { id: 13, title: 'Conclusão de adoção', detail: 'Baixa operacional de animal' },
  { id: 14, title: 'Redistribuição na rede', detail: 'Balanceamento entre unidades' },
  { id: 15, title: 'Auditoria e interesses', detail: 'Histórico de eventos e interesses' },
] as const

type ReportId = typeof reports[number]['id']
type RefreshRequest = { catalog: boolean; afterOperation: boolean }

const animalFilters = ['species', 'centerId', 'available'] as const
const reportFields: Partial<Record<ReportId, readonly (keyof ReportFilters)[]>> = {
  1: animalFilters,
  2: animalFilters,
  3: animalFilters,
  5: ['city', 'state'],
  6: ['species', 'matchStatus'],
  7: ['userId', 'desiredSpecies', 'breedId'],
  8: ['species', 'centerId'],
  9: ['centerId', 'city', 'state'],
  10: ['species', 'breedId', 'supplyStatus'],
}
const noFilters: ReportFilters = {}

export function AdvancedReportsPage({
  data,
  visible,
  refreshCatalog,
  refreshRef,
  onOperationCompleted,
}: {
  data: CatalogData
  visible: boolean
  refreshCatalog: () => Promise<void>
  refreshRef: Ref<() => Promise<void>>
  onOperationCompleted: () => void
}) {
  const [activeReport, setActiveReport] = useState<ReportId>(1)
  const [recommendationUserId, setRecommendationUserId] = useState('1')
  const [recommendation, setRecommendation] = useState({ userId: 1 })
  const [drafts, setDrafts] = useState<Partial<Record<ReportId, ReportFilters>>>({})
  const [applied, setApplied] = useState<Partial<Record<ReportId, ReportFilters>>>({})

  const [compatUserId, setCompatUserId] = useState('1')
  const [compatibility, setCompatibility] = useState({ userId: 1 })

  const [adoptAnimalId, setAdoptAnimalId] = useState('1')
  const [adoptUserId, setAdoptUserId] = useState('1')
  const [adoptSubmitting, setAdoptSubmitting] = useState(false)
  const [adoptError, setAdoptError] = useState('')
  const [adoptResult, setAdoptResult] = useState<AdoptionCompletionResult | null>(null)

  const [sourceCenterId, setSourceCenterId] = useState('32')
  const [maxPerUnit, setMaxPerUnit] = useState('1')
  const [redistributeSubmitting, setRedistributeSubmitting] = useState(false)
  const [redistributeError, setRedistributeError] = useState('')
  const [redistributeResult, setRedistributeResult] = useState<RedistributionResult | null>(null)

  const [interestUserId, setInterestUserId] = useState('1')
  const [interestAnimalId, setInterestAnimalId] = useState('1')
  const [interestSubmitting, setInterestSubmitting] = useState(false)
  const [interestError, setInterestError] = useState('')
  const [interestSuccess, setInterestSuccess] = useState('')

  const reloadRows = useRef<(() => Promise<void>) | null>(null)
  const pendingRefresh = useRef<RefreshRequest | null>(null)
  const mounted = useRef(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  async function reloadReportData({ catalog = false, afterOperation = false }: Partial<RefreshRequest> = {}) {
    const request = {
      catalog: catalog || pendingRefresh.current?.catalog === true,
      afterOperation: afterOperation || pendingRefresh.current?.afterOperation === true,
    }
    pendingRefresh.current = request
    setRefreshing(true)
    setRefreshError('')

    const [catalogResult, reportResult] = await Promise.allSettled([
      request.catalog ? refreshCatalog() : undefined,
      reloadRows.current?.(),
    ])
    if (!mounted.current || pendingRefresh.current !== request) return

    const catalogFailed = catalogResult.status === 'rejected'
    const reportFailed = reportResult.status === 'rejected'
    pendingRefresh.current = catalogFailed || reportFailed
      ? { catalog: catalogFailed, afterOperation: request.afterOperation }
      : null
    setRefreshing(false)

    if ((catalogFailed || reportFailed) && request.afterOperation) {
      setRefreshError('A operação foi concluída, mas alguns dados não puderam ser atualizados.')
    } else if (catalogFailed) {
      const cause: unknown = catalogResult.reason
      setRefreshError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o catálogo.')
    }
  }

  function refreshCurrentReport() {
    return reloadReportData({ catalog: activeReport >= 13 })
  }

  useImperativeHandle(refreshRef, () => refreshCurrentReport)

  function searchRecommendations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedId = Number(recommendationUserId)
    if (!Number.isInteger(parsedId) || parsedId < 1 || parsedId > 2_147_483_647) return
    setRecommendation({ userId: parsedId })
  }

  function searchCompatibility(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedId = Number(compatUserId)
    if (!Number.isInteger(parsedId) || parsedId < 1 || parsedId > 2_147_483_647) return
    setCompatibility({ userId: parsedId })
  }

  async function handleCompleteAdoption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAdoptSubmitting(true)
    setAdoptError('')
    setAdoptResult(null)
    try {
      const result = await api.completeAdoption({
        animalId: Number(adoptAnimalId),
        userId: Number(adoptUserId),
      })
      if (!mounted.current) return
      setAdoptResult(result)
    } catch (cause) {
      if (mounted.current) setAdoptError(cause instanceof Error ? cause.message : 'Não foi possível concluir a adoção.')
      return
    } finally {
      if (mounted.current) setAdoptSubmitting(false)
    }
    onOperationCompleted()
    await reloadReportData({ catalog: true, afterOperation: true })
  }

  async function handleRedistribute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRedistributeSubmitting(true)
    setRedistributeError('')
    setRedistributeResult(null)
    try {
      const result = await api.redistributeAnimals({
        sourceCenterId: Number(sourceCenterId),
        maxPerUnit: Number(maxPerUnit),
      })
      if (!mounted.current) return
      setRedistributeResult(result)
    } catch (cause) {
      if (mounted.current) setRedistributeError(cause instanceof Error ? cause.message : 'Não foi possível redistribuir os animais.')
      return
    } finally {
      if (mounted.current) setRedistributeSubmitting(false)
    }
    onOperationCompleted()
    await reloadReportData({ catalog: true, afterOperation: true })
  }

  async function handleRegisterInterest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setInterestSubmitting(true)
    setInterestError('')
    setInterestSuccess('')
    try {
      await api.registerInterest({
        userId: Number(interestUserId),
        animalId: Number(interestAnimalId),
      })
      if (!mounted.current) return
      setInterestSuccess(`Interesse registrado para o usuário #${interestUserId} no animal #${interestAnimalId}.`)
    } catch (cause) {
      if (mounted.current) setInterestError(cause instanceof Error ? cause.message : 'Não foi possível registrar o interesse.')
      return
    } finally {
      if (mounted.current) setInterestSubmitting(false)
    }
    onOperationCompleted()
    await reloadReportData({ afterOperation: true })
  }

  if (!visible) return null

  const reportRequest = {
    filters: applied[activeReport] ?? noFilters,
    onRetry: () => void reloadReportData(),
  }
  const fields = reportFields[activeReport]
  const filterForm = fields && (
    <ReportFilterForm fields={fields} data={data} draft={drafts[activeReport] ?? noFilters}
      applied={reportRequest.filters}
      onEdit={(draft) => setDrafts((previous) => ({ ...previous, [activeReport]: draft }))}
      onApply={(filters) => {
        setDrafts((previous) => ({ ...previous, [activeReport]: filters }))
        setApplied((previous) => ({ ...previous, [activeReport]: filters }))
      }}
      onClear={() => {
        setDrafts((previous) => ({ ...previous, [activeReport]: noFilters }))
        setApplied((previous) => ({ ...previous, [activeReport]: {} }))
      }} />
  )

  return (
    <div className="space-y-5">
      <Panel title="Consultas SQL" detail="Consultas, visões gerenciais, funções, procedimentos armazenados e auditoria">
        <div className="grid gap-px bg-[#2b4961] sm:grid-cols-2 xl:grid-cols-5">
          {reports.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => setActiveReport(report.id)}
              aria-current={activeReport === report.id ? 'page' : undefined}
              className={`min-h-24 p-4 text-left transition-colors ${activeReport === report.id ? 'bg-[#244562] text-[#e7f3fb]' : 'bg-[#112438] text-[#9bb5c6] hover:bg-[#1b344a]'}`}
            >
              <span className="font-mono text-xs text-[#80bddd]">{String(report.id).padStart(2, '0')}</span>
              <span className="mt-1 block text-sm font-semibold">{report.title}</span>
              <span className="mt-1 block text-xs leading-5 text-[#8faabc]">{report.detail}</span>
            </button>
          ))}
        </div>
      </Panel>

      <div aria-live="polite">
        {refreshing && <p className="text-sm text-[#9bb5c6]">Atualizando dados...</p>}
        {refreshError && (
          <div className="space-y-3">
            <ErrorMessage message={refreshError} />
            <button type="button" className={secondaryButtonClass} onClick={() => void reloadReportData()}>
              Tentar atualizar dados novamente
            </button>
          </div>
        )}
      </div>

      {activeReport === 1 && (
        <Panel title="01 · Animais e centros" detail="JOIN entre Animal, Centro_Adocao e Raca">
          {filterForm}
          <ReportRows reloadRef={reloadRows} {...reportRequest} load={api.animals}>
            {(animals) => <AnimalResults animals={animals} />}
          </ReportRows>
        </Panel>
      )}

      {activeReport === 2 && (
        <Panel title="02 · Resumo por espécie" detail="Quantidade total, disponível e indisponível por espécie">
          {filterForm}
          <ReportRows reloadRef={reloadRows} {...reportRequest} load={api.speciesSummary}>
            {(rows) => (
              <ReportTable headers={['Espécie', 'Total', 'Disponíveis', 'Indisponíveis']}>
                {rows.map((row) => <tr key={row.species} className={tableRowClass}>
                  <Cell highlight>{speciesLabel(row.species)}</Cell><Cell mono>{row.total}</Cell><Cell mono>{row.available}</Cell><Cell mono>{row.unavailable}</Cell>
                </tr>)}
              </ReportTable>
            )}
          </ReportRows>
        </Panel>
      )}

      {activeReport === 3 && (
        <Panel title="03 · Faixas etárias" detail="Idade calculada no banco a partir da data de nascimento">
          {filterForm}
          <ReportRows reloadRef={reloadRows} {...reportRequest} load={api.ageGroupSummary}>
            {(rows) => (
              <ReportTable headers={['Espécie', 'Faixa etária', 'Animais']}>
                {rows.map((row) => <tr key={`${row.species}-${row.ageGroup}`} className={tableRowClass}>
                  <Cell highlight>{speciesLabel(row.species)}</Cell><Cell>{ageGroupLabel(row.ageGroup)}</Cell><Cell mono>{row.total}</Cell>
                </tr>)}
              </ReportTable>
            )}
          </ReportRows>
        </Panel>
      )}

      {activeReport === 4 && (
        <Panel title="04 · Recomendações" detail="Animais disponíveis que atendem às preferências do usuário informado">
          <form onSubmit={searchRecommendations} className="flex flex-wrap items-end gap-3 border-b border-[#29465b] p-4">
            <label className="block w-48 text-xs font-medium text-[#a9c2d2]">ID do usuário
              <input className={`${fieldClass} mt-1.5`} type="number" min="1" step="1" max="2147483647" required value={recommendationUserId} onChange={(event) => setRecommendationUserId(event.target.value)} />
            </label>
            <button type="submit" className={primaryButtonClass}>Buscar recomendações</button>
          </form>
          <p className="px-4 pt-3 text-xs text-[#a9c2d2]">Usuário consultado · #{recommendation.userId}</p>
          <ReportRows reloadRef={reloadRows} {...reportRequest} filters={recommendation} load={loadRecommendations}
            emptyMessage="Nenhum animal corresponde às preferências deste usuário.">
            {(animals) => <AnimalResults animals={animals} />}
          </ReportRows>
        </Panel>
      )}

      {activeReport === 5 && (
        <Panel title="05 · Centros sem animais disponíveis" detail="Anti join com LEFT JOIN entre Centro_Adocao e Animal">
          {filterForm}
          <ReportRows reloadRef={reloadRows} {...reportRequest} load={api.emptyCenters}>
            {(rows) => (
              <ReportTable headers={['ID', 'Centro', 'Cidade', 'Estado']}>
                {rows.map((row) => <tr key={row.centerId} className={tableRowClass}>
                  <Cell mono>#{row.centerId}</Cell><Cell highlight>{row.centerName}</Cell><Cell>{row.city || '—'}</Cell><Cell>{row.state || '—'}</Cell>
                </tr>)}
              </ReportTable>
            )}
          </ReportRows>
        </Panel>
      )}

      {activeReport === 6 && (
        <Panel title="06 · Cobertura entre raças e animais" detail="Full outer join emulado no MySQL com dois LEFT JOINs e UNION ALL">
          {filterForm}
          <ReportRows reloadRef={reloadRows} {...reportRequest} load={api.breedAnimalCoverage}>
            {(rows) => (
              <ReportTable headers={['Raça', 'Espécie da raça', 'Animal', 'Espécie do animal', 'Situação']}>
                {rows.map((row, index) => <tr key={`${row.breedId ?? 'sem-raca'}-${row.animalId ?? 'sem-animal'}-${index}`} className={tableRowClass}>
                  <Cell highlight>{row.breedName ? `${row.breedName} #${row.breedId}` : '—'}</Cell>
                  <Cell>{row.breedSpecies ? speciesLabel(row.breedSpecies) : '—'}</Cell>
                  <Cell>{row.animalName ? `${row.animalName} #${row.animalId}` : '—'}</Cell>
                  <Cell>{row.animalSpecies ? speciesLabel(row.animalSpecies) : '—'}</Cell>
                  <Cell>{row.matchStatus}</Cell>
                </tr>)}
              </ReportTable>
            )}
          </ReportRows>
        </Panel>
      )}

      {activeReport === 7 && (
        <Panel title="07 · Preferências não atendidas" detail="Subconsulta correlacionada com NOT EXISTS">
          {filterForm}
          <ReportRows reloadRef={reloadRows} {...reportRequest} load={api.unmetPreferences}>
            {(rows) => (
              <ReportTable headers={['Usuário', 'E-mail', 'Preferência', 'Idade desejada']}>
                {rows.map((row) => <tr key={row.userId} className={tableRowClass}>
                  <Cell highlight>{row.userName} <span className="font-mono text-xs text-[#819caf]">#{row.userId}</span></Cell>
                  <Cell>{row.email}</Cell><Cell>{preferenceLabel(row)}</Cell><Cell>{agePreferenceLabel(row)}</Cell>
                </tr>)}
              </ReportTable>
            )}
          </ReportRows>
        </Panel>
      )}

      {activeReport === 8 && (
        <Panel title="08 · Animais acima da média etária" detail="Subconsulta correlacionada que calcula a média por espécie">
          {filterForm}
          <ReportRows reloadRef={reloadRows} {...reportRequest} load={api.olderAnimals}>
            {(rows) => (
              <ReportTable headers={['Animal', 'Espécie', 'Idade', 'Média da espécie', 'Centro']}>
                {rows.map((row) => <tr key={row.animalId} className={tableRowClass}>
                  <Cell highlight>{row.animalName} <span className="font-mono text-xs text-[#819caf]">#{row.animalId}</span></Cell>
                  <Cell>{speciesLabel(row.species)}</Cell><Cell>{row.ageYears} anos</Cell><Cell>{row.speciesAverageAge.toFixed(1)} anos</Cell><Cell>{row.centerName}</Cell>
                </tr>)}
              </ReportTable>
            )}
          </ReportRows>
        </Panel>
      )}

      {activeReport === 9 && (
        <Panel title="09 · Painel operacional dos centros" detail="Visão com Centro_Adocao, Vinculado_A, Animal e Interesse">
          {filterForm}
          <ReportRows reloadRef={reloadRows} {...reportRequest} load={api.centerOperations}>
            {(rows) => (
              <ReportTable headers={['Centro', 'Centro principal', 'Animais', 'Disponíveis', 'Indisponíveis', 'Interesses', 'Último interesse']}>
                {rows.map((row) => <tr key={row.centerId} className={tableRowClass}>
                  <Cell highlight>{row.centerName} <span className="font-mono text-xs text-[#819caf]">#{row.centerId}</span></Cell>
                  <Cell>{row.mainCenterName || 'Matriz / sem vínculo'}</Cell><Cell mono>{row.totalAnimals}</Cell><Cell mono>{row.availableAnimals}</Cell>
                  <Cell mono>{row.unavailableAnimals}</Cell><Cell mono>{row.totalInterests}</Cell><Cell>{dateTimeLabel(row.lastInterest)}</Cell>
                </tr>)}
              </ReportTable>
            )}
          </ReportRows>
        </Panel>
      )}

      {activeReport === 10 && (
        <Panel title="10 · Oferta e demanda por raça" detail="Visão com Raca, Preferencia, Animal e Interesse">
          {filterForm}
          <ReportRows reloadRef={reloadRows} {...reportRequest} load={api.breedSupplyDemand}>
            {(rows) => (
              <ReportTable headers={['Raça', 'Espécie', 'Preferências', 'Animais', 'Disponíveis', 'Interessados', 'Saldo', 'Situação']}>
                {rows.map((row) => <tr key={row.breedId} className={tableRowClass}>
                  <Cell highlight>{row.breedName} <span className="font-mono text-xs text-[#819caf]">#{row.breedId}</span></Cell>
                  <Cell>{speciesLabel(row.species)}</Cell><Cell mono>{row.preferenceCount}</Cell><Cell mono>{row.totalAnimals}</Cell>
                  <Cell mono>{row.availableAnimals}</Cell><Cell mono>{row.interestedUsers}</Cell><Cell mono>{row.supplyBalance}</Cell><Cell>{row.supplyStatus}</Cell>
                </tr>)}
              </ReportTable>
            )}
          </ReportRows>
        </Panel>
      )}

      {activeReport === 11 && (
        <Panel
          title="11 · Prioridade de adoção"
          detail="Classificação calculada pela função fn_classificar_prioridade_adocao conforme disponibilidade, idade, porte e procura"
        >
          <ReportRows reloadRef={reloadRows} {...reportRequest} load={loadPriorities} emptyMessage="Nenhum animal cadastrado.">
            {(rows) => (
              <ReportTable headers={['ID', 'Animal', 'Espécie', 'Porte', 'Nascimento', 'Situação', 'Interesses', 'Prioridade']}>
                {rows.map((row) => (
                  <tr key={row.animalId} className={tableRowClass}>
                    <Cell mono>#{row.animalId}</Cell>
                    <Cell highlight>{row.animalName}</Cell>
                    <Cell>{speciesLabel(row.species)}</Cell>
                    <Cell>{row.size ? sizeLabel(row.size) : '—'}</Cell>
                    <Cell>{dateLabel(row.birthDate)}</Cell>
                    <Cell><Availability available={row.available} /></Cell>
                    <Cell mono>{row.totalInterests}</Cell>
                    <Cell highlight>{row.adoptionPriority}</Cell>
                  </tr>
                ))}
              </ReportTable>
            )}
          </ReportRows>
        </Panel>
      )}

      {activeReport === 12 && (
        <Panel
          title="12 · Índice de compatibilidade por usuário"
          detail="Pontuação de 0 a 100 calculada pela função fn_pontuacao_compatibilidade conforme as preferências cadastradas"
        >
          <form onSubmit={searchCompatibility} className="flex flex-wrap items-end gap-3 border-b border-[#29465b] p-4">
            <label className="block w-48 text-xs font-medium text-[#a9c2d2]">ID do usuário
              <input className={`${fieldClass} mt-1.5`} type="number" min="1" step="1" max="2147483647" required value={compatUserId} onChange={(event) => setCompatUserId(event.target.value)} />
            </label>
            <button type="submit" className={primaryButtonClass}>Calcular compatibilidade</button>
          </form>
          <p className="px-4 pt-3 text-xs text-[#a9c2d2]">Usuário consultado · #{compatibility.userId}</p>
          <ReportRows reloadRef={reloadRows} {...reportRequest} filters={compatibility} load={loadCompatibility}
            emptyMessage="Nenhum animal disponível para avaliação.">
            {(rows) => (
              <ReportTable headers={['ID', 'Animal', 'Espécie', 'Raça', 'Porte', 'Sexo', 'Cor', 'Pontuação', 'Prioridade']}>
                {rows.map((row) => (
                  <tr key={row.animalId} className={tableRowClass}>
                    <Cell mono>#{row.animalId}</Cell>
                    <Cell highlight>{row.animalName}</Cell>
                    <Cell>{speciesLabel(row.species)}</Cell>
                    <Cell>{row.breedName || '—'}</Cell>
                    <Cell>{row.size ? sizeLabel(row.size) : '—'}</Cell>
                    <Cell>{row.sex ? sexLabel(row.sex) : '—'}</Cell>
                    <Cell>{row.color || '—'}</Cell>
                    <Cell mono highlight>{row.compatibilityScore} pts</Cell>
                    <Cell>{row.adoptionPriority}</Cell>
                  </tr>
                ))}
              </ReportTable>
            )}
          </ReportRows>
        </Panel>
      )}

      {activeReport === 13 && (
        <Panel
          title="13 · Conclusão de adoção"
          detail="Procedimento sp_concluir_adocao_animal para vincular o adotante e atualizar a disponibilidade do animal"
        >
          <form onSubmit={(event) => void handleCompleteAdoption(event)} className="flex flex-wrap items-end gap-3 border-b border-[#29465b] p-4">
            <label className="block w-64 text-xs font-medium text-[#a9c2d2]">Animal
              <select className={`${fieldClass} mt-1.5`} value={adoptAnimalId} onChange={(event) => setAdoptAnimalId(event.target.value)}>
                {data.animals.map((animal) => (
                  <option key={animal.id} value={animal.id}>
                    #{animal.id} · {animal.name} ({animal.available ? 'Disponível' : 'Indisponível'})
                  </option>
                ))}
              </select>
            </label>
            <label className="block w-48 text-xs font-medium text-[#a9c2d2]">ID do usuário adotante
              <input className={`${fieldClass} mt-1.5`} type="number" min="1" step="1" required value={adoptUserId} onChange={(event) => setAdoptUserId(event.target.value)} />
            </label>
            <button type="submit" disabled={adoptSubmitting} className={primaryButtonClass}>
              {adoptSubmitting ? 'Processando...' : 'Concluir adoção'}
            </button>
          </form>
          <div aria-live="polite">
            {adoptError && <div className="p-4"><ErrorMessage message={adoptError} /></div>}
            {!adoptError && !adoptResult && (
              <EmptyState>Selecione um animal disponível e informe o ID do adotante para registrar a adoção.</EmptyState>
            )}
            {adoptResult && <p className="px-4 py-3 text-sm text-[#c8f0db]">Adoção concluída.</p>}
            {adoptResult && (
              <ReportTable headers={['ID', 'Animal', 'Espécie', 'Centro', 'Situação', 'Descrição atualizada']}>
                <tr className={tableRowClass}>
                  <Cell mono>#{adoptResult.animalId}</Cell>
                  <Cell highlight>{adoptResult.animalName}</Cell>
                  <Cell>{speciesLabel(adoptResult.species)}</Cell>
                  <Cell mono>#{adoptResult.centerId}</Cell>
                  <Cell><Availability available={adoptResult.available} /></Cell>
                  <Cell>{adoptResult.description || '—'}</Cell>
                </tr>
              </ReportTable>
            )}
          </div>
        </Panel>
      )}

      {activeReport === 14 && (
        <Panel
          title="14 · Redistribuição de animais na rede"
          detail="Procedimento sp_redistribuir_animais_rede com cursor para alocar animais nas unidades vinculadas de menor ocupação"
        >
          <form onSubmit={(event) => void handleRedistribute(event)} className="flex flex-wrap items-end gap-3 border-b border-[#29465b] p-4">
            <label className="block w-72 text-xs font-medium text-[#a9c2d2]">Centro de origem
              <select className={`${fieldClass} mt-1.5`} value={sourceCenterId} onChange={(event) => setSourceCenterId(event.target.value)}>
                {data.centers.map((center) => (
                  <option key={center.id} value={center.id}>
                    #{center.id} · {center.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block w-52 text-xs font-medium text-[#a9c2d2]">Limite por unidade
              <input className={`${fieldClass} mt-1.5`} type="number" min="1" step="1" required value={maxPerUnit} onChange={(event) => setMaxPerUnit(event.target.value)} />
            </label>
            <button type="submit" disabled={redistributeSubmitting} className={primaryButtonClass}>
              {redistributeSubmitting ? 'Redistribuindo...' : 'Redistribuir animais'}
            </button>
          </form>
          <div aria-live="polite">
            {redistributeError && <div className="p-4"><ErrorMessage message={redistributeError} /></div>}
            {!redistributeError && !redistributeResult && (
              <EmptyState>Selecione o centro de origem e o limite de ocupação por unidade para iniciar a redistribuição.</EmptyState>
            )}
            {redistributeResult && <p className="px-4 py-3 text-sm text-[#c8f0db]">Redistribuição concluída.</p>}
            {redistributeResult && (
              <ReportTable headers={['Centro de origem', 'Matriz da rede', 'Limite por unidade', 'Animais transferidos', 'Restantes na origem']}>
                <tr className={tableRowClass}>
                  <Cell mono>#{redistributeResult.sourceCenterId}</Cell>
                  <Cell mono>#{redistributeResult.mainCenterId}</Cell>
                  <Cell mono>{redistributeResult.maxPerUnit}</Cell>
                  <Cell mono highlight>{redistributeResult.transferredAnimals}</Cell>
                  <Cell mono>{redistributeResult.remainingAtSource}</Cell>
                </tr>
              </ReportTable>
            )}
          </div>
        </Panel>
      )}

      {activeReport === 15 && (
        <div className="space-y-5">
          <Panel
            title="15 · Registro de interesse"
            detail="Manifestação de interesse validada pelo trigger trg_interesse_before_insert_validar"
          >
            <form onSubmit={(event) => void handleRegisterInterest(event)} className="flex flex-wrap items-end gap-3 border-b border-[#29465b] p-4">
              <label className="block w-48 text-xs font-medium text-[#a9c2d2]">ID do usuário
                <input className={`${fieldClass} mt-1.5`} type="number" min="1" step="1" required value={interestUserId} onChange={(event) => setInterestUserId(event.target.value)} />
              </label>
              <label className="block w-72 text-xs font-medium text-[#a9c2d2]">Animal
                <select className={`${fieldClass} mt-1.5`} value={interestAnimalId} onChange={(event) => setInterestAnimalId(event.target.value)}>
                  {data.animals.map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      #{animal.id} · {animal.name} ({animal.available ? 'Disponível' : 'Indisponível'})
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" disabled={interestSubmitting} className={primaryButtonClass}>
                {interestSubmitting ? 'Registrando...' : 'Registrar interesse'}
              </button>
            </form>
            {(interestError || interestSuccess) && (
              <div className="p-4" aria-live="polite">
                {interestError && <ErrorMessage message={interestError} />}
                {interestSuccess && (
                  <div className="border border-[#386b52] bg-[#162f28] px-4 py-3 text-sm text-[#c8f0db]">
                    {interestSuccess}
                  </div>
                )}
              </div>
            )}
          </Panel>

          <Panel
            title="Histórico de auditoria de animais"
            detail="Eventos registrados automaticamente em Log_Auditoria_Animal pelo trigger trg_animal_after_update_log"
            action={
              <button
                type="button"
                onClick={() => void reloadReportData()}
                className={secondaryButtonClass}
              >
                ↻ Atualizar histórico
              </button>
            }
          >
            <ReportRows reloadRef={reloadRows} {...reportRequest} load={loadAuditLogs} emptyMessage="Nenhum evento de auditoria registrado.">
              {(rows) => (
                <ReportTable headers={['ID', 'Animal', 'Evento', 'Disponibilidade', 'Centro', 'Detalhes', 'Data']}>
                  {rows.map((log) => (
                    <tr key={log.logId} className={tableRowClass}>
                      <Cell mono>#{log.logId}</Cell>
                      <Cell highlight>{log.animalName} <span className="font-mono text-xs text-[#819caf]">#{log.animalId}</span></Cell>
                      <Cell mono>{log.eventType}</Cell>
                      <Cell mono>{log.previousAvailability ? 'Disponível' : 'Indisponível'} → {log.newAvailability ? 'Disponível' : 'Indisponível'}</Cell>
                      <Cell mono>#{log.previousCenterId} → #{log.newCenterId}</Cell>
                      <Cell>{log.details}</Cell>
                      <Cell mono>{dateTimeLabel(log.eventDate)}</Cell>
                    </tr>
                  ))}
                </ReportTable>
              )}
            </ReportRows>
          </Panel>
        </div>
      )}
    </div>
  )
}

function loadRecommendations(filters: { userId: number }, signal: AbortSignal) {
  return api.recommendedAnimals(filters.userId, signal)
}

function loadPriorities(_: ReportFilters, signal: AbortSignal) {
  return api.animalPriorities(signal)
}

function loadCompatibility(filters: { userId: number }, signal: AbortSignal) {
  return api.userCompatibility(filters.userId, signal)
}

function loadAuditLogs(_: ReportFilters, signal: AbortSignal) {
  return api.auditLogs(signal)
}

function ReportRows<T, Filters>({ filters, load, reloadRef, onRetry, emptyMessage, children }: {
  filters: Filters
  load: (filters: Filters, signal: AbortSignal) => Promise<T[]>
  reloadRef: Ref<() => Promise<void>>
  onRetry: () => void
  emptyMessage?: string
  children: (rows: T[]) => ReactNode
}) {
  const request = useRef<AbortController | null>(null)
  const [result, setResult] = useState<{ filters: Filters; rows?: T[]; error?: string }>()

  const loadRows = useCallback(() => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    const { signal } = controller

    return load(filters, signal)
      .then((rows) => {
        if (!signal.aborted) setResult({ filters, rows })
      })
      .catch((cause: unknown) => {
        if (signal.aborted) return
        const error = cause instanceof Error ? cause.message : 'Não foi possível carregar esta consulta.'
        setResult({ filters, error })
        throw cause
      })
  }, [filters, load])

  useEffect(() => {
    void loadRows().catch(() => {})
    return () => request.current?.abort()
  }, [loadRows])

  useImperativeHandle(reloadRef, () => async () => {
    setResult(undefined)
    await loadRows()
  }, [loadRows])

  const current = result?.filters === filters ? result : undefined

  return (
    <div aria-live="polite" aria-busy={!current}>
      {!current && <EmptyState>Carregando consulta...</EmptyState>}
      {current?.error && (
        <div className="space-y-3 p-4">
          <ErrorMessage message={current.error} />
          <button type="button" className={secondaryButtonClass} onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      )}
      {current?.rows && (current.rows.length
        ? children(current.rows)
        : <EmptyState>{emptyMessage ?? 'Nenhum resultado para o recorte selecionado.'}</EmptyState>)}
    </div>
  )
}

function AnimalResults({ animals }: { animals: Animal[] }) {
  return (
    <ReportTable headers={['ID', 'Animal', 'Espécie', 'Raça', 'Centro de adoção', 'Situação']}>
      {animals.map((animal) => <tr key={animal.id} className={tableRowClass}>
        <Cell mono>#{animal.id}</Cell><Cell highlight>{animal.name}</Cell><Cell>{speciesLabel(animal.species)}</Cell><Cell>{animal.breedName || '—'}</Cell>
        <Cell>{animal.centerName} <span className="font-mono text-xs text-[#819caf]">#{animal.centerId}</span></Cell>
        <Cell><Availability available={animal.available} /></Cell>
      </tr>)}
    </ReportTable>
  )
}

function ReportTable({ headers, children }: { headers: string[], children: ReactNode }) {
  return (
    <div className="overflow-x-auto"><table className={tableClass}>
      <thead className={tableHeadClass}><tr>{headers.map((header) => <th key={header} className="px-4 py-2.5">{header}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table></div>
  )
}

function Cell({ children, mono = false, highlight = false }: { children: ReactNode, mono?: boolean, highlight?: boolean }) {
  return <td className={`px-4 py-2.5 ${mono ? 'font-mono text-xs' : ''} ${highlight ? 'font-medium text-[#b7dbf0]' : ''}`}>{children}</td>
}

function preferenceLabel(row: UnmetPreferenceReport): string {
  return [
    row.desiredSpecies ? speciesLabel(row.desiredSpecies) : null,
    row.breedName,
    row.desiredSize ? sizeLabel(row.desiredSize) : null,
    row.desiredSex ? sexLabel(row.desiredSex) : null,
    row.desiredColor,
  ].filter(Boolean).join(' · ') || 'Sem filtros específicos'
}

function agePreferenceLabel(row: UnmetPreferenceReport): string {
  if (row.minimumAge == null && row.maximumAge == null) return 'Qualquer idade'
  if (row.minimumAge == null) return `Até ${row.maximumAge} anos`
  if (row.maximumAge == null) return `A partir de ${row.minimumAge} anos`
  return `${row.minimumAge}–${row.maximumAge} anos`
}

function dateTimeLabel(value: string | null): string {
  if (!value) return '—'
  const [date, time = ''] = value.split('T')
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}${time ? ` ${time.slice(0, 5)}` : ''}`
}
