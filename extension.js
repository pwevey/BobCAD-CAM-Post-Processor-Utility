const vscode = require('vscode');

function activate(context) {
    // console.log('Congratulations, your extension "bobcad-post" is now active!');
    
    // Implement hover provider for 'lua'
    const luaHoverProvider = vscode.languages.registerHoverProvider('lua', {
        provideHover(document, position, token) {
            const hoverText = new vscode.MarkdownString("This is hover information for the lua symbol.");
            return new vscode.Hover(hoverText);
        }
    });

    // Implement hover provider for 'bcpst'
    const bcpstHoverProvider = vscode.languages.registerHoverProvider('bcpst', {
        provideHover(document, position, token) {
            const hoverText = new vscode.MarkdownString("This is hover information for the bcpst symbol.");
            return new vscode.Hover(hoverText);
        }
    });

    // Register the hover providers
    context.subscriptions.push(luaHoverProvider);
    context.subscriptions.push(bcpstHoverProvider);
}

function deactivate() {
    // Cleanup logic when the extension is deactivated
}

module.exports = {
    activate,
    deactivate
};
