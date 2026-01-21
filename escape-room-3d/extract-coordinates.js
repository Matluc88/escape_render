// extract-coordinates.js
// Script da eseguire nella CONSOLE del browser per estrarre coordinate precise
// Uso: Copia tutto il codice e incolla nella console mentre sei nella scena cucina

(function() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ESTRAZIONE COORDINATE - INIZIO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Accedi alla scena Three.js
  if (!window.__DEBUG || !window.__DEBUG.scene) {
    console.error('❌ ERROR: window.__DEBUG.scene non trovato!');
    console.error('   Assicurati di essere nella scena cucina con DebugExpose attivo');
    return;
  }
  
  const scene = window.__DEBUG.scene;
  const results = {
    timestamp: new Date().toISOString(),
    pentola: null,
    fornelli: [],
    piano_cucina: [],
    analisi: {}
  };
  
  // ═══════════════════════════════════════════════════════
  // 1. CERCA LA PENTOLA
  // ═══════════════════════════════════════════════════════
  const PENTOLA_UUID = 'FC640F14-10EB-486E-8AED-5773C59DA9E0';
  let pentola = null;
  
  scene.traverse((obj) => {
    if (obj.uuid === PENTOLA_UUID) {
      pentola = obj;
    }
  });
  
  if (pentola) {
    const worldPos = new THREE.Vector3();
    pentola.getWorldPosition(worldPos);
    
    const localPos = pentola.position.clone();
    const bbox = new THREE.Box3().setFromObject(pentola);
    
    results.pentola = {
      name: pentola.name,
      uuid: pentola.uuid,
      type: pentola.type,
      position_world: {
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z
      },
      position_local: {
        x: localPos.x,
        y: localPos.y,
        z: localPos.z
      },
      parent: pentola.parent ? pentola.parent.name : null,
      bounding_box: {
        min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
        max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z },
        size: {
          x: bbox.max.x - bbox.min.x,
          y: bbox.max.y - bbox.min.y,
          z: bbox.max.z - bbox.min.z
        }
      },
      rotation: {
        x: pentola.rotation.x,
        y: pentola.rotation.y,
        z: pentola.rotation.z
      }
    };
    
    console.log('✅ PENTOLA TROVATA:', pentola.name);
    console.log('   World Position:', worldPos);
  } else {
    console.warn('⚠️  PENTOLA NON TROVATA con UUID:', PENTOLA_UUID);
  }
  
  // ═══════════════════════════════════════════════════════
  // 2. CERCA I FORNELLI
  // ═══════════════════════════════════════════════════════
  const FORNELLI_NAMES = ['FORNELLI', 'Feu_32_447', 'Corps_32_449'];
  
  scene.traverse((obj) => {
    if (obj.isMesh && FORNELLI_NAMES.some(name => obj.name.includes(name))) {
      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos);
      
      const bbox = new THREE.Box3().setFromObject(obj);
      
      results.fornelli.push({
        name: obj.name,
        uuid: obj.uuid,
        position_world: {
          x: worldPos.x,
          y: worldPos.y,
          z: worldPos.z
        },
        bounding_box: {
          min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
          max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z },
          center: {
            x: (bbox.min.x + bbox.max.x) / 2,
            y: (bbox.min.y + bbox.max.y) / 2,
            z: (bbox.min.z + bbox.max.z) / 2
          },
          top_surface: bbox.max.y
        }
      });
    }
  });
  
  console.log(`✅ FORNELLI TROVATI: ${results.fornelli.length} oggetti`);
  results.fornelli.forEach(f => {
    console.log(`   - ${f.name}: Y top = ${f.bounding_box.top_surface.toFixed(3)}`);
  });
  
  // ═══════════════════════════════════════════════════════
  // 3. CERCA PIANI/TAVOLI CUCINA
  // ═══════════════════════════════════════════════════════
  scene.traverse((obj) => {
    if (obj.isMesh) {
      const name = obj.name.toLowerCase();
      if (name.includes('table') || name.includes('piano') || name.includes('top')) {
        const worldPos = new THREE.Vector3();
        obj.getWorldPosition(worldPos);
        
        const bbox = new THREE.Box3().setFromObject(obj);
        
        results.piano_cucina.push({
          name: obj.name,
          uuid: obj.uuid,
          position_world: {
            x: worldPos.x,
            y: worldPos.y,
            z: worldPos.z
          },
          bounding_box: {
            min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
            max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z },
            top_surface: bbox.max.y
          }
        });
      }
    }
  });
  
  console.log(`✅ PIANI CUCINA TROVATI: ${results.piano_cucina.length} oggetti`);
  
  // ═══════════════════════════════════════════════════════
  // 4. CALCOLA DISTANZE E ANALISI
  // ═══════════════════════════════════════════════════════
  if (pentola && results.fornelli.length > 0) {
    const pentolaPos = new THREE.Vector3(
      results.pentola.position_world.x,
      results.pentola.position_world.y,
      results.pentola.position_world.z
    );
    
    // Trova il fornello più vicino
    let minDistance = Infinity;
    let closestFornello = null;
    
    results.fornelli.forEach(f => {
      const fornelloPos = new THREE.Vector3(
        f.bounding_box.center.x,
        f.bounding_box.center.y,
        f.bounding_box.center.z
      );
      const distance = pentolaPos.distanceTo(fornelloPos);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestFornello = f;
      }
    });
    
    results.analisi.fornello_piu_vicino = {
      name: closestFornello.name,
      distanza_metri: minDistance,
      centro_fornello: closestFornello.bounding_box.center,
      top_surface_y: closestFornello.bounding_box.top_surface,
      delta_y_pentola_fornello: results.pentola.position_world.y - closestFornello.bounding_box.top_surface
    };
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ANALISI:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Fornello più vicino: ${closestFornello.name}`);
    console.log(`Distanza: ${minDistance.toFixed(3)}m`);
    console.log(`Top surface fornello Y: ${closestFornello.bounding_box.top_surface.toFixed(3)}`);
    console.log(`Pentola Y: ${results.pentola.position_world.y.toFixed(3)}`);
    console.log(`Delta Y: ${results.analisi.fornello_piu_vicino.delta_y_pentola_fornello.toFixed(3)}m`);
  }
  
  // ═══════════════════════════════════════════════════════
  // 5. OUTPUT JSON
  // ═══════════════════════════════════════════════════════
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📄 JSON OUTPUT:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const jsonOutput = JSON.stringify(results, null, 2);
  console.log(jsonOutput);
  
  // Salva in window per accesso facile
  window.__COORDINATE_DATA = results;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ESTRAZIONE COMPLETATA!');
  console.log('   Dati salvati in: window.__COORDINATE_DATA');
  console.log('   Per scaricare: copy(JSON.stringify(window.__COORDINATE_DATA, null, 2))');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  return results;
})();
