import React from 'react'
import { useAudio } from '../../contexts/AudioContext'
import './MusicControl.css'

const MusicControl = () => {
  const { isPlaying, isMuted, toggleMusic, toggleMute } = useAudio()

  return (
    <div className="music-control">
      <button 
        onClick={toggleMusic}
        className={`music-btn ${isPlaying ? 'playing' : 'paused'}`}
        title={isPlaying ? 'Pausa musica' : 'Avvia musica'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      <button 
        onClick={toggleMute}
        className={`music-btn ${isMuted ? 'muted' : ''}`}
        title={isMuted ? 'Attiva audio' : 'Disattiva audio'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
    </div>
  )
}

export default MusicControl