import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import {
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
import { sexLabel, sizeLabel, speciesLabel } from '../format'
import type { Breed, Preference, PreferenceInput, UserSummary } from '../types'

export function PreferencesPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.loadPreferences>> | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [editor, setEditor] = useState<Preference | 'new' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    api.loadPreferences()
      .then((result) => { if (active) setData(result) })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as preferências.')
      })
    return () => { active = false }
  }, [loadAttempt])

  useEffect(() => {
    if (editor) {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      editorRef.current?.focus({ preventScroll: true })
    }
  }, [editor])

  function openEditor(target: Preference | 'new') {
    setError('')
    setSuccess('')
    setEditor(target)
    if (editor === target) editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function refreshPreferences() {
    try {
      const preferences = await api.listPreferences()
      setData((current) => current && { ...current, preferences })
    } catch {
      setError('Não foi possível atualizar a lista. Use “Atualizar lista” para tentar novamente.')
    }
  }

  async function save(input: PreferenceInput) {
    if (!editor) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const saved = editor === 'new'
        ? await api.createPreference(input)
        : await api.updatePreference(editor.id, input)
      setData((current) => current && {
        ...current,
        preferences: [...current.preferences.filter(({ id }) => id !== saved.id), saved]
          .sort((first, next) => first.userName.localeCompare(next.userName, 'pt-BR') || first.id - next.id),
      })
      setEditor(null)
      setSuccess(editor === 'new' ? 'Preferência cadastrada.' : 'Preferência atualizada.')
      await refreshPreferences()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a preferência.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(preference: Preference) {
    if (!window.confirm(`Excluir a preferência de ${preference.userName}?`)) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await api.deletePreference(preference.id)
      setData((current) => current && {
        ...current,
        preferences: current.preferences.filter(({ id }) => id !== preference.id),
      })
      if (editor !== 'new' && editor?.id === preference.id) setEditor(null)
      setSuccess('Preferência excluída.')
      await refreshPreferences()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível excluir a preferência.')
    } finally {
      setBusy(false)
    }
  }

  function reload() {
    setError('')
    setSuccess('')
    setEditor(null)
    setData(null)
    setLoadAttempt((attempt) => attempt + 1)
  }

  if (!data) {
    return (
      <Panel title="Preferências cadastradas">
        {error ? (
          <div className="space-y-3 p-4">
            <ErrorMessage message={error} />
            <button type="button" onClick={reload} className={secondaryButtonClass}>Tentar novamente</button>
          </div>
        ) : <EmptyState><span role="status">Carregando preferências...</span></EmptyState>}
      </Panel>
    )
  }

  return (
    <div className="space-y-5">
      {success && <div role="status" className="border border-[#486d60] bg-[#1b3435] px-4 py-3 text-sm text-[#a8d7ba]">{success}</div>}
      {error && <ErrorMessage message={error} />}
      {editor && (
        <div ref={editorRef} tabIndex={-1} className="outline-none">
          <Panel title={editor === 'new' ? 'Cadastrar preferência' : `Editar preferência de ${editor.userName}`} detail="Os critérios de adoção são opcionais.">
            <PreferenceForm
              key={editor === 'new' ? 'new' : editor.id}
              preference={editor === 'new' ? null : editor}
              users={data.users}
              breeds={data.breeds}
              busy={busy}
              onSave={save}
              onCancel={() => { setEditor(null); setError('') }}
            />
          </Panel>
        </div>
      )}
      <Panel
        title="Preferências cadastradas"
        detail={`${data.preferences.length} registros`}
        action={(
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || editor !== null} onClick={reload} className={secondaryButtonClass}>Atualizar lista</button>
            <button type="button" disabled={busy || data.users.length === 0} onClick={() => openEditor('new')} className={primaryButtonClass}>+ Nova preferência</button>
          </div>
        )}
      >
        {data.preferences.length === 0 ? (
          <EmptyState>{data.users.length ? 'Nenhuma preferência cadastrada.' : 'Nenhum usuário disponível para cadastrar preferências.'}</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={tableHeadClass}>
                <tr>
                  {['Usuário', 'Espécie', 'Porte', 'Idade (anos)', 'Sexo', 'Cor', 'Raça'].map((label) => (
                    <th key={label} scope="col" className="px-4 py-2.5">{label}</th>
                  ))}
                  <th scope="col" className="px-4 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.preferences.map((preference) => (
                  <tr key={preference.id} className={tableRowClass}>
                    <td className="px-4 py-2.5 font-medium text-[#b7dbf0]">{preference.userName}</td>
                    <td className="px-4 py-2.5">{preference.desiredSpecies ? speciesLabel(preference.desiredSpecies) : '—'}</td>
                    <td className="px-4 py-2.5">{sizeLabel(preference.desiredSize)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{ageLabel(preference)}</td>
                    <td className="px-4 py-2.5">{sexLabel(preference.desiredSex)}</td>
                    <td className="px-4 py-2.5">{preference.desiredColor ?? '—'}</td>
                    <td className="px-4 py-2.5">{preference.breedName ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs">
                      <button type="button" disabled={busy} onClick={() => openEditor(preference)} className="mr-3 text-[#9fd2ef] hover:underline disabled:opacity-50">Editar</button>
                      <button type="button" disabled={busy} onClick={() => void remove(preference)} className="text-[#e6a4aa] hover:underline disabled:opacity-50">Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

function ageLabel({ minimumAge, maximumAge }: Preference) {
  if (minimumAge === null) return maximumAge === null ? '—' : `Até ${maximumAge}`
  return maximumAge === null ? `A partir de ${minimumAge}` : `${minimumAge}–${maximumAge}`
}

function PreferenceForm({ preference, users, breeds, busy, onSave, onCancel }: {
  preference: Preference | null
  users: UserSummary[]
  breeds: Breed[]
  busy: boolean
  onSave: (input: PreferenceInput) => Promise<void>
  onCancel: () => void
}) {
  const [species, setSpecies] = useState<NonNullable<PreferenceInput['desiredSpecies']> | ''>(preference?.desiredSpecies ?? '')
  const [breedId, setBreedId] = useState(preference?.breedId ?? null)
  const availableBreeds = breeds.filter((breed) => !species || breed.species === species || breed.id === breedId)
  const inputClass = `${fieldClass} mt-1.5`

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const minimumAge = values.get('minimumAge')
    const maximumAge = values.get('maximumAge')
    void onSave({
      userId: Number(values.get('userId')),
      desiredSpecies: species || null,
      desiredSize: (values.get('desiredSize') || null) as PreferenceInput['desiredSize'],
      minimumAge: minimumAge ? Number(minimumAge) : null,
      maximumAge: maximumAge ? Number(maximumAge) : null,
      desiredSex: (values.get('desiredSex') || null) as PreferenceInput['desiredSex'],
      desiredColor: String(values.get('desiredColor')).trim() || null,
      breedId,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5 p-4">
      <fieldset disabled={busy} className="grid gap-4 md:grid-cols-2 [&>label]:text-xs [&>label]:font-medium [&>label]:text-[#a9c2d2]">
        <label>Usuário *
          <select name="userId" className={inputClass} defaultValue={preference?.userId ?? ''} required>
            <option value="" disabled>Selecione um usuário</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name} (#{user.id})</option>)}
          </select>
        </label>
        <label>Espécie desejada
          <select className={inputClass} value={species} onChange={(event) => {
            const next = event.target.value as typeof species
            setSpecies(next)
            if (next && breeds.find((breed) => breed.id === breedId)?.species !== next) setBreedId(null)
          }}>
            <option value="">Qualquer espécie</option>
            <option value="Cao">Cão</option>
            <option value="Gato">Gato</option>
          </select>
        </label>
        <label>Porte desejado
          <select name="desiredSize" className={inputClass} defaultValue={preference?.desiredSize ?? ''}>
            <option value="">Qualquer porte</option>
            <option value="Pequeno">Pequeno</option>
            <option value="Medio">Médio</option>
            <option value="Grande">Grande</option>
          </select>
        </label>
        <label>Sexo desejado
          <select name="desiredSex" className={inputClass} defaultValue={preference?.desiredSex ?? ''}>
            <option value="">Qualquer sexo</option>
            <option value="Macho">Macho</option>
            <option value="Femea">Fêmea</option>
          </select>
        </label>
        <label>Idade mínima (anos)
          <input name="minimumAge" className={inputClass} type="number" min={0} max={2147483647} step={1} defaultValue={preference?.minimumAge ?? ''} />
        </label>
        <label>Idade máxima (anos)
          <input name="maximumAge" className={inputClass} type="number" min={0} max={2147483647} step={1} defaultValue={preference?.maximumAge ?? ''} />
        </label>
        <label>Cor desejada
          <input name="desiredColor" className={inputClass} maxLength={50} defaultValue={preference?.desiredColor ?? ''} />
        </label>
        <label>Raça desejada
          <select className={inputClass} value={breedId ?? ''} onChange={(event) => setBreedId(event.target.value ? Number(event.target.value) : null)}>
            <option value="">Qualquer raça</option>
            {availableBreeds.map((breed) => (
              <option key={breed.id} value={breed.id}>{breed.name} ({speciesLabel(breed.species)})</option>
            ))}
          </select>
        </label>
      </fieldset>
      <div className="flex flex-wrap gap-2 border-t border-[#29465b] pt-4">
        <button type="submit" disabled={busy} className={primaryButtonClass}>{busy ? 'Salvando...' : 'Salvar preferência'}</button>
        <button type="button" disabled={busy} onClick={onCancel} className={secondaryButtonClass}>Cancelar</button>
      </div>
    </form>
  )
}
