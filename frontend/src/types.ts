export type Species = 'Cao' | 'Gato'

export interface Animal {
  id: number
  name: string
  species: Species
  birthDate: string | null
  sex: 'Macho' | 'Femea' | null
  size: 'Pequeno' | 'Medio' | 'Grande' | null
  color: string | null
  description: string | null
  available: boolean
  centerId: number
  centerName: string
  breedId: number | null
  breedName: string | null
}

export interface AnimalInput {
  name: string
  species: Species
  birthDate: string | null
  sex: Animal['sex']
  size: Animal['size']
  color: string | null
  description: string | null
  available: boolean
  centerId: number
  breedId: number | null
}

export interface Breed {
  id: number
  name: string
  species: Species
}

export type BreedInput = Pick<Breed, 'name' | 'species'>

export interface Center {
  id: number
  name: string
}

export interface SpeciesSummary {
  species: Species
  total: number
  available: number
  unavailable: number
}

export interface AgeGroupSummary {
  species: Species
  ageGroup: string
  total: number
}

export interface DashboardData {
  animals: Animal[]
  breeds: Breed[]
  centers: Center[]
  speciesSummary: SpeciesSummary[]
  ageGroupSummary: AgeGroupSummary[]
}

export interface EmptyCenterReport {
  centerId: number
  centerName: string
  city: string | null
  state: string | null
}

export interface BreedAnimalCoverageReport {
  breedId: number | null
  breedName: string | null
  breedSpecies: Species | null
  animalId: number | null
  animalName: string | null
  animalSpecies: Species | null
  matchStatus: string
}

export interface UnmetPreferenceReport {
  userId: number
  userName: string
  email: string
  desiredSpecies: Species | null
  desiredSize: Animal['size']
  minimumAge: number | null
  maximumAge: number | null
  desiredSex: Animal['sex']
  desiredColor: string | null
  breedId: number | null
  breedName: string | null
}

export interface OlderAnimalReport {
  animalId: number
  animalName: string
  species: Species
  ageYears: number
  speciesAverageAge: number
  centerName: string
}

export interface CenterOperationsReport {
  centerId: number
  centerName: string
  city: string | null
  state: string | null
  mainCenterId: number | null
  mainCenterName: string | null
  totalAnimals: number
  availableAnimals: number
  unavailableAnimals: number
  totalInterests: number
  lastInterest: string | null
}

export interface BreedSupplyDemandReport {
  breedId: number
  breedName: string
  species: Species
  preferenceCount: number
  totalAnimals: number
  availableAnimals: number
  unavailableAnimals: number
  interestedUsers: number
  totalInterests: number
  supplyBalance: number
  supplyStatus: string
}

export interface AdvancedReports {
  emptyCenters: EmptyCenterReport[]
  breedAnimalCoverage: BreedAnimalCoverageReport[]
  unmetPreferences: UnmetPreferenceReport[]
  olderAnimals: OlderAnimalReport[]
  centerOperations: CenterOperationsReport[]
  breedSupplyDemand: BreedSupplyDemandReport[]
}
