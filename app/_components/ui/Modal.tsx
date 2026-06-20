interface Props {
  /** 背景クリック / キャンセル時に呼ばれる */
  onClose: () => void
  children: React.ReactNode
  /** 内側ボックスのクラス（幅・最大高さ・レイアウト等）。既定: w-80 */
  boxClassName?: string
}

/**
 * 全画面オーバーレイ + 中央ボックスのモーダル土台。
 * 背景クリックで閉じ、ボックス内クリックは伝播を止める処理を共通化。
 */
export default function Modal({ onClose, children, boxClassName = 'w-80' }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={`bg-slate-800 border border-slate-600 rounded-2xl p-4 ${boxClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
