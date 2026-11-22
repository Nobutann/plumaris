import { useEffect, useState } from 'react'
import { api } from '../api'
import { ErrorMessage, fieldClass, labelClass, primaryButtonClass, secondaryButtonClass } from '../components/ui'
import { speciesLabel } from '../format'
import type { CatalogData, ReportFilters, UserSummary } from '../types'

type FilterName = keyof ReportFilters
type Option<T> = { value: T; label: string }
type FilterOptions = { [K in FilterName]?: Option<NonNullable<ReportFilters[K]>>[] }

const speciesOptions = (['Cao', 'Gato'] as const).map((value) => ({ value, label: speciesLabel(value) }))
const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
const labels: Record<FilterName, string> = {
  species: 'Espécie',
  centerId: 'Centro',
  available: 'Situação',
  city: 'Cidade',
  state: 'Estado',
  matchStatus: 'Mostrar',
  userId: 'Pessoa',
  desiredSpecies: 'Espécie desejada',
  breedId: 'Raça',
  supplyStatus: 'Procura',
}

interface ReportFilterFormProps {
  fields: readonly FilterName[]
  data: CatalogData
  draft: ReportFilters
  applied: ReportFilters
  onEdit: (draft: ReportFilters) => void
  onApply: (filters: ReportFilters) => void
  onClear: () => void
}

export function ReportFilterForm({ fields, data, draft, applied, onEdit, onApply, onClear }: ReportFilterFormProps) {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [userError, setUserError] = useState('')
  const [userAttempt, setUserAttempt] = useState(0)
  const needsUsers = fields.includes('userId')

  useEffect(() => {
    if (!needsUsers) return

    const controller = new AbortController()
    api.listUsers(controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setUsers(rows)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setUserError(cause instanceof Error ? cause.message : 'Não foi possível carregar a lista de pessoas.')
        }
      })
    return () => controller.abort()
  }, [needsUsers, userAttempt])

  const options: FilterOptions = {
    species: speciesOptions,
    desiredSpecies: speciesOptions,
    available: [{ value: true, label: 'Disponível' }, { value: false, label: 'Indisponível' }],
    centerId: data.centers.map((center) => ({ value: center.id, label: center.name })),
    state: states.map((value) => ({ value, label: value })),
    userId: users.map((user) => ({ value: user.id, label: user.name })),
    breedId: data.breeds.map((breed) => ({ value: breed.id, label: `${breed.name} (${speciesLabel(breed.species)})` })),
    matchStatus: [
      { value: 'Raca com animal', label: 'Raças com animais' },
      { value: 'Raca sem animal', label: 'Raças sem animais' },
      { value: 'Animal sem raca', label: 'Animais sem raça definida' },
    ],
    supplyStatus: [
      { value: 'Deficit de oferta', label: 'Mais procura que animais' },
      { value: 'Superavit de oferta', label: 'Mais animais que procura' },
      { value: 'Oferta equilibrada', label: 'Equilibrado' },
    ],
  }

  function filterLabel(field: FilterName, value: string | number | boolean) {
    return options[field]?.find((option) => option.value === value)?.label
      ?? (typeof value === 'number' ? `#${value}` : String(value))
  }

  const appliedLabels = fields.flatMap((field) => {
    const value = applied[field]
    return value === undefined ? [] : [`${labels[field]} · ${filterLabel(field, value)}`]
  })

  return (
    <div className="border-y border-toolbar-line bg-toolbar px-5 py-4">
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
        event.preventDefault()
        const city = draft.city?.replace(/\s+/g, ' ').trim()
        onApply({ ...draft, city: city || undefined })
      }}>
        {fields.map((field) => {
          const value = draft[field]
          const choices = options[field]
          return (
            <label key={field} className={`${labelClass} w-full sm:w-52`}>{labels[field]}
              {field === 'city' ? (
                <input className={`${fieldClass} mt-1.5`} type="text" value={draft.city ?? ''}
                  onChange={(event) => onEdit({ ...draft, city: event.target.value })} />
              ) : (
                <select className={`${fieldClass} mt-1.5`} value={String(value ?? '')} onChange={(event) => {
                  const selected = choices?.find((option) => String(option.value) === event.target.value)
                  onEdit({ ...draft, [field]: selected?.value })
                }}>
                  <option value="">Qualquer</option>
                  {value !== undefined && !choices?.some((option) => option.value === value) && (
                    <option value={String(value)}>{filterLabel(field, value)}</option>
                  )}
                  {choices?.map((option) => (
                    <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
                  ))}
                </select>
              )}
            </label>
          )
        })}
        <button type="submit" className={primaryButtonClass}>Aplicar filtros</button>
        <button type="button" className={secondaryButtonClass} onClick={onClear}>Limpar filtros</button>
      </form>
      {needsUsers && userError && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ErrorMessage message={userError} />
          <button type="button" className={secondaryButtonClass} onClick={() => {
            setUserError('')
            setUserAttempt((attempt) => attempt + 1)
          }}>Tentar novamente</button>
        </div>
      )}
      <p className="mt-3 text-xs text-muted" aria-live="polite">
        {appliedLabels.length ? `Filtros: ${appliedLabels.join(' · ')}` : 'Mostrando tudo, sem filtros.'}
      </p>
    </div>
  )
}
