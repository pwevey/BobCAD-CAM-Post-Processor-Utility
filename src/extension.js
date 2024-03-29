const vscode = require('vscode');
const path = require('path');
const { PostBlockDataProvider } = require('./postBlocksTreeView');
const HoverProvider = require('./hover');
const BcpstCompletionProvider = require('./completionProvider');

let postBlockDataProvider;
let postBlockTreeView;

function activate(context) {
  //console.log('Post Blocks extension activated.');
  const hoverProvider = vscode.languages.registerHoverProvider(['bcpst', 'source.bcpst'], new HoverProvider());
  context.subscriptions.push(hoverProvider);

  postBlockDataProvider = new PostBlockDataProvider();


  // Go To Definition Provider for Lua program blocks
  const goToLuaDefinitionProvider = vscode.languages.registerDefinitionProvider(['bcpst', 'source.bcpst'], { provideDefinition: provideLuaDefinition });

  context.subscriptions.push(goToLuaDefinitionProvider);


  // Go To Definition Provider for VBScript program blocks
  const goToDefinitionProvider = vscode.languages.registerDefinitionProvider(['bcpst', 'source.bcpst'], { provideDefinition });

  context.subscriptions.push(goToDefinitionProvider);

  // Go To Definition Provider for inverse Lua blocks
  const goToInverseLuaDefinitionProvider = vscode.languages.registerDefinitionProvider(['bcpst', 'source.bcpst'], { provideDefinition: provideInverseLuaDefinition });

  context.subscriptions.push(goToInverseLuaDefinitionProvider);

  // Go To Definition Provider for inverse program blocks
  const goToInverseDefinitionProvider = vscode.languages.registerDefinitionProvider(['bcpst', 'source.bcpst'], { provideDefinition: provideInverseDefinition });

  context.subscriptions.push(goToInverseDefinitionProvider);


  // Update the openLuaAPIsCommand
  const openLuaAPIsCommand = vscode.commands.registerCommand('postBlocks.openLuaAPIs', () => {
    const luaAPIsUrl = vscode.workspace.getConfiguration().get('postBlocks.luaAPIsUrl');
    if (luaAPIsUrl) {
      openWebViewPanel('BobCAD Lua APIs', luaAPIsUrl);
    }
  });
  context.subscriptions.push(openLuaAPIsCommand);

  // Update the openHelpSystemCommand
  const openHelpSystemCommand = vscode.commands.registerCommand('postBlocks.openHelpSystem', async () => {
    const helpSystemUrl = vscode.workspace.getConfiguration().get('postBlocks.helpSystemUrl');
    if (helpSystemUrl) {
      await vscode.env.openExternal(vscode.Uri.parse(helpSystemUrl));
    }
  });
  context.subscriptions.push(openHelpSystemCommand);

  // Add the openWebViewPanel function
  function openWebViewPanel(title, url) {
    const panel = vscode.window.createWebviewPanel(
      'customWebView', // Use a unique identifier
      title,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'webview'))],
      }
    );

    // Load the HTML content into the webview
    panel.webview.html = getWebviewContent(url);
  }


  // Register a new command to open the support site in a webview
  const openSupportSiteCommand = vscode.commands.registerCommand('postBlocks.openSupportSite', () => {
    const supportSiteUrl = vscode.workspace.getConfiguration().get('postBlocks.supportSiteUrl', 'https://bobcadsupport.com/');
    vscode.env.openExternal(vscode.Uri.parse(supportSiteUrl));
  });

  context.subscriptions.push(openSupportSiteCommand);


  // Add the command to open both Wire EDM Post Documentation Files
  const openPDFsCommand = vscode.commands.registerCommand('postBlocks.openWireEDMDocumentation', async () => {
    const wireEDMPostVariablesUrl = vscode.Uri.file(path.join(context.extensionPath, 'res', 'helpDocumentation', 'Wire_EDM_Post_Variables.pdf'));
    const wireEDMScriptingFunctionReferenceUrl = vscode.Uri.file(path.join(context.extensionPath, 'res', 'helpDocumentation', 'Wire_EDM_Scripting_Function_Reference.pdf'));
    
    const userResponse = await vscode.window.showInformationMessage('Wire_EDM_Scripting_Function_Reference.pdf and Wire_EDM_Post_Variables.pdf will be opened in your default web browser. Do you want to continue?', 'Yes', 'No');
    
    if (userResponse === 'Yes') {
      vscode.env.openExternal(wireEDMPostVariablesUrl);
      vscode.env.openExternal(wireEDMScriptingFunctionReferenceUrl);
    }
  });
  context.subscriptions.push(openPDFsCommand);


  // Register the new command to format the entire document
  const formatCommand = vscode.commands.registerCommand('postBlocks.autoIndent', autoIndent);

  context.subscriptions.push(formatCommand);

  context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider('bcpst', {
    provideDocumentFormattingEdits(document) {
      // Call your autoIndent function here and return the edits it makes
      const edits = autoIndent(document);
      return edits;
    }
  }));


  // Register the new command to toggle debug mode
  const toggleDebugCommand = vscode.commands.registerCommand('postBlocks.toggleDebug', async () => {
    const editor = vscode.window.activeTextEditor;

    if (editor && editor.document.languageId === 'bcpst') {
      // Get the document
      const document = editor.document;
      // Get the entire text of the document
      const entireText = document.getText();
      // Toggle debug mode
      const toggledText = toggleDebugMode(entireText);
      
      // Replace the entire content with the modified text
      await editor.edit(editBuilder => {
        const start = new vscode.Position(0, 0);
        const end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
        const range = new vscode.Range(start, end);
        editBuilder.replace(range, toggledText);
      });

      // Save the document
      await document.save();

      // Refresh the tree view
      postBlockDataProvider.manualRefresh();
    }
  });

  context.subscriptions.push(toggleDebugCommand);


  // Register the new command to append revision log
  const appendRevisionLogCommand = vscode.commands.registerCommand('postBlocks.appendRevisionLog', async () => {
    const entries = [];
    let entry = '';
    let entryCount = 1;
  
    while (true) {
      const userInput = await vscode.window.showInputBox({
        placeHolder: `Enter revision log entry #${entryCount} (Type "done" to finish)`,
        prompt: `Provide a description for the revision log entry. You can enter multiple entries.`,
        validateInput: (text) => {
          return text.trim() ? null : 'Description cannot be empty';
        },
      });
  
      if (userInput === undefined) {
        // User pressed 'Escape' or closed the input box
        break;
      }
  
      if (userInput.toLowerCase() === 'done') {
        // User typed 'done' to finish
        if (entry !== '') {
          entries.push(entry);
        }
        break;
      } else {
        // User entered text
        entry += `//--   ${entryCount}. ${userInput}\n`;
        entryCount++;
      }
    }
  
    if (entries.length > 0) {
      await appendRevisionLogs(entries);
    }
  });

  context.subscriptions.push(appendRevisionLogCommand);


  // Register the completion provider for both 'bcpst' and 'lua' languages
  const bcpstAndLuaCompletionProvider = vscode.languages.registerCompletionItemProvider(
    { scheme: 'file', language: 'bcpst' },
    new BcpstCompletionProvider(), // Replace 'BcpstCompletionProvider' with your actual completion provider class
    // Optionally specify trigger characters (if needed)
  );

  context.subscriptions.push(bcpstAndLuaCompletionProvider);

  // Register the same completion provider for 'lua' language
  const luaCompletionProvider = vscode.languages.registerCompletionItemProvider(
    { scheme: 'file', language: 'lua' },
    new BcpstCompletionProvider(), // Use the same instance of your completion provider
    // Optionally specify trigger characters (if needed)
  );

  context.subscriptions.push(luaCompletionProvider);



  const navigateToPositionCommand = vscode.commands.registerCommand('postBlocks.navigateToPosition', (position) => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const selection = new vscode.Selection(position, position);
      editor.selection = selection;
      editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
    }
  });
  context.subscriptions.push(navigateToPositionCommand);


  const refreshCommand = vscode.commands.registerCommand('postBlocks.refresh', () => {
    postBlockDataProvider.manualRefresh();
  });
  context.subscriptions.push(refreshCommand);

  // Used for the Tree Viewer to navigate to a specific post block
  const navigateToLineCommand = vscode.commands.registerCommand('postBlocks.navigateToLine', (postBlockNumber) => {
    // console.log(`Navigating to line for Post Block ${postBlockNumber}`);
    const lineNumber = postBlockDataProvider.findLineNumber(postBlockNumber);
    if (lineNumber !== undefined && vscode.window.activeTextEditor) {
      const position = new vscode.Position(lineNumber, 0);
      const selection = new vscode.Selection(position, position);
      vscode.window.activeTextEditor.selection = selection;
      vscode.window.activeTextEditor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
    }
  });
  context.subscriptions.push(navigateToLineCommand);

  // Used for the "Navigate to Line from Palette" command to navigate to a specific post block
  const navigateToLineFromPaletteCommand = vscode.commands.registerCommand('postBlocks.navigateToLineFromPalette', async () => {
    const postBlockNumber = await vscode.window.showInputBox({ prompt: 'Enter Post Block Number' });
    if (postBlockNumber !== undefined && !isNaN(postBlockNumber)) {
      const lineNumber = postBlockDataProvider.findLineNumber(parseInt(postBlockNumber));
      if (lineNumber !== undefined && vscode.window.activeTextEditor) {
        const position = new vscode.Position(lineNumber, 0);
        const selection = new vscode.Selection(position, position);
        vscode.window.activeTextEditor.selection = selection;
        vscode.window.activeTextEditor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
      } else {
        vscode.window.showErrorMessage(`Post Block Number ${postBlockNumber} not found in Post Processor`);
      }
    }
  });
  context.subscriptions.push(navigateToLineFromPaletteCommand);

  

  // Check if a supported file is open when the extension is activated
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const fileExtension = activeEditor.document.fileName.split('.').pop().toLowerCase();
    if (['bcpst', 'edmpst', 'lathepst', 'millpst'].includes(fileExtension) && !postBlockTreeView) {
      postBlockTreeView = vscode.window.createTreeView('postBlocks', { treeDataProvider: postBlockDataProvider });
      context.subscriptions.push(postBlockTreeView);
    }
  }

  // Listen for changes to the active editor
  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor && !postBlockTreeView) {
      const fileExtension = editor.document.fileName.split('.').pop().toLowerCase();
      if (['bcpst', 'edmpst', 'lathepst', 'millpst'].includes(fileExtension)) {
        postBlockTreeView = vscode.window.createTreeView('postBlocks', { treeDataProvider: postBlockDataProvider });
        context.subscriptions.push(postBlockTreeView);
      }
    }
  });


  const collapseAllCommand = vscode.commands.registerCommand('postBlocks.collapseAll', () => {
    postBlockDataProvider.collapseAll();
  });
  context.subscriptions.push(collapseAllCommand);

  const expandAllCommand = vscode.commands.registerCommand('postBlocks.expandAll', () => {
    postBlockDataProvider.expandAll();
  });
  context.subscriptions.push(expandAllCommand);
}



