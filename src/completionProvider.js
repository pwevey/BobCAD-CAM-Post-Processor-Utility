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
      if (parsedData && parsedData.postVariables && parsedData.commonPostVariables && prefix) {
        // Filter postVariables based on the prefix
        const filteredPostVariables = parsedData.postVariables.filter(
          (postVariable) =>
            postVariable.postVariableName &&
            postVariable.postVariableName.toLowerCase().includes(prefix.toLowerCase())
        );

        // console.log('Filtered Post Variables:', filteredPostVariables);

        // Check if commonPostVariables array exists
        if (parsedData.commonPostVariables) {
          // Filter commonPostVariables based on the prefix
          const filteredCommonPostVariables = parsedData.commonPostVariables.filter(
            (commonPostVariable) => commonPostVariable.toLowerCase().includes(prefix.toLowerCase())
          );

          // console.log('Filtered Common Post Variables:', filteredCommonPostVariables);

          // Create a set of common post variables for efficient lookup
          const commonPostVariableSet = new Set(filteredCommonPostVariables);

          // Separate common post variables and other post variables
          const commonPostVariableSuggestions = filteredPostVariables.filter(
            (postVariable) => commonPostVariableSet.has(postVariable.postVariableName.toLowerCase())
          );

          const otherPostVariableSuggestions = filteredPostVariables.filter(
            (postVariable) => !commonPostVariableSet.has(postVariable.postVariableName.toLowerCase())
          );

          // Create completion items for common post variables with top priority
          const commonPostVariableCompletionItems = commonPostVariableSuggestions.map((postVariable) => {
            const postVariableItem = new vscode.CompletionItem(postVariable.postVariableName);
            postVariableItem.kind = vscode.CompletionItemKind.Variable;
            postVariableItem.detail = 'Common Post Variable';
            postVariableItem.documentation = `Description: ${postVariable.description}\n\nJob Types: ${postVariable.jobTypes.join(', ')}`;
            postVariableItem.sortText = '0'; // Set a lower sortText value for higher priority
            return postVariableItem;
          });

          // Create completion items for other post variables
          const otherPostVariableCompletionItems = otherPostVariableSuggestions.map((postVariable) => {
            const postVariableItem = new vscode.CompletionItem(postVariable.postVariableName);
            postVariableItem.kind = vscode.CompletionItemKind.Variable;
            postVariableItem.detail = 'Post Variable';
            postVariableItem.documentation = `Description: ${postVariable.description}\n\nJob Types: ${postVariable.jobTypes.join(', ')}`;
            return postVariableItem;
          });

          // Combine commonPostVariableSuggestions and postVariableSuggestions
          const finalSuggestions = commonPostVariableCompletionItems.concat(otherPostVariableCompletionItems);

          // Manually sort the suggestions based on priority
          const sortedSuggestions = finalSuggestions.sort((a, b) => {
            // Extract the post variable names for comparison
            const postVariableNameA = a.label.toLowerCase();
            const postVariableNameB = b.label.toLowerCase();

            // Check if both are in commonPostVariables
            const inCommonA = commonPostVariableSet.has(postVariableNameA);
            const inCommonB = commonPostVariableSet.has(postVariableNameB);

            // Custom sorting logic: Common post variables first, then others
            if (inCommonA && !inCommonB) {
              return -1; // a comes first
            } else if (!inCommonA && inCommonB) {
              return 1; // b comes first
            } else {
              // Sort alphabetically if both are in common or both are not in common
              return postVariableNameA.localeCompare(postVariableNameB);
            }
          });

          // console.log('Sorted Final Post Variable Suggestions:', sortedSuggestions);

          return sortedSuggestions;
        } else {
          console.error('Missing commonPostVariables array.');
        }
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
