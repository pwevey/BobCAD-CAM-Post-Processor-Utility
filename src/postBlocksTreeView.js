const vscode = require('vscode');

class PostBlockTreeItem extends vscode.TreeItem {
  constructor(label, lineNumber, collapsibleState, contextValue, command) {
    super(label, collapsibleState);
    this.lineNumber = lineNumber;
    this.contextValue = contextValue || 'postBlock';
    this.command = command;
  }
}

class PostBlockFolderTreeItem extends PostBlockTreeItem {
  constructor(label, collapsibleState, children) {
    super(label, undefined, collapsibleState);
    this.children = children || [];
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

  getChildren(element) {
    if (!element) {
      // Top-level elements
      const postBlockRegex = /^(\d+)\.\s+/;
      const document = vscode.window.activeTextEditor.document;
      const postBlocks = [];

      for (let index = 0; index < document.lineCount; index++) {
        const lineNumber = index + 1;
        const line = document.lineAt(index);
        const match = line.text.match(postBlockRegex);

        if (match) {
          const postBlockNumber = parseInt(match[1]);
          const label = `${postBlockNumber}. ${line.text.replace(postBlockRegex, '').trim()}`;
          const command = {
            command: 'postBlocks.navigateToLine',
            title: '',
            arguments: [lineNumber],
          };
          postBlocks.push(new PostBlockTreeItem(label, lineNumber, undefined, undefined, command));
        }
      }

      // Add folders with different initial states
      const parentFolders = [
        new PostBlockFolderTreeItem('Folder A', vscode.TreeItemCollapsibleState.Expanded, postBlocks.slice(0, 2)),
        new PostBlockFolderTreeItem('Folder B', vscode.TreeItemCollapsibleState.Collapsed, postBlocks.slice(2, 4)),
        new PostBlockFolderTreeItem('Folder C', vscode.TreeItemCollapsibleState.Expanded, postBlocks.slice(4)),
      ];

      return parentFolders;
    } else if (element instanceof PostBlockFolderTreeItem) {
      // Subfolders
      return element.children;
    }

    return [];
  }
}

module.exports = {
  PostBlockDataProvider,
};
