import React, { createContext, useContext, useState, useEffect, useRef } from 'react'

const AudioContext = createContext()

export const useAudio = () => {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}

export const AudioProvider = ({ children }) => {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.3) // Volume default: 30%
  const [isMuted, setIsMuted] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Inizializza l'elemento Audio
    audioRef.current = new Audio('/audio/lobby-music.mp3')
    audioRef.current.loop = true
    audioRef.current.volume = volume
    
    // Eventi per tracciare lo stato
    audioRef.current.addEventListener('play', () => setIsPlaying(true))
    audioRef.current.addEventListener('pause', () => setIsPlaying(false))
    audioRef.current.addEventListener('canplay', () => setIsReady(true))
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted
      audioRef.current.volume = volume
    }
  }, [volume, isMuted])

  const playMusic = async () => {
    if (audioRef.current && isReady) {
      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch (error) {
        console.log('Audio autoplay prevented:', error)
      }
    }
  }

  const pauseMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const toggleMusic = () => {
    if (isPlaying) {
      pauseMusic()
    } else {
      playMusic()
    }
  }

  const changeVolume = (newVolume) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setVolume(clampedVolume)
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : clampedVolume
    }
  }

  const toggleMute = () => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)
    if (audioRef.current) {
      audioRef.current.muted = newMutedState
    }
  }

  const value = {
    isPlaying,
    volume,
    isMuted,
    isReady,
    playMusic,
    pauseMusic,
    toggleMusic,
    setVolume: changeVolume,
    toggleMute
  }

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  )
}