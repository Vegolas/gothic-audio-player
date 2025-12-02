// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ChildProcess } from 'child_process';

// Track currently playing audio process
let currentAudioProcess: ChildProcess | null = null;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "gothic-audio-player" is now active!');



	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
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

			// Try to match AI_Output on the current line
			const lineMatch = lineText.match(/AI_Output\s*\([^,]+,\s*[^,]+,\s*"([^"]+)"\)/);
			if (lineMatch) {
				dialogueId = lineMatch[1];
			} else {
				// Fallback: search entire document
				const text = document.getText();
				const match = text.match(/AI_Output\s*\([^,]+,\s*[^,]+,\s*"([^"]+)"\)/);
				if (!match) {
					vscode.window.showWarningMessage('No AI_Output dialogue found. Place cursor on a line with AI_Output.');
					return;
				}
				dialogueId = match[1];
			}
		}

		// Get configuration
		const config = vscode.workspace.getConfiguration('gothicAudio');
		const audioDir = config.get<string>('audioDir') || '';
		const searchPaths = config.get<string[]>('searchPaths') || ['**/{Speech,Sounds}/**/*.wav'];

		let audioFilePath: string | undefined;

		// If audioDir is set, search directly in that path
		if (audioDir) {
			const audioPath = path.join(audioDir, `${dialogueId}.wav`);

			if (fs.existsSync(audioPath)) {
				audioFilePath = audioPath;
			}
		}

		// Fallback: search using workspace patterns
		if (!audioFilePath) {
			const audioFiles = await vscode.workspace.findFiles(searchPaths[0], undefined, 1000);
			const audioFile = audioFiles.find(file => {
				const fileName = file.fsPath.split(/[\\/]/).pop()?.replace(/\.wav$/i, '');
				return fileName === dialogueId;
			});

			if (audioFile) {
				audioFilePath = audioFile.fsPath;
			}
		}

		if (!audioFilePath) {
			vscode.window.showWarningMessage(`No audio found for ${dialogueId}. Check gothicAudio settings.`);
			return;
		}

		// Stop any currently playing audio
		if (currentAudioProcess) {
			currentAudioProcess.kill('SIGKILL');
			currentAudioProcess = null;
		}

		// Play audio using WPF MediaPlayer
		vscode.window.showInformationMessage(`Playing: ${audioFilePath}`);

		const spawn = require('child_process').spawn;
		const process = spawn('powershell.exe', [
			'-NoProfile',
			'-Command',
			`Add-Type -AssemblyName PresentationFramework; $player = New-Object System.Windows.Media.MediaPlayer; $player.Open([System.Uri]"${audioFilePath}"); $player.Play(); while($player.NaturalDuration.HasTimeSpan -eq $false) { Start-Sleep -Milliseconds 100 }; Start-Sleep -Seconds $player.NaturalDuration.TimeSpan.TotalSeconds; $player.Close()`
		]);

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

	// Stop audio command
	const stopDisposable = vscode.commands.registerCommand('gothic-audio-player.stopAudio', () => {
		if (currentAudioProcess) {
			currentAudioProcess.kill();
			currentAudioProcess = null;
			vscode.window.showInformationMessage('Audio stopped');
		} else {
			vscode.window.showInformationMessage('No audio is currently playing');
		}
	});

	context.subscriptions.push(stopDisposable);

	// Fix Silesian command - replace special character sequences
	const fixSilesianDisposable = vscode.commands.registerCommand('gothic-audio-player.fixSilesian', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('No active editor');
			return;
		}

		const document = editor.document;
		let count = 0;

		await editor.edit(editBuilder => {
			const text = document.getText();

			// Define replacements
			const replacements = [
				{ search: '\u014D', replace: '\u00E4' },  // ? ? ä
				{ search: '!O', replace: '\u00D4' },      // !O ? Ô
				{ search: '!o', replace: '\u00F4' },      // !o ? ô
				{ search: '@o', replace: '\u00E4' }       // @o ? ä
			];

			for (let i = 0; i < text.length; i++) {
				for (const { search, replace } of replacements) {
					const searchLen = search.length;
					const substring = text.substring(i, i + searchLen);

					if (substring === search) {
						const pos = document.positionAt(i);
						const range = new vscode.Range(pos, document.positionAt(i + searchLen));
						editBuilder.replace(range, replace);
						count++;
						// Skip ahead to avoid overlapping replacements
						i += searchLen - 1;
						break;
					}
				}
			}
		});

		if (count > 0) {
			vscode.window.showInformationMessage(`Fixed Silesian: Replaced ${count} occurrence(s)`);
		} else {
			vscode.window.showInformationMessage('No characters found to replace');
		}
	}); context.subscriptions.push(fixSilesianDisposable);

	// Register CodeLens provider to show play buttons
	const codeLensProvider = vscode.languages.registerCodeLensProvider(
		'*', // All files (we filter by content anyway)
		{
			provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
				const codeLenses: vscode.CodeLens[] = [];
				const text = document.getText();
				const regex = /AI_Output\s*\([^,]+,\s*[^,]+,\s*"([^"]+)"\)/g;
				let match;

				while ((match = regex.exec(text)) !== null) {
					const dialogueId = match[1];
					const startPos = document.positionAt(match.index);
					const endPos = document.positionAt(match.index + match[0].length);
					const range = new vscode.Range(startPos, endPos);

					const codeLens = new vscode.CodeLens(range);
					codeLens.command = {
						title: `\u{1F50A} Play ${dialogueId}`,
						command: 'gothic-audio-player.playDialogueAudio',
						arguments: [dialogueId]
					};

					codeLenses.push(codeLens);
				}

				return codeLenses;
			},
			resolveCodeLens(codeLens: vscode.CodeLens): vscode.CodeLens {
				return codeLens;
			}
		}
	);

	context.subscriptions.push(codeLensProvider);
}

export function deactivate() { }
