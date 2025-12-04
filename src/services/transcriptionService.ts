import * as vscode from 'vscode';
import * as fs from 'fs';

export interface TranscriptionResult {
	text: string;
	confidence?: number;
	language?: string;
}

export interface TranscriptionError {
	error: string;
	details?: string;
}

export class TranscriptionService {
	private apiKey: string = '';
	private apiProvider: string = 'openai';
	private language: string = 'de';

	constructor() {
		this.loadConfiguration();
	}

	private loadConfiguration() {
		const config = vscode.workspace.getConfiguration('gothicAudio.transcription');
		this.apiKey = config.get<string>('apiKey') || '';
		this.apiProvider = config.get<string>('apiProvider') || 'openai';
		this.language = config.get<string>('language') || 'de';
	}

	public isConfigured(): boolean {
		return this.apiKey.trim() !== '';
	}

	public async transcribeAudio(audioFilePath: string): Promise<TranscriptionResult | TranscriptionError> {
		if (!this.isConfigured()) {
			return {
				error: 'API key not configured',
				details: 'Please set your API key in settings: gothicAudio.transcription.apiKey'
			};
		}

		if (!fs.existsSync(audioFilePath)) {
			return {
				error: 'Audio file not found',
				details: audioFilePath
			};
		}

		try {
			switch (this.apiProvider) {
				case 'openai':
					return await this.transcribeWithOpenAI(audioFilePath);
				default:
					return {
						error: 'Unknown API provider',
						details: this.apiProvider
					};
			}
		} catch (error: any) {
			return {
				error: 'Transcription failed',
				details: error.message
			};
		}
	}

	private async transcribeWithOpenAI(audioFilePath: string): Promise<TranscriptionResult | TranscriptionError> {
		try {
			const OpenAI = require('openai');
			const openai = new OpenAI({
				apiKey: this.apiKey
			});

			const audioFile = fs.createReadStream(audioFilePath);
			
			const response = await openai.audio.transcriptions.create({
				file: audioFile,
				model: 'whisper-1',
				language: this.language === 'auto' ? undefined : this.language,
				response_format: 'verbose_json'
			});

			// Calculate average confidence from segments if available
			let avgConfidence: number | undefined;
			if (response.segments && response.segments.length > 0) {
				const confidences = response.segments
					.map((seg: any) => seg.avg_logprob)
					.filter((c: number) => c !== undefined);
				
				if (confidences.length > 0) {
					// Convert log probability to confidence (approximate)
					const avgLogProb = confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length;
					avgConfidence = Math.exp(avgLogProb);
				}
			}

			return {
				text: response.text.trim(),
				confidence: avgConfidence,
				language: response.language
			};
		} catch (error: any) {
			console.error('OpenAI transcription error:', error);
			
			if (error.status === 401) {
				return {
					error: 'Invalid API key',
					details: 'Please check your OpenAI API key in settings'
				};
			}
			
			// Provide more detailed error information
			let errorDetails = error.message;
			if (error.response) {
				errorDetails += ` | Status: ${error.response.status}`;
				if (error.response.data) {
					errorDetails += ` | ${JSON.stringify(error.response.data)}`;
				}
			}
			
			return {
				error: 'OpenAI API error',
				details: errorDetails
			};
		}
	}

	public async transcribeBatch(audioFilePaths: string[], onProgress?: (current: number, total: number) => void): Promise<Map<string, TranscriptionResult | TranscriptionError>> {
		const results = new Map<string, TranscriptionResult | TranscriptionError>();
		
		for (let i = 0; i < audioFilePaths.length; i++) {
			const filePath = audioFilePaths[i];
			if (onProgress) {
				onProgress(i + 1, audioFilePaths.length);
			}
			
			const result = await this.transcribeAudio(filePath);
			results.set(filePath, result);
		}

		return results;
	}
}
