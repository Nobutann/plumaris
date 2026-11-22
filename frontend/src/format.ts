import type { Species } from './types'

export function speciesLabel(species: Species): string {
  return species === 'Cao' ? 'Cão' : 'Gato'
}

export function sexLabel(sex: string | null): string {
  return sex === 'Femea' ? 'Fêmea' : sex || '—'
}

export function sizeLabel(size: string | null): string {
  return size === 'Medio' ? 'Médio' : size || '—'
}

export function ageGroupLabel(group: string): string {
  const labels: Record<string, string> = {
    '0-1': '0–1 ano',
    '2-4': '2–4 anos',
    '5+': '5 anos ou mais',
    Unknown: 'Idade não informada',
  }

  return labels[group] || group
}

export function dateLabel(value: string | null): string {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

const priorityLabels: Record<string, string> = {
  'Prioridade Critica': 'Urgente',
  'Prioridade Alta': 'Alta',
  'Prioridade Media': 'Normal',
  'Alta Procura': 'Muito procurado',
  Indisponivel: 'Indisponível',
  'Animal inexistente': '—',
}

/** Classificação de prioridade calculada no banco, em linguagem do dia a dia. */
export function priorityLabel(value: string | null | undefined) {
  return value ? priorityLabels[value] ?? value : '—'
}

const eventLabels: Record<string, string> = {
  ADOCAO_INDISPONIVEL: 'Adotado ou indisponível',
  REATIVACAO_DISPONIVEL: 'Voltou a ficar disponível',
  TRANSFERENCIA_CENTRO: 'Transferido de centro',
  ATUALIZACAO_CADASTRO: 'Cadastro atualizado',
}

export function eventLabel(value: string) {
  return eventLabels[value] ?? value
}

const matchLabels: Record<string, string> = {
  'Raca com animal': 'Raça com animais',
  'Raca sem animal': 'Raça sem animais',
  'Animal sem raca': 'Animal sem raça definida',
}

export function matchStatusLabel(value: string) {
  return matchLabels[value] ?? value
}

const supplyLabels: Record<string, string> = {
  'Deficit de oferta': 'Mais procura que animais',
  'Superavit de oferta': 'Mais animais que procura',
  'Oferta equilibrada': 'Equilibrado',
}

export function supplyStatusLabel(value: string) {
  return supplyLabels[value] ?? value
}
