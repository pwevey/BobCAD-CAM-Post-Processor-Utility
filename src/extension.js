const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

function getExtensionRoot() {
  const extensionPath = vscode.extensions.getExtension('BobCAD-CAM.bobcad-post').extensionPath;
  return extensionPath;
}

function getJsonFilePath() {
  const extensionRoot = getExtensionRoot();
  return path.join(extensionRoot, 'res', 'post_data', 'postBlocks.json');
}




function activate(context) {
  //console.log('Extension activated');

  // Register hover provider for .bcpst documents
  const hoverProvider = vscode.languages.registerHoverProvider('bcpst', {
    provideHover(document, position, token) {
      //console.log('Hover requested');

      // Check if the line starts with a post block number
      const postBlocks = readPostBlocks();
      if (postBlocks) {
        const line = document.lineAt(position.line).text;
        //console.log('Hover Line:', line);

        const postBlockNumber = parseInt(line);
        //console.log('Post Block Number:', postBlockNumber);

        const hoveredBlock = postBlocks.blocks.find((block) => block.number === postBlockNumber);
        //console.log('Hovered Block:', hoveredBlock);

        if (hoveredBlock) {
          const hoverText = new vscode.MarkdownString(`**${hoveredBlock.name}**\n\n${hoveredBlock.description}\n\nJob Types: ${hoveredBlock.jobTypes.join(', ')}`);
          return new vscode.Hover(hoverText);
        }
      }

      return null;
    },
  });

  context.subscriptions.push(hoverProvider);

  // Additional activation logic...
}

function readPostBlocks() {
  const jsonFilePath = getJsonFilePath();

  // "C:/Users/pweve/Documents/GitHub/BobCAD-CAM-Post-Processor-Utility/res/post_data/postBlocks.json"

  try {
    //console.log('Reading JSON file from path:', jsonFilePath);
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
    //console.log('Parsed JSON:', jsonContent);
    return JSON.parse(jsonContent);
  } catch (error) {
    //console.error('Error reading/parsing JSON file:', error.message);
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
