'use client'

import { useRef, useState } from 'react'

// 全ストアの永続化キーはこの接頭辞（holo-guild-game / -characters / -inventory /
// -facilities / -dungeon / -manual-prod）。接頭辞で一括して入出力する。
const SAVE_PREFIX = 'holo-guild-'

function collectSaveKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(SAVE_PREFIX)) keys.push(k)
  }
  return keys
}

function exportSave() {
  const data: Record<string, string> = {}
  for (const k of collectSaveKeys()) data[k] = localStorage.getItem(k) ?? ''
  const payload = {
    app: 'holo-guild',
    exportedAt: new Date().toISOString(),
    data,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `holo-guild-save-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export default function HeaderMenu() {
  const [open, setOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = '' // 同じファイルを再選択できるように
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        // {app, exportedAt, data:{...}} 形式 / 生の {key:value} 形式の両方を受け付ける
        const data: unknown = parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed
        if (!data || typeof data !== 'object') throw new Error('invalid')
        const entries = Object.entries(data as Record<string, unknown>).filter(
          ([k, v]) => k.startsWith(SAVE_PREFIX) && typeof v === 'string',
        )
        if (entries.length === 0) throw new Error('no save keys')
        if (!confirm('現在のセーブデータを上書きしてインポートします。よろしいですか？')) return
        for (const k of collectSaveKeys()) localStorage.removeItem(k)
        for (const [k, v] of entries) localStorage.setItem(k, v as string)
        location.reload()
      } catch {
        alert('インポートに失敗しました。ファイル形式を確認してください。')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="メニュー"
        className="relative z-50 p-1 text-ink hover:text-accent-strong transition-colors"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-50 w-48 bg-surface border border-line rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={() => { exportSave(); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-surface-2 transition-colors"
            >
              データをエクスポート
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-surface-2 border-t border-line transition-colors"
            >
              データをインポート
            </button>
          </div>
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />
    </div>
  )
}
