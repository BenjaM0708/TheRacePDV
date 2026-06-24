import { useEffect, useState } from 'react'
import { X, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Info } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
  duration?: number
}

export function Toast({ message, type = 'info', onClose, duration = 4000 }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10)
    const hideTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, duration)
    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [duration, onClose])

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success-500" />,
    error: <AlertCircle className="w-5 h-5 text-error-500" />,
    info: <Info className="w-5 h-5 text-primary-500" />,
  }

  const bgColors = {
    success: 'bg-success-50 border-success-200 text-success-900',
    error: 'bg-error-50 border-error-200 text-error-900',
    info: 'bg-primary-50 border-primary-200 text-primary-900',
  }

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all duration-300 ${bgColors[type]} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
    >
      {icons[type]}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300) }} className="ml-2 p-1 hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
