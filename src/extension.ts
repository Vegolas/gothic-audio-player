import * as vscode from 'vscode';
import { registerPlayDialogueAudioCommand } from './commands/playDialogueAudio';
import { registerStopAudioCommand } from './commands/stopAudio';
import { registerFixSilesianCommand } from './commands/fixSilesian';
import { registerVerifyDialoguesCommand } from './commands/verifyDialogues';
import { registerCodeLensProvider } from './providers/codeLensProvider';
import { checkAndPromptForAudioDirectory } from './utils/configCheck';

export function activate(context: vscode.ExtensionContext) {
	console.log('Gothic Audio Player extension is now active!');

	// Check if audio directory is configured, prompt if not
	checkAndPromptForAudioDirectory();

	// Register all commands
	registerPlayDialogueAudioCommand(context);
	registerStopAudioCommand(context);
	registerFixSilesianCommand(context);
	registerVerifyDialoguesCommand(context);

	// Register providers
	registerCodeLensProvider(context);
}

export function deactivate() { }
