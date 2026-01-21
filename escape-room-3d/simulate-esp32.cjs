#!/usr/bin/env node

/**
 * 🔬 SIMULATORE ESP32 - Test MQTT senza hardware fisico
 * 
 * Simula l'ESP32 della scena esterno pubblicando messaggi MQTT
 * per testare l'integrazione frontend senza avere l'hardware connesso.
 * 
 * REQUISITI:
 * - Backend Docker running (docker-compose up nel folder backend/)
 * - Broker MQTT attivo su localhost:1883
 * 
 * USO:
 * node simulate-esp32.js [scenario]
 * 
 * SCENARI DISPONIBILI:
 * - interactive: Controllo interattivo da terminale (default)
 * - demo: Sequenza automatica dimostrativa
 * - blocked: Sensore sempre bloccato
 * - free: Sensore sempre libero
 */

const mqtt = require('mqtt')

// Configurazione MQTT
const BROKER_URL = 'mqtt://localhost:1883'
const CLIENT_ID = `esp32-simulator-${Math.random().toString(16).slice(2, 10)}`

// Topics (stessi usati da ESP32 reale)
const TOPICS = {
  IR_SENSOR: 'escape/esterno/ir-sensor/stato',
  LED: 'escape/esterno/led/stato',
  CANCELLO1: 'escape/esterno/cancello1/posizione',
  CANCELLO2: 'escape/esterno/cancello2/posizione',
  TETTO: 'escape/esterno/tetto/posizione',
  PORTA: 'escape/esterno/porta/posizione'
}

// Stati del simulatore
let state = {
  irLibero: false,
  ledColor: 'ROSSO',
  posizione: {
    cancello1: 0,
    cancello2: 0,
    tetto: 0,
    porta: 0
  }
}

// Connessione MQTT
console.log('🔌 Connessione al broker MQTT...')
console.log(`URL: ${BROKER_URL}`)
console.log(`Client ID: ${CLIENT_ID}`)

const client = mqtt.connect(BROKER_URL, {
  clientId: CLIENT_ID,
  clean: true,
  keepalive: 60
})

client.on('connect', () => {
  console.log('✅ Connesso al broker MQTT\n')
  
  // Pubblica stato iniziale
  publishAllStates()
  
  const scenario = process.argv[2] || 'interactive'
  
  switch (scenario) {
    case 'demo':
      runDemoScenario()
      break
    case 'blocked':
      runBlockedScenario()
      break
    case 'free':
      runFreeScenario()
      break
    case 'interactive':
    default:
      runInteractiveMode()
      break
  }
})

client.on('error', (error) => {
  console.error('❌ Errore MQTT:', error.message)
  process.exit(1)
})

client.on('close', () => {
  console.log('\n🔌 Disconnesso dal broker MQTT')
})

// Pubblica tutti gli stati correnti
function publishAllStates() {
  const irMsg = state.irLibero ? 'LIBERO' : 'OCCUPATO'
  client.publish(TOPICS.IR_SENSOR, irMsg, { qos: 1, retain: true })
  client.publish(TOPICS.LED, state.ledColor, { qos: 1, retain: true })
  client.publish(TOPICS.CANCELLO1, state.posizione.cancello1.toString(), { qos: 1, retain: true })
  client.publish(TOPICS.CANCELLO2, state.posizione.cancello2.toString(), { qos: 1, retain: true })
  client.publish(TOPICS.TETTO, state.posizione.tetto.toString(), { qos: 1, retain: true })
  client.publish(TOPICS.PORTA, state.posizione.porta.toString(), { qos: 1, retain: true })
  
  console.log('📤 Stati pubblicati:')
  console.log(`   IR Sensor: ${irMsg}`)
  console.log(`   LED: ${state.ledColor}`)
  console.log(`   Cancello1: ${state.posizione.cancello1}°`)
  console.log(`   Cancello2: ${state.posizione.cancello2}°`)
  console.log(`   Tetto: ${state.posizione.tetto}°`)
  console.log(`   Porta: ${state.posizione.porta}°\n`)
}

