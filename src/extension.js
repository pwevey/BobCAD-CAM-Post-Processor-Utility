const vscode = require('vscode');
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
    const entry = await vscode.window.showInputBox({
      placeHolder: 'Enter revision log entry',
      prompt: 'Provide a description for the revision log entry',
      validateInput: (text) => {
        return text.trim() ? null : 'Description cannot be empty';
      },
    });

    if (entry) {
      appendRevisionLog(entry);
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

  const navigateToLineFromPaletteCommand = vscode.commands.registerCommand('postBlocks.navigateToLineFromPalette', async () => {
    const postBlockNumber = await vscode.window.showInputBox({ prompt: 'Enter Post Block Number' });
    if (postBlockNumber !== undefined && !isNaN(postBlockNumber)) {
      const lineNumber = postBlockDataProvider.findLineNumber(parseInt(postBlockNumber));
      if (lineNumber !== undefined && vscode.window.activeTextEditor) {
        const position = new vscode.Position(lineNumber, 0);
        const selection = new vscode.Selection(position, position);
        vscode.window.activeTextEditor.selection = selection;
        vscode.window.activeTextEditor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
      }
    }
  });
  context.subscriptions.push(navigateToLineFromPaletteCommand);

  postBlockTreeView = vscode.window.createTreeView('postBlocks', { treeDataProvider: postBlockDataProvider });
  // console.log('Post Blocks Tree View created.');
  
  context.subscriptions.push(postBlockTreeView);

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

// Function to append a revision log entry to the file
async function appendRevisionLog(entry) {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const document = editor.document;

    // Find the position to insert the revision log entry
    const insertPosition = findInsertPosition(document);

    // Insert the revision log entry and a new line
    const newText = `//-- ${entry}\n//--\n`;
    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.insert(document.uri, insertPosition, newText);

    // Apply the edit
    await vscode.workspace.applyEdit(workspaceEdit);

    // Save the document
    await document.save();
  }
}

// Command to prompt for revision log entry and append it to the file
async function appendRevisionLogCommand() {
  const entry = await vscode.window.showInputBox({
    placeHolder: 'Enter revision log entry',
    prompt: 'Provide a description for the revision log entry',
    validateInput: (text) => {
      return text.trim() ? null : 'Description cannot be empty';
    },
  });

  if (entry) {
    await appendRevisionLog(entry);
  }
}



function deactivate() {}

module.exports = { activate, deactivate };
