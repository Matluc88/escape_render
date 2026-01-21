// EXPORT SPAWN DATA - Esegui nella Console del Browser (F12)
// Copia tutto questo codice e incollalo nella console mentre sei su http://localhost:5174/admin/spawn-editor

(async function exportSpawnData() {
  try {
    console.log('🔄 Esportazione spawn data in corso...');
    
    const response = await fetch('http://localhost:3000/api/rooms');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const rooms = await response.json();
    
    console.log('✅ Dati spawn recuperati:');
    console.log(JSON.stringify(rooms, null, 2));
    
    // Crea una versione formattata per facile copia
    const formatted = rooms.map(room => ({
      name: room.name,
      spawn_x: room.spawn_x,
      spawn_y: room.spawn_y,
      spawn_z: room.spawn_z,
      spawn_node_name: room.spawn_node_name
    }));
    
    console.log('\n📋 COPIA QUESTO JSON:');
    console.log(JSON.stringify(formatted, null, 2));
    
    // Copia automaticamente negli appunti
    await navigator.clipboard.writeText(JSON.stringify(formatted, null, 2));
    console.log('✅ JSON copiato negli appunti!');
    
    return formatted;
  } catch (error) {
    console.error('❌ Errore durante l\'esportazione:', error);
  }
})();
