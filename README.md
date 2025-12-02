# Gothic Audio Player

Play Gothic dialogue audio files and fix Silesian encoding directly in VS Code.

## Features

### ?? Audio Playback
- **Inline Play Buttons**: Click the play button above any `AI_Output` line to hear the dialogue
- **Quick Access**: Use `Ctrl+Alt+P` to play audio for the current line
- **Stop Playback**: Press `Ctrl+Alt+S` to stop currently playing audio
- **Auto-detection**: Automatically finds dialogue IDs in your `.d` files

### ?? Silesian Encoding Fix
- **One-click fix**: Converts broken Silesian characters to proper encoding
- Replaces: `?` ? `ä`, `!O` ? `Ô`, `!o` ? `ô`, `@o` ? `ä`
- Use command palette: "Fix Silesian"

## Requirements

- Windows OS (uses PowerShell for audio playback)
- Gothic audio files (`.wav` format)

## Extension Settings

This extension contributes the following settings:

* `gothicAudio.audioDir`: Custom base directory for audio files (e.g., `E:\Gothic\_work\DATA\Sound\Speech`)
* `gothicAudio.searchPaths`: Glob patterns to search for audio files (default: `**/{Speech,Sounds}/**/*.wav`)

## Usage

1. Open a Gothic `.d` script file
2. Click the play button above any `AI_Output` line
3. Or use keyboard shortcuts:
   - `Ctrl+Alt+P` - Play audio at cursor
   - `Ctrl+Alt+S` - Stop audio

## Release Notes

### 0.1.0

Initial release:
- Audio playback with CodeLens buttons
- Stop audio command
- Fix Silesian encoding command
- Configurable audio directory

**Enjoy!**
