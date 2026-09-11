import React, { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Download, Eye, ZoomIn, ZoomOut, RotateCcw, CheckCircle, XCircle, Image as ImageIcon } from 'lucide-react'

interface PlateModalProps {
  plate: string
  crops: any[]
  onClose: () => void
}

interface CropData {
  id: string
  image: string // base64 or blob URL
  confidence: number
  timestamp: string
  camera_id: string
  bbox: [number, number, number, number]
  quality: number
  ocr_result?: {
    text: string
    confidence: number
    char_confs: number[]
  }
}

export function PlateModal({ plate, crops, onClose }: PlateModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const [selectedCrop, setSelectedCrop] = useState<CropData | null>(null)

  // Generate mock crop data if empty
  const cropData: CropData[] = React.useMemo(() => {
    if (crops.length > 0) {
      return crops.map((c, i) => ({
        id: `crop-${i}`,
        image: c.image || '',
        confidence: c.confidence || 0,
        timestamp: c.timestamp || new Date().toISOString(),
        camera_id: c.camera_id || 'CAM_001',
        bbox: c.bbox || [0, 0, 100, 50],
        quality: c.quality || 0.5,
        ocr_result: c.ocr_result,
      }))
    }
    // Generate mock data for demonstration
    return Array.from({ length: 8 }, (_, i) => ({
      id: `crop-${i}`,
      image: `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg width="320" height="120" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="120" fill="#1a1a2e"/>
          <rect x="40" y="20" width="240" height="80" fill="#0f0f1a" stroke="#00E599" stroke-width="2" rx="4"/>
          <text x="160" y="70" text-anchor="middle" font-family="monospace" font-size="32" font-weight="bold" fill="#00E599">${plate}</text>
          <text x="160" y="100" text-anchor="middle" font-family="monospace" font-size="10" fill="#64748B">CROP ${i + 1} - CONF: ${(0.7 + Math.random() * 0.3).toFixed(2)}</text>
        </svg>
      `)}`,
      confidence: 0.7 + Math.random() * 0.3,
      timestamp: new Date(Date.now() - i * 5000).toISOString(),
      camera_id: ['CAM_001', 'CAM_002', 'CAM_003'][i % 3],
      bbox: [100 + i * 10, 100, 300 + i * 10, 200] as [number, number, number, number],
      quality: 0.5 + Math.random() * 0.5,
      ocr_result: {
        text: plate,
        confidence: 0.85 + Math.random() * 0.1,
        char_confs: plate.split('').map(() => 0.8 + Math.random() * 0.2),
      },
    }))
  }, [crops, plate])

  const currentCrop = cropData[currentIndex]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') navigate(-1)
    if (e.key === 'ArrowRight') navigate(1)
    if (e.key === 'Escape') onClose()
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const navigate = (dir: number) => {
    setCurrentIndex(prev => (prev + dir + cropData.length) % cropData.length)
    setZoom(1)
    setRotation(0)
  }

  const downloadCrop = () => {
    if (!currentCrop) return
    const link = document.createElement('a')
    link.href = currentCrop.image
    link.download = `${plate}_crop_${currentIndex + 1}.png`
    link.click()
  }

  const formatConfidence = (conf: number) => `${(conf * 100).toFixed(1)}%`

  return (
    <div id="plate-modal" className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] bg-[var(--bg-surface)] border border-[var(--border-standard)] rounded-lg overflow-hidden flex flex-col animate-slide-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-standard)]">
          <div className="flex items-center gap-4">
            <button id="plate-modal-close" onClick={onClose} className="btn btn-ghost btn-icon p-2" title="Close">
              <X size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="plate-badge">{plate}</span>
                <span className="badge badge-info text-[10px]">{cropData.length} CROPS</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">Multi-frame inspection • Use ← → arrows to navigate</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={downloadCrop} className="btn btn-secondary btn-icon p-2" title="Download crop">
              <Download size={16} />
            </button>
            <button onClick={() => setShowAll(!showAll)} className={`btn btn-ghost btn-icon p-2 ${showAll ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : ''}`} title="Grid view">
              <ImageIcon size={16} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Main Crop View */}
          <div className={`flex-1 flex flex-col ${showAll ? 'hidden' : ''}`}>
            <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
              {/* Zoom Controls */}
              <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-[var(--bg-primary)]/90 backdrop-blur rounded border border-[var(--border-standard)] p-1">
                <button onClick={() => setZoom(Math.max(0.25, zoom - 0.25))} className="btn btn-ghost btn-icon p-1.5 text-xs" title="Zoom out"><ZoomOut size={14} /></button>
                <span className="px-2 text-xs font-mono text-[var(--accent-primary)]">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(Math.min(4, zoom + 0.25))} className="btn btn-ghost btn-icon p-1.5 text-xs" title="Zoom in"><ZoomIn size={14} /></button>
                <button onClick={() => setRotation(r => (r + 90) % 360)} className="btn btn-ghost btn-icon p-1.5 text-xs" title="Rotate"><RotateCcw size={14} /></button>
                <button onClick={() => { setZoom(1); setRotation(0) }} className="btn btn-ghost btn-icon p-1.5 text-xs" title="Reset">⌂</button>
              </div>

              {/* Crop Image */}
              <div 
                className="flex items-center justify-center w-full h-full"
                style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
              >
                {currentCrop ? (
                  <img
                    src={currentCrop.image}
                    alt={`Plate crop ${currentIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                    style={{ 
                      filter: 'drop-shadow(0 0 24px rgba(0, 229, 153, 0.3))',
                      border: '2px solid #00E599',
                      borderRadius: '8px',
                      background: '#07090E',
                    }}
                  />
                ) : (
                  <div className="text-center text-[var(--text-muted)]">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>No crop image available</p>
                  </div>
                )}
              </div>

              {/* Crop Info Overlay */}
              {currentCrop && (
                <div className="absolute bottom-4 left-4 right-4 z-10">
                  <div className="flex items-center justify-between bg-[var(--bg-primary)]/95 backdrop-blur rounded-lg border border-[var(--border-standard)] p-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--accent-primary)] font-mono text-sm">{currentCrop.camera_id}</span>
                        <span className="px-2 py-0.5 bg-[var(--bg-elevated)] rounded text-[10px] font-mono">
                          #{currentIndex + 1} / {cropData.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                        <span>Conf: <span className="font-mono text-[var(--accent-primary)]">{formatConfidence(currentCrop.confidence)}</span></span>
                        <span>Quality: <span className="font-mono text-[var(--accent-secondary)]">{(currentCrop.quality * 100).toFixed(0)}%</span></span>
                        <span>Time: <span className="font-mono">{new Date(currentCrop.timestamp).toLocaleTimeString()}</span></span>
                      </div>
                    </div>
                    
                    {/* OCR Result */}
                    {currentCrop.ocr_result && (
                      <div className="ml-auto flex items-center gap-2">
                        <span className={`badge ${currentCrop.ocr_result.confidence > 0.8 ? 'badge-success' : currentCrop.ocr_result.confidence > 0.5 ? 'badge-warning' : 'badge-critical'} text-[10px]`}>
                          {currentCrop.ocr_result.is_valid_format ? <CheckCircle size={10} /> : <XCircle size={10} />}
                          {currentCrop.ocr_result.text}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)]">
                          {currentCrop.ocr_result.char_confs.map((c, i) => (
                            <span key={i} className={`w-5 h-4 text-center ${c > 0.8 ? 'text-[var(--accent-primary)]' : c > 0.5 ? 'text-[var(--accent-warning)]' : 'text-[var(--accent-critical)]'}`}>
                              {currentCrop.ocr_result?.text[i] || '?'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="absolute left-4 right-4 bottom-4 flex items-center justify-between z-10 pointer-events-none">
              <button 
                onClick={() => navigate(-1)}
                className="btn btn-primary btn-icon p-3 ml-4 pointer-events-auto opacity-70 hover:opacity-100 transition-opacity"
                disabled={cropData.length <= 1}
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={() => navigate(1)}
                className="btn btn-primary btn-icon p-3 mr-4 pointer-events-auto opacity-70 hover:opacity-100 transition-opacity"
                disabled={cropData.length <= 1}
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

          {/* Right: Metadata Panel */}
          <div className="w-80 flex-shrink-0 border-l border-[var(--border-standard)] bg-[var(--bg-elevated)] overflow-y-auto">
            <div className="p-4 border-b border-[var(--border-standard)]">
              <h3 className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider">CROP METADATA</h3>
            </div>
            <div className="p-4 space-y-4">
              {currentCrop && (
                <div className="space-y-3">
                  <MetadataRow label="CROP ID" value={currentCrop.id} />
                  <MetadataRow label="CAMERA" value={currentCrop.camera_id} />
                  <MetadataRow label="TIMESTAMP" value={new Date(currentCrop.timestamp).toLocaleString()} />
                  <MetadataRow label="CONFIDENCE" value={formatConfidence(currentCrop.confidence)} color="var(--accent-primary)" />
                  <MetadataRow label="QUALITY SCORE" value={`${(currentCrop.quality * 100).toFixed(0)}%`} color="var(--accent-secondary)" />
                  <MetadataRow label="BBOX" value={`[${currentCrop.bbox.join(', ')}]`} />
                  <div className="pt-2 border-t border-[var(--border-standard)]">
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2">CHARACTER CONFIDENCES</div>
                    <div className="flex flex-wrap gap-1">
                      {currentCrop.ocr_result?.char_confs.map((c, i) => (
                        <div key={i} className="w-8 h-8 rounded bg-[var(--bg-primary)] border border-[var(--border-standard)] flex flex-col items-center justify-center">
                          <span className="font-mono text-sm" style={{ color: c > 0.8 ? 'var(--accent-primary)' : c > 0.5 ? 'var(--accent-warning)' : 'var(--accent-critical)' }}>
                            {currentCrop.ocr_result?.text[i] || '?'}
                          </span>
                          <span className="text-[10px] font-mono" style={{ color: c > 0.8 ? 'var(--accent-primary)' : c > 0.5 ? 'var(--accent-warning)' : 'var(--accent-critical)' }}>
                            {(c * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {cropData.map((crop, i) => (
                <CropThumbnail 
                  key={crop.id}
                  crop={crop}
                  index={i}
                  active={i === currentIndex}
                  onClick={() => { setCurrentIndex(i); setZoom(1); setRotation(0); }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Grid View */}
        {showAll && (
          <div className="absolute inset-0 flex flex-col z-20">
            <div className="p-4 border-b border-[var(--border-standard)] flex items-center justify-between">
              <h3 className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider">ALL CROPS</h3>
              <button onClick={() => setShowAll(false)} className="btn btn-ghost btn-icon p-2"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {cropData.map((crop, i) => (
                  <CropThumbnail 
                    key={crop.id}
                    crop={crop}
                    index={i}
                    active={i === currentIndex}
                    onClick={() => { setCurrentIndex(i); setShowAll(false); setZoom(1); setRotation(0); }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MetadataRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[var(--text-muted)] font-mono uppercase tracking-wider">{label}</span>
      <span className="font-mono text-right max-w-[60%] truncate" style={{ color: color || 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

function CropThumbnail({ crop, index, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-lg border-2 transition-all ${active ? 'border-[var(--accent-primary)] bg-[rgba(0,229,153,0.1)]' : 'border-transparent hover:border-[var(--border-standard)]'}`}
    >
      <img
        src={crop.image}
        alt={`Crop ${index + 1}`}
        className="w-full aspect-[3/1] object-cover rounded mb-2"
      />
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-mono text-[var(--accent-primary)]">#{index + 1}</span>
        <span className={`font-mono ${crop.confidence > 0.8 ? 'text-[var(--accent-primary)]' : crop.confidence > 0.5 ? 'text-[var(--accent-warning)]' : 'text-[var(--accent-critical)]'}`}>
          {(crop.confidence * 100).toFixed(0)}%
        </span>
      </div>
      {active && (
        <div className="absolute inset-0 border-2 border-[var(--accent-primary)] rounded-lg pointer-events-none" />
      )}
    </button>
  )
}