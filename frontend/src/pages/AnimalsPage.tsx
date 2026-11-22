import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import { AnimalPhoto } from '../components/AnimalPhoto'
import { dateLabel, sexLabel, sizeLabel, speciesLabel } from '../format'
import type { Animal, AnimalInput, Breed, Center, Species } from '../types'
import {
  Availability,
  EmptyState,
  ErrorMessage,
  Panel,
  PlusIcon,
  deleteLinkClass,
  editLinkClass,
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  tableClass,
  tableHeadClass,
  tableRowClass,
} from '../components/ui'

interface AnimalsPageProps {
  animals: Animal[]
  breeds: Breed[]
  centers: Center[]
  refresh: () => Promise<void>
}

interface AnimalDraft {
  name: string
  species: Species
  birthDate: string
  sex: string
  size: string
  color: string
  description: string
  available: boolean
  centerId: string
  breedId: string
}

function draftFromAnimal(animal: Animal | null): AnimalDraft {
  return {
    name: animal?.name || '',
    species: animal?.species || 'Cao',
    birthDate: animal?.birthDate || '',
    sex: animal?.sex || '',
    size: animal?.size || '',
    color: animal?.color || '',
    description: animal?.description || '',
    available: animal?.available ?? true,
    centerId: animal?.centerId.toString() || '',
    breedId: animal?.breedId?.toString() || '',
  }
}