// Simula movimento servo (smooth animation)
async function animateServo(name, target) {
  const start = state.posizione[name]
  const step = target > start ? 1 : -1
  
  for (let pos = start; step > 0 ? pos <= target : pos >= target; pos += step) {
    state.posizione[name] = pos
    client.publish(TOPICS[name.toUpperCase()], pos.toString(), { qos: 1, retain: true })
    await sleep(20) // 20ms per step (simula movimento reale)
  }
}

// SCENARIO 1: Modalità interattiva
function runInteractiveMode() {
  console.log('🎮 MODALITÀ INTERATTIVA')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Comandi disponibili:')
  console.log('  f - Libera fotocellula (IR libero)')
  console.log('  b - Blocca fotocellula (IR occupato)')
  console.log('  o - Apri cancelli (0° → 90°)')
  console.log('  c - Chiudi cancelli (90° → 0°)')
  console.log('  t - Toggle tetto serra')
  console.log('  p - Toggle porta casa')
  console.log('  r - Reset tutto')
  console.log('  s - Mostra stato corrente')
  console.log('  q - Esci')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  })
  
  rl.prompt()
  
  rl.on('line', async (line) => {
    const cmd = line.trim().toLowerCase()
    
    switch (cmd) {
      case 'f':
        console.log('🟢 Fotocellula LIBERA')
        state.irLibero = true
        state.ledColor = 'VERDE'
        client.publish(TOPICS.IR_SENSOR, 'LIBERO', { qos: 1, retain: true })
        client.publish(TOPICS.LED, 'VERDE', { qos: 1, retain: true })
        break
        
      case 'b':
        console.log('🔴 Fotocellula BLOCCATA')
        state.irLibero = false
        state.ledColor = 'ROSSO'
        client.publish(TOPICS.IR_SENSOR, 'OCCUPATO', { qos: 1, retain: true })
        client.publish(TOPICS.LED, 'ROSSO', { qos: 1, retain: true })
        break
        
      case 'o':
        console.log('🚪 Apertura cancelli...')
        await Promise.all([
          animateServo('cancello1', 90),
          animateServo('cancello2', 90)
        ])
        console.log('✅ Cancelli aperti')
        break
        
      case 'c':
        console.log('🚪 Chiusura cancelli...')
        await Promise.all([
          animateServo('cancello1', 0),
          animateServo('cancello2', 0)
        ])
        console.log('✅ Cancelli chiusi')
        break
        
      case 't':
        const tettoTarget = state.posizione.tetto > 90 ? 0 : 180
        console.log(`🏠 ${tettoTarget > 0 ? 'Apertura' : 'Chiusura'} tetto serra...`)
        await animateServo('tetto', tettoTarget)
        console.log(`✅ Tetto ${tettoTarget > 0 ? 'aperto' : 'chiuso'}`)
        break
        
      case 'p':
        const portaTarget = state.posizione.porta > 45 ? 0 : 90
        console.log(`🚪 ${portaTarget > 0 ? 'Apertura' : 'Chiusura'} porta casa...`)
        await animateServo('porta', portaTarget)
        console.log(`✅ Porta ${portaTarget > 0 ? 'aperta' : 'chiusa'}`)
        break
        
      case 'r':
        console.log('🔄 Reset stato...')
        state.irLibero = false
        state.ledColor = 'ROSSO'
        state.posizione = { cancello1: 0, cancello2: 0, tetto: 0, porta: 0 }
        publishAllStates()
        break
        
      case 's':
        console.log('\n📊 STATO CORRENTE:')
        console.log(`   IR Sensor: ${state.irLibero ? '🟢 LIBERO' : '🔴 OCCUPATO'}`)
        console.log(`   LED: ${state.ledColor === 'VERDE' ? '🟢' : '🔴'} ${state.ledColor}`)
        console.log(`   Cancello 1: ${state.posizione.cancello1}° ${state.posizione.cancello1 > 45 ? '(APERTO)' : '(CHIUSO)'}`)
        console.log(`   Cancello 2: ${state.posizione.cancello2}° ${state.posizione.cancello2 > 45 ? '(APERTO)' : '(CHIUSO)'}`)
        console.log(`   Tetto Serra: ${state.posizione.tetto}° ${state.posizione.tetto > 90 ? '(APERTO)' : '(CHIUSO)'}`)
        console.log(`   Porta Casa: ${state.posizione.porta}° ${state.posizione.porta > 45 ? '(APERTA)' : '(CHIUSA)'}\n`)
        break
        
      case 'q':
        console.log('👋 Uscita...')
        client.end()
        process.exit(0)
        break
        
      default:
        if (cmd) {
          console.log('❌ Comando non riconosciuto. Digita "h" per aiuto.')
        }
    }
    
    rl.prompt()
  })
}

