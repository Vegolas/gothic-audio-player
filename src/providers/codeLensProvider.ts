import * as vscode from 'vscode';
import { isPositionInComment } from '../utils/commentChecker';

export function registerCodeLensProvider(context: vscode.ExtensionContext) {
	const codeLensProvider = vscode.languages.registerCodeLensProvider(
		'*', // All files (we filter by content anyway)
		{
			provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
				const codeLenses: vscode.CodeLens[] = [];
				const text = document.getText();

				// Match AI_Output patterns
				const aiOutputRegex = /AI_Output\s*\([^,]+,\s*[^,]+,\s*"([^"]+)"\)/g;
				let match;

				while ((match = aiOutputRegex.exec(text)) !== null) {
					// Skip if in comment
					if (isPositionInComment(document, match.index)) {
						continue;
					}

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

				// Match SVM patterns: variable = "SVM_XX_Name";
				const svmRegex = /=\s*"(SVM_[^"]+)"\s*;/g;
				while ((match = svmRegex.exec(text)) !== null) {
					// Skip if in comment
					if (isPositionInComment(document, match.index)) {
						continue;
					}

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
