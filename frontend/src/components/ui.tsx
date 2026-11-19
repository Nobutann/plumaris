import type { ReactNode, SVGProps } from 'react'

interface PanelProps {
  title: string
  detail?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  tone?: 'paper' | 'sand'
}

export function Panel({ title, detail, action, children, className = '', tone = 'paper' }: PanelProps) {
  const surface = tone === 'sand' ? 'border-sand-line bg-sand-wash' : 'border-line bg-paper'
  return (
    <section className={`rounded-[14px] border ${surface} ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          {detail && <p className="mt-0.5 text-[13px] text-muted">{detail}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-sm text-muted">{children}</p>
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-[10px] border border-danger-line bg-danger-soft px-4 py-3 text-sm text-danger-ink">
      <AlertIcon className="mt-0.5 size-4 shrink-0 text-danger" />
      <span>{message}</span>
    </div>
  )
}

export function SuccessMessage({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-2.5 rounded-[10px] border border-teal-line bg-teal-soft px-4 py-3 text-sm text-teal-ink">
      <CheckIcon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

export function Availability({ available }: { available: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${available ? 'bg-sky-soft text-sky-strong' : 'bg-sand-wash text-sand-ink ring-1 ring-sand-line'}`}>
      <span aria-hidden="true" className={`size-2 rounded-full ${available ? 'bg-sea' : 'bg-sand'}`} />
      {available ? 'Disponível' : 'Indisponível'}
    </span>
  )
}

export function RecordId({ children }: { children: ReactNode }) {
  return <span className="font-mono text-xs text-subtle">{children}</span>
}

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, className = 'size-4', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className={className} {...props}>
      {children}
    </svg>
  )
}

export function RefreshIcon(props: IconProps) {
  return <Icon {...props}><path d="M16 10a6 6 0 1 1-1.76-4.24" /><path d="M16 3.5v3.25h-3.25" /></Icon>
}

export function PlusIcon(props: IconProps) {
  return <Icon {...props}><path d="M10 4.5v11M4.5 10h11" /></Icon>
}

export function CheckIcon(props: IconProps) {
  return <Icon {...props}><circle cx="10" cy="10" r="7" /><path d="m7 10.25 2 2 4-4.5" /></Icon>
}

export function AlertIcon(props: IconProps) {
  return <Icon {...props}><circle cx="10" cy="10" r="7" /><path d="M10 6.5v4M10 13.5v.01" /></Icon>
}

export const fieldClass = 'w-full rounded-[10px] font-normal border border-line-strong bg-paper px-3 py-2 text-sm text-ink transition-colors placeholder:text-subtle hover:border-sky/50 focus:border-sky focus:ring-2 focus:ring-sky/20 focus:outline-none aria-invalid:border-danger disabled:cursor-not-allowed disabled:bg-track disabled:text-muted'
export const labelClass = 'block text-[13px] font-semibold text-ink'
export const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-[10px] border border-sky bg-sky px-4 py-2 text-sm font-semibold text-white shadow-[0_1px_2px_rgb(14_42_71/0.12)] transition-colors hover:border-sky-strong hover:bg-sky-strong active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50'
export const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-[10px] border border-line-strong bg-paper px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-sky/50 hover:bg-sky-soft active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50'
export const editLinkClass = 'mr-1 rounded-md px-2 py-1 text-[13px] font-semibold text-sky hover:bg-sky-soft disabled:cursor-not-allowed disabled:opacity-50'
export const deleteLinkClass = 'rounded-md px-2 py-1 text-[13px] font-semibold text-muted hover:bg-danger-soft hover:text-danger focus-visible:text-danger disabled:cursor-not-allowed disabled:opacity-50'
export const tableClass = 'w-full min-w-[600px] border-collapse text-left text-sm'
export const tableHeadClass = 'border-y border-line bg-ground text-xs font-semibold tracking-[0.04em] text-muted uppercase'
export const tableRowClass = 'border-b border-line last:border-b-0 transition-colors hover:bg-sky-soft/60'
