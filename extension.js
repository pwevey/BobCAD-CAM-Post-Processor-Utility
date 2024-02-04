const vscode = require('vscode');

function activate(context) {
    let provider = vscode.languages.registerHoverProvider('lua', {
        provideHover(document, position, token) {
            const word = document.getText(document.getWordRangeAtPosition(position));
            if (word === 'Hello') {
                return new vscode.Hover('World');
            }
        }
    });

    context.subscriptions.push(provider);
}

exports.activate = activate;