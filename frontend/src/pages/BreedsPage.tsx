import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import { speciesLabel } from '../format'
import type { Breed, BreedInput, Species } from '../types'
import {
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

interface BreedsPageProps {
  breeds: Breed[]
  refresh: () => Promise<void>
}

export function BreedsPage({ breeds, refresh }: BreedsPageProps) {
  const [search, setSearch] = useState('')
  const [speciesFilter, setSpeciesFilter] = useState('all')
  const [editor, setEditor] = useState<Breed | 'new' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editor) {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      editorRef.current?.focus({ preventScroll: true })
    }
  }, [editor, error])

  function openEditor(target: Breed | 'new') {
    setError('')
    setEditor(target)
    if (editor === target) editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const filteredBreeds = breeds.filter((breed) =>
    breed.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))
    && (speciesFilter === 'all' || breed.species === speciesFilter),
  )

  async function save(input: BreedInput) {
    setBusy(true)
    setError('')
    try {
      if (editor === 'new') {
        await api.createBreed(input)
      } else if (editor) {
        await api.updateBreed(editor.id, input)
      }
      await refresh()
      setEditor(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a raça.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(breed: Breed) {
    if (!window.confirm(`Excluir a raça ${breed.name}? Os animais associados continuarão cadastrados, sem raça definida.`)) return

    setBusy(true)
    setError('')
    try {
      await api.deleteBreed(breed.id)
      await refresh()
      if (editor !== 'new' && editor?.id === breed.id) setEditor(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível excluir a raça.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {error && !editor && <ErrorMessage message={error} />}
      {editor && (
        <div ref={editorRef} tabIndex={-1} className="outline-none">
          <Panel title={editor === 'new' ? 'Cadastrar raça' : `Editar ${editor.name}`} detail="Nome e espécie são obrigatórios">
            {error && <div className="px-5 pt-1 pb-3"><ErrorMessage message={error} /></div>}
            <BreedForm key={editor === 'new' ? 'new' : editor.id} breed={editor === 'new' ? null : editor} busy={busy} onSave={save} onCancel={() => setEditor(null)} />
          </Panel>
        </div>
      )}
      <Panel
        title="Raças cadastradas"
        detail={`${filteredBreeds.length} de ${breeds.length} raças`}
        action={<button type="button" onClick={() => openEditor('new')} className={primaryButtonClass}><PlusIcon /> Nova raça</button>}
      >
        <div className="grid gap-3 border-y border-toolbar-line bg-toolbar px-5 py-4 md:grid-cols-[1fr_170px]">
          <label className="sr-only" htmlFor="breed-search">Buscar raças</label>
          <input id="breed-search" className={fieldClass} placeholder="Buscar por nome" value={search} onChange={(event) => setSearch(event.target.value)} />
          <label className="sr-only" htmlFor="breed-species">Filtrar por espécie</label>
          <select id="breed-species" className={fieldClass} value={speciesFilter} onChange={(event) => setSpeciesFilter(event.target.value)}>
            <option value="all">Todas as espécies</option><option value="Cao">Cães</option><option value="Gato">Gatos</option>
          </select>
        </div>
        {filteredBreeds.length === 0 ? <EmptyState>Nenhuma raça corresponde aos filtros.</EmptyState> : (<>
          <ul className="divide-y divide-line border-t border-line sm:hidden">
            {filteredBreeds.map((breed) => (
              <li key={breed.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <p><span className="font-semibold text-ink">{breed.name}</span><span className="ml-2 font-mono text-xs text-subtle">#{breed.id}</span>
                  <span className="block text-xs text-muted">{speciesLabel(breed.species)}</span></p>
                <div className="flex shrink-0 gap-1">
                  <button type="button" disabled={busy} onClick={() => openEditor(breed)} className={editLinkClass}>Editar</button>
                  <button type="button" disabled={busy} onClick={() => void remove(breed)} className={deleteLinkClass}>Excluir</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className={tableClass}>
              <thead className={tableHeadClass}>
                <tr><th className="px-5 py-3">ID</th><th className="px-5 py-3">Nome</th><th className="px-5 py-3">Espécie</th><th className="px-5 py-3 text-right">Ações</th></tr>
              </thead>
              <tbody>
                {filteredBreeds.map((breed) => (
                  <tr key={breed.id} className={tableRowClass}>
                    <td className="px-5 py-3 font-mono text-xs text-subtle">#{breed.id}</td>
                    <td className="px-5 py-3 font-semibold text-ink">{breed.name}</td>
                    <td className="px-5 py-3">{speciesLabel(breed.species)}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-xs">
                      <button type="button" disabled={busy} onClick={() => openEditor(breed)} className={editLinkClass}>Editar</button>
                      <button type="button" disabled={busy} onClick={() => void remove(breed)} className={deleteLinkClass}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>)}
      </Panel>

    </div>
  )
}

function BreedForm({ breed, busy, onSave, onCancel }: {
  breed: Breed | null
  busy: boolean
  onSave: (input: BreedInput) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(breed?.name || '')
  const [species, setSpecies] = useState<Species>(breed?.species || 'Cao')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSave({ name: name.trim(), species })
  }

  return (
    <form onSubmit={submit} className="space-y-5 px-5 pt-2 pb-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Nome *
          <input className={`${fieldClass} mt-1.5`} value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
        </label>
        <label className={labelClass}>Espécie *
          <select className={`${fieldClass} mt-1.5`} value={species} onChange={(event) => setSpecies(event.target.value as Species)}>
            <option value="Cao">Cão</option><option value="Gato">Gato</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <button type="submit" disabled={busy} className={primaryButtonClass}>{busy ? 'Salvando...' : 'Salvar raça'}</button>
        <button type="button" disabled={busy} onClick={onCancel} className={secondaryButtonClass}>Cancelar</button>
      </div>
    </form>
  )
}
