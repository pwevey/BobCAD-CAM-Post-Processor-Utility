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

function readPostBlocks() {
  const jsonFilePath = getJsonFilePath();

  try {
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
    return JSON.parse(jsonContent);
  } catch (error) {
    return null;
  }
}

module.exports = { readPostBlocks };
