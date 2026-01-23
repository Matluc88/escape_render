import { useProgress, Html } from '@react-three/drei'
import './LoadingScreen.css'

/**
 * LoadingScreen - Schermo di caricamento con progress bar
 * Mostra percentuale di caricamento del modello 3D
 * 
 * @returns {JSX.Element} Loading screen con spinner e progress bar
 */
export default function LoadingScreen() {
  const { active, progress, errors, item, loaded, total } = useProgress()

  return (
    <Html center>
      <div className="loading-screen">
        <div className="loading-content">
          {/* Spinner animato */}
          <div className="spinner"></div>
          
          {/* Titolo */}
          <h2 className="loading-title">Caricamento Mondo 3D</h2>
          
          {/* Progress bar */}
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          {/* Percentuale */}
          <p className="progress-text">{progress.toFixed(0)}%</p>
          
          {/* Info dettagliate (opzionale, per debug) */}
          {item && (
            <p className="loading-item">
              Caricamento: {item.split('/').pop()}
            </p>
          )}
          
          {/* Errori */}
          {errors.length > 0 && (
            <div className="loading-errors">
              <p>⚠️ Errori di caricamento:</p>
              {errors.map((error, index) => (
                <p key={index} className="error-message">{error}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </Html>
  )
}