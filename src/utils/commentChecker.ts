import * as vscode from 'vscode';

/**
 * Check if a given position in the document is within a comment
 */
export function isPositionInComment(document: vscode.TextDocument, position: number): boolean {
	const text = document.getText();
	
	// Check for multi-line comment blocks /* */
	const blockCommentRegex = /\/\*[\s\S]*?\*\//g;
	let match;
	while ((match = blockCommentRegex.exec(text)) !== null) {
		if (position >= match.index && position < match.index + match[0].length) {
			return true;
		}
	}
	
	// Check for single-line comments //
	const line = document.lineAt(document.positionAt(position).line);
	const lineText = line.text;
	const commentIndex = lineText.indexOf('//');
	
	if (commentIndex !== -1) {
		const positionInLine = position - document.offsetAt(line.range.start);
		if (positionInLine >= commentIndex) {
			return true;
		}
	}
	
	return false;
}

/**
 * Check if a line number is within a comment block
 */
export function isLineInComment(document: vscode.TextDocument, lineNumber: number): boolean {
	const text = document.getText();
	const line = document.lineAt(lineNumber);
	const lineStart = document.offsetAt(line.range.start);
	
	// Check if line is in multi-line comment
	const blockCommentRegex = /\/\*[\s\S]*?\*\//g;
	let match;
	while ((match = blockCommentRegex.exec(text)) !== null) {
		const commentStart = document.positionAt(match.index).line;
		const commentEnd = document.positionAt(match.index + match[0].length).line;
		if (lineNumber >= commentStart && lineNumber <= commentEnd) {
			return true;
		}
	}
	
	// Check if line starts with //
	const trimmedLine = line.text.trim();
	if (trimmedLine.startsWith('//')) {
		return true;
	}
	
	return false;
}
