import { getCharacterMaster } from '@/data/characters'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASS: Record<AvatarSize, string> = {
  xs: 'w-8 h-8 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-4xl',
}

interface Props {
  masterId: string
  size?: AvatarSize
  className?: string
}

/** キャラ名の頭文字を表示する円形アバター。各ページで重複していたものを共通化。 */
export default function CharacterAvatar({ masterId, size = 'md', className = '' }: Props) {
  const master = getCharacterMaster(masterId)
  return (
    <div
      className={`${SIZE_CLASS[size]} rounded-full bg-slate-600 flex items-center justify-center font-bold text-slate-300 shrink-0 ${className}`}
    >
      {master?.name.slice(0, 1) ?? '?'}
    </div>
  )
}
