import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import type { Center, CenterInput } from '../types'
import {
  EmptyState,
  ErrorMessage,
  Panel,
  PlusIcon,
  SuccessMessage,
  deleteLinkClass,
  editLinkClass,
  fieldClass,
  labelClass as sharedLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
  tableClass,
  tableHeadClass,
  tableRowClass,
} from '../components/ui'

const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

const addressFields = [
  { key: 'street', label: 'Rua', maxLength: 120 },
  { key: 'number', label: 'Número', maxLength: 20 },
  { key: 'neighborhood', label: 'Bairro', maxLength: 80 },
  { key: 'city', label: 'Cidade', maxLength: 80 },
] as const

export function CentersPage({ centers, refresh }: { centers: Center[]; refresh: () => Promise<void> }) {
  const [editor, setEditor] = useState<Center | 'new' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editor) {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      editorRef.current?.focus({ preventScroll: true })
    }
  }, [editor])

  function openEditor(target: Center | 'new' | null) {
    setError('')
    setSuccess('')
    setEditor(target)
  }

  async function reload() {
    try {
      await refresh()
    } catch {
      setError('A operação foi concluída, mas a lista não pôde ser atualizada. Clique em Atualizar dados para tentar de novo.')
    }
  }

  async function save(input: CenterInput, password: string) {
    if (!editor) return
    setBusy(true)
    setError('')
    try {
      if (editor === 'new') {
        await api.createCenter({ ...input, password })
      } else {
        await api.updateCenter(editor.id, input)
      }
      setEditor(null)
      setSuccess(editor === 'new' ? 'Centro cadastrado com sucesso.' : 'Centro atualizado com sucesso.')
      await reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o centro.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(center: Center) {
    if (!window.confirm(`Excluir o centro ${center.name}? Os contatos do centro também serão removidos.`)) return

    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await api.deleteCenter(center.id)
      setSuccess('Centro excluído com sucesso.')
      await reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível excluir o centro.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {success && <SuccessMessage>{success}</SuccessMessage>}
      {error && !editor && <ErrorMessage message={error} />}
      {editor && (
        <div ref={editorRef} tabIndex={-1} className="outline-none">
          <Panel title={editor === 'new' ? 'Cadastrar centro' : `Editar ${editor.name}`} detail="Campos com * são obrigatórios">
            {error && <div className="px-5 pt-1 pb-3"><ErrorMessage message={error} /></div>}
            <CenterForm key={editor === 'new' ? 'new' : editor.id} center={editor === 'new' ? null : editor}
              busy={busy} onSave={save} onCancel={() => openEditor(null)} />
          </Panel>
        </div>
      )}

      <Panel title="Centros cadastrados" detail={`${centers.length} ${centers.length === 1 ? 'centro' : 'centros'} na rede`}
        action={<button type="button" disabled={busy || !!editor} onClick={() => openEditor('new')} className={primaryButtonClass}><PlusIcon /> Novo centro</button>}>
        {centers.length === 0 ? <EmptyState>Nenhum centro cadastrado.</EmptyState> : (<>
          <ul className="divide-y divide-line border-t border-line sm:hidden">
            {centers.map((center) => (
              <li key={center.id} className="space-y-1.5 px-5 py-4">
                <p><span className="font-semibold text-ink">{center.name}</span><span className="ml-2 font-mono text-xs text-subtle">#{center.id}</span></p>
                {center.description && <p className="line-clamp-2 text-xs text-muted">{center.description}</p>}
                <p className="text-sm break-all text-ink">{center.email}</p>
                <p className="text-xs text-muted">{formatAddress(center)}</p>
                <div className="-ml-2 flex gap-1 pt-1">
                  <button type="button" disabled={busy || !!editor} onClick={() => openEditor(center)} className={editLinkClass}>Editar</button>
                  <button type="button" disabled={busy || !!editor} onClick={() => void remove(center)} className={deleteLinkClass}>Excluir</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className={tableClass}>
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Centro</th>
                  <th className="px-5 py-3">E-mail</th>
                  <th className="px-5 py-3">Endereço</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {centers.map((center) => (
                  <tr key={center.id} className={tableRowClass}>
                    <td className="px-5 py-3 font-mono text-xs text-subtle">#{center.id}</td>
                    <td className="px-5 py-3 font-semibold text-ink">{center.name}
                      {center.description && <p className="mt-1 line-clamp-2 max-w-xs wrap-anywhere text-xs font-normal text-muted">{center.description}</p>}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">{center.email}</td>
                    <td className="px-5 py-3">{formatAddress(center)}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-xs">
                      <button type="button" disabled={busy || !!editor} onClick={() => openEditor(center)} className={editLinkClass}>Editar</button>
                      <button type="button" disabled={busy || !!editor} onClick={() => void remove(center)} className={deleteLinkClass}>Excluir</button>
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

function formatAddress(center: Center) {
  const locality = [center.city, center.state].filter(Boolean).join(' / ')
  return [center.street, center.number, center.neighborhood, locality, center.postalCode].filter(Boolean).join(', ') || '—'
}

function CenterForm({ center, busy, onSave, onCancel }: {
  center: Center | null
  busy: boolean
  onSave: (input: CenterInput, password: string) => Promise<void>
  onCancel: () => void
}) {
  const labelClass = sharedLabelClass
  const inputClass = `${fieldClass} mt-1.5`

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const text = (key: string) => String(form.get(key) ?? '').trim()
    void onSave({
      name: text('name'),
      email: text('email'),
      description: text('description') || null,
      street: text('street') || null,
      number: text('number') || null,
      neighborhood: text('neighborhood') || null,
      city: text('city') || null,
      state: text('state') || null,
      postalCode: text('postalCode') || null,
    }, String(form.get('password') ?? ''))
  }

  return (
    <form onSubmit={submit} className="space-y-5 px-5 pt-2 pb-5">
      <fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Nome *
          <input name="name" className={inputClass} defaultValue={center?.name} maxLength={150} required />
        </label>
        <label className={labelClass}>E-mail *
          <input name="email" type="email" className={inputClass} defaultValue={center?.email} maxLength={255} required />
        </label>
        {!center && <label className={labelClass}>Senha * (8 a 128 caracteres)
          <input name="password" type="password" autoComplete="new-password" className={inputClass} minLength={8} maxLength={128} required />
        </label>}
        <label className={`${labelClass} md:col-span-2`}>Descrição
          <textarea name="description" className={inputClass} defaultValue={center?.description ?? ''} rows={3} maxLength={65_535} />
        </label>
        {addressFields.map(({ key, label, maxLength }) => (
          <label key={key} className={labelClass}>{label}
            <input name={key} className={inputClass} defaultValue={center?.[key] ?? ''} maxLength={maxLength} />
          </label>
        ))}
        <label className={labelClass}>UF
          <select name="state" className={inputClass} defaultValue={center?.state ?? ''}>
            <option value="">Selecione uma UF</option>
            {states.map((state) => <option key={state}>{state}</option>)}
          </select>
        </label>
        <label className={labelClass}>CEP (oito dígitos)
          <input name="postalCode" className={inputClass} inputMode="numeric" pattern="[0-9]{8}" maxLength={8} defaultValue={center?.postalCode ?? ''} />
        </label>
      </fieldset>
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <button type="submit" disabled={busy} className={primaryButtonClass}>{busy ? 'Salvando...' : 'Salvar centro'}</button>
        <button type="button" disabled={busy} onClick={onCancel} className={secondaryButtonClass}>Cancelar</button>
      </div>
    </form>
  )
}
