#!/usr/bin/env node

import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import fetch from 'node-fetch';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import os from 'os';

// Get the current file path and calculate file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const historyFilePath = path.join(__dirname, 'history.json');
const chatHistoryFilePath = path.join(__dirname, 'chat_history.json');
const configFilePath = path.join(__dirname, 'config.json');

// Config object with defaults
let config = {
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5-coder'
  }
};

// Mode tracking (shell or chat)
let currentMode = 'shell'; // Default to shell mode

// Create a readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.blue('LLMCode [Shell] > ')
});

// Command and chat history
let commandHistory = [];
let chatHistory = [];

// Update prompt based on current mode
function updatePrompt() {
  const modeText = currentMode === 'shell' ? 'Shell' : 'Chat';
  const promptColor = currentMode === 'shell' ? chalk.blue : chalk.green;
  rl.setPrompt(promptColor(`LLMCode [${modeText}] > `));
}

// Function to load config
async function loadConfig() {
  try {
    const data = await fs.readFile(configFilePath, 'utf8');
    config = JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, create config with defaults
    await fs.writeFile(configFilePath, JSON.stringify(config, null, 2));
  }
}

// Function to save config
async function saveConfig() {
  await fs.writeFile(configFilePath, JSON.stringify(config, null, 2));
}

// Function to load command history
async function loadCommandHistory() {
  try {
    const data = await fs.readFile(historyFilePath, 'utf8');
    commandHistory = JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, create an empty history
    commandHistory = [];
    await fs.writeFile(historyFilePath, JSON.stringify(commandHistory, null, 2));
  }
}

// Function to load chat history
async function loadChatHistory() {
  try {
    const data = await fs.readFile(chatHistoryFilePath, 'utf8');
    chatHistory = JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, create an empty history
    chatHistory = [];
    await fs.writeFile(chatHistoryFilePath, JSON.stringify(chatHistory, null, 2));
  }
}

// Function to save command history
async function saveCommandHistory() {
  await fs.writeFile(historyFilePath, JSON.stringify(commandHistory, null, 2));
}

// Function to save chat history
async function saveChatHistory() {
  await fs.writeFile(chatHistoryFilePath, JSON.stringify(chatHistory, null, 2));
}

// Function to get current directory info
function executeShellCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve(`Error executing command: ${stderr}`);
      } else {
        resolve(stdout);
      }
    });
  });
}

// Function to get system information for Ollama context
async function getSystemInfo() {
  const now = new Date();
  const dateStr = now.toISOString();
  
  // Get result of ls -a command
  const directoryListing = await executeShellCommand('ls -a');
  
  return `<info>
Date: ${dateStr}
Directory Listing (ls -a):
${directoryListing}

IMPORTANT INSTRUCTIONS:
- Provide concise, summarized responses
- Focus on the key points only
- Use bullet points for clarity when appropriate
- Keep explanations brief and to the point
- Avoid unnecessary details and verbose explanations
</info>`;
}

// Function to execute a shell command
function executeCommand(command) {
  return new Promise((resolve) => {
    console.log(chalk.dim(`Executing: ${command}`));
    
    const childProcess = exec(command, { maxBuffer: 1024 * 1024 * 10 });
    let stdout = '';
    let stderr = '';

    childProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
      stdout += data;
    });

    childProcess.stderr.on('data', (data) => {
      process.stderr.write(chalk.red(data));
      stderr += data;
    });

    childProcess.on('close', (code) => {
      const result = {
        command,
        timestamp: new Date().toISOString(),
        exitCode: code,
        output: stdout,
        error: stderr,
        hasError: code !== 0 || stderr.length > 0
      };
      
      commandHistory.push(result);
      saveCommandHistory();
      
      resolve(result);
    });
  });
}

// Function to check if command output contains errors
function hasErrors(commandResult) {
  return commandResult.hasError;
}

