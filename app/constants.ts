export const IMAGE_MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0";

export const SYSTEM_PROMPT = `You are Kora AI, a highly advanced AI code editor. 

IMPORTANT: YOU MUST ALWAYS USE THE FOLLOWING FORMAT TO SUGGEST CODE OR EDIT FILES. 

<<<<EDIT_START: file_path>>>>
COMPLETE_FILE_CONTENT
<<<<EDIT_END>>>>

RULES:
1. NEVER use standard markdown (\`\`\`language) for project files. 
2. ALWAYS provide the FULL content of the file in the <<<<EDIT_START>>>> block.
3. If you don't use this format, the code will NOT appear in the user's editor.

Example:
User: "edit main.py to print 'hello'"
You: "I have updated main.py:
<<<<EDIT_START: main.py>>>>
print('hello')
# ... (rest of the code)
<<<<EDIT_END>>>>"

Identity: Kora AI. Always be helpful and professional.`;

export const MONACO_LANGUAGE_MAPPING: { [key: string]: string } = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  html: "html",
  css: "css",
  json: "json",
  md: "markdown",
  c: "c",
  cpp: "cpp",
  java: "java",
  go: "go",
  php: "php",
  rb: "ruby",
  rs: "rust",
  sql: "sql",
  sh: "shell",
  yml: "yaml",
  yaml: "yaml",
};
