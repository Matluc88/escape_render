# Audio per Lobby/Join

## File Richiesto
- **Nome file**: `lobby-music.mp3`
- **Posizione**: `/public/audio/lobby-music.mp3`

## Come Scaricare

### Da YouTube
URL: https://youtu.be/VO-KGzTraTs

### Opzioni:
1. **Usa un convertitore online**:
   - https://ytmp3.nu/
   - https://y2mate.com/
   - Scarica come MP3, rinomina in `lobby-music.mp3`

2. **Usa youtube-dl (CLI)**:
   ```bash
   yt-dlp -x --audio-format mp3 https://youtu.be/VO-KGzTraTs -o lobby-music.mp3
   ```

3. **Posiziona il file qui**:
   ```
   escape-room-3d/public/audio/lobby-music.mp3
   ```

## Note
- Il file deve essere nominato **esattamente** `lobby-music.mp3`
- Formato: MP3
- La musica si riproduce in loop su pagina Join e Waiting Room
- Si ferma automaticamente quando il gioco inizia