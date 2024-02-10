const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class BcpstCompletionProvider {


  provideCompletionItems(document, position, token, context) {
    // Get the entire text of the document up to the current position
    const currentLinePrefix = document.lineAt(position.line).text.substr(0, position.character);

    // Check if the current line contains any word
    const wordRegex = /\b(\w+)\b/;
    const match = currentLinePrefix.match(wordRegex);

    if (match && match[1]) {
      // If a word is found, suggest postVariableNames from postVariables.json
      const postVariableSuggestions = this.findPostVariableSuggestions(match[1]);

      if (postVariableSuggestions.length > 0) {
        return postVariableSuggestions;
      }
    }

    return [];
  }


  resolveCompletionItem(item, token) {
    // console.log('Resolved completion item:', item.label);

    return item;
  }


  findPostVariableSuggestions(prefix) {
    // Define the path to the postVariables.json file
    const jsonFilePath = path.join(__dirname, '..', 'res', 'post_data', 'postVariables.json');
  
    try {
      // Read the content of postVariables.json file
      const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
  
      // Parse the JSON data
      const parsedData = JSON.parse(jsonData);
  
      // If the data and postVariables array exist
      if (parsedData && parsedData.postVariables && prefix) {
        // Filter postVariables based on the prefix
        const filteredPostVariables = parsedData.postVariables.filter(
          (postVariable) =>
            postVariable.postVariableName &&
            postVariable.postVariableName.toLowerCase().startsWith(prefix.toLowerCase())
        );
  
        // Create completion items for each filtered postVariable
        const postVariableSuggestions = filteredPostVariables.map((postVariable) => {
          const postVariableItem = new vscode.CompletionItem(postVariable.postVariableName);
          postVariableItem.kind = vscode.CompletionItemKind.Variable;
          postVariableItem.detail = 'Post Variable';
          postVariableItem.documentation = `Description: ${postVariable.description}\n\nJob Types: ${postVariable.jobTypes.join(', ')}`;
          return postVariableItem;
        });
  
        return postVariableSuggestions;
      } else {
        console.error('Invalid JSON format or missing postVariables array.');
      }
    } catch (error) {
      console.error('Error reading postVariables.json:', error.message);
    }
  
    return [];
  }
  

}

module.exports = BcpstCompletionProvider;
