const vscode = require('vscode');

class BcpstCompletionProvider {
  provideCompletionItems(document, position, token, context) {
    // Log a message when autocompletion is triggered
    console.log('Autocompletion triggered!');

    // Get the entire text of the document up to the current position
    const currentLinePrefix = document.lineAt(position.line).text.substr(0, position.character);

    // Check if the current line contains a variable declaration
    const variableDeclarationRegex = /\bconst\s+(\w+)\s*=/;
    const match = currentLinePrefix.match(variableDeclarationRegex);

    if (match && match[1]) {
      // If a variable declaration is found, suggest variables based on existing declarations
      const existingVariables = this.findExistingVariables(document);
      const variableSuggestions = existingVariables.map((variable) => {
        const variableItem = new vscode.CompletionItem(variable);
        variableItem.kind = vscode.CompletionItemKind.Variable;
        variableItem.detail = 'Variable in the current document';
        return variableItem;
      });

      return variableSuggestions;
    }

    return [];
  }

  // Example function to find existing variable declarations in the document
  findExistingVariables(document) {
    const existingVariables = new Set();

    for (let line = 0; line < document.lineCount; line++) {
      const text = document.lineAt(line).text;
      const match = text.match(/\bconst\s+(\w+)\s*=/);

      if (match && match[1]) {
        existingVariables.add(match[1]);
      }
    }

    return Array.from(existingVariables);
  }
}

module.exports = BcpstCompletionProvider;