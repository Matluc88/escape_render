#!/bin/bash

# Script per applicare async loading alle scene rimanenti

SCENES=(
  "BathroomScene:bagno"
  "BedroomScene:camera"
  "EsternoScene:esterno"
)

for scene_info in "${SCENES[@]}"; do
  IFS=':' read -r SCENE ROOM <<< "$scene_info"
  FILE="src/components/scenes/${SCENE}.jsx"
  
  echo "🔧 Patching $FILE ($ROOM)..."
  
  # 1. Aggiungi import LoadingOverlay dopo gli altri import
  sed -i '' '/import LivePositionDebug/a\
import LoadingOverlay from '"'"'../UI/LoadingOverlay'"'"'
' "$FILE"
  
  # 2. Aggiungi stati async dopo liveDebugInfo
  sed -i '' '/const \[liveDebugInfo, setLiveDebugInfo\] = useState(null)/a\
\
  // 🚀 ASYNC SPAWN LOADING\
  const [spawnData, setSpawnData] = useState(null)\
  const [isLoadingSpawn, setIsLoadingSpawn] = useState(true)
' "$FILE"
  
  # 3. Aggiungi useEffect per caricamento async dopo gli altri useEffect
  # Trova la riga dopo "setCaptureReady(true)" e inserisci il codice
  sed -i '' '/setCaptureReady(true)/a\
\
  // Load spawn position ASYNC at component mount\
  useEffect(() => {\
    console.log('"'"'['"$SCENE"'] 🔍 CARICAMENTO spawn position async - START'"'"')\
    \
    const loadSpawnPosition = async () => {\
      try {\
        const captured = await getCapturedPosition('"'"$ROOM"'"'"')\
        \
        if (captured) {\
          console.log('"'"'['"$SCENE"'] getCapturedPosition("'"$ROOM"'") returned:'"'"', captured)\
          setSpawnData({\
            position: { x: captured.position.x, y: captured.position.y, z: captured.position.z },\
            yaw: captured.yaw\
          })\
        } else {\
          setSpawnData(null)\
        }\
      } catch (error) {\
        console.error('"'"'['"$SCENE"'] Error loading spawn:'"'"', error)\
        setSpawnData(null)\
      } finally {\
        setIsLoadingSpawn(false)\
        console.log('"'"'['"$SCENE"'] 🔍 CARICAMENTO spawn position - END'"'"')\
      }\
    }\
    \
    loadSpawnPosition()\
  }, [])
' "$FILE"
  
  echo "✅ $FILE patched successfully"
done

echo "🎉 All scenes patched!"
