#!/bin/bash
# Fix spawn useMemo bug in tutte le scene

for scene in KitchenScene LivingRoomScene EsternoScene; do
  file="src/components/scenes/${scene}.jsx"
  echo "Fixing $scene..."
  
  # Backup
  cp "$file" "${file}.bak"
  
  # Fix: aggiungi spawnData se manca nelle dipendenze di useMemo con initialPosition o safeSpawnPosition
  sed -i '' 's/}, \[modelRef\.spawnPoint, boundaryLimits\])/}, [spawnData, modelRef.spawnPoint, boundaryLimits])/g' "$file"
  
  # Verifica se il fix è stato applicato
  if grep -q "}, \[spawnData, modelRef\.spawnPoint, boundaryLimits\])" "$file"; then
    echo "✅ $scene fixato"
    rm "${file}.bak"
  else
    echo "⚠️  $scene non modificato (forse già fixato)"
    mv "${file}.bak" "$file"
  fi
done

echo "Done!"
