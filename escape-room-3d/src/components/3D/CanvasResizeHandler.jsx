import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

/**
 * Componente che gestisce il resize del Canvas e della camera
 * Necessario per garantire che il gioco 3D si adatti correttamente
 * quando cambia l'orientamento del dispositivo (portrait ↔ landscape)
 */
function CanvasResizeHandler() {
  const { gl, camera, size } = useThree()

  useEffect(() => {
    const handleResize = () => {
      // Ottieni dimensioni reali del viewport
      const width = window.innerWidth
      const height = window.innerHeight

      console.log('[CanvasResizeHandler] 📱 Resize rilevato:', {
        width,
        height,
        aspect: (width / height).toFixed(2),
        orientation: width > height ? 'landscape' : 'portrait'
      })

      // Aggiorna renderer size
      gl.setSize(width, height)
      
      // Aggiorna pixel ratio (max 2 per performance mobile)
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      // Aggiorna camera aspect ratio se è una PerspectiveCamera
      if (camera.isPerspectiveCamera) {
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        console.log('[CanvasResizeHandler] ✅ Camera aspect aggiornato:', camera.aspect.toFixed(2))
      }
    }

    // Handler immediato al mount
    handleResize()

    // Listener per resize e orientationchange
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', () => {
      // Ritardo per iOS che aggiorna viewport dopo orientationchange
      setTimeout(handleResize, 100)
    })

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [gl, camera])

  return null // Componente invisibile
}

export default CanvasResizeHandler