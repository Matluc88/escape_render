#!/bin/bash

# Array di scene da fixare
scenes=("BathroomScene" "LivingRoomScene" "BedroomScene")
spawn_names=("INIZIO_BAGNO" "INIZIO_SOGGIORNO" "INIZIO_CAMERA_DA_LETTO")

for i in "${!scenes[@]}"; do
    scene="${scenes[$i]}"
    spawn="${spawn_names[$i]}"
    file="src/components/scenes/${scene}.jsx"
    
    echo "🔧 Fixing $scene..."
    
    # 1. Rimuovi spawnPoint da useState
    sed -i '' 's/const \[modelRef, setModelRef\] = useState({ current: null, spawnPoint: null })/const [modelRef, setModelRef] = useState({ current: null })/' "$file"
    
    # 2. Rimuovi log spawnPoint
    sed -i '' '/console.log.*Model spawnPoint.*modelRef\.spawnPoint/d' "$file"
    
    # 3. Rimuovi spawnNodeName prop
    sed -i '' "s/spawnNodeName=\"$spawn\"//" "$file"
    
    echo "✅ $scene fixed!"
done

echo "🎉 All scenes fixed!"
