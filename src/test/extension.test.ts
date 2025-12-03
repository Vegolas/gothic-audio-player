import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Gothic Audio Player Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('MTCode.gothic-audio-player'));
	});

	test('Extension should activate', async () => {
		const ext = vscode.extensions.getExtension('MTCode.gothic-audio-player');
		await ext?.activate();
		assert.ok(ext?.isActive);
	});

	test('playDialogueAudio command should be registered', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('gothic-audio-player.playDialogueAudio'));
	});

	test('stopAudio command should be registered', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('gothic-audio-player.stopAudio'));
	});

	test('fixSilesian command should be registered', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('gothic-audio-player.fixSilesian'));
	});

	test('Configuration should have default values', () => {
		const config = vscode.workspace.getConfiguration('gothicAudio');
		assert.ok(config.get('searchPaths'));
		assert.ok(config.get('audioDir'));
		assert.strictEqual(config.get('volume'), 100);
	});

	test('Fix Silesian should replace characters in text', async () => {
		// Create a test document
		const doc = await vscode.workspace.openTextDocument({
			content: 'Test ? text with !O and !o and @o',
			language: 'plaintext'
		});

		const editor = await vscode.window.showTextDocument(doc);

		// Run fix silesian command
		await vscode.commands.executeCommand('gothic-audio-player.fixSilesian');

		const text = editor.document.getText();
		assert.ok(text.includes('ä')); // ? should be replaced
		assert.ok(text.includes('Ô')); // !O should be replaced
		assert.ok(text.includes('ô')); // !o should be replaced
		assert.ok(!text.includes('?')); // Original should be gone
	});
});
