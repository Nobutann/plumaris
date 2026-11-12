import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { api } from '../api'
import { ageGroupLabel, dateLabel, sexLabel, sizeLabel, speciesLabel } from '../format'
import type {
  AdoptionCompletionResult,
  AdvancedReports,
  Animal,
  AnimalAuditLogReport,
  AnimalCompatibilityReport,
  AnimalPriorityReport,
  DashboardData,
  RedistributionResult,
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
type LoadStatus = 'loading' | 'ready' | 'error'

export function AdvancedReportsPage({
  data,
  refresh,
}: {
  data: DashboardData
  refresh: () => Promise<void>
}) {
  const [activeReport, setActiveReport] = useState<ReportId>(1)
  const [userId, setUserId] = useState('1')
  const [recommended, setRecommended] = useState<Animal[]>([])
  const [recommendationStatus, setRecommendationStatus] = useState<LoadStatus>('loading')
  const [recommendationError, setRecommendationError] = useState('')
  const [advanced, setAdvanced] = useState<AdvancedReports | null>(null)
  const [advancedStatus, setAdvancedStatus] = useState<LoadStatus>('loading')
  const [advancedError, setAdvancedError] = useState('')

  const [priorities, setPriorities] = useState<AnimalPriorityReport[]>([])
  const [priorityStatus, setPriorityStatus] = useState<LoadStatus>('loading')
  const [priorityError, setPriorityError] = useState('')

  const [compatUserId, setCompatUserId] = useState('1')
  const [compatibilities, setCompatibilities] = useState<AnimalCompatibilityReport[]>([])
  const [compatStatus, setCompatStatus] = useState<LoadStatus>('loading')
  const [compatError, setCompatError] = useState('')

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

  const [auditLogs, setAuditLogs] = useState<AnimalAuditLogReport[]>([])
  const [auditStatus, setAuditStatus] = useState<LoadStatus>('loading')
  const [auditError, setAuditError] = useState('')

  const [interestUserId, setInterestUserId] = useState('1')
  const [interestAnimalId, setInterestAnimalId] = useState('1')
  const [interestSubmitting, setInterestSubmitting] = useState(false)
  const [interestError, setInterestError] = useState('')
  const [interestSuccess, setInterestSuccess] = useState('')

  const reloadRoutinesAndTriggersData = useCallback(async (targetUserId: number) => {
    setPriorityStatus('loading')
    setPriorityError('')
    api.animalPriorities()
      .then((rows) => {
        setPriorities(rows)
        setPriorityStatus('ready')
      })
      .catch((cause: unknown) => {
        setPriorityError(cause instanceof Error ? cause.message : 'Não foi possível carregar a classificação de prioridade.')
        setPriorityStatus('error')
      })

    setCompatStatus('loading')
    setCompatError('')
    api.userCompatibility(targetUserId)
      .then((rows) => {
        setCompatibilities(rows)
        setCompatStatus('ready')
      })
      .catch((cause: unknown) => {
        setCompatError(cause instanceof Error ? cause.message : 'Não foi possível carregar o índice de compatibilidade.')
        setCompatStatus('error')
      })

    setAuditStatus('loading')
    setAuditError('')
    api.auditLogs()
      .then((rows) => {
        setAuditLogs(rows)
        setAuditStatus('ready')
      })
      .catch((cause: unknown) => {
        setAuditError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico de auditoria.')
        setAuditStatus('error')
      })
  }, [])

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

    api.loadAdvancedReports()
      .then((result) => {
        if (active) {
          setAdvanced(result)
          setAdvancedStatus('ready')
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setAdvancedError(cause instanceof Error ? cause.message : 'Não foi possível carregar os relatórios avançados.')
          setAdvancedStatus('error')
        }
      })

    api.animalPriorities()
      .then((rows) => {
        if (active) {
          setPriorities(rows)
          setPriorityStatus('ready')
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setPriorityError(cause instanceof Error ? cause.message : 'Não foi possível carregar a classificação de prioridade.')
          setPriorityStatus('error')
        }
      })

    api.userCompatibility(1)
      .then((rows) => {
        if (active) {
          setCompatibilities(rows)
          setCompatStatus('ready')
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setCompatError(cause instanceof Error ? cause.message : 'Não foi possível carregar o índice de compatibilidade.')
          setCompatStatus('error')
        }
      })

    api.auditLogs()
      .then((rows) => {
        if (active) {
          setAuditLogs(rows)
          setAuditStatus('ready')
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setAuditError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico de auditoria.')
          setAuditStatus('error')
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

  async function searchCompatibility(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedId = Number(compatUserId)
    if (!Number.isInteger(parsedId) || parsedId < 1) return

    setCompatStatus('loading')
    setCompatError('')
    try {
      setCompatibilities(await api.userCompatibility(parsedId))
      setCompatStatus('ready')
    } catch (cause) {
      setCompatError(cause instanceof Error ? cause.message : 'Não foi possível calcular a compatibilidade.')
      setCompatStatus('error')
    }
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
      setAdoptResult(result)
      await refresh()
      const nextReports = await api.loadAdvancedReports()
      setAdvanced(nextReports)
      await reloadRoutinesAndTriggersData(Number(compatUserId) || 1)
    } catch (cause) {
      setAdoptError(cause instanceof Error ? cause.message : 'Não foi possível concluir a adoção.')
    } finally {
      setAdoptSubmitting(false)
    }
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
      setRedistributeResult(result)
      await refresh()
      const nextReports = await api.loadAdvancedReports()
      setAdvanced(nextReports)
      await reloadRoutinesAndTriggersData(Number(compatUserId) || 1)
    } catch (cause) {
      setRedistributeError(cause instanceof Error ? cause.message : 'Não foi possível redistribuir os animais.')
    } finally {
      setRedistributeSubmitting(false)
    }
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
      setInterestSuccess(`Interesse registrado para o usuário #${interestUserId} no animal #${interestAnimalId}.`)
      await reloadRoutinesAndTriggersData(Number(compatUserId) || 1)
    } catch (cause) {
      setInterestError(cause instanceof Error ? cause.message : 'Não foi possível registrar o interesse.')
    } finally {
      setInterestSubmitting(false)
    }
  }

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

      {activeReport === 1 && (
        <Panel title="01 · Animais e centros" detail={`${data.animals.length} registros; JOIN entre Animal, Centro_Adocao e Raca`}>
          {data.animals.length === 0 ? <EmptyState>Nenhum animal cadastrado.</EmptyState> : <AnimalResults animals={data.animals} />}
        </Panel>
      )}

      {activeReport === 2 && (
        <Panel title="02 · Resumo por espécie" detail="Quantidade total, disponível e indisponível por espécie">
          {data.speciesSummary.length === 0 ? <EmptyState>Não há dados para esta consulta.</EmptyState> : (
            <ReportTable headers={['Espécie', 'Total', 'Disponíveis', 'Indisponíveis']}>
              {data.speciesSummary.map((row) => <tr key={row.species} className={tableRowClass}>
                <Cell highlight>{speciesLabel(row.species)}</Cell><Cell mono>{row.total}</Cell><Cell mono>{row.available}</Cell><Cell mono>{row.unavailable}</Cell>
              </tr>)}
            </ReportTable>
          )}
        </Panel>
      )}

      {activeReport === 3 && (
        <Panel title="03 · Faixas etárias" detail="Idade calculada no banco a partir da data de nascimento">
          {data.ageGroupSummary.length === 0 ? <EmptyState>Não há dados para esta consulta.</EmptyState> : (
            <ReportTable headers={['Espécie', 'Faixa etária', 'Animais']}>
              {data.ageGroupSummary.map((row) => <tr key={`${row.species}-${row.ageGroup}`} className={tableRowClass}>
                <Cell highlight>{speciesLabel(row.species)}</Cell><Cell>{ageGroupLabel(row.ageGroup)}</Cell><Cell mono>{row.total}</Cell>
              </tr>)}
            </ReportTable>
          )}
        </Panel>
      )}

      {activeReport === 4 && (
        <Panel title="04 · Recomendações" detail="Animais disponíveis que atendem às preferências do usuário informado">
          <form onSubmit={(event) => void searchRecommendations(event)} className="flex flex-wrap items-end gap-3 border-b border-[#29465b] p-4">
            <label className="block w-48 text-xs font-medium text-[#a9c2d2]">ID do usuário
              <input className={`${fieldClass} mt-1.5`} type="number" min="1" step="1" required value={userId} onChange={(event) => setUserId(event.target.value)} />
            </label>
            <button type="submit" disabled={recommendationStatus === 'loading'} className={primaryButtonClass}>Buscar recomendações</button>
          </form>
          <div aria-live="polite">
            {recommendationStatus === 'loading' && <EmptyState>Carregando recomendações...</EmptyState>}
            {recommendationStatus === 'error' && <div className="p-4"><ErrorMessage message={recommendationError} /></div>}
            {recommendationStatus === 'ready' && (recommended.length === 0
              ? <EmptyState>Nenhum animal corresponde às preferências deste usuário.</EmptyState>
              : <AnimalResults animals={recommended} />)}
          </div>
        </Panel>
      )}

      {activeReport >= 5 && activeReport <= 10 && advancedStatus === 'loading' && (
        <Panel title="Relatórios avançados"><EmptyState>Carregando consultas e visões...</EmptyState></Panel>
      )}
      {activeReport >= 5 && activeReport <= 10 && advancedStatus === 'error' && (
        <Panel title="Relatórios avançados"><div className="p-4"><ErrorMessage message={`${advancedError} Confirme se os scripts 04_indices.sql e 05_visoes.sql foram executados.`} /></div></Panel>
      )}

      {activeReport === 5 && advanced && (
        <Panel title="05 · Centros sem animais disponíveis" detail="Anti join com LEFT JOIN entre Centro_Adocao e Animal">
          {advanced.emptyCenters.length === 0 ? <EmptyState>Todos os centros possuem ao menos um animal disponível.</EmptyState> : (
            <ReportTable headers={['ID', 'Centro', 'Cidade', 'Estado']}>
              {advanced.emptyCenters.map((row) => <tr key={row.centerId} className={tableRowClass}>
                <Cell mono>#{row.centerId}</Cell><Cell highlight>{row.centerName}</Cell><Cell>{row.city || '—'}</Cell><Cell>{row.state || '—'}</Cell>
              </tr>)}
            </ReportTable>
          )}
        </Panel>
      )}

      {activeReport === 6 && advanced && (
        <Panel title="06 · Cobertura entre raças e animais" detail="Full outer join emulado no MySQL com dois LEFT JOINs e UNION ALL">
          <ReportTable headers={['Raça', 'Espécie da raça', 'Animal', 'Espécie do animal', 'Situação']}>
            {advanced.breedAnimalCoverage.map((row, index) => <tr key={`${row.breedId ?? 'sem-raca'}-${row.animalId ?? 'sem-animal'}-${index}`} className={tableRowClass}>
              <Cell highlight>{row.breedName ? `${row.breedName} #${row.breedId}` : '—'}</Cell>
              <Cell>{row.breedSpecies ? speciesLabel(row.breedSpecies) : '—'}</Cell>
              <Cell>{row.animalName ? `${row.animalName} #${row.animalId}` : '—'}</Cell>
              <Cell>{row.animalSpecies ? speciesLabel(row.animalSpecies) : '—'}</Cell>
              <Cell>{row.matchStatus}</Cell>
            </tr>)}
          </ReportTable>
        </Panel>
      )}

      {activeReport === 7 && advanced && (
        <Panel title="07 · Preferências não atendidas" detail="Subconsulta correlacionada com NOT EXISTS">
          {advanced.unmetPreferences.length === 0 ? <EmptyState>Todas as preferências possuem alguma correspondência disponível.</EmptyState> : (
            <ReportTable headers={['Usuário', 'E-mail', 'Preferência', 'Idade desejada']}>
              {advanced.unmetPreferences.map((row) => <tr key={row.userId} className={tableRowClass}>
                <Cell highlight>{row.userName} <span className="font-mono text-xs text-[#819caf]">#{row.userId}</span></Cell>
                <Cell>{row.email}</Cell><Cell>{preferenceLabel(row)}</Cell><Cell>{agePreferenceLabel(row)}</Cell>
              </tr>)}
            </ReportTable>
          )}
        </Panel>
      )}

      {activeReport === 8 && advanced && (
        <Panel title="08 · Animais acima da média etária" detail="Subconsulta correlacionada que calcula a média por espécie">
          {advanced.olderAnimals.length === 0 ? <EmptyState>Nenhum animal disponível está acima da média de sua espécie.</EmptyState> : (
            <ReportTable headers={['Animal', 'Espécie', 'Idade', 'Média da espécie', 'Centro']}>
              {advanced.olderAnimals.map((row) => <tr key={row.animalId} className={tableRowClass}>
                <Cell highlight>{row.animalName} <span className="font-mono text-xs text-[#819caf]">#{row.animalId}</span></Cell>
                <Cell>{speciesLabel(row.species)}</Cell><Cell>{row.ageYears} anos</Cell><Cell>{row.speciesAverageAge.toFixed(1)} anos</Cell><Cell>{row.centerName}</Cell>
              </tr>)}
            </ReportTable>
          )}
        </Panel>
      )}

      {activeReport === 9 && advanced && (
        <Panel title="09 · Painel operacional dos centros" detail="Visão com Centro_Adocao, Vinculado_A, Animal e Interesse">
          <ReportTable headers={['Centro', 'Centro principal', 'Animais', 'Disponíveis', 'Indisponíveis', 'Interesses', 'Último interesse']}>
            {advanced.centerOperations.map((row) => <tr key={row.centerId} className={tableRowClass}>
              <Cell highlight>{row.centerName} <span className="font-mono text-xs text-[#819caf]">#{row.centerId}</span></Cell>
              <Cell>{row.mainCenterName || 'Matriz / sem vínculo'}</Cell><Cell mono>{row.totalAnimals}</Cell><Cell mono>{row.availableAnimals}</Cell>
              <Cell mono>{row.unavailableAnimals}</Cell><Cell mono>{row.totalInterests}</Cell><Cell>{dateTimeLabel(row.lastInterest)}</Cell>
            </tr>)}
          </ReportTable>
        </Panel>
      )}

      {activeReport === 10 && advanced && (
        <Panel title="10 · Oferta e demanda por raça" detail="Visão com Raca, Preferencia, Animal e Interesse">
          <ReportTable headers={['Raça', 'Espécie', 'Preferências', 'Animais', 'Disponíveis', 'Interessados', 'Saldo', 'Situação']}>
            {advanced.breedSupplyDemand.map((row) => <tr key={row.breedId} className={tableRowClass}>
              <Cell highlight>{row.breedName} <span className="font-mono text-xs text-[#819caf]">#{row.breedId}</span></Cell>
              <Cell>{speciesLabel(row.species)}</Cell><Cell mono>{row.preferenceCount}</Cell><Cell mono>{row.totalAnimals}</Cell>
              <Cell mono>{row.availableAnimals}</Cell><Cell mono>{row.interestedUsers}</Cell><Cell mono>{row.supplyBalance}</Cell><Cell>{row.supplyStatus}</Cell>
            </tr>)}
          </ReportTable>
        </Panel>
      )}

      {activeReport === 11 && (
        <Panel
          title="11 · Prioridade de adoção"
          detail="Classificação calculada pela função fn_classificar_prioridade_adocao conforme disponibilidade, idade, porte e procura"
        >
          {priorityStatus === 'loading' && <EmptyState>Carregando classificação de prioridade...</EmptyState>}
          {priorityStatus === 'error' && <div className="p-4"><ErrorMessage message={`${priorityError} Confirme se o script 07_funcoes.sql foi executado.`} /></div>}
          {priorityStatus === 'ready' && (
            priorities.length === 0 ? <EmptyState>Nenhum animal cadastrado.</EmptyState> : (
              <ReportTable headers={['ID', 'Animal', 'Espécie', 'Porte', 'Nascimento', 'Situação', 'Interesses', 'Prioridade']}>
                {priorities.map((row) => (
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
            )
          )}
        </Panel>
      )}

      {activeReport === 12 && (
        <Panel
          title="12 · Índice de compatibilidade por usuário"
          detail="Pontuação de 0 a 100 calculada pela função fn_pontuacao_compatibilidade conforme as preferências cadastradas"
        >
          <form onSubmit={(event) => void searchCompatibility(event)} className="flex flex-wrap items-end gap-3 border-b border-[#29465b] p-4">
            <label className="block w-48 text-xs font-medium text-[#a9c2d2]">ID do usuário
              <input className={`${fieldClass} mt-1.5`} type="number" min="1" step="1" required value={compatUserId} onChange={(event) => setCompatUserId(event.target.value)} />
            </label>
            <button type="submit" disabled={compatStatus === 'loading'} className={primaryButtonClass}>Calcular compatibilidade</button>
          </form>
          <div aria-live="polite">
            {compatStatus === 'loading' && <EmptyState>Calculando compatibilidade...</EmptyState>}
            {compatStatus === 'error' && <div className="p-4"><ErrorMessage message={`${compatError} Confirme se o script 07_funcoes.sql foi executado.`} /></div>}
            {compatStatus === 'ready' && (
              compatibilities.length === 0 ? <EmptyState>Nenhum animal disponível para avaliação.</EmptyState> : (
                <ReportTable headers={['ID', 'Animal', 'Espécie', 'Raça', 'Porte', 'Sexo', 'Cor', 'Pontuação', 'Prioridade']}>
                  {compatibilities.map((row) => (
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
              )
            )}
          </div>
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
                onClick={() => void reloadRoutinesAndTriggersData(Number(compatUserId) || 1)}
                className={secondaryButtonClass}
              >
                ↻ Atualizar histórico
              </button>
            }
          >
            {auditStatus === 'loading' && <EmptyState>Carregando histórico de auditoria...</EmptyState>}
            {auditStatus === 'error' && <div className="p-4"><ErrorMessage message={`${auditError} Confirme se o script 09_triggers.sql foi executado.`} /></div>}
            {auditStatus === 'ready' && (
              auditLogs.length === 0 ? (
                <EmptyState>Nenhum evento de auditoria registrado.</EmptyState>
              ) : (
                <ReportTable headers={['ID', 'Animal', 'Evento', 'Disponibilidade', 'Centro', 'Detalhes', 'Data']}>
                  {auditLogs.map((log) => (
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
              )
            )}
          </Panel>
        </div>
      )}
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
