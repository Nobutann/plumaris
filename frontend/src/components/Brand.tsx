/** Marca do Plumaris: uma pluma (pena) com uma pegada de coração. */
export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={`shrink-0 ${className}`}>
      <defs>
        <clipPath id="plumaris-pena"><path d="M12.4 29.6C9.2 20.6 16.2 9.4 32 6.6 31.4 19.4 24 29.8 12.4 29.6z" /></clipPath>
      </defs>
      <rect width="40" height="40" rx="11" fill="var(--color-brand)" />
      <path d="M9.2 32.8 13.4 28.6" stroke="var(--color-brand-pad)" strokeWidth="2.2" strokeLinecap="round" />
      <g clipPath="url(#plumaris-pena)">
        <rect width="40" height="40" fill="var(--color-brand-pad)" />
        <path d="M12.4 29.6 32 6.6 40 40H12z" fill="var(--color-brand-shade)" />
        <path d="M8 21.2 15.2 23.6 10.6 17.4z" fill="var(--color-brand)" />
      </g>
      <g fill="var(--color-brand)">
        <path d="M22 24.2c-2.9-1.6-3.8-3-3.8-4.2 0-1.1.9-1.9 1.9-1.9.8 0 1.4.4 1.9 1.1.4-.7 1-1.1 1.8-1.1 1.1 0 1.9.8 1.9 1.9 0 1.2-.9 2.6-3.7 4.2z" />
        <ellipse cx="18" cy="16.2" rx="1.1" ry="1.45" transform="rotate(-25 18 16.2)" />
        <ellipse cx="20.6" cy="13.8" rx="1.15" ry="1.5" transform="rotate(-5 20.6 13.8)" />
        <ellipse cx="23.8" cy="13.9" rx="1.15" ry="1.5" transform="rotate(12 23.8 13.9)" />
        <ellipse cx="26.3" cy="16.5" rx="1.1" ry="1.45" transform="rotate(30 26.3 16.5)" />
      </g>
    </svg>
  )
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-none">
        <span className="block text-[1.1875rem] font-bold tracking-[-0.02em] text-rail-ink">Plumaris</span>
        <span className="mt-1 block text-xs text-rail-muted">Gestão de adoções</span>
      </div>
    </div>
  )
}
