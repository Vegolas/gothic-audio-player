import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ChildProcess } from 'child_process';
import { isLineInComment } from '../utils/commentChecker';

let currentAudioProcess: ChildProcess | null = null;

export function registerPlayDialogueAudioCommand(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('gothic-audio-player.playDialogueAudio', async (dialogueIdParam?: string) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('No active editor');
			return;
		}

		// Use provided dialogueId or extract from current line or cursor position
		let dialogueId = dialogueIdParam;
		if (!dialogueId) {
			const document = editor.document;
			const selection = editor.selection;
			const currentLine = document.lineAt(selection.active.line);
			const lineText = currentLine.text;

			// Skip if current line is commented out
			if (!isLineInComment(document, selection.active.line)) {
				// Try to match AI_Output on the current line
				let lineMatch = lineText.match(/AI_Output\s*\([^,]+,\s*[^,]+,\s*"([^"]+)"\)/);
				if (lineMatch) {
					dialogueId = lineMatch[1];;
				} else {
					// Try to match SVM pattern: variable = "SVM_XX_Name"
					lineMatch = lineText.match(/=\s*"([^"]+)"\s*;/);
					if (lineMatch) {
						dialogueId = lineMatch[1];
					}
				}
			}

			// If still no dialogue found, show error
			if (!dialogueId) {
				vscode.window.showWarningMessage('No dialogue found on current line. Place cursor on a line with AI_Output or SVM pattern.');
				return;
			}
		}

		// Get configuration
		const config = vscode.workspace.getConfiguration('gothicAudio');
		const audioDir = config.get<string>('audioDir') || '';

		if (!audioDir) {
			vscode.window.showWarningMessage('Gothic audio directory not configured. Please set gothicAudio.audioDir in settings.');
			return;
		}

		// Search for audio file in the configured directory
		const audioFilePath = path.join(audioDir, `${dialogueId}.wav`);

		if (!fs.existsSync(audioFilePath)) {
			vscode.window.showWarningMessage(`No audio found for ${dialogueId} in ${audioDir}`);
			return;
		}

		// Stop any currently playing audio
		if (currentAudioProcess) {
			currentAudioProcess.kill('SIGKILL');
			currentAudioProcess = null;
		}

		// Get settings
		const volume = config.get<number>('volume') || 100;
		const volumeDecimal = volume / 100;
		const showNotification = config.get<boolean>('showPlaybackNotification') !== false;
		const audioFormat = config.get<string>('audioFormat') || 'standard';

		// Show playback notification
		if (showNotification) {
			vscode.window.showInformationMessage(`Playing: ${audioFilePath} (Volume: ${volume}%)`);
		}

		const spawn = require('child_process').spawn;
		let process: ChildProcess;
		const platform = os.platform();

		// Choose playback method based on audio format
		if (audioFormat === 'ffplay') {
			// FFplay playback (supports Vorbis OGG and other formats) - cross-platform
			const volumePercent = Math.floor(volumeDecimal * 100);

			if (platform === 'win32') {
				process = spawn('powershell.exe', [
					'-NoProfile',
					'-Command',
					`$ffplay = Get-Command ffplay -ErrorAction SilentlyContinue; if ($ffplay) { & ffplay -nodisp -autoexit -volume ${volumePercent} "${audioFilePath}" 2>$null } else { Write-Error "FFmpeg is required for ffplay playback. Please install FFmpeg and add it to your PATH, or change the audio format setting to 'standard' or 'process-start'." }`
				]);
			} else {
				// macOS and Linux
				process = spawn('sh', [
					'-c',
					`if command -v ffplay > /dev/null 2>&1; then ffplay -nodisp -autoexit -volume ${volumePercent} "${audioFilePath}" 2>/dev/null; else echo "ERROR: FFmpeg is required" >&2; exit 1; fi`
				]);
			}

			// Capture stderr to detect if ffplay is missing
			let errorOutput = '';
			process.stderr?.on('data', (data: Buffer) => {
				errorOutput += data.toString();
			});

			process.on('exit', (code) => {
				if (currentAudioProcess === process) {
					currentAudioProcess = null;
				}
				if (errorOutput.includes('FFmpeg is required') || errorOutput.includes('ERROR: FFmpeg is required')) {
					vscode.window.showErrorMessage(
						'FFplay requires FFmpeg to be installed. Download from https://ffmpeg.org/download.html and add to PATH, or change "Gothic Audio: Audio Format" to "standard" or "process-start".',
						'Open Settings'
					).then(selection => {
						if (selection === 'Open Settings') {
							vscode.commands.executeCommand('workbench.action.openSettings', 'gothicAudio.audioFormat');
						}
					});
				}
			});
		} else if (audioFormat === 'process-start') {
			// Process Start - opens the file with default system player
			if (platform === 'win32') {
				process = spawn('powershell.exe', [
					'-NoProfile',
					'-Command',
					`Start-Process -FilePath "${audioFilePath}"`
				]);
			} else if (platform === 'darwin') {
				// macOS
				process = spawn('open', [audioFilePath]);
			} else {
				// Linux
				process = spawn('xdg-open', [audioFilePath]);
			}

			// Note: Volume control is not available with process-start method
			if (showNotification) {
				vscode.window.showInformationMessage(`Opening: ${audioFilePath} (Volume control not available with process-start)`);
			}
		} else {
			// Standard playback - platform-specific
			if (platform === 'win32') {
				// Windows: Use Windows Media Player
				process = spawn('powershell.exe', [
					'-NoProfile',
					'-Command',
					`Add-Type -AssemblyName PresentationFramework; $player = New-Object System.Windows.Media.MediaPlayer; $player.Volume = ${volumeDecimal}; $player.Open([System.Uri]"${audioFilePath}"); $player.Play(); while($player.NaturalDuration.HasTimeSpan -eq $false) { Start-Sleep -Milliseconds 100 }; Start-Sleep -Seconds $player.NaturalDuration.TimeSpan.TotalSeconds; $player.Close()`
				]);
			} else if (platform === 'darwin') {
				// macOS: Use afplay (built-in audio player)
				// Note: afplay doesn't support volume control directly, but we can use sox if available
				process = spawn('afplay', [audioFilePath, '-v', volumeDecimal.toString()]);
			} else {
				// Linux: Try to use paplay (PulseAudio) or aplay (ALSA)
				// Fall back to ffplay if available
				process = spawn('sh', [
					'-c',
					`if command -v paplay > /dev/null 2>&1; then paplay "${audioFilePath}"; elif command -v aplay > /dev/null 2>&1; then aplay "${audioFilePath}"; elif command -v ffplay > /dev/null 2>&1; then ffplay -nodisp -autoexit -volume ${Math.floor(volumeDecimal * 100)} "${audioFilePath}" 2>/dev/null; else echo "ERROR: No audio player found. Please install ffmpeg, pulseaudio, or alsa-utils." >&2; exit 1; fi`
				]);
			}
		}

		currentAudioProcess = process;

		process.on('exit', () => {
			if (currentAudioProcess === process) {
				currentAudioProcess = null;
			}
		});

		process.on('error', (error: any) => {
			if (currentAudioProcess === process) {
				currentAudioProcess = null;
			}
			vscode.window.showErrorMessage(`Failed to play audio: ${error.message}`);
		});
	});

	context.subscriptions.push(disposable);
}

export function getCurrentAudioProcess(): ChildProcess | null {
	return currentAudioProcess;
}

export function setCurrentAudioProcess(process: ChildProcess | null): void {
	currentAudioProcess = process;
}
