import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const storageKey = 'plumaris-tema'
const systemDark = '(prefers-color-scheme: dark)'

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(storageKey)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function systemTheme(): Theme {
  return window.matchMedia(systemDark).matches ? 'dark' : 'light'
}

// Suspende as transições de cor durante a troca para que a página mude de tema de uma só vez.
function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (root.dataset.theme === theme) return
  root.classList.add('theme-switching')
  root.dataset.theme = theme
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')))
}

/** Tema escolhido pelo usuário; sem escolha salva, segue a preferência do sistema. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => storedTheme() ?? systemTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const query = window.matchMedia(systemDark)
    function followSystem() {
      if (!storedTheme()) setTheme(systemTheme())
    }
    function followOtherTabs(event: StorageEvent) {
      if (event.key === storageKey) setTheme(storedTheme() ?? systemTheme())
    }
    query.addEventListener('change', followSystem)
    window.addEventListener('storage', followOtherTabs)
    return () => {
      query.removeEventListener('change', followSystem)
      window.removeEventListener('storage', followOtherTabs)
    }
  }, [])

  function chooseTheme(next: Theme) {
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      // Sem armazenamento disponível, a escolha vale apenas para esta visita.
    }
    setTheme(next)
  }

  return [theme, chooseTheme] as const
}
