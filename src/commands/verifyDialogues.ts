import * as vscode from 'vscode';
import * as path from 'path';
import { TranscriptionService, TranscriptionResult, TranscriptionError } from '../services/transcriptionService';
import { isPositionInComment } from '../utils/commentChecker';

interface DialogueMatch {
	dialogueId: string;
	lineNumber: number;
	expectedText: string;
	transcribedText: string;
	confidence?: number;
	isMatch: boolean;
	audioFilePath: string;
}

export function registerVerifyDialoguesCommand(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('gothic-audio-player.verifyDialogues', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('No active editor');
			return;
		}

		// Check if transcription is enabled
		const config = vscode.workspace.getConfiguration('gothicAudio');
		const transcriptionEnabled = config.get<boolean>('transcription.enabled');
		
		if (!transcriptionEnabled) {
			const action = await vscode.window.showWarningMessage(
				'Dialogue transcription is not enabled. Would you like to enable it?',
				'Enable',
				'Cancel'
			);
			
			if (action === 'Enable') {
				await config.update('transcription.enabled', true, vscode.ConfigurationTarget.Global);
			} else {
				return;
			}
		}

		// Check audio directory
		const audioDir = config.get<string>('audioDir') || '';
		if (!audioDir) {
			vscode.window.showWarningMessage('Gothic audio directory not configured. Please set gothicAudio.audioDir in settings.');
			return;
		}

		// Initialize transcription service
		const transcriptionService = new TranscriptionService();
		if (!transcriptionService.isConfigured()) {
			vscode.window.showErrorMessage('Transcription API key not configured. Please set gothicAudio.transcription.apiKey in settings.');
			return;
		}

		// Extract all dialogues from the document
		const document = editor.document;
		const text = document.getText();
		const dialogues = extractDialogues(document, text);

		if (dialogues.length === 0) {
			vscode.window.showInformationMessage('No dialogues found in this file.');
			return;
		}

		// Collect audio file paths
		const audioFilePaths: string[] = [];
		const dialogueMap = new Map<string, typeof dialogues[0]>();
		
		for (const dialogue of dialogues) {
			const audioFilePath = path.join(audioDir, `${dialogue.dialogueId}.wav`);
			audioFilePaths.push(audioFilePath);
			dialogueMap.set(audioFilePath, dialogue);
		}

		// Create output channel and show initial header
		const outputChannel = vscode.window.createOutputChannel('Gothic Audio Verification');
		outputChannel.clear();
		outputChannel.appendLine('=== Dialogue Verification Results ===\n');
		outputChannel.appendLine(`Total dialogues to verify: ${dialogues.length}\n`);
		outputChannel.appendLine('=== Processing ===\n');
		outputChannel.show();

		// Start batch transcription with progress and streaming output
		const matches: DialogueMatch[] = [];
		const confidenceThreshold = config.get<number>('transcription.confidenceThreshold') || 0.8;

		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Verifying dialogues',
			cancellable: false
		}, async (progress) => {
			progress.report({ message: `Processing 0/${dialogues.length} dialogues...` });

			// Process dialogues one by one with streaming output
			for (let i = 0; i < audioFilePaths.length; i++) {
				const audioFilePath = audioFilePaths[i];
				const dialogue = dialogueMap.get(audioFilePath);
				if (!dialogue) continue;

				progress.report({
					message: `Processing ${i + 1}/${dialogues.length} dialogues...`,
					increment: (1 / dialogues.length) * 100
				});

				// Transcribe single file
				const result = await transcriptionService.transcribeAudio(audioFilePath);

				// Process result immediately
				if ('error' in result) {
					// Handle error
					const errorText = result.details 
						? `[ERROR: ${result.error} - ${result.details}]`
						: `[ERROR: ${result.error}]`;
					
					matches.push({
						dialogueId: dialogue.dialogueId,
						lineNumber: dialogue.lineNumber,
						expectedText: dialogue.text,
						transcribedText: errorText,
						isMatch: false,
						audioFilePath
					});

					// Stream error to output
					outputChannel.appendLine(`❌ [Line ${dialogue.lineNumber + 1}] ${dialogue.dialogueId}`);
					outputChannel.appendLine(`   ${errorText}`);
					outputChannel.appendLine('');
				} else {
					// Compare transcription with expected text
					const isMatch = compareTexts(dialogue.text, result.text);
					const needsReview = result.confidence !== undefined && result.confidence < confidenceThreshold;
					const finalMatch = isMatch && !needsReview;

					matches.push({
						dialogueId: dialogue.dialogueId,
						lineNumber: dialogue.lineNumber,
						expectedText: dialogue.text,
						transcribedText: result.text,
						confidence: result.confidence,
						isMatch: finalMatch,
						audioFilePath
					});

					// Stream result to output
					if (finalMatch) {
						outputChannel.appendLine(`✓ [Line ${dialogue.lineNumber + 1}] ${dialogue.dialogueId}`);
					} else {
						outputChannel.appendLine(`⚠ [Line ${dialogue.lineNumber + 1}] ${dialogue.dialogueId}`);
						outputChannel.appendLine(`   Expected:     "${dialogue.text}"`);
						outputChannel.appendLine(`   Transcribed:  "${result.text}"`);
						if (result.confidence !== undefined) {
							outputChannel.appendLine(`   Confidence:   ${(result.confidence * 100).toFixed(1)}%`);
						}
					}
					outputChannel.appendLine('');
				}
			}

			// Show final summary
			showFinalSummary(matches, outputChannel);
		});
	});

	context.subscriptions.push(disposable);
}

