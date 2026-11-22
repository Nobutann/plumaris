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
  const surface = tone === 'sand' ? 'border-toolbar-line bg-toolbar' : 'border-line bg-paper'
  return (
    <section className={`overflow-hidden rounded-2xl border shadow-card ${surface} ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-bold tracking-[-0.005em] text-ink">{title}</h2>
          {detail && <p className="mt-0.5 text-[0.8125rem] text-muted">{detail}</p>}
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
    <div role="alert" className="flex items-start gap-2.5 rounded-[0.625rem] border border-danger-line bg-danger-soft px-4 py-3 text-sm text-danger-ink">
      <AlertIcon className="mt-0.5 size-4 shrink-0 text-danger" />
      <span>{message}</span>
    </div>
  )
}

export function SuccessMessage({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-2.5 rounded-[0.625rem] border border-teal-line bg-teal-soft px-4 py-3 text-sm text-teal-ink">
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

export function SunIcon(props: IconProps) {
  return <Icon {...props}><circle cx="10" cy="10" r="3.25" /><path d="M10 2.75v1.5M10 15.75v1.5M2.75 10h1.5M15.75 10h1.5M4.87 4.87l1.06 1.06M14.07 14.07l1.06 1.06M4.87 15.13l1.06-1.06M14.07 5.93l1.06-1.06" /></Icon>
}

export function MoonIcon(props: IconProps) {
  return <Icon {...props}><path d="M16 12.1A6.5 6.5 0 0 1 7.9 4a6.5 6.5 0 1 0 8.1 8.1Z" /></Icon>
}

export function DashboardIcon(props: IconProps) {
  return <Icon {...props}><rect x="3" y="3" width="6" height="8" rx="1.5" /><rect x="11" y="3" width="6" height="5" rx="1.5" /><rect x="11" y="10" width="6" height="7" rx="1.5" /><rect x="3" y="13" width="6" height="4" rx="1.5" /></Icon>
}

export function PawIcon(props: IconProps) {
  return <Icon {...props}><path d="M10 10.5c-2.6 0-4.5 2.3-4.5 4.2 0 1.4 1.1 2.1 2.3 2.1.9 0 1.4-.4 2.2-.4s1.3.4 2.2.4c1.2 0 2.3-.7 2.3-2.1 0-1.9-1.9-4.2-4.5-4.2Z" /><ellipse cx="7.4" cy="5.4" rx="1.4" ry="1.9" /><ellipse cx="12.6" cy="5.4" rx="1.4" ry="1.9" /><ellipse cx="4" cy="9" rx="1.3" ry="1.7" /><ellipse cx="16" cy="9" rx="1.3" ry="1.7" /></Icon>
}

export function TagIcon(props: IconProps) {
  return <Icon {...props}><path d="M3.5 4.5v4.8c0 .4.2.8.4 1.1l6.2 6.2c.6.6 1.5.6 2.1 0l4.4-4.4c.6-.6.6-1.5 0-2.1L10.4 3.9c-.3-.3-.7-.4-1.1-.4H4.5a1 1 0 0 0-1 1Z" /><circle cx="7.2" cy="7.2" r="1.1" /></Icon>
}

export function SearchIcon(props: IconProps) {
  return <Icon {...props}><circle cx="8.75" cy="8.75" r="5.25" /><path d="m12.6 12.6 4 4" /></Icon>
}

export function HeartIcon(props: IconProps) {
  return <Icon {...props}><path d="M10 16.25s-6.25-3.6-6.25-8.1A3.4 3.4 0 0 1 10 6.1a3.4 3.4 0 0 1 6.25 2.05c0 4.5-6.25 8.1-6.25 8.1Z" /></Icon>
}

export function BuildingIcon(props: IconProps) {
  return <Icon {...props}><path d="M3.5 16.5h13M5 16.5V8.2l5-3.7 5 3.7v8.3" /><path d="M8.25 16.5v-3.75h3.5v3.75" /><path d="M8 9.5h.01M12 9.5h.01" /></Icon>
}

export const fieldClass = 'w-full rounded-[0.625rem] font-normal border border-field-line bg-paper px-3 py-2 text-sm text-ink shadow-rest transition-colors placeholder:text-subtle hover:border-sky/60 focus:border-sky focus:ring-3 focus:ring-sky/20 focus:outline-none aria-invalid:border-danger disabled:cursor-not-allowed disabled:bg-track disabled:text-muted'
export const labelClass = 'block text-[0.8125rem] font-semibold text-ink'
export const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-[0.625rem] border border-action bg-action px-4 py-2 text-sm font-semibold text-on-action shadow-rest transition-colors hover:border-action-strong hover:bg-action-strong focus-visible:outline-sky active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50'
export const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-[0.625rem] border border-line-strong bg-paper px-4 py-2 text-sm font-semibold text-ink shadow-rest transition-colors hover:border-sky/50 hover:bg-sky-soft hover:text-sky-strong active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50'
export const editLinkClass = 'mr-1 rounded-md px-2 py-1 text-[0.8125rem] font-semibold text-link hover:bg-sky-soft hover:text-link-strong disabled:cursor-not-allowed disabled:opacity-50'
export const deleteLinkClass = 'rounded-md px-2 py-1 text-[0.8125rem] font-semibold text-muted hover:bg-danger-soft hover:text-danger focus-visible:text-danger disabled:cursor-not-allowed disabled:opacity-50'
export const tableClass = 'w-full min-w-[37.5rem] border-collapse text-left text-sm'
export const tableHeadClass = 'border-y border-line bg-toolbar text-[0.8125rem] font-semibold text-muted'
export const tableRowClass = 'border-b border-line last:border-b-0 transition-colors hover:bg-sky-soft/50'
