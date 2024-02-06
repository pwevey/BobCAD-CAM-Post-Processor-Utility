const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class PostBlockTreeItem extends vscode.TreeItem {
  constructor(label, lineNumber, collapsibleState, contextValue, command) {
    super(label, collapsibleState);
    this.lineNumber = lineNumber;
    this.contextValue = contextValue || 'postBlock';

    // Remove the adjustment for 0-based line numbers
    this.command = command || {
      command: 'postBlocks.navigateToLine',
      title: '',
      arguments: [lineNumber], // Keep the original line number
    };

    // Update the command directly with postBlockNumber
    this.command = {
      command: 'postBlocks.navigateToLine',
      title: '',
      arguments: [lineNumber], // Use the post block number as the line number
    };
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
    this.postBlocksData = this.loadPostBlocksData(); // Load data from JSON
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

  // Function to navigate to the line in the document that starts with the post block number
  navigateToLine(postBlockNumber) {
    const editor = vscode.window.activeTextEditor;

    if (editor) {
      const document = editor.document;

      for (let line = 0; line < document.lineCount; line++) {
        const text = document.lineAt(line).text;
        const match = text.match(new RegExp(`^${postBlockNumber}\\.`));

        if (match) {
          const position = new vscode.Position(line, 0);
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
          break;
        }
      }
    }
  }


  // Function to map post blocks to corresponding folders
  mapPostBlocksToFolders(postBlocks, folderStructure) {
    const mappedFolders = [];

    for (const folderName in folderStructure) {
      const folderContents = folderStructure[folderName];
      const mappedContents = Array.isArray(folderContents)
        ? folderContents.map((blockIdentifier) => {
                if (typeof blockIdentifier === 'number') {
                    const foundBlock = postBlocks.find((block) => block.lineNumber === blockIdentifier);
                    if (foundBlock) {
                        //console.log(`Mapping - Folder: ${folderName}, Expected Block: ${blockIdentifier}, Actual Block: ${foundBlock.lineNumber}`);
                        return new PostBlockTreeItem(`${foundBlock.label}`, foundBlock.lineNumber, vscode.TreeItemCollapsibleState.None);
                    } else {
                        //console.log(`No matching block found for - Folder: ${folderName}, Expected Block: ${blockIdentifier}`);
                        return null;
                    }
                } else if (typeof blockIdentifier === 'string') {
                    // Convert string ranges to arrays of numbers
                    const rangeParts = blockIdentifier.split('-').map(part => parseInt(part.trim()));
                    if (rangeParts.length === 2 && !isNaN(rangeParts[0]) && !isNaN(rangeParts[1])) {
                        const start = Math.min(rangeParts[0], rangeParts[1]);
                        const end = Math.max(rangeParts[0], rangeParts[1]);

                        const foundBlocks = postBlocks.filter((block) => block.lineNumber >= start && block.lineNumber <= end);
                        return foundBlocks.map((foundBlock) => {
                            //console.log(`Mapping - Folder: ${folderName}, Expected Block: ${start} - ${end}, Actual Block: ${foundBlock.lineNumber}`);
                            return new PostBlockTreeItem(`${foundBlock.label}`, foundBlock.lineNumber, vscode.TreeItemCollapsibleState.None);
                        });
                    } else {
                        //console.log(`Invalid block range format for folder: ${folderName}`);
                        return null;
                    }
                } else if (typeof blockIdentifier === 'object' && 'start' in blockIdentifier && 'end' in blockIdentifier) {
                    const foundBlocks = postBlocks.filter((block) => block.lineNumber >= blockIdentifier.start && block.lineNumber <= blockIdentifier.end);
                    return foundBlocks.map((foundBlock) => {
                        //console.log(`Mapping - Folder: ${folderName}, Expected Block: ${blockIdentifier.start} - ${blockIdentifier.end}, Actual Block: ${foundBlock.lineNumber}`);
                        return new PostBlockTreeItem(`${foundBlock.label}`, foundBlock.lineNumber, vscode.TreeItemCollapsibleState.None);
                    });
                } else {
                    //console.log(`Invalid block identifier format for folder: ${folderName}`);
                    return null;
                }
            }).flat().filter(Boolean) // Filter out undefined (not found) blocks
            : this.mapPostBlocksToFolders(postBlocks, folderContents);

            if (mappedContents.length > 0) {
              // Use vscode.TreeItemCollapsibleState.Collapsed for default collapsed state
              mappedFolders.push(new PostBlockFolderTreeItem(folderName, vscode.TreeItemCollapsibleState.Collapsed, mappedContents));
            } else {
              //console.log(`No blocks found for folder: ${folderName}`);
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
