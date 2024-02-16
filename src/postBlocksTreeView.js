const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

// Represents a single post block item in the tree view
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

// Represents a folder item that can contain post block items
class PostBlockFolderTreeItem extends PostBlockTreeItem {
  constructor(label, collapsibleState, children) {
    super(label, undefined, collapsibleState);
    this.children = children || [];
  }onDidChangeTreeData
}

// Represents an item to navigate to a specific position in the document
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

// Provides data for the post block tree view
class PostBlockDataProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.postBlocksData = this.loadPostBlocksData();
    this.goToTopItem = null;
    this.goToBottomItem = null;
    this.debounceTimeout = null; // Initialize debounceTimeout
    // Subscribe to the onDidChangeActiveTextEditor event
    vscode.window.onDidChangeActiveTextEditor(() => this.autoRefresh());
    // Subscribe to the onDidChangeTextDocument event
    vscode.workspace.onDidChangeTextDocument(e => this.onDocumentChanged(e));
    // Subscribe to the onDidChangeTextEditorSelection event
    vscode.window.onDidChangeTextEditorSelection(e => this.onSelectionChanged(e));
  }

  // Create an instance of GoToPositionTreeItem for Go to Top
  createGoToTopItem() {
    return new GoToPositionTreeItem('Go to Top', new vscode.Position(0, 0));
  }

  // Create an instance of GoToPositionTreeItem for Go to Bottom
  createGoToBottomItem() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      // Create a new position at the last line of the document
      const position = new vscode.Position(editor.document.lineCount - 1, 0);
      // Create a new GoToPositionTreeItem with a command that navigates to the last line
      const goToBottomItem = new GoToPositionTreeItem('Go to Bottom', position);
      goToBottomItem.command = {
        command: 'vscode.open',
        arguments: [editor.document.uri, { selection: new vscode.Selection(position, position) }],
        title: 'Go to Bottom'
      };
      return goToBottomItem;
    }
    return null;
  }

  // Load treeViewerPostStruct.json or treeViewerPostStructEDM.json file based on the file extension
  loadPostBlocksData() {
    const extensionPath = vscode.extensions.getExtension('BobCAD-CAM.bobcad-post').extensionPath;
    const activeEditor = vscode.window.activeTextEditor;

    if (activeEditor) {
      const fileExtension = activeEditor.document.fileName.split('.').pop().toLowerCase();
      const jsonFileName = fileExtension === 'edmpst' ? 'treeViewerPostStructEDM.json' : 'treeViewerPostStruct.json';
      const jsonFilePath = path.join(extensionPath, 'res', 'post_data', jsonFileName);

      try {
        const data = fs.readFileSync(jsonFilePath, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        console.error(`Error loading ${jsonFileName}:`, error.message);
      }
    }

    return {};
  }


  // Function to auto-refresh the tree view
  autoRefresh() {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const fileExtension = activeEditor.document.fileName.split('.').pop().toLowerCase();
      if (['bcpst', 'millpst', 'edmpst', 'lathepst'].includes(fileExtension)) {
        this.manualRefresh();
      }
    }
  }

  // Function to handle document changes
  onDocumentChanged(e) {
    const fileExtension = e.document.fileName.split('.').pop().toLowerCase();
    if (['bcpst', 'millpst', 'edmpst', 'lathepst'].includes(fileExtension)) {
      for (const change of e.contentChanges) {
        // Check if the change is a post block line and if it's a new line
        if (/^\d+\./.test(change.text) && change.text.includes('\n')) {
          this.debounceRefresh();
          break;
        }
      }
    }
  }

  // Function to handle selection changes
  onSelectionChanged(e) {
    const fileExtension = e.textEditor.document.fileName.split('.').pop().toLowerCase();
    if (['bcpst', 'millpst', 'edmpst', 'lathepst'].includes(fileExtension)) {
      const line = e.textEditor.document.lineAt(e.selections[0].start.line);
      if (/^\d+\./.test(line.text)) {
        this.debounceRefresh();
      }
    }
  }

  // Function to debounce the refresh
  debounceRefresh() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.debounceTimeout = setTimeout(() => this.manualRefresh(), 500); // 5 seconds
  }


  // Trigger a manual refresh of the tree view
  manualRefresh() {
    this.postBlocksData = this.loadPostBlocksData(); // Load Wire EDM or Milling treeViewerPostStruct.json
    this._onDidChangeTreeData.fire();
    // Create a new "Go to Bottom" item based on the current active text editor
    this.goToBottomItem = this.createGoToBottomItem();
  }

  // Command to refresh the tree view
  refreshCommand() {
    this.manualRefresh();
  }
  

  // Collapse all folders in the tree view
  collapseAll() {
    this.changeFolderCollapsibleState(this.postBlocksData.root, vscode.TreeItemCollapsibleState.Collapsed);
    this._onDidChangeTreeData.fire();
  }

  // Recursively change the collapsible state of folders
  changeFolderCollapsibleState(folder, state) {
    if (Array.isArray(folder)) {
      for (const element of folder) {
        this.changeFolderCollapsibleState(element, state);
      }
    } else if (typeof folder === 'object' && folder !== null) {
      folder.collapsibleState = state;
      this.changeFolderCollapsibleState(folder.children, state);
    }
  }

  // Expand all folders in the tree view
  expandAll() {
    this.changeFolderCollapsibleState(this.postBlocksData.root, vscode.TreeItemCollapsibleState.Expanded);
    this._onDidChangeTreeData.fire();
  }

  // Recursively expand folders
  expandFolders(folder) {
    if (Array.isArray(folder)) {
      for (const element of folder) {
        this.expandFolders(element);
      }
    } else if (typeof folder === 'object' && folder !== null) {
      folder.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
      this.expandFolders(folder.children);
    }
  }

  // Parse the currently opened .bcpst file and extract post blocks
  parseBcpstFile(document) {
    const postBlockRegex = /^(\d+)\.\s*(.*)/;
    const postBlocks = [];
    const lineNumberMap = {};

    // Load deprecated post blocks from file
    const deprecatedPostBlocks = this.loadDeprecatedPostBlocks();

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

        // Check if post block is deprecated
        const isDeprecated = deprecatedPostBlocks.includes(postBlockNumber);
        const deprecatedSuffix = isDeprecated ? ' (deprecated)' : '';

        const label = `${postBlockNumber}. ${postBlockName}${deprecatedSuffix}`;
        const command = {
          command: 'postBlocks.navigateToLine',
          title: '',
          arguments: [postBlockNumber], // Use the post block number as the line number
        };

        // Update the mapping object
        lineNumberMap[lineNumber] = true;

        postBlocks.push(new PostBlockTreeItem(label, postBlockNumber, vscode.TreeItemCollapsibleState.None, undefined, command));
      }
    }

    return postBlocks;
  }

  // Load deprecated post blocks from file
  loadDeprecatedPostBlocks() {
    const extensionPath = vscode.extensions.getExtension('BobCAD-CAM.bobcad-post').extensionPath;
    const jsonFilePath = path.join(extensionPath, 'res', 'post_data', 'deprecatedPostBlocks.json');

    try {
      const data = fs.readFileSync(jsonFilePath, 'utf-8');
      const deprecatedPostBlocks = JSON.parse(data).deprecatedPostBlocks || [];
      return deprecatedPostBlocks;
    } catch (error) {
      console.error('Error loading deprecatedPostBlocks.json:', error.message);
      return [];
    }
  }

  // Find the line number of a post block in the document
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

  // Navigate to the specified post block line number
  navigateToLine(postBlockNumber) {
    // console.log(`Navigating to line for Post Block ${postBlockNumber}`);
  
    if (postBlockNumber === 1) {
      // Special case for "Go to Top"
      vscode.commands.executeCommand('postBlocks.goToTop');
    } else {
      const lineNumber = this.findLineNumber(postBlockNumber);
      if (lineNumber !== undefined) {
        this.navigateToLineInternal(lineNumber);
      }
    }
  }

  // Command to navigate to the top of the document
  goToTop() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const position = new vscode.Position(0, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    }
  }

  // Navigate to the specified line number
  navigateToLineInternal(line) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const position = new vscode.Position(line, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    }
  }

  // Map post blocks to their respective folders based on the provided folder structure
  mapPostBlocksToFolders(postBlocks, folderStructure, isTopLevel = true) {
    const mappedFolders = [];

    if (isTopLevel) {
      // Insert "Go to Top" as the first item if it's a top-level mapping
      mappedFolders.push(this.goToTopItem, this.goToBottomItem);
      isTopLevel = false;
    }

    // Iterate through the provided folder structure
    for (const folderName in folderStructure) {
      const folderContents = folderStructure[folderName];
      const mappedContents = Array.isArray(folderContents)
        ? folderContents.flatMap((blockIdentifier) => this.mapBlockIdentifierToItems(blockIdentifier, postBlocks))
        : this.mapPostBlocksToFolders(postBlocks, folderContents, false);

      // Determine the collapsible state for the folder
      let collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

      const defaultOpenFolders = [
        'Debug Block',
        'Start Blocks',
        'Tool Change / End of Op Blocks',
        'End of Program Blocks',
        'Program Blocks'
      ];

      if (defaultOpenFolders.includes(folderName)) {
        collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
      }

      // Add the folder item to the mappedFolders array
      if (mappedContents.length > 0) {
        mappedFolders.push(new PostBlockFolderTreeItem(folderName, collapsibleState, mappedContents));
      }
    }

    return mappedFolders;
  }

  // Map block identifiers to their respective post block items
  mapBlockIdentifierToItems(blockIdentifier, postBlocks) {
    if (typeof blockIdentifier === 'number') {
      // Single post block identifier
      const foundBlock = postBlocks.find((block) => block.lineNumber === blockIdentifier);
      return foundBlock
        ? [new PostBlockTreeItem(`${foundBlock.label}`, foundBlock.lineNumber, vscode.TreeItemCollapsibleState.None)]
        : [];
    } else if (typeof blockIdentifier === 'string') {
      // Handle range specified as a string (e.g., "1-5")
      const rangeParts = blockIdentifier.split('-').map((part) => parseInt(part.trim()));
      if (rangeParts.length === 2 && !isNaN(rangeParts[0]) && !isNaN(rangeParts[1])) {
        const start = Math.min(rangeParts[0], rangeParts[1]);
        const end = Math.max(rangeParts[0], rangeParts[1]);

        const foundBlocks = postBlocks.filter((block) => block.lineNumber >= start && block.lineNumber <= end);
        return foundBlocks.map((foundBlock) => new PostBlockTreeItem(`${foundBlock.label}`, foundBlock.lineNumber, vscode.TreeItemCollapsibleState.None));
      } else {
        return [];
      }
    } else if (typeof blockIdentifier === 'object' && 'start' in blockIdentifier && 'end' in blockIdentifier) {
      // Handle range specified as an object with start and end properties
      const foundBlocks = postBlocks.filter((block) => block.lineNumber >= blockIdentifier.start && block.lineNumber <= blockIdentifier.end);
      return foundBlocks.map((foundBlock) => new PostBlockTreeItem(`${foundBlock.label}`, foundBlock.lineNumber, vscode.TreeItemCollapsibleState.None));
    } else {
      return [];
    }
  }

  // Get the tree item for a given element
  getTreeItem(element) {
    return element;
  }

  // Get the children of a given element
  getChildren(element) {
    if (!element) {
      // Root level, show the tree structure
      const document = vscode.window.activeTextEditor.document;

      if (!this.postBlocksData.hasOwnProperty('root')) {
        console.error('Error: The JSON file should have a root property.');
        return [];
      }

      // Parse the .bcpst file and map post blocks to folders
      const postBlocks = this.parseBcpstFile(document);
      const mappedFolders = this.mapPostBlocksToFolders(postBlocks, this.postBlocksData.root);

      // Add "Go to Top" and "Go to Bottom" items
      if (!this.goToTopItem) {
        this.goToTopItem = this.createGoToTopItem();
        mappedFolders.unshift(this.goToTopItem);
      }

      if (!this.goToBottomItem) {
        this.goToBottomItem = this.createGoToBottomItem();
        // Insert the "Go to Bottom" item at the second position in the array
        mappedFolders.splice(1, 0, this.goToBottomItem);
      }

      return mappedFolders;
    } else if (element instanceof PostBlockFolderTreeItem) {
      // Children of a folder, return its children
      return element.children;
    }

    return [];
  }
}

module.exports = {
  PostBlockDataProvider,
};
