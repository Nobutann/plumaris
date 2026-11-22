import { useState } from 'react'
import type { Animal } from '../types'

function parsePhotoUrl(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

function photoSources(value: string | null) {
  const url = parsePhotoUrl(value)
  if (!url) return []

  const isGoogleImageResult = /^(?:(?:www|images)\.)?google\.(?:[a-z]{2,3}\.)?[a-z]{2,3}$/i
    .test(url.hostname) && url.pathname === '/imgres'
  if (!isGoogleImageResult) return [url.href]

  const source = parsePhotoUrl(url.searchParams.get('imgurl'))
  const thumbnailId = url.searchParams.get('tbnid')
  const sources = []
  if (source) {
    sources.push(source.href)
  }
  if (thumbnailId && /^[A-Za-z0-9_-]+$/.test(thumbnailId)) {
    sources.push(`https://encrypted-tbn0.gstatic.com/images?q=tbn:${thumbnailId}`)
  }
  return sources
}

export function AnimalPhoto({ animal, expanded = false, showStatus = expanded }: {
  animal: Animal
  expanded?: boolean
  showStatus?: boolean
}) {
  return (
    <Photo
      key={animal.photoUrl}
      url={animal.photoUrl}
      name={animal.name}
      sizeClass={expanded ? 'h-24 w-24 sm:h-36 sm:w-36' : 'h-12 w-12'}
      showStatus={showStatus}
    />
  )
}

function Photo({ url, name, sizeClass, showStatus }: {
  url: string | null
  name: string
  sizeClass: string
  showStatus: boolean
}) {
  const [sourceIndex, setSourceIndex] = useState(0)
  const source = photoSources(url)[sourceIndex]

  if (source) {
    return (
      <img
        key={source}
        src={source}
        alt={`Foto de ${name}`}
        className={`${sizeClass} shrink-0 rounded-md bg-sand-wash object-contain`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setSourceIndex(sourceIndex + 1)}
      />
    )
  }

  return showStatus && (
    <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded-md bg-sand-wash px-1 text-center text-[10px] text-muted`}>
      {url ? 'Foto indisponível' : 'Sem foto cadastrada'}
    </div>
  )
}
