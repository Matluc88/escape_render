// reset-pentola.js
// Script per resettare la PENTOLA alla posizione originale nel mobile
// ISTRUZIONI:
// 1. Apri browser su http://localhost:5174 nella scena CUCINA
// 2. Apri Console (F12)
// 3. Copia TUTTO questo file e incolla nella console
// 4. Premi Enter

(function() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 RESET PENTOLA - INIZIO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // UUID pentola
  const PENTOLA_UUID = 'FC640F14-10EB-486E-8AED-5773C59DA9E0';
  
  // Posizione originale nel MOBILE (da JSON export)
  const POSIZIONE_ORIGINALE = {
    x: -1.0153120000000009,
    y: -0.10899887084960827,
    z: 0.8566409999999999
  };
  
  // Verifica accesso alla scena
  if (!window.__DEBUG || !window.__DEBUG.scene) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERRORE: window.__DEBUG.scene non trovato!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('⚠️  Assicurati di:');
    console.error('   1. Essere nella scena CUCINA');
    console.error('   2. Avere DebugExpose attivo');
    console.error('   3. Non essere in modalità produzione');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return;
  }
  
  const scene = window.__DEBUG.scene;
  let pentola = null;
  
  // Cerca la pentola nella scena
  console.log('🔍 Ricerca PENTOLA nella scena...');
  
  scene.traverse((obj) => {
    // Cerca per UUID (più affidabile)
    if (obj.uuid === PENTOLA_UUID) {
      pentola = obj;
      console.log('✅ Pentola trovata tramite UUID!');
    }
    // Fallback: cerca per nome
    else if (obj.name && obj.name.includes('PENTOLA')) {
      if (!pentola) {
        pentola = obj;
        console.log('✅ Pentola trovata tramite nome:', obj.name);
      }
    }
  });
  
  // Se non trovata
  if (!pentola) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERRORE: Pentola non trovata nella scena!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('UUID cercato:', PENTOLA_UUID);
    console.error('Nome cercato: contiene "PENTOLA"');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Lista oggetti disponibili per debug
    console.log('📋 Oggetti disponibili nella scena:');
    let count = 0;
    scene.traverse((obj) => {
      if (obj.name && obj.name.length > 0) {
        count++;
        if (count <= 20) {
          console.log(`   - ${obj.name} (${obj.type}, UUID: ${obj.uuid})`);
        }
      }
    });
    console.log(`   ... e altri ${count - 20} oggetti`);
    
    return;
  }
  
  // Pentola trovata - mostra info
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 PENTOLA IDENTIFICATA:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Nome:', pentola.name);
  console.log('   UUID:', pentola.uuid);
  console.log('   Tipo:', pentola.type);
  console.log('   Parent:', pentola.parent ? pentola.parent.name : 'Scene');
  console.log('');
  console.log('📍 POSIZIONE ATTUALE:');
  console.log(`   X: ${pentola.position.x.toFixed(6)}`);
  console.log(`   Y: ${pentola.position.y.toFixed(6)}`);
  console.log(`   Z: ${pentola.position.z.toFixed(6)}`);
  
  // Calcola distanza dalla posizione originale
  const currentPos = pentola.position;
  const distance = Math.sqrt(
    Math.pow(currentPos.x - POSIZIONE_ORIGINALE.x, 2) +
    Math.pow(currentPos.y - POSIZIONE_ORIGINALE.y, 2) +
    Math.pow(currentPos.z - POSIZIONE_ORIGINALE.z, 2)
  );
  
  console.log('');
  console.log('📏 DISTANZA DA POSIZIONE ORIGINALE:');
  console.log(`   ${distance.toFixed(3)}m`);
  
  if (distance < 0.001) {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ LA PENTOLA È GIÀ NELLA POSIZIONE CORRETTA!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Nessun reset necessario.');
    console.log('   Puoi procedere con la configurazione animazione.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return;
  }
  
  // ✅ TROVA NODO MOVIBILE (potrebbe essere PENTOLA_ROOT!)
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 RILEVAMENTO NODO MOVIBILE...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Determina se usa pattern ROOT
  const hasRoot = pentola.parent && pentola.parent.name && pentola.parent.name.endsWith('_ROOT');
  const movable = hasRoot ? pentola.parent : pentola;
  
  console.log('   Oggetto selezionato:', pentola.name);
  console.log('   Parent:', pentola.parent ? pentola.parent.name : 'Scene');
  console.log('   Usa pattern ROOT:', hasRoot ? '✅ SÌ' : '❌ NO');
  console.log('   Nodo da resettare:', movable.name);
  
  if (hasRoot) {
    console.log('');
    console.log('💡 Pattern "Ancora Matematica" rilevato!');
    console.log('   Il reset verrà applicato su', movable.name);
    console.log('   La mesh', pentola.name, 'resterà a (0,0,0) locale');
  }
  
  // Reset posizione
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 APPLICAZIONE RESET...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  movable.position.set(
    POSIZIONE_ORIGINALE.x,
    POSIZIONE_ORIGINALE.y,
    POSIZIONE_ORIGINALE.z
  );
  
  // Forza aggiornamento matrix
  movable.updateMatrix();
  movable.updateMatrixWorld(true);
  
  console.log('');
  console.log('📍 NUOVA POSIZIONE (nodo movibile):');
  console.log(`   X: ${movable.position.x.toFixed(6)}`);
  console.log(`   Y: ${movable.position.y.toFixed(6)}`);
  console.log(`   Z: ${movable.position.z.toFixed(6)}`);
  
  // ✅ VERIFICA: Se ha ROOT, la mesh DEVE essere a (0,0,0)
  if (hasRoot) {
    console.log('');
    console.log('🔍 VERIFICA OWNERSHIP:');
    console.log(`   ${pentola.name}.position: [${pentola.position.x.toFixed(6)}, ${pentola.position.y.toFixed(6)}, ${pentola.position.z.toFixed(6)}]`);
    
    const meshLength = pentola.position.length();
    if (meshLength > 0.001) {
      console.warn('');
      console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.warn('⚠️  ATTENZIONE: OWNERSHIP CORROTTA!');
      console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.warn(`   ${pentola.name}.position dovrebbe essere (0,0,0)`);
      console.warn(`   Invece è: [${pentola.position.x.toFixed(6)}, ${pentola.position.y.toFixed(6)}, ${pentola.position.z.toFixed(6)}]`);
      console.warn('   Distanza da origine:', meshLength.toFixed(6), 'm');
      console.warn('');
      console.warn('📋 COSA FARE:');
      console.warn('   1. Ricarica la pagina (Ctrl+Shift+R)');
      console.warn('   2. Se il problema persiste, verifica AnimationEditor');
      console.warn('   3. Consulta PENTOLA_ROOT_ANCHOR_PATTERN.md');
      console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      console.log('   ✅ OK: mesh.position = (0,0,0) come previsto');
    }
  }
  
  // Verifica successo
  const newDistance = Math.sqrt(
    Math.pow(movable.position.x - POSIZIONE_ORIGINALE.x, 2) +
    Math.pow(movable.position.y - POSIZIONE_ORIGINALE.y, 2) +
    Math.pow(movable.position.z - POSIZIONE_ORIGINALE.z, 2)
  );
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (newDistance < 0.001) {
    console.log('✅ ✅ ✅ RESET COMPLETATO CON SUCCESSO! ✅ ✅ ✅');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🎯 PROSSIMI PASSI:');
    console.log('   1. Premi tasto E per aprire Animation Editor');
    console.log('   2. Click sulla PENTOLA');
    console.log('   3. Verifica Punto A: Y ≈ -0.109 (nel mobile)');
    console.log('   4. Click "Pick Destination"');
    console.log('   5. Click SUI FORNELLI (non sulla pentola!)');
    console.log('   6. Verifica Punto B: Y ≈ 0.95 (sui fornelli)');
    console.log('   7. Test Animation');
    console.log('   8. Scarica coordinate finali');
    console.log('');
    console.log('💡 Consulta PENTOLA_RESET_GUIDE.md per dettagli!');
  } else {
    console.error('❌ ERRORE: Reset fallito!');
    console.error(`   Distanza residua: ${newDistance.toFixed(6)}m`);
    console.error('   Prova a ricaricare la pagina (Ctrl+Shift+R)');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
})();
