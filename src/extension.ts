'use strict';

import { window, commands, ExtensionContext, QuickPickItem } from 'vscode';
import { generateProject } from './generateProject/generationWizard';
import { add } from './addExtensions/addExtensions';
import { ConfigManager } from './definitions/configManager';
import { QUARKUS_PROJECT_REQUEST, JDTLS_PROJECT_INFO_COMMAND } from './definitions/commandConstants';
import * as requirements from './languageServer/requirements';
import { prepareExecutable } from './languageServer/javaServerStarter';
import { LanguageClientOptions, LanguageClient } from 'vscode-languageclient';

let languageClient: LanguageClient;

export interface QuickPickItemWithValue extends QuickPickItem {
  value: string;
}

export function activate(context: ExtensionContext) {
  
  connectToLS().then(() => {
    languageClient.onRequest(QUARKUS_PROJECT_REQUEST, (uri: String) => {
      commands.executeCommand("java.execute.workspaceCommand", JDTLS_PROJECT_INFO_COMMAND, uri);
    });
  }).catch((error) => {
    window.showErrorMessage(error.message, error.label).then((selection) => {
      if (error.label && error.label === selection && error.openUrl) {
        commands.executeCommand('vscode.open', error.openUrl);
      }
    });
  });

  registerVSCodeCommands(context);
  
}

export function deactivate() { }

function registerVSCodeCommands(context: ExtensionContext) {
  const configManager = new ConfigManager();

  /**
   * Command for creating a Quarkus Maven project
   */
  context.subscriptions.push(commands.registerCommand('quarkusTools.createMavenProject', () => {
    generateProject(configManager);
  }));

  /**
   * Command for adding Quarkus extensions to current Quarkus Maven project
   */
  context.subscriptions.push(commands.registerCommand('quarkusTools.addExtension', () => {
    add(configManager);
  }));

    /**
   * Temporary command to invoke jdt.ls extension command manually
   */
  context.subscriptions.push(commands.registerCommand('quarkusTools.jdtls', () => {

    console.log('jdtls invoked via command palette');

    const quarkusJtdlsParameter = "parameters here";

    commands.executeCommand("java.execute.workspaceCommand", JDTLS_PROJECT_INFO_COMMAND, "hello").then((res) => {
      console.log("Return value from jdtls");
      console.log(res);
    });
  }));
}

function connectToLS() {
  return requirements.resolveRequirements().then(requirements => {
    let clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: 'file', pattern: '**/application.properties' }
      ]
    };

    let serverOptions = prepareExecutable(requirements);
    languageClient = new LanguageClient('Quarkus', 'Quarkus Tools', serverOptions, clientOptions);
    languageClient.start();
    return languageClient.onReady();
  });
}