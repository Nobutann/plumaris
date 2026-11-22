import type {
  AdoptionCompletionResult,
  AgeGroupSummary,
  Animal,
  AnimalAuditLogReport,
  AnimalCompatibilityReport,
  AnimalInput,
  AnimalPriorityReport,
  AnimalReportFilters,
  Breed,
  BreedInput,
  BreedAnimalCoverageReport,
  BreedSupplyDemandReport,
  Center,
  CenterInput,
  CenterLocationFilters,
  CenterOperationsReport,
  CompleteAdoptionInput,
  DashboardFilters,
  DashboardStatisticsResponse,
  EmptyCenterReport,
  InterestInput,
  OlderAnimalReport,
  Preference,
  PreferenceInput,
  RedistributeAnimalsInput,
  RedistributionResult,
  ReportFilters,
  SpeciesSummary,
  UnmetPreferenceReport,
  UserSummary,
} from './types'

interface ApiProblem {
  detail?: string
  title?: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
        ...options?.headers,
      },
    })
  } catch (cause) {
    if (options?.signal?.aborted) throw cause
    throw new Error('Não foi possível conectar à API. Verifique se o backend está em execução.', { cause })
  }

  if (!response.ok) {
    const problem = await response.json().catch(() => null) as ApiProblem | null
    throw new Error(problem?.detail || problem?.title || `A API retornou o erro ${response.status}.`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  if (!text) {
    return undefined as T
  }

  return JSON.parse(text) as T
}

function listCenters(signal?: AbortSignal): Promise<Center[]> {
  return request<Center[]>('/centros', { signal, cache: 'no-store' })
}

function requestReport<T>(path: string, filters: ReportFilters, signal?: AbortSignal): Promise<T> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const query = params.size ? `?${params}` : ''
  return request<T>(`${path}${query}`, { signal, cache: 'no-store' })
}

