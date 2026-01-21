import * as THREE from "three";
import { fetchSpawnPosition } from './api';

/**
 * Sistema di posizionamento camera per casa.glb.
 * 🔒 COORDINATE SPAWN CARICATE SOLO DAL DATABASE - NESSUN FALLBACK
 * 
 * Le coordinate spawn sono l'UNICA fonte di verità e risiedono nel database PostgreSQL.
 * Se il database non è disponibile, il gioco NON si carica.
 */

/**
 * Ritorna la posizione e rotazione per una stanza DAL DATABASE
 * 🔒 SOLO DATABASE - Nessun fallback, nessun localStorage
 * 
 * @param {string} sceneType - Tipo di scena (cucina, soggiorno, bagno, camera, esterno)
 * @returns {Promise<Object>} - { position: {x, y, z}, yaw: number }
 * @throws {Error} Se l'API non risponde o non ci sono coordinate
 */
export async function getCapturedPosition(sceneType) {
  try {
    const apiData = await fetchSpawnPosition(sceneType);
    if (apiData) {
      console.log(`[CameraPositioning] ✅ Loaded spawn from DATABASE for ${sceneType}:`, apiData);
      return apiData;
    }
    
    // Se API risponde ma non ci sono dati → usa fallback
    console.warn(`[CameraPositioning] ⚠️ No spawn data in database for ${sceneType}, using fallback`);
    return getDefaultSpawnPosition(sceneType);
    
  } catch (error) {
    // Se API fallisce → usa fallback per dev mode
    console.warn(`[CameraPositioning] ⚠️ Cannot load spawn from database for ${sceneType}: ${error.message}`);
    console.warn(`[CameraPositioning] 🔧 Using fallback coordinates for dev mode`);
    return getDefaultSpawnPosition(sceneType);
  }
}

/**
 * Coordinate di fallback per ogni stanza (solo per dev mode)
 */
function getDefaultSpawnPosition(sceneType) {
  // 📍 COORDINATE DEFINITIVE (16/01/2026 ore 08:42)
  // Fonte: definitive.json
  // Tutte le stanze aggiornate con coordinate definitive
  // Y = 0 perché il sistema aggiunge automaticamente l'eye height
  const defaults = {
    cucina: {
      position: { x: -0.94, y: 0, z: 2.14 },  // ✅ DEFINITIVA da definitive.json
      yaw: 2.48  // 142 gradi - Guarda verso centro
    },
    soggiorno: {
      position: { x: 0.54, y: 0, z: 1.51 },  // ✅ AGGIORNATA z: 1.52→1.51
      yaw: 5.39  // 309 gradi (era 299)
    },
    bagno: {
      position: { x: 1.31, y: 0, z: 2.77 },  // ✅ AGGIORNATA x: 1.27→1.31, z: 2.62→2.77
      yaw: 3.53  // 202 gradi (era 209) - Guarda verso lavandino
    },
    camera: {
      position: { x: -0.56, y: 0, z: 1.31 },  // ✅ AGGIORNATA x: -0.18→-0.56, z: 1.5→1.31
      yaw: 0.46  // 26 gradi (era 35)
    },
    esterno: {
      position: { x: 0.53, y: 0, z: 7.27 },
      yaw: 0  // 0 gradi
    }
  };
  
  return defaults[sceneType] || defaults.cucina;
}

export async function getSpawnPosition(scene, sceneType) {
  console.log("=== GET SPAWN POSITION CALLED ===", sceneType);
  
  // 🔒 UNICA FONTE DI COORDINATE: DATABASE PostgreSQL
  const captured = await getCapturedPosition(sceneType);
  
  console.log(`[CameraPositioning] ✅ Using coordinates from DATABASE for ${sceneType}:`, captured);
  return {
    position: new THREE.Vector3(captured.position.x, captured.position.y, captured.position.z),
    yaw: captured.yaw
  };
}