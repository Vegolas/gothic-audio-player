import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
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

			// If still no dialogue found, fallback to searching entire document
			if (!dialogueId) {
				const text = document.getText();
				const match = text.match(/AI_Output\s*\([^,]+,\s*[^,]+,\s*"([^"]+)"\)/);
				if (!match) {
					vscode.window.showWarningMessage('No dialogue found. Place cursor on a line with AI_Output or SVM pattern.');
					return;
				}
				dialogueId = match[1];
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

		// Choose playback method based on audio format
		if (audioFormat === 'vorbis-ogg') {
			// TODO: Implement Vorbis OGG playback
			// For now, show error message
			vscode.window.showErrorMessage('Vorbis OGG playback not yet implemented. Please wait for the next update.');
			return;
		} else {
			// Standard WAV playback using Windows Media Player
			process = spawn('powershell.exe', [
				'-NoProfile',
				'-Command',
				`Add-Type -AssemblyName PresentationFramework; $player = New-Object System.Windows.Media.MediaPlayer; $player.Volume = ${volumeDecimal}; $player.Open([System.Uri]"${audioFilePath}"); $player.Play(); while($player.NaturalDuration.HasTimeSpan -eq $false) { Start-Sleep -Milliseconds 100 }; Start-Sleep -Seconds $player.NaturalDuration.TimeSpan.TotalSeconds; $player.Close()`
			]);
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