// SCENARIO 2: Demo automatica
async function runDemoScenario() {
  console.log('🎬 SCENARIO DEMO AUTOMATICO')
  console.log('Simula sequenza completa di gioco...\n')
  
  await sleep(1000)
  
  console.log('1️⃣  Stato iniziale: tutto chiuso, fotocellula bloccata')
  await sleep(2000)
  
  console.log('2️⃣  Giocatore sposta pietra → fotocellula LIBERA')
  state.irLibero = true
  state.ledColor = 'VERDE'
  client.publish(TOPICS.IR_SENSOR, 'LIBERO', { qos: 1, retain: true })
  client.publish(TOPICS.LED, 'VERDE', { qos: 1, retain: true })
  await sleep(1000)
  
  console.log('3️⃣  ESP32 rileva fotocellula libera → apertura cancelli')
  await Promise.all([
    animateServo('cancello1', 90),
    animateServo('cancello2', 90)
  ])
  console.log('   ✅ Cancelli aperti!')
  await sleep(2000)
  
  console.log('4️⃣  Apertura porta casa')
  await animateServo('porta', 90)
  console.log('   ✅ Porta aperta!')
  await sleep(2000)
  
  console.log('5️⃣  Apertura tetto serra')
  await animateServo('tetto', 180)
  console.log('   ✅ Tetto aperto!')
  await sleep(3000)
  
  console.log('\n🎉 Demo completata! Premi Ctrl+C per uscire o attendi reset...\n')
  await sleep(5000)
  
  console.log('🔄 Reset automatico...')
  state.irLibero = false
  state.ledColor = 'ROSSO'
  state.posizione = { cancello1: 0, cancello2: 0, tetto: 0, porta: 0 }
  
  await Promise.all([
    animateServo('cancello1', 0),
    animateServo('cancello2', 0),
    animateServo('tetto', 0),
    animateServo('porta', 0)
  ])
  
  client.publish(TOPICS.IR_SENSOR, 'OCCUPATO', { qos: 1, retain: true })
  client.publish(TOPICS.LED, 'ROSSO', { qos: 1, retain: true })
  
  console.log('✅ Reset completato!\n')
  
  // Ripeti demo
  setTimeout(() => runDemoScenario(), 3000)
}

// SCENARIO 3: Sempre bloccato
function runBlockedScenario() {
  console.log('🔴 SCENARIO: Fotocellula sempre BLOCCATA')
  console.log('Per testing LED rosso e cancello chiuso\n')
  
  setInterval(() => {
    state.irLibero = false
    state.ledColor = 'ROSSO'
    client.publish(TOPICS.IR_SENSOR, 'OCCUPATO', { qos: 1, retain: true })
    client.publish(TOPICS.LED, 'ROSSO', { qos: 1, retain: true })
  }, 5000)
}

// SCENARIO 4: Sempre libero
function runFreeScenario() {
  console.log('🟢 SCENARIO: Fotocellula sempre LIBERA')
  console.log('Per testing LED verde e cancello aperto\n')
  
  state.irLibero = true
  state.ledColor = 'VERDE'
  state.posizione = { cancello1: 90, cancello2: 90, tetto: 180, porta: 90 }
  
  setInterval(() => {
    client.publish(TOPICS.IR_SENSOR, 'LIBERO', { qos: 1, retain: true })
    client.publish(TOPICS.LED, 'VERDE', { qos: 1, retain: true })
    client.publish(TOPICS.CANCELLO1, '90', { qos: 1, retain: true })
    client.publish(TOPICS.CANCELLO2, '90', { qos: 1, retain: true })
    client.publish(TOPICS.TETTO, '180', { qos: 1, retain: true })
    client.publish(TOPICS.PORTA, '90', { qos: 1, retain: true })
  }, 5000)
}

// Utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Gestione Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Chiusura simulatore...')
  client.end()
  process.exit(0)
})
