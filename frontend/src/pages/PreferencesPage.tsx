import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { FormEvent, Ref } from 'react'
import { api } from '../api'
import {
  EmptyState,
  ErrorMessage,
  Panel,
  PlusIcon,
  SuccessMessage,
  deleteLinkClass,
  editLinkClass,
  fieldClass,
  primaryButtonClass,
  secondaryButtonClass,
  tableClass,
  tableHeadClass,
  tableRowClass,
} from '../components/ui'
import { sexLabel, sizeLabel, speciesLabel } from '../format'
import type { Breed, Preference, PreferenceInput, UserSummary } from '../types'

interface PreferencesPageProps {
  refreshRef: Ref<() => void>
  onRefreshLockChange: (locked: boolean) => void
  onConnectionChange: (connected: boolean) => void
}

export function PreferencesPage({ refreshRef, onRefreshLockChange, onConnectionChange }: PreferencesPageProps) {
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
      .then((result) => {
        if (!active) return
        setData(result)
        onConnectionChange(true)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as preferências.')
        onConnectionChange(false)
      })
    return () => { active = false }
  }, [loadAttempt, onConnectionChange])

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
      setError('Não foi possível atualizar a lista. Use “Atualizar dados” para tentar novamente.')
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
  useImperativeHandle(refreshRef, () => reload)

  const refreshLocked = busy || editor !== null || !data
  useEffect(() => onRefreshLockChange(refreshLocked), [refreshLocked, onRefreshLockChange])


  if (!data) {
    return (
      <Panel title="Preferências cadastradas">
        {error ? (
          <div className="space-y-3 px-5 pt-1 pb-5">
            <ErrorMessage message={error} />
            <button type="button" onClick={reload} className={secondaryButtonClass}>Tentar novamente</button>
          </div>
        ) : <EmptyState><span role="status">Carregando preferências...</span></EmptyState>}
      </Panel>
    )
  }

  return (
    <div className="space-y-5">
      {success && <SuccessMessage>{success}</SuccessMessage>}
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
        action={<button type="button" disabled={busy || data.users.length === 0} onClick={() => openEditor('new')} className={primaryButtonClass}><PlusIcon /> Nova preferência</button>}
      >
        {data.preferences.length === 0 ? (
          <EmptyState>{data.users.length ? 'Nenhuma preferência cadastrada.' : 'Nenhum usuário disponível para cadastrar preferências.'}</EmptyState>
        ) : (<>
          <ul className="divide-y divide-line border-t border-line sm:hidden">
            {data.preferences.map((preference) => (
              <li key={preference.id} className="space-y-1.5 px-5 py-4">
                <p className="font-semibold text-ink">{preference.userName}</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                  {([
                    ['Espécie', preference.desiredSpecies ? speciesLabel(preference.desiredSpecies) : '—'],
                    ['Porte', sizeLabel(preference.desiredSize)],
                    ['Idade (anos)', ageLabel(preference)],
                    ['Sexo', sexLabel(preference.desiredSex)],
                    ['Cor', preference.desiredColor ?? '—'],
                    ['Raça', preference.breedName ?? '—'],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="contents"><dt className="text-muted">{label}</dt><dd className="text-ink">{value}</dd></div>
                  ))}
                </dl>
                <div className="-ml-2 flex gap-1 pt-1">
                  <button type="button" disabled={busy} onClick={() => openEditor(preference)} className={editLinkClass}>Editar</button>
                  <button type="button" disabled={busy} onClick={() => void remove(preference)} className={deleteLinkClass}>Excluir</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className={tableClass}>
              <thead className={tableHeadClass}>
                <tr>
                  {['Usuário', 'Espécie', 'Porte', 'Idade (anos)', 'Sexo', 'Cor', 'Raça'].map((label) => (
                    <th key={label} scope="col" className="px-5 py-3">{label}</th>
                  ))}
                  <th scope="col" className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.preferences.map((preference) => (
                  <tr key={preference.id} className={tableRowClass}>
                    <td className="px-5 py-3 font-semibold text-ink">{preference.userName}</td>
                    <td className="px-5 py-3">{preference.desiredSpecies ? speciesLabel(preference.desiredSpecies) : '—'}</td>
                    <td className="px-5 py-3">{sizeLabel(preference.desiredSize)}</td>
                    <td className="whitespace-nowrap px-5 py-3">{ageLabel(preference)}</td>
                    <td className="px-5 py-3">{sexLabel(preference.desiredSex)}</td>
                    <td className="px-5 py-3">{preference.desiredColor ?? '—'}</td>
                    <td className="px-5 py-3">{preference.breedName ?? '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-xs">
                      <button type="button" disabled={busy} onClick={() => openEditor(preference)} className={editLinkClass}>Editar</button>
                      <button type="button" disabled={busy} onClick={() => void remove(preference)} className={deleteLinkClass}>Excluir</button>
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
    <form onSubmit={submit} className="space-y-5 px-5 pt-2 pb-5">
      <fieldset disabled={busy} className="grid gap-4 md:grid-cols-2 [&>label]:text-[13px] [&>label]:font-semibold [&>label]:text-ink">
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
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <button type="submit" disabled={busy} className={primaryButtonClass}>{busy ? 'Salvando...' : 'Salvar preferência'}</button>
        <button type="button" disabled={busy} onClick={onCancel} className={secondaryButtonClass}>Cancelar</button>
      </div>
    </form>
  )
}
