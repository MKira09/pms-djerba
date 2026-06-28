import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  children?: ReactNode
}

const variants = {
  primary:   'bg-brand-900 text-white hover:bg-brand-700 focus:ring-brand-400',
  secondary: 'bg-brand-100 text-brand-700 hover:bg-brand-200 focus:ring-brand-300',
  ghost:     'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-200',
  danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400',
  outline:   'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-200',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
}

export default function Button({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}