// Function to toggle debug mode
function toggleDebugMode(text) {
  // Use regular expression to replace debug_on with debug_off and vice versa throughout the entire file
  return text.replace(/\b(debug_on|debug_off)\b/g, (match) => {
    return match === 'debug_on' ? 'debug_off' : 'debug_on';
  });
}



// Function to find the position to insert the revision log entry
function findInsertPosition(document) {
  const lineCount = document.lineCount;

  for (let line = 0; line < lineCount; line++) {
    const currentLine = document.lineAt(line).text.trim();

    // Check if the line contains the words "REVISION LOG"
    if (currentLine.includes('REVISION LOG')) {
      return new vscode.Position(line + 1, 0);
    }
  }

  // If "REVISION LOG" is not found, insert at the end of the document
  return new vscode.Position(0, 0);
}


// Function to append multiple revision log entries to the file with a date line
async function appendRevisionLogs(entries) {
  if (!vscode.window.activeTextEditor) {
    vscode.window.showErrorMessage('No active editor!');
    return;
  }

  const editor = vscode.window.activeTextEditor;
  const document = editor.document;

  // Find the position to insert the revision log entries
  const insertPosition = findInsertPosition(document);

  // Get the current date
  const currentDate = new Date().toLocaleDateString();

  // Create the new text with date and all entries
  const newText = `//-- ${currentDate}\n${entries.map(entry => `${entry}`).join('\n')}//--\n`;

  // Apply the edit
  const workspaceEdit = new vscode.WorkspaceEdit();
  workspaceEdit.insert(document.uri, insertPosition, newText);
  await vscode.workspace.applyEdit(workspaceEdit);

  // Save the document
  await document.save();
}