export function AnimalsPage({ animals, breeds, centers, refresh }: AnimalsPageProps) {
  const [search, setSearch] = useState('')
  const [speciesFilter, setSpeciesFilter] = useState('all')
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const [editor, setEditor] = useState<Animal | 'new' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editor) {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      editorRef.current?.focus({ preventScroll: true })
    }
  }, [editor, error])

  function openEditor(target: Animal | 'new') {
    setError('')
    setEditor(target)
    if (editor === target) editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const term = search.trim().toLocaleLowerCase('pt-BR')
  const searching = term.length > 0
  const filteredAnimals = animals.filter((animal) => {
    const matchesSearch = !term || [animal.name, animal.breedName, animal.centerName, String(animal.id)]
      .some((value) => value?.toLocaleLowerCase('pt-BR').includes(term))
    return matchesSearch
      && (speciesFilter === 'all' || animal.species === speciesFilter)
      && (availabilityFilter === 'all' || String(animal.available) === availabilityFilter)
  })

  async function save(input: AnimalInput, photoUrl?: string, file?: File) {
    setBusy(true)
    setError('')
    try {
      const photoData = file ? await encodePhoto(file) : undefined
      if (editor === 'new') {
        await api.createAnimal(input, photoUrl, photoData)
      } else if (editor) {
        await api.updateAnimal(editor.id, input, photoUrl, photoData)
      }
      setEditor(null)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o animal.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(animal: Animal) {
    if (!window.confirm(`Excluir ${animal.name}? A foto e os interesses registrados para este animal também serão removidos.`)) return

    setBusy(true)
    setError('')
    try {
      await api.deleteAnimal(animal.id)
      await refresh()
      if (editor !== 'new' && editor?.id === animal.id) setEditor(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível excluir o animal.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {error && !editor && <ErrorMessage message={error} />}
      {editor && (
        <div ref={editorRef} tabIndex={-1} className="outline-none">
          <Panel title={editor === 'new' ? 'Cadastrar animal' : `Editar ${editor.name}`} detail="Campos marcados com * são obrigatórios">
            {error && <div className="px-5 pt-1 pb-3"><ErrorMessage message={error} /></div>}
            <AnimalForm
              key={editor === 'new' ? 'new' : editor.id}
              animal={editor === 'new' ? null : editor}
              breeds={breeds}
              centers={centers}
              busy={busy}
              onCancel={() => setEditor(null)}
              onSave={save}
            />
          </Panel>
        </div>
      )}
      <Panel
        title="Animais cadastrados"
        detail={`${filteredAnimals.length} de ${animals.length} animais`}
        action={<button type="button" disabled={busy} onClick={() => openEditor('new')} className={primaryButtonClass}><PlusIcon /> Novo animal</button>}
      >
        <div className="grid gap-3 border-y border-toolbar-line bg-toolbar px-5 py-4 md:grid-cols-[1fr_200px_200px]">
          <label className="sr-only" htmlFor="animal-search">Buscar animais</label>
          <input id="animal-search" className={fieldClass} placeholder="Buscar por nome, raça ou centro" value={search} onChange={(event) => setSearch(event.target.value)} />
          <label className="sr-only" htmlFor="animal-species">Filtrar por espécie</label>
          <select id="animal-species" className={fieldClass} value={speciesFilter} onChange={(event) => setSpeciesFilter(event.target.value)}>
            <option value="all">Todas as espécies</option>
            <option value="Cao">Cães</option>
            <option value="Gato">Gatos</option>
          </select>
          <label className="sr-only" htmlFor="animal-availability">Filtrar por situação</label>
          <select id="animal-availability" className={fieldClass} value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
            <option value="all">Todas as situações</option>
            <option value="true">Disponíveis</option>
            <option value="false">Indisponíveis</option>
          </select>
        </div>
        {filteredAnimals.length === 0 ? <EmptyState>Nenhum animal corresponde aos filtros.</EmptyState> : (<>
          <ul className={`divide-y divide-line border-t border-line ${searching ? '' : 'sm:hidden'}`}>
            {filteredAnimals.map((animal) => (
              <li key={animal.id} className="flex items-start gap-4 px-5 py-4">
                {searching && <AnimalPhoto animal={animal} expanded />}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    {searching ? <AnimalName animal={animal} /> : <AnimalIdentity animal={animal} />}
                    <Availability available={animal.available} />
                  </div>
                  <p className="text-sm text-ink">{speciesLabel(animal.species)} · {animal.breedName || 'Raça não informada'}</p>
                  <p className="text-xs text-muted">{sexLabel(animal.sex)} · {sizeLabel(animal.size)} · Nasc.: {dateLabel(animal.birthDate)}</p>
                  <p className="text-xs text-muted">{animal.centerName} <span className="font-mono text-subtle">#{animal.centerId}</span></p>
                  {searching && animal.color && <p className="text-sm text-ink">Cor: {animal.color}</p>}
                  {searching && animal.description && <p className="whitespace-pre-wrap break-words text-sm text-muted">{animal.description}</p>}
                  <div className="-ml-2 flex gap-1 pt-1">
                    <button type="button" disabled={busy} onClick={() => openEditor(animal)} className={editLinkClass}>Editar</button>
                    <button type="button" disabled={busy} onClick={() => void remove(animal)} className={deleteLinkClass}>Excluir</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {!searching && <div className="hidden overflow-x-auto sm:block">
            <table className={tableClass}>
              <thead className={tableHeadClass}>
                <tr><th className="px-5 py-3">Animal</th><th className="px-5 py-3">Espécie / raça</th><th className="px-5 py-3">Características</th><th className="px-5 py-3">Centro</th><th className="px-5 py-3">Situação</th><th className="px-5 py-3 text-right">Ações</th></tr>
              </thead>
              <tbody>
                {filteredAnimals.map((animal) => (
                  <tr key={animal.id} className={tableRowClass}>
                    <td className="px-5 py-3"><AnimalIdentity animal={animal} /></td>
                    <td className="px-5 py-3">{speciesLabel(animal.species)}<div className="text-xs text-subtle">{animal.breedName || 'Raça não informada'}</div></td>
                    <td className="px-5 py-3">{sexLabel(animal.sex)} · {sizeLabel(animal.size)}<div className="text-xs text-subtle">Nasc.: {dateLabel(animal.birthDate)}</div></td>
                    <td className="px-5 py-3">{animal.centerName}<div className="font-mono text-xs text-subtle">#{animal.centerId}</div></td>
                    <td className="px-5 py-3"><Availability available={animal.available} /></td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-xs">
                      <button type="button" disabled={busy} onClick={() => openEditor(animal)} className={editLinkClass}>Editar</button>
                      <button type="button" disabled={busy} onClick={() => void remove(animal)} className={deleteLinkClass}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </>)}
      </Panel>

    </div>
  )
}

function AnimalIdentity({ animal }: { animal: Animal }) {
  return (
    <div className="flex items-center gap-3">
      <AnimalPhoto animal={animal} />
      <AnimalName animal={animal} />
    </div>
  )
}

function AnimalName({ animal }: { animal: Animal }) {
  return (
    <p><span className="font-semibold text-ink">{animal.name}</span><span className="ml-2 font-mono text-xs text-subtle">#{animal.id}</span></p>
  )
}

function encodePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1])
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo da foto.'))
    reader.readAsDataURL(file)
  })
}

function AnimalForm({ animal, breeds, centers, busy, onCancel, onSave }: {
  animal: Animal | null
  breeds: Breed[]
  centers: Center[]
  busy: boolean
  onCancel: () => void
  onSave: (input: AnimalInput, photoUrl?: string, file?: File) => Promise<void>
}) {
  const [draft, setDraft] = useState(() => draftFromAnimal(animal))
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoFile, setPhotoFile] = useState<File>()
  const [fileError, setFileError] = useState('')
  const photoFileRef = useRef<HTMLInputElement>(null)
  const matchingBreeds = breeds.filter((breed) => breed.species === draft.species)

  function update<Key extends keyof AnimalDraft>(key: Key, value: AnimalDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input: AnimalInput = {
      name: draft.name.trim(),
      species: draft.species,
      birthDate: draft.birthDate || null,
      sex: draft.sex ? draft.sex as Animal['sex'] : null,
      size: draft.size ? draft.size as Animal['size'] : null,
      color: draft.color.trim() || null,
      description: draft.description.trim() || null,
      available: draft.available,
      centerId: Number(draft.centerId),
      breedId: draft.breedId ? Number(draft.breedId) : null,
    }
    void onSave(input, photoFile ? undefined : photoUrl.trim() || undefined, photoFile)
  }

  return (
    <form onSubmit={submit} className="space-y-5 px-5 pt-2 pb-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className={labelClass}>Nome *
          <input className={`${fieldClass} mt-1.5`} value={draft.name} onChange={(event) => update('name', event.target.value)} maxLength={100} required />
        </label>
        <label className={labelClass}>Espécie *
          <select className={`${fieldClass} mt-1.5`} value={draft.species} onChange={(event) => setDraft((current) => ({ ...current, species: event.target.value as Species, breedId: '' }))}>
            <option value="Cao">Cão</option><option value="Gato">Gato</option>
          </select>
        </label>
        <label className={labelClass}>Raça
          <select className={`${fieldClass} mt-1.5`} value={draft.breedId} onChange={(event) => update('breedId', event.target.value)}>
            <option value="">Não informada</option>
            {matchingBreeds.map((breed) => <option key={breed.id} value={breed.id}>{breed.name}</option>)}
          </select>
        </label>
        <label className={labelClass}>Centro de adoção *
          <select className={`${fieldClass} mt-1.5`} value={draft.centerId} onChange={(event) => update('centerId', event.target.value)} required>
            <option value="">Selecione um centro</option>
            {centers.map((center) => <option key={center.id} value={center.id}>{center.name} (#{center.id})</option>)}
          </select>
        </label>
        <label className={labelClass}>Data de nascimento
          <input className={`${fieldClass} mt-1.5`} type="date" max={new Date().toISOString().slice(0, 10)} value={draft.birthDate} onChange={(event) => update('birthDate', event.target.value)} />
        </label>
        <label className={labelClass}>Sexo
          <select className={`${fieldClass} mt-1.5`} value={draft.sex} onChange={(event) => update('sex', event.target.value)}>
            <option value="">Não informado</option><option value="Macho">Macho</option><option value="Femea">Fêmea</option>
          </select>
        </label>
        <label className={labelClass}>Porte
          <select className={`${fieldClass} mt-1.5`} value={draft.size} onChange={(event) => update('size', event.target.value)}>
            <option value="">Não informado</option><option value="Pequeno">Pequeno</option><option value="Medio">Médio</option><option value="Grande">Grande</option>
          </select>
        </label>
        <label className={labelClass}>Cor
          <input className={`${fieldClass} mt-1.5`} value={draft.color} onChange={(event) => update('color', event.target.value)} maxLength={50} />
        </label>
        <label className={labelClass}>Situação *
          <select className={`${fieldClass} mt-1.5`} value={String(draft.available)} onChange={(event) => update('available', event.target.value === 'true')}>
            <option value="true">Disponível</option><option value="false">Indisponível</option>
          </select>
        </label>
      </div>
      <label className={labelClass}>{animal?.photoUrl ? 'Novo link da foto (opcional)' : 'Link da foto (opcional)'}
        <input
          className={`${fieldClass} mt-1.5`}
          type="url"
          maxLength={500}
          placeholder="https://…"
          disabled={Boolean(photoFile) || busy}
          value={photoUrl}
          onChange={(event) => setPhotoUrl(event.target.value)}
        />
        <span className="mt-1 block text-xs font-normal text-muted">Cole o link de uma imagem da internet ou envie um arquivo abaixo.</span>
      </label>
      <label className={labelClass}>Foto do computador (opcional)
        <input
          className={`${fieldClass} mt-1.5`}
          ref={photoFileRef}
          type="file"
          accept="image/jpeg,image/png"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file && file.size > 3 * 1024 * 1024) {
              setFileError('A foto deve ter no máximo 3 MB.')
              event.target.value = ''
              setPhotoFile(undefined)
              return
            }
            setFileError('')
            setPhotoFile(file)
          }}
        />
        <span className="mt-1 block text-xs font-normal text-muted">JPEG ou PNG, até 3 MB.</span>
      </label>
      {fileError && <ErrorMessage message={fileError} />}
      {(photoFile || fileError) && (
        <button type="button" disabled={busy} className={secondaryButtonClass} onClick={() => {
          if (photoFileRef.current) photoFileRef.current.value = ''
          setPhotoFile(undefined)
          setFileError('')
        }}>Limpar arquivo selecionado</button>
      )}
      <label className={labelClass}>Descrição
        <textarea className={`${fieldClass} mt-1.5 min-h-24 resize-y`} value={draft.description} onChange={(event) => update('description', event.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <button type="submit" disabled={busy || Boolean(fileError)} className={primaryButtonClass}>{busy ? 'Salvando...' : 'Salvar animal'}</button>
        <button type="button" disabled={busy} onClick={onCancel} className={secondaryButtonClass}>Cancelar</button>
      </div>
    </form>
  )
}
