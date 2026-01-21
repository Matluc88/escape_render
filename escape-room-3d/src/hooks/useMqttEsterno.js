import { useEffect, useRef, useState } from 'react'
import mqtt from 'mqtt'

/**
 * Hook MQTT per gestire comunicazione con ESP32 della scena esterno
 * Connessione WebSocket al broker Mosquitto in Docker (porta 9001)
 * 
 * Topics ESP32:
 * - escape/esterno/ir-sensor/stato (LIBERO/OCCUPATO)
 * - escape/esterno/led/stato (VERDE/ROSSO)
 * - escape/esterno/cancello1/posizione (0-90)
 * - escape/esterno/cancello2/posizione (0-90)
 * - escape/esterno/tetto/posizione (0-180)
 * - escape/esterno/porta/posizione (0-90)
 */
export function useMqttEsterno() {
  const clientRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const lastMessageTime = useRef(Date.now())
  const timeoutCheckInterval = useRef(null)
  
  // Stati DEFAULT (sicurezza se ESP32 offline)
  const DEFAULT_STATES = {
    irSensor: { libero: false, raw: 'OCCUPATO' },
    led: { color: 'rosso', raw: 'ROSSO' },
    posizioni: { cancello1: 0, cancello2: 0, tetto: 0, porta: 0 }
  }
  
  // Stati ESP32
  const [irSensorState, setIrSensorState] = useState(DEFAULT_STATES.irSensor)
  const [ledState, setLedState] = useState(DEFAULT_STATES.led)
  const [posizioni, setPosizioni] = useState(DEFAULT_STATES.posizioni)
  const [esp32Online, setEsp32Online] = useState(true)

  // Configurazione MQTT
  // Usa window.location.hostname per adattarsi automaticamente
  // localhost in dev, IP Raspberry in produzione
  // ✅ FIX: Auto-detect protocol (wss:// for HTTPS, ws:// for HTTP)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const MQTT_URL = `${protocol}//${window.location.hostname}:9001`
  
  const TOPICS = {
    IR_SENSOR: 'escape/esterno/ir-sensor/stato',
    LED: 'escape/esterno/led/stato',
    CANCELLO1: 'escape/esterno/cancello1/posizione',
    CANCELLO2: 'escape/esterno/cancello2/posizione',
    TETTO: 'escape/esterno/tetto/posizione',
    PORTA: 'escape/esterno/porta/posizione'
  }

  // Reset a stati default
  const resetToDefault = () => {
    console.warn('[useMqttEsterno] ⚠️ ESP32 OFFLINE - Ripristino stati default (sicurezza)')
    setIrSensorState(DEFAULT_STATES.irSensor)
    setLedState(DEFAULT_STATES.led)
    setPosizioni(DEFAULT_STATES.posizioni)
    setEsp32Online(false)
  }

  // Timeout check: se nessun messaggio per 10 secondi, reset a default
  useEffect(() => {
    timeoutCheckInterval.current = setInterval(() => {
      const timeSinceLastMessage = Date.now() - lastMessageTime.current
      const TIMEOUT_MS = 10000 // 10 secondi
      
      if (timeSinceLastMessage > TIMEOUT_MS && esp32Online) {
        console.warn(`[useMqttEsterno] ⏱️ Nessun messaggio da ${Math.round(timeSinceLastMessage/1000)}s`)
        resetToDefault()
      }
    }, 2000) // Check ogni 2 secondi
    
    return () => {
      if (timeoutCheckInterval.current) {
        clearInterval(timeoutCheckInterval.current)
      }
    }
  }, [esp32Online])

  useEffect(() => {
    if (clientRef.current) return

    console.log('[useMqttEsterno] 🔌 Connessione al broker MQTT via WebSocket...')
    console.log('[useMqttEsterno] URL:', MQTT_URL)
    
    const client = mqtt.connect(MQTT_URL, {
      clean: true,
      keepalive: 60,
      clientId: `web-esterno-${Math.random().toString(16).slice(2, 10)}`,
      reconnectPeriod: 5000
    })
    
    clientRef.current = client

    client.on('connect', () => {
      console.log('[useMqttEsterno] ✅ Connesso al broker MQTT')
      setConnected(true)
      
      // Sottoscrivi a tutti i topic ESP32
      Object.values(TOPICS).forEach(topic => {
        client.subscribe(topic, (err) => {
          if (err) {
            console.error(`[useMqttEsterno] ❌ Errore sottoscrizione ${topic}:`, err)
          } else {
            console.log(`[useMqttEsterno] 📡 Sottoscritto a: ${topic}`)
          }
        })
      })
      
      // 🛡️ PROTEZIONE RETAINED MESSAGES OBSOLETI
      // Dopo la connessione, aspetta 3 secondi e verifica se i messaggi ricevuti
      // sono "freschi" (recenti). Se no, sono retained obsoleti → reset a default
      const connectionTime = Date.now()
      setTimeout(() => {
        const elapsed = Date.now() - lastMessageTime.current
        const timeFromConnection = Date.now() - connectionTime
        
        // Se non sono arrivati messaggi nuovi negli ultimi 2 secondi
        // (cioè i messaggi ricevuti erano retained vecchi)
        if (elapsed > 2000 || lastMessageTime.current < connectionTime) {
          console.warn('[useMqttEsterno] ⚠️ Nessun messaggio fresco da ESP32')
          console.warn('[useMqttEsterno] 🧹 Messaggi retained obsoleti rilevati → Reset a stati DEFAULT')
          resetToDefault()
        } else {
          console.log('[useMqttEsterno] ✅ ESP32 online - messaggi freschi ricevuti')
        }
      }, 3000)
    })

    client.on('message', (topic, payload) => {
      const message = payload.toString()
      console.log(`[useMqttEsterno] 📥 ${topic}: ${message}`)
      
      // Aggiorna timestamp ultimo messaggio
      lastMessageTime.current = Date.now()
      if (!esp32Online) {
        console.log('[useMqttEsterno] ✅ ESP32 tornato ONLINE')
        setEsp32Online(true)
      }
      
      // Router messaggi basato su topic
      switch (topic) {
        case TOPICS.IR_SENSOR:
          handleIrSensorMessage(message)
          break
        case TOPICS.LED:
          handleLedMessage(message)
          break
        case TOPICS.CANCELLO1:
          handlePosizioneMessage('cancello1', message)
          break
        case TOPICS.CANCELLO2:
          handlePosizioneMessage('cancello2', message)
          break
        case TOPICS.TETTO:
          handlePosizioneMessage('tetto', message)
          break
        case TOPICS.PORTA:
          handlePosizioneMessage('porta', message)
          break
      }
    })

    client.on('close', () => {
      console.log('[useMqttEsterno] 🔌 Connessione MQTT chiusa')
      setConnected(false)
    })

    client.on('error', (error) => {
      console.error('[useMqttEsterno] ❌ Errore MQTT:', error)
      setConnected(false)
    })

    client.on('reconnect', () => {
      console.log('[useMqttEsterno] 🔄 Tentativo riconnessione...')
    })

    return () => {
      console.log('[useMqttEsterno] 🔌 Disconnessione dal broker MQTT...')
      try {
        if (clientRef.current) {
          clientRef.current.end(true)
        }
      } catch (error) {
        console.error('[useMqttEsterno] Errore disconnessione:', error)
      }
      clientRef.current = null
    }
  }, [])

  // Handler per messaggio sensore IR
  const handleIrSensorMessage = (message) => {
    let libero = false
    
    // Prova a parsare come JSON (dal backend)
    try {
      const parsed = JSON.parse(message)
      libero = parsed.libero === true || parsed.libero === 1
      console.log(`[useMqttEsterno] 📥 JSON IR sensor:`, parsed)
    } catch {
      // Fallback: messaggio testuale (da ESP32 diretto)
      const msg = message.toUpperCase()
      libero = msg === 'LIBERO' || msg === 'FREE' || msg === '1' || msg === 'TRUE'
    }
    
    setIrSensorState({
      libero,
      raw: message
    })
    
    console.log(`[useMqttEsterno] 🚥 Fotocellula: ${libero ? 'LIBERA ✅' : 'OCCUPATA ⛔'}`)
  }

  // Handler per messaggio LED
  const handleLedMessage = (message) => {
    const msg = message.toLowerCase()
    const ledColor = msg.includes('verde') || msg.includes('green') ? 'verde' : 'rosso'
    
    setLedState({
      color: ledColor,
      raw: message
    })
    
    console.log(`[useMqttEsterno] 💡 LED: ${ledColor === 'verde' ? '🟢 VERDE' : '🔴 ROSSO'}`)
  }

  // Handler per messaggi posizione servo
  const handlePosizioneMessage = (servo, message) => {
    let position = 0
    
    // Prova a parsare come JSON (dal backend)
    try {
      const parsed = JSON.parse(message)
      position = parsed.position || 0
      console.log(`[useMqttEsterno] 📥 JSON ${servo}:`, parsed)
    } catch {
      // Fallback: numero diretto (da ESP32 diretto)
      position = parseInt(message, 10)
    }
    
    if (!isNaN(position)) {
      setPosizioni(prev => ({
        ...prev,
        [servo]: position
      }))
      
      console.log(`[useMqttEsterno] 🔧 ${servo}: ${position}°`)
    } else {
      console.warn(`[useMqttEsterno] ⚠️ Posizione invalida per ${servo}: ${message}`)
    }
  }

  // Funzione per pubblicare comandi (opzionale, per controllo remoto)
  const publishCommand = (topic, message) => {
    if (clientRef.current && connected) {
      clientRef.current.publish(topic, message, { qos: 1, retain: false })
      console.log(`[useMqttEsterno] 📤 Pubblicato su ${topic}: ${message}`)
    } else {
      console.warn('[useMqttEsterno] ⚠️ MQTT non connesso, impossibile pubblicare')
    }
  }

  // Stati derivati per facilità d'uso
  const fotocellulaSbloccata = irSensorState.libero
  const ledVerde = ledState.color === 'verde'
  const cancelloAperto = posizioni.cancello1 > 45 || posizioni.cancello2 > 45
  const tettoAperto = posizioni.tetto > 90
  const portaAperta = posizioni.porta > 45

  return {
    // Connessione
    connected,
    esp32Online,
    
    // Stati raw
    irSensorState,
    ledState,
    posizioni,
    
    // Stati derivati (comodi per UI)
    fotocellulaSbloccata,
    ledVerde,
    cancelloAperto,
    tettoAperto,
    portaAperta,
    
    // Funzioni utility
    publishCommand,
    resetToDefault,
    topics: TOPICS
  }
}