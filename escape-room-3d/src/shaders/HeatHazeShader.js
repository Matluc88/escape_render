/**
 * HeatHazeShader - Effetto distorsione aria calda (post-processing)
 * 
 * Crea un effetto di "heat haze" realistico distorcendo le UV della scena renderizzata.
 * L'effetto è più intenso in basso (vicino al suolo) e si attenua verso l'alto.
 * 
 * Utilizzo: Con EffectComposer + ShaderPass in RoomScene
 */

const HeatHazeShader = {
  uniforms: {
    // Texture della scena renderizzata
    tDiffuse: { value: null },
    
    // Tempo per animazione
    time: { value: 0.0 },
    
    // Intensità generale della distorsione (0.0 = nessuna, 0.01 = leggera, 0.05 = forte)
    heatStrength: { value: 0.008 },
    
    // Frequenza onde (numero di ondulazioni visibili)
    heatFrequency: { value: 20.0 },
    
    // Velocità movimento effetto
    heatSpeed: { value: 1.2 },
    
    // Altezza zona effetto (0.0 = tutta schermo, 0.5 = metà inferiore, 1.0 = solo bordo inf)
    heatHeight: { value: 0.65 },
    
    // Scala noise per variazione
    noiseScale: { value: 1.8 },
    
    // 🌡️ Intensità tinta rossa riscaldamento (0.0 = off, 0.05 = leggero, 0.2 = visibile)
    heatTint: { value: 0.03 },
    
    // Abilitazione effetto (0.0 = OFF, 1.0 = ON)
    enabled: { value: 0.0 }
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float heatStrength;
    uniform float heatFrequency;
    uniform float heatSpeed;
    uniform float heatHeight;
    uniform float noiseScale;
    uniform float heatTint;
    uniform float enabled;
    
    varying vec2 vUv;
    
    // Simple 2D noise function per variazione organica
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    // Smooth noise con interpolazione
    float smoothNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      
      // Smooth interpolation (hermite)
      f = f * f * (3.0 - 2.0 * f);
      
      // Campiona 4 angoli e interpola
      float a = noise(i);
      float b = noise(i + vec2(1.0, 0.0));
      float c = noise(i + vec2(0.0, 1.0));
      float d = noise(i + vec2(1.0, 1.0));
      
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    // Fractional Brownian Motion (FBM) per noise stratificato
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      
      // 3 ottave di noise
      for (int i = 0; i < 3; i++) {
        value += amplitude * smoothNoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      
      return value;
    }
    
    void main() {
      vec2 uv = vUv;
      
      // Se disabilitato, passa direttamente
      if (enabled < 0.5) {
        gl_FragColor = texture2D(tDiffuse, uv);
        return;
      }
      
      // ========================================
      // MASCHERA VERTICALE (forte in basso)
      // ========================================
      float mask = smoothstep(heatHeight, 0.0, uv.y);
      
      // ========================================
      // 🔥 MASCHERA SPAZIALE DISOMOGENEA (zone calde)
      // Simula aria calda che arriva da punti specifici (fessure porta)
      // ========================================
      vec2 spatialNoiseCoord = vec2(uv.x * 3.0, uv.y * 2.0 + time * 0.15);
      float spatialPattern = fbm(spatialNoiseCoord);
      
      // Crea "hot spots" - zone dove l'aria calda è più concentrata
      float hotSpots = smoothstep(0.3, 0.7, spatialPattern);
      
      // Combina maschera verticale con pattern spaziale
      // 0.5 + 0.5 * hotSpots = varia tra 50% e 100% della maschera base
      float combinedMask = mask * (0.5 + 0.5 * hotSpots);
      
      // ========================================
      // DISTORSIONE ORIZZONTALE (onde che salgono)
      // ========================================
      float wave1 = sin(uv.y * heatFrequency + time * heatSpeed) * 0.5;
      float wave2 = sin(uv.y * heatFrequency * 0.7 - time * heatSpeed * 0.8) * 0.3;
      
      // ========================================
      // NOISE per variazione organica
      // ========================================
      vec2 noiseCoord = vec2(uv.x * noiseScale, uv.y * noiseScale + time * 0.3);
      float noiseValue = fbm(noiseCoord) - 0.5;
      
      // ========================================
      // DISTORSIONE COMBINATA (usa maschera combinata disomogenea)
      // ========================================
      float distortionX = (wave1 + wave2 + noiseValue * 0.4) * heatStrength * combinedMask;
      
      // Leggera distorsione verticale (opzionale, molto sottile)
      float distortionY = sin(uv.x * heatFrequency * 0.5 + time * heatSpeed * 0.6) * heatStrength * 0.3 * combinedMask;
      
      // ========================================
      // APPLICA DISTORSIONE
      // ========================================
      vec2 distortedUV = vec2(
        uv.x + distortionX,
        uv.y + distortionY
      );
      
      // Clamp per evitare artefatti ai bordi
      distortedUV = clamp(distortedUV, 0.0, 1.0);
      
      // ========================================
      // CAMPIONA TEXTURE CON UV DISTORTE
      // ========================================
      vec4 color = texture2D(tDiffuse, distortedUV);
      
      // ========================================
      // 🔴 TINTA ROSSA DIFFUSA (riscaldamento acceso)
      // Aggiunge un leggero bagliore rosso per indicare aria calda
      // ========================================
      if (heatTint > 0.0) {
        // Calcola intensità tinta basata su maschera verticale
        // Più intensa in basso, si attenua verso l'alto
        float tintStrength = mask * heatTint;
        
        // Aggiungi variazione spaziale alla tinta (stesso pattern delle zone calde)
        tintStrength *= (0.7 + 0.3 * hotSpots);
        
        // Colore rosso caldo molto tenue (arancio-rosso)
        vec3 heatColor = vec3(1.0, 0.3, 0.1); // RGB rosso-arancio
        
        // Mix additivo (overlay leggero) - non sostituisce, aggiunge luminosità
        color.rgb = mix(color.rgb, color.rgb + heatColor * tintStrength, tintStrength);
      }
      
      gl_FragColor = color;
    }
  `
};

export default HeatHazeShader;
