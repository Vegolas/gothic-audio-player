# Gothic Audio Player

Play Gothic dialogue audio files directly in VS Code.

## Features

### Audio Playback
- **Inline Play Buttons**: Click the play button above any `AI_Output` line to hear the dialogue
- **Quick Access**: Use `Ctrl+Alt+P` to play audio for the current line
- **Stop Playback**: Press `Ctrl+Alt+S` to stop currently playing audio
- **Auto-detection**: Automatically finds dialogue IDs in your `.d` files

### Silesian Encoding Fix
- **One-click fix**: Converts broken Silesian characters to proper encoding
- Replaces: `ō` → `ä`, `!O` → `Ô`, `!o` → `ô`, `@o` → `ä`
- Use command palette: "Fix Silesian"
- **Note**: This command is optional and needs to be enabled in settings (`gothicAudio.registerFixSilesian`)

### AI Transcription (Experimental)
- **Batch testing**: Sends all audio files from the current file to OpenAI for transcription
- **Auto language detection**: Each file's language can be dynamically detected
- **Verification**: Checks if audio matches the dialogue text in your script
- **Note**: This is a highly experimental feature. Remember that you need voice actor permission before sending their recordings to the cloud.

## Requirements

- Windows OS (uses PowerShell for audio playback)
- Gothic audio files (`.wav` format)
- **Optional**: For Vorbis OGG files, install [FFmpeg](https://ffmpeg.org/download.html) and select "ffplay" as the playback method in settings

## Extension Settings

This extension contributes the following settings:

* `gothic-audio-player.audioDir`: Base directory for audio files (e.g., `C:\Gothic\Data\Speech`)
* `gothic-audio-player.audioFormat`: Playback method - `standard` (default), `ffplay`, or `process-start`
* `gothic-audio-player.volume`: Volume level for audio playback (0-100, default: 100)
* `gothic-audio-player.showPlaybackNotification`: Show notification when audio starts playing (default: true)
* `gothic-audio-player.registerFixSilesian`: Enable the "Fix Silesian" command (default: false)
* `gothic-audio-player.transcription.enabled`: Enable AI transcription features (default: false)
* `gothic-audio-player.transcription.apiKey`: OpenAI API key for transcription service

## Usage

1. Open a Gothic `.d` script file
2. Click the play button above any `AI_Output` line
3. Or use keyboard shortcuts:
   - `Ctrl+Alt+P` - Play audio at cursor
   - `Ctrl+Alt+S` - Stop audio


## Release Notes

### 0.2.0
- Removed pattern search functionality.
- Functions now ignore lines that are commented out.
- `gothic-audio-player.audioDir` is not set by default now.
- `gothic-audio-player.audioDir` will show a popup allowing you to choose the Gothic audio directory.
- `gothic-audio-player.fixSilesian` command is now optional and isn't registered by default.
- `gothic-audio-player.playDialogueAudio` now has 3 playback options:
  - **ffplay** (part of FFmpeg, requires installation) - works with Vorbis OGG files
  - **process-start** - opens audio files in your default `.wav` player
  - **standard** (default) - uses `System.Windows.Media.MediaPlayer` from PowerShell
- Added AI transcription (command `Verify all Dialogues in File`) that verifies if dialogue text matches the audio.
  - Currently supports OpenAI provider only.

### 0.1.3
- Added functionality to work with  `SVM` files.

### 0.1.2 
- Default informational popup about audio playing is now optional. You can disable it in settings.

### 0.1.1 - Bug fixes
- Fixed few bugs
- Added default shortcut for `Fix Silesian` command (CTRL+ALT+[)

### 0.1.0 - Initial release
- Audio playback with CodeLens buttons
- Stop audio command
- Fix Silesian encoding command
- Configurable audio directory

---

This whole extension was vibe-coded with Claude Sonnet 4.5. I don't know anything about Node.js, TypeScript and needed this thing ASAP. ;)

**Enjoy!**
