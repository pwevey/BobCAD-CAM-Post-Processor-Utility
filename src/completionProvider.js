const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class BcpstCompletionProvider {
  provideCompletionItems(document, position, token, context) {
    // Check if the caret is on a blank line
    if (position.line === 0 || document.lineAt(position.line - 1).isEmptyOrWhitespace) {
      return this.findPostVariableSuggestions('');
    }
  
    const currentLine = document.lineAt(position.line).text;
    const currentLineBeforeCaret = currentLine.substr(0, position.character);

    // Use a regex to find the closest text within commas or spaces on the line above the caret
    const regex = /,([^,]*)$|\s([^ \t]*)$/;
    const match = currentLineBeforeCaret.match(regex);

    // If we find a match, use it as the prefix for suggestions
    const prefix = match ? (match[1] || match[2]).trim() : '';

    const suggestions = this.findPostVariableSuggestions(prefix);

    if (suggestions.length > 0) {
      return suggestions;
    }

    return [];
  }

  resolveCompletionItem(item, token) {
    // Check if the item is a bobcadAPI
    if (item.kind === vscode.CompletionItemKind.Method && item.documentation && item.documentation.includes('BobCAD API for')) {
      // Transform the content inside parentheses into a code snippet
      const snippetText = item.documentation.replace(/\(([^)]+)\)/g, (match, p1) => {
        const placeholders = p1.split(',').map((param, index) => `\${${index + 1}:${param.trim()}}`);
        return `(${placeholders.join(', ')})`;
      });

      item.insertText = new vscode.SnippetString(snippetText);
    }

    // Check if the item is a postVariable and has a specific filter
    if (item.kind === vscode.CompletionItemKind.Variable && item.filterText === 'postVariableFilter') {
      // If it is a postVariable with the filter, set a specific filter for suggestions
      item.filterText = 'postVariableFilter';
    }
    
    return item;
  }

  findPostVariableSuggestions(prefix, isInsideSnippet) {
    const jsonFilePath = path.join(__dirname, '..', 'res', 'post_data', 'postVariables.json');

    try {
      const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
      const parsedData = JSON.parse(jsonData);

      if (parsedData && parsedData.postVariables && parsedData.commonPostVariables) {
        const filteredPostVariables = parsedData.postVariables.filter(
          (postVariable) =>
            (postVariable.postVariableName &&
              postVariable.postVariableName.toLowerCase().includes(prefix.toLowerCase())) ||
            postVariable.postVariableName === null
        );

        if (isInsideSnippet) {
          // If inside a code snippet, filter post variables
          const postVariableSuggestions = filteredPostVariables.map((postVariable) => {
            const postVariableItem = new vscode.CompletionItem(postVariable.postVariableName || 'None');
            postVariableItem.kind = vscode.CompletionItemKind.Variable;
            postVariableItem.detail = 'Post Variable (BobCAD)';
            postVariableItem.documentation = `Description: ${postVariable.description || 'None'}\n\nJob Types: ${postVariable.jobTypes.join(', ')}`;
            return postVariableItem;
          });

          return postVariableSuggestions;
        }

        if (parsedData.commonPostVariables) {
          const filteredCommonPostVariables = parsedData.commonPostVariables.filter(
            (commonPostVariable) => commonPostVariable.toLowerCase().includes(prefix.toLowerCase())
          );

          const commonPostVariableSet = new Set(filteredCommonPostVariables);

          const commonPostVariableSuggestions = filteredPostVariables.filter(
            (postVariable) => commonPostVariableSet.has(postVariable.postVariableName?.toLowerCase())
          );

          const otherPostVariableSuggestions = filteredPostVariables.filter(
            (postVariable) => !commonPostVariableSet.has(postVariable.postVariableName?.toLowerCase())
          );

          const commonPostVariableCompletionItems = commonPostVariableSuggestions.map((postVariable) => {
            const postVariableItem = new vscode.CompletionItem(postVariable.postVariableName || 'None');
            postVariableItem.kind = vscode.CompletionItemKind.Variable;
            postVariableItem.detail = 'Common Post Variable (BobCAD)';
            postVariableItem.documentation = `Description: ${postVariable.description || 'None'}\n\nJob Types: ${postVariable.jobTypes.join(', ')}`;
            postVariableItem.sortText = '0';
            return postVariableItem;
          });

          const otherPostVariableCompletionItems = otherPostVariableSuggestions.map((postVariable) => {
            const postVariableItem = new vscode.CompletionItem(postVariable.postVariableName || 'None');
            postVariableItem.kind = vscode.CompletionItemKind.Variable;
            postVariableItem.detail = 'Post Variable (BobCAD)';
            postVariableItem.documentation = `Description: ${postVariable.description || 'None'}\n\nJob Types: ${postVariable.jobTypes.join(', ')}`;
            return postVariableItem;
          });

          const finalSuggestions = commonPostVariableCompletionItems.concat(otherPostVariableCompletionItems);

          // Retrieve API suggestions for each post variable, including those with null postVariableName
          const apiSuggestions = parsedData.postVariables.flatMap((postVariable) => {
            return (postVariable.bobcadAPIs || []).map((api) => {
              const snippetText = api.replace(/\(([^)]+)\)/g, (match, p1) => {
                const placeholders = p1.split(',').map((param, index) => `\${${index + 1}:${param.trim()}}`);
                return `(${placeholders.join(', ')})`;
              });

              const apiSuggestion = new vscode.CompletionItem(api, vscode.CompletionItemKind.Method);
              apiSuggestion.detail = `BobCAD API for ${postVariable.postVariableName || 'None'}`;
              apiSuggestion.documentation = `Associated Post Variable: ${postVariable.postVariableName || 'None'}\nLanguage: VBScript\n\nDescription:\n ${postVariable.description || 'None'}`;
              apiSuggestion.insertText = new vscode.SnippetString(snippetText);
              return apiSuggestion;
            });
          });

          // Append API suggestions to the final list
          const suggestionsWithAPIs = finalSuggestions.concat(apiSuggestions);

          // Manually sort the suggestions based on priority
          const sortedSuggestions = suggestionsWithAPIs.sort((a, b) => {
            const postVariableNameA = (a.label || '').toLowerCase();
            const postVariableNameB = (b.label || '').toLowerCase();
            const inCommonA = commonPostVariableSet.has(postVariableNameA);
            const inCommonB = commonPostVariableSet.has(postVariableNameB);

            if (inCommonA && !inCommonB) {
              return -1;
            } else if (!inCommonA && inCommonB) {
              return 1;
            } else {
              return postVariableNameA.localeCompare(postVariableNameB);
            }
          });

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
