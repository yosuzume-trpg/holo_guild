import type { ReactNode } from 'react'
import type { CharacterInstance } from '@/types/game'
import { getCharacterMaster } from '@/data/characters'
import CharacterAvatar from '@/app/_components/ui/CharacterAvatar'

interface Props {
  /** 各スロット。未配置は null */
  slots: (CharacterInstance | null)[]
  /** 空スロットのボタン押下（index を渡す） */
  onAddSlot: (index: number) => void
  /** 配置解除 */
  onUnassign: (charId: string) => void
  /** 名前下のサブ情報行（施設ごとの差分: Lv表記や生産/販売/レシピ情報） */
  renderInfo: (char: CharacterInstance) => ReactNode
  /** 解除ボタン手前に差し込む追加アクション（例: 生産施設の「手動」ボタン） */
  renderActions?: (char: CharacterInstance) => ReactNode
}

/** 「配置スロット」一覧の共通コンポーネント。生産施設・商人/工芸ギルドで共有。 */
export default function AssignedSlotList({
  slots,
  onAddSlot,
  onUnassign,
  renderInfo,
  renderActions,
}: Props) {
  return (
    <div>
      <div className="text-sm text-ink-muted mb-2">配置スロット</div>
      <div className="space-y-2">
        {slots.map((char, i) => {
          if (!char) {
            return (
              <button
                key={i}
                onClick={() => onAddSlot(i)}
                className="w-full bg-surface border border-dashed border-line hover:border-accent-strong rounded-lg p-3 text-ink-subtle hover:text-ink text-sm transition-colors text-center"
              >
                ＋ キャラクターを配置
              </button>
            )
          }
          const master = getCharacterMaster(char.masterId)
          return (
            <div
              key={char.id}
              className="bg-surface border border-line rounded-lg p-3 flex items-center gap-3"
            >
              <CharacterAvatar masterId={char.masterId} size="md" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink truncate">
                  {master?.name ?? char.masterId}
                </div>
                <div className="text-xs text-ink-muted">{renderInfo(char)}</div>
              </div>
              {renderActions?.(char)}
              <button
                onClick={() => onUnassign(char.id)}
                className="text-xs text-ink-subtle hover:text-danger transition-colors shrink-0"
              >
                解除
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