export const api = {
  listCenters,

  dashboardStatistics(filters: DashboardFilters, signal?: AbortSignal): Promise<DashboardStatisticsResponse> {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries({ ...filters })) {
      if (value !== null && value !== '') params.set(key, String(value))
    }
    const query = params.size ? `?${params}` : ''
    return request<DashboardStatisticsResponse>(`/dashboard/estatisticas${query}`, { signal, cache: 'no-store' })
  },

  listBreeds(signal?: AbortSignal): Promise<Breed[]> {
    return request<Breed[]>('/racas', { signal, cache: 'no-store' })
  },

  animals(filters: AnimalReportFilters, signal?: AbortSignal): Promise<Animal[]> {
    return requestReport('/animais', filters, signal)
  },

  speciesSummary(filters: AnimalReportFilters, signal?: AbortSignal): Promise<SpeciesSummary[]> {
    return requestReport('/animais/resumo-por-especie', filters, signal)
  },

  ageGroupSummary(filters: AnimalReportFilters, signal?: AbortSignal): Promise<AgeGroupSummary[]> {
    return requestReport('/animais/faixas-etarias', filters, signal)
  },

  recommendedAnimals(userId: number, signal?: AbortSignal): Promise<Animal[]> {
    return requestReport('/animais/recomendados', { userId }, signal)
  },

  emptyCenters(filters: CenterLocationFilters, signal?: AbortSignal): Promise<EmptyCenterReport[]> {
    return requestReport('/relatorios/centros-sem-animais-disponiveis', filters, signal)
  },

  breedAnimalCoverage(filters: Pick<ReportFilters, 'species' | 'matchStatus'>, signal?: AbortSignal): Promise<BreedAnimalCoverageReport[]> {
    return requestReport('/relatorios/cobertura-racas-animais', filters, signal)
  },

  unmetPreferences(filters: Pick<ReportFilters, 'userId' | 'desiredSpecies' | 'breedId'>, signal?: AbortSignal): Promise<UnmetPreferenceReport[]> {
    return requestReport('/relatorios/preferencias-nao-atendidas', filters, signal)
  },

  olderAnimals(filters: Pick<ReportFilters, 'species' | 'centerId'>, signal?: AbortSignal): Promise<OlderAnimalReport[]> {
    return requestReport('/relatorios/animais-acima-media-idade', filters, signal)
  },

  centerOperations(filters: CenterLocationFilters & Pick<ReportFilters, 'centerId'>, signal?: AbortSignal): Promise<CenterOperationsReport[]> {
    return requestReport('/relatorios/painel-centros', filters, signal)
  },

  breedSupplyDemand(filters: Pick<ReportFilters, 'species' | 'breedId' | 'supplyStatus'>, signal?: AbortSignal): Promise<BreedSupplyDemandReport[]> {
    return requestReport('/relatorios/oferta-demanda-racas', filters, signal)
  },

  listUsers(signal?: AbortSignal): Promise<UserSummary[]> {
    return request<UserSummary[]>('/usuarios', { signal })
  },

  createAnimal(input: AnimalInput, photoUrl?: string): Promise<Animal> {
    return request<Animal>('/animais', { method: 'POST', body: JSON.stringify({ ...input, photoUrl }) })
  },

  updateAnimal(id: number, input: AnimalInput, photoUrl?: string): Promise<Animal> {
    return request<Animal>(`/animais/${id}`, { method: 'PUT', body: JSON.stringify({ ...input, photoUrl }) })
  },

  deleteAnimal(id: number): Promise<void> {
    return request<void>(`/animais/${id}`, { method: 'DELETE' })
  },

  createCenter(input: CenterInput & { password: string }): Promise<Center> {
    return request<Center>('/centros', { method: 'POST', body: JSON.stringify(input) })
  },

  updateCenter(id: number, input: CenterInput): Promise<Center> {
    return request<Center>(`/centros/${id}`, { method: 'PUT', body: JSON.stringify(input) })
  },

  deleteCenter(id: number): Promise<void> {
    return request<void>(`/centros/${id}`, { method: 'DELETE' })
  },

  createBreed(input: BreedInput): Promise<Breed> {
    return request<Breed>('/racas', { method: 'POST', body: JSON.stringify(input) })
  },

  updateBreed(id: number, input: BreedInput): Promise<Breed> {
    return request<Breed>(`/racas/${id}`, { method: 'PUT', body: JSON.stringify(input) })
  },

  deleteBreed(id: number): Promise<void> {
    return request<void>(`/racas/${id}`, { method: 'DELETE' })
  },

  async loadPreferences() {
    const [preferences, users, breeds] = await Promise.all([
      request<Preference[]>('/preferencias'),
      request<UserSummary[]>('/usuarios'),
      request<Breed[]>('/racas'),
    ])

    return { preferences, users, breeds }
  },

  listPreferences(): Promise<Preference[]> {
    return request<Preference[]>('/preferencias')
  },

  createPreference(input: PreferenceInput): Promise<Preference> {
    return request<Preference>('/preferencias', { method: 'POST', body: JSON.stringify(input) })
  },

  updatePreference(id: number, input: PreferenceInput): Promise<Preference> {
    return request<Preference>(`/preferencias/${id}`, { method: 'PUT', body: JSON.stringify(input) })
  },

  deletePreference(id: number): Promise<void> {
    return request<void>(`/preferencias/${id}`, { method: 'DELETE' })
  },

  animalPriorities(signal?: AbortSignal): Promise<AnimalPriorityReport[]> {
    return requestReport('/relatorios/prioridade-adocao', {}, signal)
  },

  userCompatibility(userId: number, signal?: AbortSignal): Promise<AnimalCompatibilityReport[]> {
    return requestReport('/relatorios/compatibilidade-usuario', { userId }, signal)
  },

  completeAdoption(input: CompleteAdoptionInput): Promise<AdoptionCompletionResult> {
    return request<AdoptionCompletionResult>('/relatorios/procedimentos/concluir-adocao', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  redistributeAnimals(input: RedistributeAnimalsInput): Promise<RedistributionResult> {
    return request<RedistributionResult>('/relatorios/procedimentos/redistribuir-animais', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  auditLogs(signal?: AbortSignal): Promise<AnimalAuditLogReport[]> {
    return requestReport('/relatorios/logs-auditoria', {}, signal)
  },

  registerInterest(input: InterestInput): Promise<void> {
    return request<void>('/relatorios/interesses', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
}
