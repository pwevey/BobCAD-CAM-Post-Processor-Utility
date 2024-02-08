const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class PostBlockTreeItem extends vscode.TreeItem {
  constructor(label, lineNumber, collapsibleState, contextValue, command) {
    super(label, collapsibleState);
    this.lineNumber = lineNumber;
    this.contextValue = contextValue || 'postBlock';

    this.command = command || {
      command: 'postBlocks.navigateToLine',
      title: '',
      arguments: [lineNumber],
    };
  }
}

class PostBlockFolderTreeItem extends PostBlockTreeItem {
  constructor(label, collapsibleState, children) {
    super(label, undefined, collapsibleState);
    this.children = children || [];
  }
}

class GoToPositionTreeItem extends vscode.TreeItem {
  constructor(label, position, title = '') {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.command = {
      command: 'postBlocks.navigateToPosition',
      title: title,
      arguments: [position],
    };
  }
}


class PostBlockDataProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.postBlocksData = this.loadPostBlocksData();
    this.goToTopItem = null;
    this.goToBottomItem = null;
  }

  // Create instances of GoToPositionTreeItem for Go to Top and Go to Bottom
  createGoToTopItem() {
    return new GoToPositionTreeItem('Go to Top', new vscode.Position(0, 0));
  }

  createGoToBottomItem() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const lastLine = editor.document.lineCount - 1;
      return new GoToPositionTreeItem('Go to Bottom', new vscode.Position(lastLine, 0));
    }
    return null;
  }

  // Load treeViewerPostStruct.json file
  loadPostBlocksData() {
    const extensionPath = vscode.extensions.getExtension('BobCAD-CAM.bobcad-post').extensionPath;
    const jsonFilePath = path.join(extensionPath, 'res', 'post_data', 'treeViewerPostStruct.json');

    try {
      const data = fs.readFileSync(jsonFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading treeViewerPostStruct.json:', error.message);
      return {};
    }
  }

  // Add the manual refresh function
  manualRefresh() {
    this._onDidChangeTreeData.fire();
  }

  // Add the refresh command
  refreshCommand() {
    this.manualRefresh();
  }

  // Function to collapse all folders in the tree view
  collapseAll() {
    this.changeFolderCollapsibleState(this.postBlocksData.root, vscode.TreeItemCollapsibleState.Collapsed);
    this._onDidChangeTreeData.fire();
  }

  // Recursive function to change collapsible state of folders
  changeFolderCollapsibleState(folder, state) {
    if (Array.isArray(folder)) {
      // If it's an array, iterate through the elements
      for (const element of folder) {
        this.changeFolderCollapsibleState(element, state);
      }
    } else if (typeof folder === 'object' && folder !== null) {
      // If it's an object, it's a folder
      folder.collapsibleState = state;
      this.changeFolderCollapsibleState(folder.children, state);
    }
  }

  // Function to expand all folders in the tree view
  expandAll() {
    this.changeFolderCollapsibleState(this.postBlocksData.root, vscode.TreeItemCollapsibleState.Expanded);
    this._onDidChangeTreeData.fire();
  }

  // Recursive function to expand folders
  expandFolders(folder) {
    if (Array.isArray(folder)) {
      // If it's an array, iterate through the elements
      for (const element of folder) {
        this.expandFolders(element);
      }
    } else if (typeof folder === 'object' && folder !== null) {
      // If it's an object, it's a folder
      folder.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
      this.expandFolders(folder.children);
    }
  }

  // Parse the currently opened .bcpst file
  parseBcpstFile(document) {
    const postBlockRegex = /^(\d+)\.\s*(.*)/;
    const postBlocks = [];
    const lineNumberMap = {}; // Keep track of processed line numbers

    for (let index = 0; index < document.lineCount; index++) {
      const lineNumber = index + 1;

      // Skip lines already processed
      if (lineNumberMap[lineNumber]) {
        continue;
      }

      const line = document.lineAt(index);
      const match = line.text.match(postBlockRegex);

      if (match) {
        const postBlockNumber = parseInt(match[1]);
        const postBlockName = match[2].trim();
        const label = `${postBlockNumber}. ${postBlockName}`;
        const command = {
          command: 'postBlocks.navigateToLine',
          title: '',
          arguments: [postBlockNumber], // Use the post block number as the line number
        };

        // Log post block information for debugging
        //console.log(`Found post block - Line: ${lineNumber}, Number: ${postBlockNumber}, Name: ${postBlockName}`);

        // Update the mapping object
        lineNumberMap[lineNumber] = true;

        postBlocks.push(new PostBlockTreeItem(label, postBlockNumber, vscode.TreeItemCollapsibleState.None, undefined, command));
      } else {
        //console.log(`No match for line ${lineNumber}: ${line.text}`);
      }
    }

    return postBlocks;
  }

  // Function to find the line number of a post block in the document
  findLineNumber(postBlockNumber) {
    const editor = vscode.window.activeTextEditor;

    if (editor) {
      const document = editor.document;

      for (let line = 0; line < document.lineCount; line++) {
        const text = document.lineAt(line).text;
        const match = text.match(new RegExp(`^${postBlockNumber}\\.`));

        if (match) {
          return line;
        }
      }
    }

    return undefined;
  }


  navigateToLine(postBlockNumber) {
    // console.log(`Navigating to line for Post Block ${postBlockNumber}`);
  
    if (postBlockNumber === 1) {
      // Special case for "Go to Top"
      vscode.commands.executeCommand('postBlocks.goToTop');
    } else {
      // Normal navigation for other post block numbers
      const lineNumber = this.findLineNumber(postBlockNumber);
      if (lineNumber !== undefined) {
        this.navigateToLineInternal(lineNumber);
        // console.log(`Navigated to post block ${postBlockNumber}`);
      }
    }
  }
  

  goToTop() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const position = new vscode.Position(0, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);

      //console.log('Navigated to Top');
    }
  }

  navigateToLineInternal(line) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const position = new vscode.Position(line, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    }
  }



  // Function to map post blocks to corresponding folders
  mapPostBlocksToFolders(postBlocks, folderStructure, isTopLevel = true) {
    const mappedFolders = [];

    if (isTopLevel) {
      // Use the existing GoToTopTreeItem instance
      mappedFolders.push(this.goToTopItem);
      // Set isTopLevel to false to prevent further addition of "Go to Top" items
      isTopLevel = false;
    }

    for (const folderName in folderStructure) {
      const folderContents = folderStructure[folderName];
      const mappedContents = Array.isArray(folderContents)
        ? folderContents.flatMap((blockIdentifier) => {
          if (typeof blockIdentifier === 'number') {
            const foundBlock = postBlocks.find((block) => block.lineNumber === blockIdentifier);
            return foundBlock
              ? new PostBlockTreeItem(`${foundBlock.label}`, foundBlock.lineNumber, vscode.TreeItemCollapsibleState.None)
              : null;
          } else if (typeof blockIdentifier === 'string') {
            // Convert string ranges to arrays of numbers
            const rangeParts = blockIdentifier.split('-').map((part) => parseInt(part.trim()));
            if (rangeParts.length === 2 && !isNaN(rangeParts[0]) && !isNaN(rangeParts[1])) {
              const start = Math.min(rangeParts[0], rangeParts[1]);
              const end = Math.max(rangeParts[0], rangeParts[1]);

              const foundBlocks = postBlocks.filter((block) => block.lineNumber >= start && block.lineNumber <= end);
              return foundBlocks.map((foundBlock) => new PostBlockTreeItem(`${foundBlock.label}`, foundBlock.lineNumber, vscode.TreeItemCollapsibleState.None));
            } else {
              // console.log(`Invalid block range format for folder: ${folderName}`);
              return null;
            }
          } else if (typeof blockIdentifier === 'object' && 'start' in blockIdentifier && 'end' in blockIdentifier) {
            const foundBlocks = postBlocks.filter((block) => block.lineNumber >= blockIdentifier.start && block.lineNumber <= blockIdentifier.end);
            return foundBlocks.map((foundBlock) => new PostBlockTreeItem(`${foundBlock.label}`, foundBlock.lineNumber, vscode.TreeItemCollapsibleState.None));
          } else {
            // console.log(`Invalid block identifier format for folder: ${folderName}`);
            return null;
          }
        })
        .filter(Boolean) // Filter out undefined (not found) blocks
        : this.mapPostBlocksToFolders(postBlocks, folderContents, false);

      let collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

      // Add specific folders that should be opened by default
      const defaultOpenFolders = [
        'Debug Block',
        'Start Blocks',
        'Tool Change / End of Op Blocks',
        'End of Program Blocks',
      ];

      if (defaultOpenFolders.includes(folderName)) {
        collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
      }

      if (mappedContents.length > 0) {
        mappedFolders.push(new PostBlockFolderTreeItem(folderName, collapsibleState, mappedContents));
      } else {
        // console.log(`No blocks found for folder: ${folderName}`);
      }
    }

    return mappedFolders;
  }

  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    if (!element) {
      // Top-level elements
      const document = vscode.window.activeTextEditor.document;
  
      if (!this.postBlocksData.hasOwnProperty('root')) {
        // Fallback if 'root' is not defined in the JSON
        console.error('Error: The JSON file should have a root property.');
        return [];
      }
  
      // Parse the currently opened .bcpst file
      const postBlocks = this.parseBcpstFile(document);
  
      // Map post blocks to corresponding folders
      const mappedFolders = this.mapPostBlocksToFolders(postBlocks, this.postBlocksData.root);
  
      // Instantiate GoToTopTreeItem if it hasn't been created yet
      if (!this.goToTopItem) {
        this.goToTopItem = this.createGoToTopItem();
        mappedFolders.unshift(this.goToTopItem);
      }

      if (!this.goToBottomItem) {
        this.goToBottomItem = this.createGoToBottomItem();
        mappedFolders.push(this.goToBottomItem);
      }
  
      return mappedFolders;
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
