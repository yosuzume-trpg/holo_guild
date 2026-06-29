'use client'

import { useEffect, useState } from 'react'
import Modal from '@/app/_components/ui/Modal'
import { captureLocalSave, restoreLocalSaveAndReload, readSaveMeta } from '@/lib/localSave'

// basePath(/holo_guild) は fetch に自動付与されないため絶対パスで指定する。
const API = '/holo_guild/api/saves'
const SLOT_COUNT = 20

type Mode = 'save' | 'load' | 'delete'
type SlotMeta = { slot: number; cycleCount: number; gold: number; guildRank: number; savedAt: string }

const TITLE: Record<Mode, string> = {
  save: 'クラウドセーブ',
  load: 'クラウドロード',
  delete: 'クラウド削除',
}

export default function CloudSaveModal({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const [slots, setSlots] = useState<Record<number, SlotMeta>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  // loading は初期値 true のため、ここでは同期的に setState せず await 後にのみ更新する
  // （effect 内で同期 setState しないことで react-hooks/set-state-in-effect を満たす）。
  async function refresh() {
    try {
      const res = await fetch(API, { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const list: SlotMeta[] = await res.json()
      const map: Record<number, SlotMeta> = {}
      for (const s of list) map[s.slot] = s
      setSlots(map)
    } catch {
      alert('セーブ一覧の取得に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // マウント時にスロット一覧を取得（データフェッチは正当な effect 用途）。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [])

  async function handleSave(slot: number) {
    if (busy) return
    if (slots[slot] && !confirm(`スロット${slot}には既にデータがあります。上書きしますか？`)) return
    setBusy(true)
    try {
      const res = await fetch(`${API}/${slot}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: captureLocalSave(), ...readSaveMeta() }),
      })
      if (!res.ok) throw new Error()
      await refresh()
    } catch {
      alert('セーブに失敗しました。')
    } finally {
      setBusy(false)
    }
  }

  async function handleLoad(slot: number) {
    if (busy) return
    if (!confirm(`スロット${slot}のデータを読み込みますか？現在のデータは上書きされます。`)) return
    setBusy(true)
    try {
      const res = await fetch(`${API}/${slot}`, { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const save = await res.json()
      restoreLocalSaveAndReload(save.data as Record<string, string>)
    } catch {
      alert('ロードに失敗しました。')
      setBusy(false)
    }
  }

  async function handleDelete(slot: number) {
    if (busy) return
    if (!confirm(`スロット${slot}のデータを削除しますか？`)) return
    setBusy(true)
    try {
      const res = await fetch(`${API}/${slot}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      await refresh()
    } catch {
      alert('削除に失敗しました。')
    } finally {
      setBusy(false)
    }
  }

  const allSlots = Array.from({ length: SLOT_COUNT }, (_, i) => i + 1)
  const visibleSlots = mode === 'save' ? allSlots : allSlots.filter((n) => slots[n])

  return (
    <Modal onClose={onClose} boxClassName="w-96 max-w-[92vw] max-h-[85vh] flex flex-col">
      <div className="text-base font-bold text-ink mb-3">{TITLE[mode]}</div>

      {loading ? (
        <p className="text-sm text-ink-subtle text-center py-6">読み込み中...</p>
      ) : visibleSlots.length === 0 ? (
        <p className="text-sm text-ink-subtle text-center py-6">セーブデータがありません</p>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1">
          {visibleSlots.map((n) => {
            const meta = slots[n]
            const onClick =
              mode === 'save' ? () => handleSave(n) : mode === 'load' ? () => handleLoad(n) : () => handleDelete(n)
            return (
              <button
                key={n}
                onClick={onClick}
                disabled={busy}
                className="w-full text-left bg-surface-2 hover:bg-surface-3 border border-line hover:border-accent-strong disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-ink">スロット {n}</span>
                  {meta ? (
                    <span className="text-[10px] text-ink-subtle shrink-0">
                      {new Date(meta.savedAt).toLocaleString('ja-JP')}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-subtle shrink-0">空き</span>
                  )}
                </div>
                {meta && (
                  <div className="text-xs text-ink-muted mt-0.5">
                    サイクル{meta.cycleCount}・{meta.gold.toLocaleString()}G・GR{meta.guildRank}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      <button
        onClick={onClose}
        className="mt-3 w-full bg-surface-2 hover:bg-surface-3 text-ink py-2 rounded-lg text-sm transition-colors"
      >
        閉じる
      </button>
    </Modal>
  )
}
