import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: ReactNode
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export default function Modal({ open, onClose, title, children, size = 'md', footer }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn('relative bg-white w-full flex flex-col max-h-[92vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-xl shadow-xl', sizes[size])}>
        {title && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h2>
            <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">{children}</div>
        {footer && <div className="px-4 sm:px-6 py-4 border-t flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  )
}
