# LLMCode

A simple terminal-based coding support tool that runs in Terminal.app, executes shell commands, tracks command history, identifies errors, and provides explanations using Ollama with the gemma3:12b model.

## Features

- Execute shell commands directly from the tool
- Save and display command history
- Identify when commands result in errors
- Use Ollama (with gemma3:12b model) to explain errors
- Toggle between Shell mode and Chat mode using "!"
- Automatic context information sent to Ollama for more relevant responses
- Concise, summarized responses focused on key points

## Prerequisites

- Node.js (v14 or later)
- Ollama installed with the gemma3:12b model

## Installation

1. Clone this repository:
```
git clone https://github.com/yourusername/llmcode.git
cd llmcode
```

2. Install dependencies:
```
npm install
```

3. Make sure the script is executable:
```
chmod +x index.js
```

4. Install Ollama and the gemma3:12b model if you haven't already:
```
# Install Ollama (if not installed)
curl -fsSL https://ollama.com/install.sh | sh

# Pull the gemma3:12b model (this may take some time)
ollama pull gemma3:12b
```

## Usage

1. Start Ollama in a separate terminal:
```
ollama serve
```

2. Run LLMCode:
```
npm start
```

3. Mode switching:
   - The tool starts in Shell mode by default
   - Type `!` to toggle between Shell mode and Chat mode

4. Shell mode commands:
   - Any shell command (will be executed in the terminal)
   - `help` - Show available commands
   - `history` - Show command history
   - `clear` - Clear command history
   - `explain` - Explain the error from the last command using Ollama
   - `exit` - Exit the application

5. Chat mode commands:
   - Any input will be sent to Ollama for a response
   - `help` - Show available commands
   - `history` - Show chat history
   - `clear` - Clear chat history
   - `exit` - Exit the application

## Context Information and Response Format

When in Chat mode or when using the `explain` command, LLMCode automatically:

1. Sends helpful context information to Ollama, including:
   - Current date and time
   - Current directory listing (output of `ls -a` command)

2. Instructs Ollama to provide concise, summarized responses that:
   - Focus only on key points
   - Use bullet points for clarity when appropriate
   - Keep explanations brief
   - Avoid unnecessary details and verbose explanations

This context information and instructions are enclosed in `<info>...</info>` tags at the beginning of each prompt, helping Ollama provide more relevant and concise responses based on your current environment.

## Examples

### Shell Mode
```
LLMCode [Shell] > ls -la
# Lists files with details

LLMCode [Shell] > node non_existent_file.js
# This will produce an error

LLMCode [Shell] > explain
# Ollama will provide a concise explanation of the error

LLMCode [Shell] > history
# Shows the history of commands executed
```

### Chat Mode
```
LLMCode [Shell] > !
Switched to CHAT mode
LLMCode [Chat] > How do I fix a TypeError in JavaScript?
# Ollama will respond with concise information about fixing TypeError

LLMCode [Chat] > What's the best way to handle file operations in Node.js?
# Ollama will provide brief, key points about Node.js file operations

LLMCode [Chat] > history
# Shows the history of chat interactions
```

## License

MIT
