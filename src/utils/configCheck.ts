import * as vscode from 'vscode';

export async function checkAndPromptForAudioDirectory() {
	const config = vscode.workspace.getConfiguration('gothicAudio');
	const audioDir = config.get<string>('audioDir');

	if (!audioDir || audioDir.trim() === '') {
		const action = await vscode.window.showWarningMessage(
			'Gothic Audio Player: No audio directory configured. Please select the Gothic audio directory.',
			'Select Directory',
			'Later'
		);

		if (action === 'Select Directory') {
			const selectedFolder = await vscode.window.showOpenDialog({
				canSelectFiles: false,
				canSelectFolders: true,
				canSelectMany: false,
				openLabel: 'Select Gothic Audio Directory',
				title: 'Select Gothic Audio Directory (e.g., `Gothic/_work/DATA/Sound/Speech`)'
			});

			if (selectedFolder && selectedFolder[0]) {
				const folderPath = selectedFolder[0].fsPath;
				await config.update('audioDir', folderPath, vscode.ConfigurationTarget.Global);
				vscode.window.showInformationMessage(`Gothic audio directory set to: ${folderPath}`);
			}
		}
	}
}
