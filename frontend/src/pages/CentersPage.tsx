import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api'
import type { Center, CenterInput } from '../types'
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
      setError('A operação foi concluída, mas a lista não pôde ser atualizada. Use Atualizar dados para tentar novamente.')
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
    if (!window.confirm(`Excluir o centro ${center.name}? Os meios de contato do centro serão removidos. A conta será excluída somente se não estiver vinculada a um usuário.`)) return

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
      {success && <p role="status" className="border border-[#547e68] bg-[#183b34] px-4 py-3 text-sm text-[#b6e1c5]">{success}</p>}
      {error && !editor && <ErrorMessage message={error} />}
      {editor && (
        <div ref={editorRef} tabIndex={-1} className="outline-none">
          <Panel title={editor === 'new' ? 'Cadastrar centro' : `Editar ${editor.name}`} detail="Campos com * são obrigatórios">
            {error && <div className="px-4 pt-4"><ErrorMessage message={error} /></div>}
            <CenterForm key={editor === 'new' ? 'new' : editor.id} center={editor === 'new' ? null : editor}
              busy={busy} onSave={save} onCancel={() => openEditor(null)} />
          </Panel>
        </div>
      )}

      <Panel title="Centros cadastrados" detail={`${centers.length} registro(s)`}
        action={<button type="button" disabled={busy || !!editor} onClick={() => openEditor('new')} className={primaryButtonClass}>Novo centro</button>}>
        {centers.length === 0 ? <EmptyState>Nenhum centro cadastrado.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-4 py-2.5">ID</th>
                  <th className="px-4 py-2.5">Centro</th>
                  <th className="px-4 py-2.5">E-mail da conta</th>
                  <th className="px-4 py-2.5">Endereço</th>
                  <th className="px-4 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {centers.map((center) => (
                  <tr key={center.id} className={tableRowClass}>
                    <td className="px-4 py-2.5 font-mono text-xs text-[#819caf]">#{center.id}</td>
                    <td className="px-4 py-2.5 font-medium text-[#b7dbf0]">{center.name}
                      {center.description && <p className="mt-1 line-clamp-2 max-w-xs wrap-anywhere text-xs font-normal text-[#9bb0bf]">{center.description}</p>}
                    </td>
                    <td className="px-4 py-2.5 wrap-anywhere">{center.email}</td>
                    <td className="px-4 py-2.5">{formatAddress(center)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs">
                      <button type="button" disabled={busy || !!editor} onClick={() => openEditor(center)} className="mr-3 text-[#9fd2ef] hover:underline disabled:opacity-50">Editar</button>
                      <button type="button" disabled={busy || !!editor} onClick={() => void remove(center)} className="text-[#e6a4aa] hover:underline disabled:opacity-50">Excluir</button>
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
  const labelClass = 'block text-xs font-medium text-[#a9c2d2]'
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
    <form onSubmit={submit} className="space-y-5 p-4">
      <fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Nome *
          <input name="name" className={inputClass} defaultValue={center?.name} maxLength={150} required />
        </label>
        <label className={labelClass}>E-mail da conta *
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
      <div className="flex flex-wrap gap-2 border-t border-[#29465b] pt-4">
        <button type="submit" disabled={busy} className={primaryButtonClass}>{busy ? 'Salvando...' : 'Salvar centro'}</button>
        <button type="button" disabled={busy} onClick={onCancel} className={secondaryButtonClass}>Cancelar</button>
      </div>
    </form>
  )
}