function getWebviewContent(url) {
  return `
    <!DOCTYPE html>
    <html lang="en" style="height: 100vh;">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Webview</title>
      <style>
        body {
          height: 100vh;
          margin: 0;
        }
        iframe {
          width: 100%;
          height: 100%;
          border: 0;
        }
      </style>
    </head>
    <body>
      <iframe src="${url}"></iframe>
    </body>
    </html>
  `;
}


function autoIndent() {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const document = editor.document;
    const text = document.getText();
    let formattedText = '';
    let postBlockStarted = false;
    let inLuaOrVBScriptBlock = false;
    text.split('\n').forEach((line) => {
      // If the line starts with a number, set the postBlockStarted flag to true
      if (line.match(/^\d/)) {
        postBlockStarted = true;
        // If the line is the start of a Lua or VBScript block, set the inLuaOrVBScriptBlock flag to true
        if (line.match(/^(270[1-9]|27[1-9][0-9])\.\s*Lua\s*Block\s*\d+\.\s*|^(200[1-9]|20[1-9][0-9]|210[0-3])\.\s*(Program\s*Block\s*\d+\.\s*|Read\s*Entire\s*File\s*After\s*Posting\.\s*|Read\s*each\s*Line\s*on\s*Output\.\s*|VB\s*Script\s*Line\s*by\s*Line\.\s*)/)) {
          inLuaOrVBScriptBlock = true;
        }
      }
      // If the line is the end of a Lua or VBScript block, set the inLuaOrVBScriptBlock flag to false
      if (line.match(/(^\b\d+\.)/) && !line.match(/^(270[1-9]|27[1-9][0-9]|200[1-9]|20[1-9][0-9]|210[0-3])\.\s*/)) {
        inLuaOrVBScriptBlock = false;
      }
      // If the line does not start with a number, does not start with a space or tab, does not start with //, and the postBlockStarted and inLuaOrVBScriptBlock flags are true, indent it
      if (!line.match(/^\d|^\s|^\/\//) && postBlockStarted && !inLuaOrVBScriptBlock) {
        formattedText += '\t' + line + '\n'; // 1 tab for indentation
      } else {
        // If the line is indented more than once, unindent it to one tab
        if (line.startsWith('\t\t') && !inLuaOrVBScriptBlock) { // 2 tabs for double indentation
          formattedText += line.replace(/^\t+/, '\t') + '\n'; // Replace all leading tabs with one tab
        } else if (line.match(/^\t* +/) && !inLuaOrVBScriptBlock) { // If the line starts with a tab followed by spaces
          formattedText += line.replace(/^\t* +/, '\t') + '\n'; // Replace all leading tabs and spaces with one tab
        } else {
          formattedText += line + '\n';
        }
      }
    });
    editor.edit((editBuilder) => {
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length)
      );
      editBuilder.replace(fullRange, formattedText);
    });
  }
}