function extractDialogues(document: vscode.TextDocument, text: string): Array<{dialogueId: string, lineNumber: number, text: string}> {
	const dialogues: Array<{dialogueId: string, lineNumber: number, text: string}> = [];
	
	// Match AI_Output patterns with comment text: AI_Output(other,self,"DialogueID"); //Actual dialogue text
	const aiOutputRegex = /AI_Output\s*\([^,]+,\s*[^,]+,\s*"([^"]+)"\)[^;]*;\s*\/\/(.+)/g;
	let match;

	while ((match = aiOutputRegex.exec(text)) !== null) {
		// Skip if in comment
		if (isPositionInComment(document, match.index)) {
			continue;
		}

		const dialogueId = match[1];
		const dialogueText = match[2].trim();
		const position = document.positionAt(match.index);
		const lineNumber = position.line;

		if (dialogueText) {
			dialogues.push({
				dialogueId,
				lineNumber: lineNumber,
				text: dialogueText
			});
		}
	}

	return dialogues;
}

function compareTexts(expected: string, transcribed: string): boolean {
	// Normalize texts for comparison
	const normalize = (text: string) => {
		return text
			.toLowerCase()
			.replace(/[.,!?;:]/g, '') // Remove punctuation
			.replace(/\s+/g, ' ') // Normalize whitespace
			.trim();
	};

	const normalizedExpected = normalize(expected);
	const normalizedTranscribed = normalize(transcribed);

	// Calculate similarity (simple approach)
	return normalizedExpected === normalizedTranscribed;
}

function showFinalSummary(matches: DialogueMatch[], outputChannel: vscode.OutputChannel) {
	const mismatches = matches.filter(m => !m.isMatch);
	const matchCount = matches.length - mismatches.length;

	outputChannel.appendLine('=== Summary ===\n');
	outputChannel.appendLine(`✓ Matched: ${matchCount}`);
	outputChannel.appendLine(`⚠ Mismatched: ${mismatches.length}`);
	outputChannel.appendLine(`Total: ${matches.length}\n`);

	if (mismatches.length === 0) {
		vscode.window.showInformationMessage(`✓ All ${matches.length} dialogues verified successfully!`);
	} else {
		vscode.window.showWarningMessage(
			`Verification complete: ${matchCount} matched, ${mismatches.length} mismatched. See output for details.`,
			'Show Results'
		).then(action => {
			if (action === 'Show Results') {
				outputChannel.show();
			}
		});
	}
}
