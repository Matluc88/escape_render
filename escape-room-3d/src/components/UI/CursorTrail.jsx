import React, { useEffect, useRef } from 'react'

const CursorTrail = () => {
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const animationFrameRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Particle class per la scia
    class TrailParticle {
      constructor(x, y) {
        this.x = x
        this.y = y
        this.vx = (Math.random() - 0.5) * 0.5
        this.vy = (Math.random() - 0.5) * 0.5
        this.life = 1.0
        this.decay = 0.02
        this.size = Math.random() * 3 + 2
        this.hue = Math.random() * 60 + 270 // 270-330 (magenta to cyan)
      }

      update() {
        this.x += this.vx
        this.y += this.vy
        this.life -= this.decay
        this.size *= 0.98
      }

      draw(ctx) {
        if (this.life <= 0) return

        ctx.save()
        ctx.globalAlpha = this.life
        
        // Glow effect
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3)
        gradient.addColorStop(0, `hsla(${this.hue}, 100%, 70%, ${this.life})`)
        gradient.addColorStop(0.5, `hsla(${this.hue + 30}, 100%, 60%, ${this.life * 0.5})`)
        gradient.addColorStop(1, `hsla(${this.hue + 60}, 100%, 50%, 0)`)
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2)
        ctx.fill()

        // Core bright particle
        ctx.fillStyle = `hsla(${this.hue}, 100%, 90%, ${this.life})`
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.restore()
      }

      isDead() {
        return this.life <= 0 || this.size < 0.5
      }
    }

    // Mouse move handler
    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
      
      // Crea nuove particelle
      for (let i = 0; i < 3; i++) {
        particlesRef.current.push(
          new TrailParticle(
            e.clientX + (Math.random() - 0.5) * 5,
            e.clientY + (Math.random() - 0.5) * 5
          )
        )
      }
      
      // Limita numero particelle
      if (particlesRef.current.length > 100) {
        particlesRef.current = particlesRef.current.slice(-100)
      }
    }

    // Animation loop
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)' // Trail fade
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.update()
        particle.draw(ctx)
        return !particle.isDead()
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    // Resize handler
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', handleResize)
    animate()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9998,
        mixBlendMode: 'screen'
      }}
    />
  )
}

export default CursorTrail