function provideDefinition(document, position, token) {
  const range = document.getWordRangeAtPosition(position);
  const word = document.getText(range);

  // Check if the word matches the pattern "program_block_#"
  const match = word.match(/^program_block_(\d+)$/);
  if (match) {
    const blockNumber = match[1].padStart(2, '0'); // Pad the block number with leading zeros

    // Find the line that starts with "20##"
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      if (line.text.startsWith(`20${blockNumber}`)) {
        // Return the position of the line as the definition
        return new vscode.Location(document.uri, line.range.start);
      }
    }
  }

  // If no definition was found, return null
  return null;
}


function provideLuaDefinition(document, position) {
  const range = document.getWordRangeAtPosition(position);
  const word = document.getText(range);

  // Check if the word matches the pattern "lua_block_#"
  const match = word.match(/^lua_block_(\d+)$/);
  if (match) {
    const blockNumber = match[1].padStart(2, '0'); // Pad the block number with leading zeros

    // Find the line that starts with "27##"
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      if (line.text.startsWith(`27${blockNumber}`)) {
        // Return the position of the line as the definition
        return new vscode.Location(document.uri, line.range.start);
      }
    }
  }

  // If no definition was found, return null
  return null;
}


function provideInverseDefinition(document, position) {
  const range = document.getWordRangeAtPosition(position);
  const word = document.getText(range);

  // Check if the word starts with "200"
  const match = word.match(/^20(\d+)/);
  if (match) {
    const blockNumber = parseInt(match[1]); // Parse the block number as an integer to remove leading zeros
    const locations = [];

    // Find all instances of "program_block_#"
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const regex = new RegExp(`program_block_${blockNumber}\\b`);
      if (regex.test(line.text)) {
        // Add the position of the line to the locations array
        locations.push(new vscode.Location(document.uri, line.range.start));
      }
    }

    // If no definitions were found, return null
    if (locations.length === 0) {
      return null;
    }

    // Return the locations array
    return locations;
  }

  // If no match was found, return null
  return null;
}


function provideInverseLuaDefinition(document, position) {
  const range = document.getWordRangeAtPosition(position);
  const word = document.getText(range);

  // Check if the word starts with "270"
  const match = word.match(/^27(\d+)/);
  if (match) {
    const blockNumber = parseInt(match[1]);
    const locations = [];

    // Find all instances of "lua_block_#"
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const regex = new RegExp(`lua_block_${blockNumber}\\b`);
      if (regex.test(line.text)) {
        // Add the position of the line to the locations array
        locations.push(new vscode.Location(document.uri, line.range.start));
      }
    }

    // If no definitions were found, return null
    if (locations.length === 0) {
      return null;
    }

    // Return the locations array
    return locations;
  }

  // If no match was found, return null
  return null;
}



function deactivate() {}

module.exports = { activate, deactivate };
