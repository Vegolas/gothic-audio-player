# Change Log

# 0.2.0
- Removed pattern search functionality.
- Functions now ignore lines that are commented out.
- `gothicAudio.audioDir` is not set by default now.
- `gothicAudio.audioDir` will show a popup allowing you to choose the Gothic audio directory.
- `gothic-audio-player.fixSilesian` command is now optional and isn't registered by default.
- `gothic-audio-player.playDialogueAudio` now has 3 playback options:
  - **ffplay** (part of FFmpeg, requires installation) - works with Vorbis OGG files
  - **process-start** - opens audio files in your default `.wav` player
  - **standard** (default) - uses `System.Windows.Media.MediaPlayer` from PowerShell
- Added AI transcription (command `Verify all Dialogues in File`) that verifies if dialogue text matches the audio.
  - Currently supports OpenAI provider only.

# 0.1.3
- Added functionality to work with  `SVM` files.

# 0.1.2 
- Default informational popup about audio playing is now optional. You can disable it in settings.

# 0.1.1 - Bug fixes
- Fixed few bugs
- Added default shortcut for `Fix Silesian` command (CTRL+ALT+[)

# 0.1.0 - Initial release
- Audio playback with CodeLens buttons
- Stop audio command
- Fix Silesian encoding command
- Configurable audio directory