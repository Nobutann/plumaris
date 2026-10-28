import type {
  AdvancedReports,
  AgeGroupSummary,
  Animal,
  AnimalInput,
  Breed,
  BreedInput,
  BreedAnimalCoverageReport,
  BreedSupplyDemandReport,
  Center,
  CenterOperationsReport,
  DashboardData,
  EmptyCenterReport,
  OlderAnimalReport,
  SpeciesSummary,
  UnmetPreferenceReport,
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
  } catch {
    throw new Error('Não foi possível conectar à API. Verifique se o backend está em execução.')
  }

  if (!response.ok) {
    const problem = await response.json().catch(() => null) as ApiProblem | null
    throw new Error(problem?.detail || problem?.title || `A API retornou o erro ${response.status}.`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const api = {
  async loadDashboard(): Promise<DashboardData> {
    const [animals, breeds, centers, speciesSummary, ageGroupSummary] = await Promise.all([
      request<Animal[]>('/animais'),
      request<Breed[]>('/racas'),
      request<Center[]>('/centros'),
      request<SpeciesSummary[]>('/animais/resumo-por-especie'),
      request<AgeGroupSummary[]>('/animais/faixas-etarias'),
    ])

    return { animals, breeds, centers, speciesSummary, ageGroupSummary }
  },

  recommendedAnimals(userId: number): Promise<Animal[]> {
    return request<Animal[]>(`/animais/recomendados?userId=${userId}`)
  },

  async loadAdvancedReports(): Promise<AdvancedReports> {
    const [emptyCenters, breedAnimalCoverage, unmetPreferences, olderAnimals, centerOperations, breedSupplyDemand] = await Promise.all([
      request<EmptyCenterReport[]>('/relatorios/centros-sem-animais-disponiveis'),
      request<BreedAnimalCoverageReport[]>('/relatorios/cobertura-racas-animais'),
      request<UnmetPreferenceReport[]>('/relatorios/preferencias-nao-atendidas'),
      request<OlderAnimalReport[]>('/relatorios/animais-acima-media-idade'),
      request<CenterOperationsReport[]>('/relatorios/painel-centros'),
      request<BreedSupplyDemandReport[]>('/relatorios/oferta-demanda-racas'),
    ])

    return { emptyCenters, breedAnimalCoverage, unmetPreferences, olderAnimals, centerOperations, breedSupplyDemand }
  },

  createAnimal(input: AnimalInput): Promise<Animal> {
    return request<Animal>('/animais', { method: 'POST', body: JSON.stringify(input) })
  },

  updateAnimal(id: number, input: AnimalInput): Promise<Animal> {
    return request<Animal>(`/animais/${id}`, { method: 'PUT', body: JSON.stringify(input) })
  },

  deleteAnimal(id: number): Promise<void> {
    return request<void>(`/animais/${id}`, { method: 'DELETE' })
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
}
