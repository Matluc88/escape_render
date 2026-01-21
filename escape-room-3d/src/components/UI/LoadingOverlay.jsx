import React from 'react'
import './LoadingOverlay.css'

/**
 * LoadingOverlay - Schermata di caricamento con barra di progresso
 * Mostra un overlay a schermo intero durante il caricamento iniziale della stanza
 * con una barra di progresso animata
 */
export default function LoadingOverlay({ isVisible, progress = 0, message = "Caricamento..." }) {
  if (!isVisible) return null

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <h2 className="loading-title">{message}</h2>
        <div className="loading-bar-container">
          <div 
            className="loading-bar-fill" 
            style={{ width: `${progress}%` }}
          >
            <div className="loading-bar-shine"></div>
          </div>
        </div>
        <p className="loading-percentage">{Math.round(progress)}%</p>
        <p className="loading-hint">Stabilizzazione posizione camera...</p>
      </div>
    </div>
  )
}
