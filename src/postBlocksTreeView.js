const vscode = require('vscode');

class PostBlockTreeItem extends vscode.TreeItem {
  constructor(label, lineNumber) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.lineNumber = lineNumber;
    this.contextValue = 'postBlock'; // Unique identifier for post block items
    this.command = {
      command: 'postBlocks.navigateToLine',
      title: '',
      arguments: [this.lineNumber],
    };
  }
}

class PostBlockDataProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  // Add the manual refresh function
  manualRefresh() {
    this._onDidChangeTreeData.fire();
  }

  // Add the refresh command
  refreshCommand() {
    this.manualRefresh();
  }

  getTreeItem(element) {
    return element;
  }

  getChildren() {
    const postBlockRegex = /^(\d+)\.\s+/;
    const document = vscode.window.activeTextEditor.document;

    const postBlocks = new Set(); // Use a Set to ensure unique post block numbers

    for (let index = 0; index < document.lineCount; index++) {
      const lineNumber = index + 1;
      const line = document.lineAt(index);

      const match = line.text.match(postBlockRegex);
      if (match) {
        const postBlockNumber = parseInt(match[1]);
        const label = `${postBlockNumber}. ${line.text.replace(postBlockRegex, '').trim()}`; // Include the post block number in front
        postBlocks.add(new PostBlockTreeItem(label, lineNumber));
      }
    }

    return Array.from(postBlocks);
  }
}

module.exports = {
  PostBlockDataProvider,
};
