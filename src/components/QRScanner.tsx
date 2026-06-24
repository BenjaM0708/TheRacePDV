import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CameraOff } from 'lucide-react'

interface QRScannerProps {
  onScan: (value: string) => void
  onError?: (error: string) => void
  className?: string
}

export function QRScanner({ onScan, onError, className = '' }: QRScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [hasCamera, setHasCamera] = useState(true)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [])

  const startScan = async () => {
    if (!containerRef.current) return
    try {
      const scanner = new Html5Qrcode(containerRef.current.id)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText)
          stopScan()
        },
        () => {}
      )
      setScanning(true)
    } catch {
      setHasCamera(false)
      onError?.('No se pudo acceder a la cámara')
    }
  }

  const stopScan = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
    }
    setScanning(false)
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div
        id="qr-scanner-container"
        ref={containerRef}
        className={`w-full max-w-sm rounded-xl overflow-hidden bg-black ${scanning ? 'block' : 'hidden'}`}
        style={{ minHeight: scanning ? 300 : 0 }}
      />
      {!scanning && (
        <div className="w-full max-w-sm h-[200px] rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-400">
          <CameraOff className="w-10 h-10" />
        </div>
      )}
      <button
        onClick={scanning ? stopScan : startScan}
        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-white transition-colors ${scanning ? 'bg-error-500 hover:bg-error-600' : 'bg-primary-600 hover:bg-primary-700'}`}
      >
        {scanning ? (
          <>
            <CameraOff className="w-5 h-5" />
            Detener escaneo
          </>
        ) : (
          <>
            <Camera className="w-5 h-5" />
            Escanear QR
          </>
        )}
      </button>
      {!hasCamera && (
        <p className="text-error-500 text-sm">No se detectó cámara en este dispositivo.</p>
      )}
    </div>
  )
}
