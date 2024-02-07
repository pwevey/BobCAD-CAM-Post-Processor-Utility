const vscode = require('vscode');
const { PostBlockDataProvider } = require('./postBlocksTreeView');
const HoverProvider = require('./hover'); // Import the HoverProvider

let postBlockDataProvider;
let postBlockTreeView;

function activate(context) {
  // Register hover provider for .bcpst documents
  const hoverProvider = vscode.languages.registerHoverProvider(['bcpst', 'source.bcpst'], new HoverProvider());
  context.subscriptions.push(hoverProvider);

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
  postBlockTreeView = vscode.window.createTreeView('postBlocks', { treeDataProvider: postBlockDataProvider });
  context.subscriptions.push(postBlockTreeView);

  // Register the "Collapse All Folders" command
  const collapseAllCommand = vscode.commands.registerCommand('postBlocks.collapseAll', () => {
    postBlockDataProvider.collapseAll();
  });
  context.subscriptions.push(collapseAllCommand);

  // Register the "Expand All Folders" command
  const expandAllCommand = vscode.commands.registerCommand('postBlocks.expandAll', () => {
    postBlockDataProvider.expandAll();
  });
  context.subscriptions.push(expandAllCommand);
}

function deactivate() {}

module.exports = { activate, deactivate };
