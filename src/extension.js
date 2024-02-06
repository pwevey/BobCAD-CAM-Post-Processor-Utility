const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const { PostBlockDataProvider } = require('./postBlocksTreeView'); // Adjust the path accordingly

let postBlockDataProvider; // Declare a global variable to hold the instance

function getExtensionRoot() {
  const extensionPath = vscode.extensions.getExtension('BobCAD-CAM.bobcad-post').extensionPath;
  return extensionPath;
}

function getJsonFilePath() {
  const extensionRoot = getExtensionRoot();
  return path.join(extensionRoot, 'res', 'post_data', 'postBlocks.json');
}

function activate(context) {
  // Register hover provider for .bcpst documents
  const hoverProvider = vscode.languages.registerHoverProvider(['bcpst','source.bcpst'], {
    provideHover(document, position) {
      // Check if the line starts with a post block number
      const postBlocks = readPostBlocks();
      if (postBlocks) {
        const line = document.lineAt(position.line).text;

        const postBlockNumberMatch = line.match(/^(\d+)/);
        if (postBlockNumberMatch) {
          const postBlockNumber = parseInt(postBlockNumberMatch[1]);
          // console.log('Post Block Number:', postBlockNumber);

          const hoveredBlock = postBlocks.blocks.find((block) => block.number === postBlockNumber);

          if (hoveredBlock) {
            let hoverText = new vscode.MarkdownString(`**${hoveredBlock.name}**\n\n${hoveredBlock.description}`);
            if (hoveredBlock.jobTypes) {
              hoverText.appendMarkdown(`\n\nJob Types: ${hoveredBlock.jobTypes.join(', ')}`);
            }
            return new vscode.Hover(hoverText);
          }
        }
      }

      return null;
    },
  });

  context.subscriptions.push(hoverProvider);

 // Initialize the PostBlockDataProvider
 postBlockDataProvider = new PostBlockDataProvider();

 // Register the "Refresh Post Blocks" command
 const refreshCommand = vscode.commands.registerCommand('postBlocks.refresh', () => {
   postBlockDataProvider.manualRefresh();
 });

 context.subscriptions.push(refreshCommand);

// Register the command handler for navigating to a line
const navigateToLineCommand = vscode.commands.registerCommand('postBlocks.navigateToLine', (postBlockNumber) => {
  const lineNumber = postBlockDataProvider.findLineNumber(postBlockNumber);

  if (lineNumber !== undefined && vscode.window.activeTextEditor) {
    const position = new vscode.Position(lineNumber, 0);
    const selection = new vscode.Selection(position, position);
    vscode.window.activeTextEditor.selection = selection;
    vscode.window.activeTextEditor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
  }
});

context.subscriptions.push(navigateToLineCommand);


 // Register the Post Blocks tree view
 const postBlockTreeView = vscode.window.createTreeView('postBlocks', { treeDataProvider: postBlockDataProvider });

 context.subscriptions.push(postBlockTreeView);
 
  // Additional activation logic...
}

function readPostBlocks() {
  const jsonFilePath = getJsonFilePath();

  try {
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
    return JSON.parse(jsonContent);
  } catch (error) {
    return null;
  }
}

function deactivate() {
  // Cleanup logic when the extension is deactivated
}

module.exports = {
  activate,
  deactivate,
};
