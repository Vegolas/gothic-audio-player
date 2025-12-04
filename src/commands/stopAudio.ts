import * as vscode from 'vscode';
import { getCurrentAudioProcess, setCurrentAudioProcess } from './playDialogueAudio';

export function registerStopAudioCommand(context: vscode.ExtensionContext) {
	const stopDisposable = vscode.commands.registerCommand('gothic-audio-player.stopAudio', () => {
		const currentAudioProcess = getCurrentAudioProcess();
		if (currentAudioProcess) {
			currentAudioProcess.kill();
			setCurrentAudioProcess(null);
			vscode.window.showInformationMessage('Audio stopped');
		} else {
			vscode.window.showInformationMessage('No audio is currently playing');
		}
	});

	context.subscriptions.push(stopDisposable);
}
