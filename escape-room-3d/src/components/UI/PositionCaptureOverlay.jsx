import React, { useState, useRef, useEffect } from 'react'
import './PositionCaptureOverlay.css'

/**
 * Overlay UI per il sistema di cattura coordinate
 * Mostra prompt per inserire nome stanza e lista di tutte le catture
 */
export default function PositionCaptureOverlay({
  isPromptOpen,
  pendingCapture,
  captures,
  onSave,
  onCancel,
  onDelete,
  onClearAll,
  onExportJSON,
  onExportJavaScript
}) {
  const [roomName, setRoomName] = useState('')
  const [showCaptures, setShowCaptures] = useState(true)
  const [copiedMessage, setCopiedMessage] = useState('')
  const inputRef = useRef(null)

  // Auto-focus sull'input quando il prompt si apre
  useEffect(() => {
    if (isPromptOpen && inputRef.current) {
      inputRef.current.focus()
      setRoomName('') // Reset input
    }
  }, [isPromptOpen])

  // Gestisci submit del form
  const handleSubmit = (e) => {
    e.preventDefault()
    if (roomName.trim()) {
      onSave(roomName)
      setRoomName('')
    }
  }

  // Copia testo negli appunti
  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessage(`✅ ${label} copiato!`)
      setTimeout(() => setCopiedMessage(''), 3000)
    } catch (err) {
      console.error('Errore copia:', err)
      setCopiedMessage(`❌ Errore copia`)
      setTimeout(() => setCopiedMessage(''), 3000)
    }
  }

  // Copia singola cattura
  const copySingleCapture = (capture) => {
    const text = `// ${capture.roomName}\n` +
      `position: { x: ${capture.position.x}, y: ${capture.position.y}, z: ${capture.position.z} }\n` +
      `yaw: ${capture.rotation.yaw} // ${capture.rotation.yawDegrees}°\n` +
      `// Catturato: ${capture.timestamp}`
    
    copyToClipboard(text, capture.roomName)
  }

  return (
    <div className="position-capture-overlay">
      {/* Prompt per inserire nome stanza */}
      {isPromptOpen && pendingCapture && (
        <div className="capture-prompt-backdrop">
          <div className="capture-prompt">
            <h2>📍 Cattura Posizione</h2>
            
            <div className="capture-info">
              <div className="info-row">
                <span className="label">Posizione:</span>
                <span className="value">
                  x: {pendingCapture.position.x}, 
                  y: {pendingCapture.position.y}, 
                  z: {pendingCapture.position.z}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Rotazione:</span>
                <span className="value">
                  {pendingCapture.rotation.yawDegrees}° ({pendingCapture.rotation.yaw} rad)
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <label htmlFor="roomNameInput">
                Inserisci nome della stanza:
              </label>
              <input
                ref={inputRef}
                id="roomNameInput"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="es: cucina, bagno, soggiorno..."
                autoComplete="off"
              />
              
              <div className="prompt-buttons">
                <button type="submit" className="btn-save" disabled={!roomName.trim()}>
                  ✅ Salva
                </button>
                <button type="button" className="btn-cancel" onClick={onCancel}>
                  ❌ Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pannello laterale con lista catture */}
      <div className={`captures-panel ${showCaptures ? 'visible' : 'hidden'}`}>
        <div className="panel-header">
          <h3>📍 Catture ({captures.length})</h3>
          <button 
            className="toggle-btn"
            onClick={() => setShowCaptures(!showCaptures)}
            title={showCaptures ? 'Nascondi' : 'Mostra'}
          >
            {showCaptures ? '➖' : '➕'}
          </button>
        </div>

        {showCaptures && (
          <>
            <div className="help-text">
              Premi <kbd>N</kbd> per catturare la posizione corrente
            </div>

            {copiedMessage && (
              <div className="copied-message">
                {copiedMessage}
              </div>
            )}

            {captures.length > 0 && (
              <>
                <div className="export-buttons">
                  <button
                    className="btn-export"
                    onClick={() => copyToClipboard(onExportJavaScript(), 'Codice JavaScript')}
                    title="Copia tutto in formato JavaScript"
                  >
                    📋 Copia JS
                  </button>
                  <button
                    className="btn-export"
                    onClick={() => copyToClipboard(onExportJSON(), 'JSON')}
                    title="Copia tutto in formato JSON"
                  >
                    📋 Copia JSON
                  </button>
                  <button
                    className="btn-clear"
                    onClick={onClearAll}
                    title="Elimina tutte le catture"
                  >
                    🗑️ Pulisci
                  </button>
                </div>

                <div className="captures-list">
                  {captures.map((capture) => (
                    <div key={capture.id} className="capture-item">
                      <div className="capture-header">
                        <span className="room-name">{capture.roomName}</span>
                        <span className="capture-time">{capture.timestamp}</span>
                      </div>
                      
                      <div className="capture-coords">
                        <div className="coord-line">
                          <span className="coord-label">Pos:</span>
                          <span className="coord-value">
                            ({capture.position.x}, {capture.position.y}, {capture.position.z})
                          </span>
                        </div>
                        <div className="coord-line">
                          <span className="coord-label">Yaw:</span>
                          <span className="coord-value">
                            {capture.rotation.yawDegrees}°
                          </span>
                        </div>
                      </div>

                      <div className="capture-actions">
                        <button
                          className="btn-copy-single"
                          onClick={() => copySingleCapture(capture)}
                          title="Copia questa cattura"
                        >
                          📋
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => onDelete(capture.id)}
                          title="Elimina questa cattura"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {captures.length === 0 && (
              <div className="empty-state">
                Nessuna cattura salvata.<br />
                Muoviti nella scena e premi <kbd>N</kbd> per iniziare.
              </div>
            )}
          </>
        )}
      </div>

      {/* Indicatore tasto N sempre visibile */}
      {!isPromptOpen && (
        <div className="key-indicator">
          Premi <kbd>N</kbd> per catturare posizione
        </div>
      )}
    </div>
  )
}
