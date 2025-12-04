import * as vscode from 'vscode';

export function registerFixSilesianCommand(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('gothicAudio');
    const registerFixSilesian = config.get<boolean>('registerFixSilesian', false);

    if (!registerFixSilesian) {
        return;
    }
    
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
				{ search: '\u014D', replace: '\u00E4' },  // ō → ä
				{ search: '!O', replace: '\u00D4' },      // !O → Ô
				{ search: '!o', replace: '\u00F4' },      // !o → ô
				{ search: '@o', replace: '\u00E4' }       // @o → ä
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
	});

	context.subscriptions.push(fixSilesianDisposable);
}
