const vscode = require('vscode');
const { readPostBlocks } = require('./utils'); // Assuming you have a utils.js file for shared functions

class HoverProvider {
  provideHover(document, position) {
    const postBlocks = readPostBlocks();

    if (postBlocks) {
      const line = document.lineAt(position.line).text;

      const postBlockNumberMatch = line.match(/^(\d+)/);

      if (postBlockNumberMatch) {
        const postBlockNumber = parseInt(postBlockNumberMatch[1]);
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
  }
}

module.exports = HoverProvider;
