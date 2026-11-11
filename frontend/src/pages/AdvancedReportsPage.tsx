import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { api } from '../api'
import { ageGroupLabel, sexLabel, sizeLabel, speciesLabel } from '../format'
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
  { id: 11, title: 'Prioridade de adoção', detail: 'Função condicional (IF/ELSE)' },
  { id: 12, title: 'Índice compatibilidade', detail: 'Função de pontuação (0–100)' },
  { id: 13, title: 'Concluir adoção', detail: 'Procedimento de UPDATE' },
  { id: 14, title: 'Redistribuir na rede', detail: 'Procedimento com CURSOR' },
  { id: 15, title: 'Auditoria e Triggers', detail: 'Logs e validação de interesse' },
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

  // Etapa 05: Funções, Procedimentos e Triggers
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
  const [interestAnimalId, setInterestAnimalId] = useState('7')
  const [interestSubmitting, setInterestSubmitting] = useState(false)
  const [interestError, setInterestError] = useState('')
  const [interestSuccess, setInterestSuccess] = useState('')

  const loadRoutinesAndTriggersData = useCallback(async (targetUserId: number) => {
    setPriorityStatus('loading')
    setPriorityError('')
    api.animalPriorities()
      .then((rows) => {
        setPriorities(rows)
        setPriorityStatus('ready')
      })
      .catch((cause: unknown) => {
        setPriorityError(cause instanceof Error ? cause.message : 'Não foi possível consultar a função de prioridade.')
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
        setCompatError(cause instanceof Error ? cause.message : 'Não foi possível consultar a função de compatibilidade.')
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
        setAuditError(cause instanceof Error ? cause.message : 'Não foi possível carregar os logs de auditoria.')
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

    void loadRoutinesAndTriggersData(1)

    return () => { active = false }
  }, [loadRoutinesAndTriggersData])

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
      await loadRoutinesAndTriggersData(Number(compatUserId) || 1)
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
      await loadRoutinesAndTriggersData(Number(compatUserId) || 1)
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
      setInterestSuccess(`Interesse do usuário #${interestUserId} no animal #${interestAnimalId} registrado com sucesso!`)
      await loadRoutinesAndTriggersData(Number(compatUserId) || 1)
    } catch (cause) {
      setInterestError(cause instanceof Error ? cause.message : 'Não foi possível registrar o interesse.')
    } finally {
      setInterestSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <Panel title="Consultas, Visões, Funções, Procedimentos e Triggers" detail="Selecione um item para inspecionar os resultados ou executar rotinas armazenadas no MySQL">
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
          title="11 · Função 1: fn_classificar_prioridade_adocao"
          detail="Classifica a prioridade de divulgação de cada animal usando IF / ELSEIF / ELSE sobre disponibilidade, idade, porte e total de interesses"
        >
          {priorityStatus === 'loading' && <EmptyState>Consultando função fn_classificar_prioridade_adocao...</EmptyState>}
          {priorityStatus === 'error' && <div className="p-4"><ErrorMessage message={`${priorityError} Confirme se o script 07_funcoes.sql foi executado.`} /></div>}
          {priorityStatus === 'ready' && (
            <ReportTable headers={['ID', 'Animal', 'Espécie', 'Porte', 'Nascimento', 'Situação', 'Interesses', 'Prioridade (Função SQL)']}>
              {priorities.map((row) => (
                <tr key={row.animalId} className={tableRowClass}>
                  <Cell mono>#{row.animalId}</Cell>
                  <Cell highlight>{row.animalName}</Cell>
                  <Cell>{speciesLabel(row.species)}</Cell>
                  <Cell>{row.size ? sizeLabel(row.size) : '—'}</Cell>
                  <Cell mono>{row.birthDate || '—'}</Cell>
                  <Cell><Availability available={row.available} /></Cell>
                  <Cell mono>{row.totalInterests}</Cell>
                  <Cell highlight>{row.adoptionPriority}</Cell>
                </tr>
              ))}
            </ReportTable>
          )}
        </Panel>
      )}

      {activeReport === 12 && (
        <Panel
          title="12 · Função 2: fn_pontuacao_compatibilidade"
          detail="Calcula um índice de compatibilidade (0 a 100 pontos) entre a preferência do usuário e cada animal disponível"
        >
          <form onSubmit={(event) => void searchCompatibility(event)} className="flex flex-wrap items-end gap-3 border-b border-[#29465b] p-4">
            <label className="block w-48 text-xs font-medium text-[#a9c2d2]">ID do usuário (1 a 30)
              <input className={`${fieldClass} mt-1.5`} type="number" min="1" step="1" required value={compatUserId} onChange={(event) => setCompatUserId(event.target.value)} />
            </label>
            <button type="submit" disabled={compatStatus === 'loading'} className={primaryButtonClass}>Calcular pontuação</button>
          </form>
          {compatStatus === 'loading' && <EmptyState>Calculando compatibilidade no MySQL...</EmptyState>}
          {compatStatus === 'error' && <div className="p-4"><ErrorMessage message={`${compatError} Confirme se o script 07_funcoes.sql foi executado.`} /></div>}
          {compatStatus === 'ready' && (
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
          )}
        </Panel>
      )}

      {activeReport === 13 && (
        <Panel
          title="13 · Procedimento 1: sp_concluir_adocao_animal (Atualização)"
          detail="Registra o interesse do adotante, marca o animal como indisponível (adotado) e anota a adoção na descrição"
        >
          <form onSubmit={(event) => void handleCompleteAdoption(event)} className="flex flex-wrap items-end gap-3 border-b border-[#29465b] p-4">
            <label className="block w-64 text-xs font-medium text-[#a9c2d2]">Animal disponível
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
              {adoptSubmitting ? 'Executando...' : 'Executar CALL sp_concluir_adocao_animal'}
            </button>
          </form>
          <div className="space-y-4 p-4">
            {adoptError && <ErrorMessage message={adoptError} />}
            {adoptResult && (
              <div className="border border-[#386b52] bg-[#162f28] p-4 text-sm text-[#c8f0db]">
                <p className="font-semibold">Adoção concluída com sucesso pelo procedimento!</p>
                <p className="mt-1">Animal: <strong>#{adoptResult.animalId} · {adoptResult.animalName}</strong> (Centro #{adoptResult.centerId})</p>
                <p className="mt-1">Descrição atualizada: <span className="font-mono text-xs">{adoptResult.description}</span></p>
              </div>
            )}
            <p className="text-xs text-[#8faabc]">
              Dica: ao concluir a adoção, o trigger <code className="text-[#b7dbf0]">trg_animal_after_update_log</code> grava automaticamente um evento <code className="text-[#b7dbf0]">ADOCAO_INDISPONIVEL</code> na aba <strong>15 · Auditoria e Triggers</strong>.
            </p>
          </div>
        </Panel>
      )}

      {activeReport === 14 && (
        <Panel
          title="14 · Procedimento 2: sp_redistribuir_animais_rede (CURSOR)"
          detail="Itera com CURSOR sobre os animais disponíveis do centro de origem e transfere cada um para a unidade vinculada com menor ocupação atual abaixo do limite"
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
            <label className="block w-52 text-xs font-medium text-[#a9c2d2]">Limite máximo por unidade
              <input className={`${fieldClass} mt-1.5`} type="number" min="1" step="1" required value={maxPerUnit} onChange={(event) => setMaxPerUnit(event.target.value)} />
            </label>
            <button type="submit" disabled={redistributeSubmitting} className={primaryButtonClass}>
              {redistributeSubmitting ? 'Executando...' : 'Executar CALL sp_redistribuir_animais_rede'}
            </button>
          </form>
          <div className="space-y-4 p-4">
            {redistributeError && <ErrorMessage message={redistributeError} />}
            {redistributeResult && (
              <div className="border border-[#386b52] bg-[#162f28] p-4 text-sm text-[#c8f0db]">
                <p className="font-semibold">Redistribuição com CURSOR concluída!</p>
                <p className="mt-1">
                  Centro origem: <strong>#{redistributeResult.sourceCenterId}</strong> (Matriz #{redistributeResult.mainCenterId}) ·
                  Limite por unidade: <strong>{redistributeResult.maxPerUnit}</strong> ·
                  Animais transferidos: <strong>{redistributeResult.transferredAnimals}</strong> ·
                  Restantes na origem: <strong>{redistributeResult.remainingAtSource}</strong>
                </p>
              </div>
            )}
            <p className="text-xs text-[#8faabc]">
              Cada transferência realizada pelo cursor dispara o trigger <code className="text-[#b7dbf0]">trg_animal_after_update_log</code> na aba <strong>15 · Auditoria e Triggers</strong>.
            </p>
          </div>
        </Panel>
      )}

      {activeReport === 15 && (
        <div className="space-y-5">
          <Panel
            title="15A · Teste do Trigger 2: trg_interesse_before_insert_validar"
            detail="Valida antes do INSERT na tabela Interesse se o animal está disponível para adoção (bloqueia se disponibilidade = 0)"
          >
            <form onSubmit={(event) => void handleRegisterInterest(event)} className="flex flex-wrap items-end gap-3 border-b border-[#29465b] p-4">
              <label className="block w-48 text-xs font-medium text-[#a9c2d2]">ID do usuário (1 a 30)
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
            <div className="space-y-2 p-4">
              {interestError && <ErrorMessage message={interestError} />}
              {interestSuccess && (
                <div className="border border-[#386b52] bg-[#162f28] px-4 py-3 text-sm text-[#c8f0db]">
                  {interestSuccess}
                </div>
              )}
              <p className="text-xs text-[#8faabc]">
                Experimente selecionar o animal <strong>#7 · Rex (Indisponível)</strong> para ver o bloqueio semântico do trigger <code className="text-[#b7dbf0]">trg_interesse_before_insert_validar</code>, ou um animal disponível (como <strong>#3 · Bob</strong> para o usuário <strong>#1</strong>) para registrar um novo interesse válido.
              </p>
            </div>
          </Panel>

          <Panel
            title="15B · Tabela Log_Auditoria_Animal (Trigger 1: trg_animal_after_update_log)"
            detail="Histórico gravado automaticamente pelo trigger AFTER UPDATE ON Animal"
            action={
              <button
                type="button"
                onClick={() => void loadRoutinesAndTriggersData(Number(compatUserId) || 1)}
                className={secondaryButtonClass}
              >
                ↻ Recarregar logs
              </button>
            }
          >
            {auditStatus === 'loading' && <EmptyState>Carregando logs de auditoria...</EmptyState>}
            {auditStatus === 'error' && <div className="p-4"><ErrorMessage message={`${auditError} Confirme se o script 09_triggers.sql foi executado.`} /></div>}
            {auditStatus === 'ready' && (
              auditLogs.length === 0 ? (
                <EmptyState>Nenhum evento registrado ainda. Edite um animal ou execute os procedimentos 13 ou 14 para disparar o trigger.</EmptyState>
              ) : (
                <ReportTable headers={['Log', 'Animal', 'Evento', 'Disponibilidade (Antes → Depois)', 'Centro (Antes → Depois)', 'Detalhes', 'Data/Hora']}>
                  {auditLogs.map((log) => (
                    <tr key={log.logId} className={tableRowClass}>
                      <Cell mono>#{log.logId}</Cell>
                      <Cell highlight>{log.animalName} <span className="font-mono text-xs text-[#819caf]">#{log.animalId}</span></Cell>
                      <Cell mono>{log.eventType}</Cell>
                      <Cell mono>{log.previousAvailability ? '1' : '0'} → {log.newAvailability ? '1' : '0'}</Cell>
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
