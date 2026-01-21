#!/bin/bash
# Script per aggiungere Animation Editor a LivingRoomScene e BathroomScene

echo "🎨 Aggiunta Animation Editor alle scene mancanti..."

# Lista delle scene da modificare
SCENES=("LivingRoomScene" "BathroomScene")

for SCENE in "${SCENES[@]}"; do
  FILE="src/components/scenes/${SCENE}.jsx"
  
  if [ ! -f "$FILE" ]; then
    echo "❌ $FILE non trovato!"
    continue
  fi
  
  echo "📝 Modificando $SCENE..."
  
  # 1. Aggiungi import Animation Editor (dopo gli altri import)
  if ! grep -q "import AnimationEditor" "$FILE"; then
    # Trova l'ultima riga di import e aggiungi dopo
    sed -i '' '/^import.*from/a\
import AnimationEditor from '\''../UI/AnimationEditor'\''\
import { useObjectSelection } from '\''../../hooks/useObjectSelection'\''\
import { usePositionPicker } from '\''../../hooks/usePositionPicker'\''\
import ObjectHighlighter from '\''../debug/ObjectHighlighter'\''\
import PivotHelper from '\''../debug/PivotHelper'\''\
import PathHelper from '\''../debug/PathHelper'\''\
import { useAnimationPreview } from '\''../../hooks/useAnimationPreview'\''\
import { getMovableNode } from '\''../../utils/movableNodeHelper'\''
' "$FILE"
    echo "  ✅ Import aggiunti"
  else
    echo "  ⏭️  Import già presenti"
  fi
  
  # 2. Aggiungi state variables per editor (cerca primo useState e aggiungi dopo)
  if ! grep -q "editorEnabled.*useState" "$FILE"; then
    sed -i '' '/const \[.*useState/a\
\
  \/\/ Sistema di editing animazioni\
  const [editorEnabled, setEditorEnabled] = useState(false)\
  const [selectedObject, setSelectedObject] = useState(null)\
  const [animationConfig, setAnimationConfig] = useState(null)\
  const [showEditorUI, setShowEditorUI] = useState(false)\
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false)\
  const [pickDestinationMode, setPickDestinationMode] = useState(false)\
\
  \/\/ Quando un oggetto viene selezionato, mostra l'\''UI\
  useEffect(() => {\
    if (selectedObject && editorEnabled) {\
      setShowEditorUI(true)\
    } else {\
      setShowEditorUI(false)\
    }\
  }, [selectedObject, editorEnabled])
' "$FILE"
    echo "  ✅ State variables aggiunti"
  else
    echo "  ⏭️  State già presenti"
  fi
  
  echo "  ✅ $SCENE modificato con successo!"
done

echo ""
echo "🎉 Completato! Ora aggiungi manualmente:"
echo "  1. Tasto E nel keyboard handler"
echo "  2. Animation Editor UI nel return"
echo "  3. AnimationEditorScene component nel Canvas"
echo ""
echo "📖 Vedi EsternoScene.jsx come riferimento completo"
