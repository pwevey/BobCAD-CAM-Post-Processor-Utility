const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class BcpstCompletionProvider {
  provideCompletionItems(document, position, token, context) {
    // Get the current file extension
    const fileExtension = path.extname(document.fileName).toLowerCase();
    const allowedExtensions = ['.bcpst', '.millpst', '.lathepst', '.edmpst'];
  
    if (!allowedExtensions.includes(fileExtension)) {
      return [];
    }
  
    const currentLine = document.lineAt(position.line).text;
    const currentLineBeforeCaret = currentLine.substr(0, position.character);
  
    // Use a regex to find the closest text within commas, spaces or underscores on the line above the caret
    const regex = /(,|\s|^)([^,\s]*)$/;
    const match = currentLineBeforeCaret.match(regex);
  
    // If we find a match, use it as the prefix for suggestions
    const prefix = match ? match[2].trim() : '';
  
    if (prefix.startsWith('lua_') || prefix.startsWith('program')) {
      return this.provideProgramBlockSuggestions(prefix);
    }
  
    // Check if the caret is on a blank line
    if (currentLine.trim() === '') {
      return this.findPostVariableSuggestions('', false, document);
    }
  
    // Pass the document object to the findPostVariableSuggestions method
    const suggestions = this.findPostVariableSuggestions(prefix, false, document);
  
    if (suggestions.length > 0) {
      return suggestions;
    }
  
    return [];
  }


  provideProgramBlockSuggestions(prefix) {
    const isLua = prefix.startsWith('lua');
    const isProgram = prefix.startsWith('program');
  
    if (!isLua && !isProgram) {
      return [];
    }
  
    const blockPrefix = isLua ? 'lua_block_' : 'program_block_';
    const blocks = Array.from({length: 99}, (_, i) => `${blockPrefix}${i + 1}`);
  
    return blocks.map((block, i) => {
      const item = new vscode.CompletionItem(block, vscode.CompletionItemKind.Function);
      item.sortText = String(i).padStart(2, '0'); // Pad the index with leading zeros
      item.preselect = i === 0; // Preselect only the first item in the suggestion list
      return item;
    });
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

  findPostVariableSuggestions(prefix, isInsideSnippet, document) {
    // Get the current file extension
    const fileExtension = path.extname(document.fileName).toLowerCase();
    const allowedExtensions = ['.bcpst', '.millpst', '.lathepst', '.edmpst'];

    if (!allowedExtensions.includes(fileExtension)) {
      return [];
    }

    let jsonFilePath;
    let wireEDMAPIs = [];
    if (fileExtension === '.edmpst') {
      jsonFilePath = path.join(__dirname, '..', 'res', 'post_data', 'postVariablesEDM.json');
      const wireEDMAPIsPath = path.join(__dirname, '..', 'res', 'post_data', 'postWireEDMAPIs.json');
      try {
        const wireEDMAPIsData = fs.readFileSync(wireEDMAPIsPath, 'utf8');
        wireEDMAPIs = JSON.parse(wireEDMAPIsData).postWireEDMAPIs || [];
      } catch (error) {
        console.error('Error reading postWireEDMAPIs.json:', error.message);
      }
    } else {
      jsonFilePath = path.join(__dirname, '..', 'res', 'post_data', 'postVariables.json');
    }

    try {
      const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
      const parsedData = JSON.parse(jsonData);

      let sortedSuggestions = [];

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
          sortedSuggestions = finalSuggestions.concat(apiSuggestions);

          // Manually sort the suggestions based on priority
          sortedSuggestions.sort((a, b) => {
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
        } else {
          console.error('Missing commonPostVariables array.');
        }

      } else {
        console.error('Invalid JSON format or missing postVariables array.');
      }

      // Append Wire EDM API suggestions to the final list if the file is .edmpst
      if (fileExtension === '.edmpst') {
        const wireEDMAPIsSuggestions = wireEDMAPIs.map((api) => {
          const apiSuggestion = new vscode.CompletionItem(api['BobCAD API'], vscode.CompletionItemKind.Method);
          apiSuggestion.detail = `BobCAD API for Wire EDM`;
          apiSuggestion.documentation = `Description: ${api.description || 'None'}`;
          return apiSuggestion;
        });

        sortedSuggestions = sortedSuggestions.concat(wireEDMAPIsSuggestions);
      }

      return sortedSuggestions;

    } catch (error) {
      console.error('Error reading postVariables.json:', error.message);
    }

    return [];
  }
}

module.exports = BcpstCompletionProvider;
