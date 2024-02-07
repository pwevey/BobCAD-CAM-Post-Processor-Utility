const vscode = require('vscode');
const { PostBlockDataProvider } = require('./postBlocksTreeView');
const HoverProvider = require('./hover');

let postBlockDataProvider;
let postBlockTreeView;

function activate(context) {
  const hoverProvider = vscode.languages.registerHoverProvider(['bcpst', 'source.bcpst'], new HoverProvider());
  context.subscriptions.push(hoverProvider);

  postBlockDataProvider = new PostBlockDataProvider();

  const refreshCommand = vscode.commands.registerCommand('postBlocks.refresh', () => {
    postBlockDataProvider.manualRefresh();
  });
  context.subscriptions.push(refreshCommand);

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

function deactivate() {}

module.exports = { activate, deactivate };