// Function to send a message to Ollama
async function sendChatMessage(message) {
  console.log(chalk.yellow(`Sending message to Ollama (${config.ollama.model})...`));
  
  // Get system information to prepend to the message
  const systemInfo = await getSystemInfo();
  
  // Create the full prompt with system info
  const fullPrompt = `${systemInfo}\n\n${message}\n\nRemember to provide a concise summary focusing only on the key points.`;
  
  // Add the original message to chat history (without system info)
  chatHistory.push({
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  });
  
  try {
    const response = await fetch(`${config.ollama.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.ollama.model,
        prompt: fullPrompt,
        stream: false
      }),
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.log(chalk.red(`Error from Ollama: ${data.error}`));
      return;
    }
    
    // Add the response to chat history
    chatHistory.push({
      role: 'assistant',
      content: data.response,
      timestamp: new Date().toISOString()
    });
    
    // Save chat history
    await saveChatHistory();
    
    // Display the response
    console.log(chalk.green('\n=== OLLAMA RESPONSE ===\n'));
    console.log(data.response);
    console.log(chalk.green('\n=======================\n'));
  } catch (error) {
    console.log(chalk.red(`Failed to connect to Ollama: ${error.message}\nMake sure Ollama is running and the model '${config.ollama.model}' is installed.`));
  }
}

// Function to explain error using Ollama
async function explainError(errorText) {
  console.log(chalk.yellow(`Analyzing error using Ollama (${config.ollama.model})...`));
  
  // Get system information to prepend to the message
  const systemInfo = await getSystemInfo();
  
  try {
    const response = await fetch(`${config.ollama.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.ollama.model,
        prompt: `${systemInfo}\n\nI got the following error in my terminal. Please explain what it means and suggest how to fix it. Be concise and focus on the key points:\n\n${errorText}`,
        stream: false
      }),
    });
    
    const data = await response.json();
    
    if (data.error) {
      return chalk.red(`Error from Ollama: ${data.error}`);
    }
    
    return chalk.green('\n=== ERROR EXPLANATION ===\n') + 
           chalk.yellow(data.response) + 
           chalk.green('\n=========================\n');
  } catch (error) {
    return chalk.red(`Failed to connect to Ollama: ${error.message}\nMake sure Ollama is running and the model '${config.ollama.model}' is installed.`);
  }
}

