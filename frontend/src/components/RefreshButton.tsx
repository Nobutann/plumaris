import { useEffect, useRef, useState } from 'react'
import { CheckIcon, RefreshIcon } from './ui'

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

/**
 * Botão de atualizar do cabeçalho: gira enquanto busca, confirma com um ✓ e mostra o horário da última atualização.
 */
export function RefreshButton({ onRefresh, busy = false, disabled = false }: {
  onRefresh: () => unknown
  busy?: boolean
  disabled?: boolean
}) {
  const [spinning, setSpinning] = useState(false)
  const [done, setDone] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(() => new Date())
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), [])

  async function refresh() {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    setDone(false)
    setSpinning(true)
    const minimum = new Promise((resolve) => timers.current.push(window.setTimeout(resolve, 700)))
    let ok = true
    try {
      await Promise.all([Promise.resolve(onRefresh()), minimum])
    } catch {
      ok = false
    }
    setSpinning(false)
    if (!ok) return
    setUpdatedAt(new Date())
    setDone(true)
    timers.current.push(window.setTimeout(() => setDone(false), 2200))
  }

  const working = spinning || busy
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-[0.8125rem] text-muted sm:inline" aria-live="polite">
        {working ? 'Buscando informações…' : `Atualizado às ${timeFormat.format(updatedAt)}`}
      </span>
      <button
        type="button"
        onClick={() => void refresh()}
        disabled={disabled || working}
        className="group inline-flex min-h-12 items-center gap-3 rounded-xl border border-action bg-action py-2 pr-5 pl-2 text-base font-semibold text-on-action shadow-raised transition-[background-color,transform] hover:bg-action-strong active:scale-[0.98] disabled:cursor-wait disabled:opacity-90 motion-reduce:transition-none"
      >
        <span className="grid size-8 place-items-center rounded-lg bg-on-action/15">
          {done && !working
            ? <CheckIcon className="size-5" />
            : <RefreshIcon className={`size-5 transition-transform duration-500 motion-reduce:transition-none ${working ? 'animate-spin motion-reduce:animate-none' : 'group-hover:rotate-180'}`} />}
        </span>
        {working ? 'Atualizando…' : done ? 'Atualizado' : 'Atualizar dados'}
      </button>
    </div>
  )
}