// Main function
async function main() {
  console.log(chalk.green('=== LLMCode ==='));
  console.log(chalk.green('Terminal coding support tool with Ollama integration'));
  console.log(chalk.green('Type "exit" or press Ctrl+C to quit'));
  console.log(chalk.green('Type "help" to see available commands'));
  console.log(chalk.green('Type "!" to toggle between Shell and Chat mode'));
  console.log(chalk.green('============='));
  
  await loadConfig();
  await loadCommandHistory();
  await loadChatHistory();
  
  updatePrompt();
  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    
    // Check for mode toggle
    if (input === '!') {
      currentMode = currentMode === 'shell' ? 'chat' : 'shell';
      console.log(chalk.yellow(`Switched to ${currentMode.toUpperCase()} mode`));
      updatePrompt();
      rl.prompt();
      return;
    }
    
    if (input === 'exit') {
      rl.close();
      return;
    }
    
    if (input === 'config') {
      console.log(chalk.green('=== Current Configuration ==='));
      console.log(chalk.yellow('Ollama Model: ') + chalk.blue(config.ollama.model));
      console.log(chalk.yellow('Ollama URL: ') + chalk.blue(config.ollama.baseUrl));
      console.log(chalk.green('============================'));
      rl.prompt();
      return;
    }
    
    if (input.startsWith('config:model ')) {
      const modelName = input.replace('config:model ', '').trim();
      
      if (modelName) {
        config.ollama.model = modelName;
        await saveConfig();
        console.log(chalk.green(`Ollama model changed to: ${chalk.blue(modelName)}`));
      } else {
        console.log(chalk.red('Please provide a model name. Example: config:model llama3'));
      }
      
      rl.prompt();
      return;
    }
    
    if (input === 'help') {
      console.log(chalk.green('=== Available Commands ==='));
      console.log(chalk.green('!') + ' - Toggle between Shell and Chat mode');
      console.log(chalk.green('exit') + ' - Exit the application');
      console.log(chalk.green('help') + ' - Show this help message');
      console.log(chalk.green('config') + ' - Show current configuration');
      console.log(chalk.green('config:model <name>') + ' - Change Ollama model');
      
      if (currentMode === 'shell') {
        console.log(chalk.green('history') + ' - Show command history');
        console.log(chalk.green('clear') + ' - Clear command history');
        console.log(chalk.green('explain') + ' - Explain the error from the last command');
        console.log(chalk.green('Any other input will be executed as a shell command'));
      } else {
        console.log(chalk.green('history') + ' - Show chat history');
        console.log(chalk.green('clear') + ' - Clear chat history');
        console.log(chalk.green('Any other input will be sent to Ollama'));
      }
      
      console.log(chalk.green('============================'));
      rl.prompt();
      return;
    }
    
    // Handle mode-specific commands
    if (currentMode === 'shell') {
      // Shell mode
      if (input === 'history') {
        console.log(chalk.green('=== Command History ==='));
        commandHistory.forEach((entry, index) => {
          const statusColor = entry.hasError ? chalk.red : chalk.green;
          const status = entry.hasError ? '✖' : '✓';
          console.log(
            chalk.yellow(`${index + 1}.`),
            statusColor(status),
            chalk.blue(entry.command),
            chalk.dim(`[${new Date(entry.timestamp).toLocaleString()}]`)
          );
        });
        console.log(chalk.green('======================='));
        rl.prompt();
        return;
      }
      
      if (input === 'clear') {
        commandHistory = [];
        await saveCommandHistory();
        console.log(chalk.green('Command history cleared'));
        rl.prompt();
        return;
      }
      
      if (input === 'explain') {
        // Find the last command with an error
        const lastErrorCommand = [...commandHistory].reverse().find(cmd => cmd.hasError);
        
        if (!lastErrorCommand) {
          console.log(chalk.yellow('No errors found in recent commands.'));
          rl.prompt();
          return;
        }
        
        const explanation = await explainError(lastErrorCommand.error);
        console.log(explanation);
        rl.prompt();
        return;
      }
      
      // Check if input is empty
      if (!input.trim()) {
        rl.prompt();
        return;
      }
      
      // Execute as shell command
      const result = await executeCommand(input);
      
      if (hasErrors(result)) {
        console.log(chalk.yellow('Command completed with errors. Type "explain" to analyze the error.'));
      }
      
    } else {
      // Chat mode
      // Check if input is empty
      if (!input.trim()) {
        rl.prompt();
        return;
      }
      
      if (input === 'history') {
        console.log(chalk.green('=== Chat History ==='));
        chatHistory.forEach((entry, index) => {
          const roleColor = entry.role === 'user' ? chalk.blue : chalk.green;
          console.log(
            chalk.yellow(`${Math.floor(index/2) + 1}. `),
            roleColor(`[${entry.role.toUpperCase()}]`),
            entry.content.slice(0, 50) + (entry.content.length > 50 ? '...' : ''),
            chalk.dim(`[${new Date(entry.timestamp).toLocaleString()}]`)
          );
        });
        console.log(chalk.green('======================='));
        rl.prompt();
        return;
      }
      
      if (input === 'clear') {
        chatHistory = [];
        await saveChatHistory();
        console.log(chalk.green('Chat history cleared'));
        rl.prompt();
        return;
      }
      
      // Send to Ollama
      await sendChatMessage(input);
    }
    
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.green('Goodbye!'));
    process.exit(0);
  });
}

// Start the application
main().catch(error => {
  console.error(chalk.red(`Error: ${error.message}`));
  process.exit(1);
});
