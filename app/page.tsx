/**
 * @copyright Copyright (c) 2026 Taskkora. All rights reserved.
 * @license AGPL-3.0
 * @description This file is part of Kora AI - Premium Code Editor, a product of the Taskkora ecosystem.
 * Unauthorized copying, modification, or distribution of this file without the 
 * explicit branding of "Taskkora" is strictly prohibited.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { HfInference } from "@huggingface/inference";
import { Sidebar } from "./components/Sidebar";
import { EditorSection } from "./components/EditorSection";
import { ChatSection } from "./components/ChatSection";
import { ProjectItem, ChatSession, Message, PendingEdit } from "./types";
import { IMAGE_MODEL_ID, SYSTEM_PROMPT, MONACO_LANGUAGE_MAPPING } from "./constants";

export default function ChatApp() {
  const [provider, setProvider] = useState<string>("huggingface");
  const [token, setToken] = useState<string>("");
  const [modelId, setModelId] = useState<string>("");
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [chatMode, setChatMode] = useState<"chat" | "image">("chat");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [openFileIds, setOpenFileIds] = useState<string[]>([]); // New state for open tabs
  const [referencedFileIds, setReferencedFileIds] = useState<string[]>([]);
  const [showApiSettings, setShowApiSettings] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokensState, setMaxTokensState] = useState<number>(4000);

  const [mobileView, setMobileView] = useState<"chat" | "editor">("chat");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];
  const activeFile = projectItems.find(item => item.id === activeFileId);

  const setActiveFileHandler = (id: string) => {
    setActiveFileId(id);
    if (!openFileIds.includes(id)) {
      setOpenFileIds(prev => [...prev, id]);
    }
    if (window.innerWidth < 768) {
      setMobileView("editor");
      setIsSidebarOpen(false);
    }
  };

  const closeFileHandler = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpenFileIds(prev => {
      const newOpenFiles = prev.filter(fileId => fileId !== id);
      // If we're closing the active file, switch to another open file or null
      if (activeFileId === id) {
        setActiveFileId(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
      }
      return newOpenFiles;
    });
  };

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }, []);

  useEffect(() => {
    const savedProvider = localStorage.getItem("api_provider") || localStorage.getItem("hf_provider");
    const savedToken = localStorage.getItem("api_token") || localStorage.getItem("hf_token");
    const savedModel = localStorage.getItem("api_model") || localStorage.getItem("hf_model");
    const savedBaseUrl = localStorage.getItem("api_base_url");
    const savedSessions = localStorage.getItem("hf_sessions");
    const savedItems = localStorage.getItem("hf_project_items");
    const savedTemp = localStorage.getItem("hf_temp");
    const savedMaxTokens = localStorage.getItem("hf_max_tokens");

    if (savedProvider) setProvider(savedProvider);
    if (savedToken) setToken(savedToken);
    if (savedModel) setModelId(savedModel);
    if (savedBaseUrl) setBaseUrl(savedBaseUrl);
    if (savedTemp) setTemperature(parseFloat(savedTemp));
    if (savedMaxTokens) setMaxTokensState(parseInt(savedMaxTokens));
    if (savedItems) setProjectItems(JSON.parse(savedItems));

    if (savedSessions) {
      const parsed = JSON.parse(savedSessions) as ChatSession[];
      if (parsed.length > 0) {
        const updatedSessions = parsed.map(s => ({
          ...s,
          pendingEdits: s.pendingEdits || []
        }));
        setSessions(updatedSessions);
        setCurrentSessionId(updatedSessions[0].id);
      } else {
        createNewChat();
      }
    } else {
      createNewChat();
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("hf_sessions", JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("hf_project_items", JSON.stringify(projectItems));
  }, [projectItems]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getMonacoLanguage = (ext: string | undefined) => {
    if (!ext) return "plaintext";
    return MONACO_LANGUAGE_MAPPING[ext.toLowerCase()] || "plaintext";
  };

  const saveSettings = () => {
    if (provider !== "ollama" && !token) {
      alert("Please provide the API Token!");
      return;
    }
    if (!modelId) {
      alert("Please provide the Model ID!");
      return;
    }
    localStorage.setItem("api_provider", provider);
    localStorage.setItem("api_token", token);
    localStorage.setItem("api_model", modelId);
    localStorage.setItem("api_base_url", baseUrl);
    localStorage.setItem("hf_temp", temperature.toString());
    localStorage.setItem("hf_max_tokens", maxTokensState.toString());
    alert("Settings saved!");
  };

  const createNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: "New Chat",
      messages: [],
      pendingEdits: [],
      createdAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setReferencedFileIds([]);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (currentSessionId === id) {
      setCurrentSessionId(filtered.length > 0 ? filtered[0].id : null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const relativePath = (file as any).webkitRelativePath || file.name;
        const extension = file.name.split('.').pop() || 'txt';
        
        const pathParts = relativePath.split('/');
        let currentPath = "";
        
        pathParts.forEach((part: string, index: number) => {
          const isLast = index === pathParts.length - 1;
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          
          setProjectItems(prev => {
            const exists = prev.some(item => item.path === currentPath);
            if (!exists) {
              const newItem: ProjectItem = {
                id: Math.random().toString(36).substr(2, 9),
                name: part,
                type: isLast ? "file" : "folder",
                path: currentPath,
                content: isLast ? content : undefined,
                language: isLast ? extension : undefined,
                isOpen: true
              };
              return [...prev, newItem];
            } else if (isLast && exists) {
              return prev.map(item => 
                item.path === currentPath ? { ...item, content: content } : item
              );
            }
            return prev;
          });
        });
      };
      reader.readAsText(file);
    });
  };

  const createNewItem = (type: "file" | "folder", parentPath?: string) => {
    const name = prompt(`Enter name for new ${type === "file" ? "file" : "folder"}:`);
    if (!name) return;

    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    
    setProjectItems(prev => {
      if (prev.some(i => i.path === fullPath)) {
        alert("File or folder with this name already exists!");
        return prev;
      }
      
      const newItem: ProjectItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: name,
        type: type,
        path: fullPath,
        content: type === "file" ? "" : undefined,
        language: type === "file" ? name.split('.').pop() : undefined,
        isOpen: true
      };
      return [...prev, newItem];
    });
  };

  const removeItem = (path: string) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    setProjectItems(prev => prev.filter(item => !item.path.startsWith(path)));
  };

  const toggleFolder = (path: string) => {
    setProjectItems(prev => prev.map(item => 
      item.path === path ? { ...item, isOpen: !item.isOpen } : item
    ));
  };

  const handleEditorChange = (value: string | undefined) => {
    if (!activeFileId) return;
    setProjectItems(prev => prev.map(item => 
      item.id === activeFileId ? { ...item, content: value || "" } : item
    ));
  };

  const handleAcceptEdit = (editId: string) => {
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;
    
    const edits = session.pendingEdits || [];
    const edit = edits.find(e => e.id === editId);
    if (!edit) return;

    setProjectItems(prevItems => prevItems.map(item => 
      item.id === edit.fileId ? { ...item, content: edit.newContent } : item
    ));

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          pendingEdits: edits.map(e => 
            e.id === editId ? { ...e, status: "accepted" } : e
          )
        };
      }
      return s;
    }));
  };

  const handleRejectEdit = (editId: string) => {
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;
    
    const edits = session.pendingEdits || [];
    const edit = edits.find(e => e.id === editId);
    if (!edit) return;

    // If it was a new file, remove it from the file system
    if (edit.isNewFile) {
      setProjectItems(prev => prev.filter(item => item.id !== edit.fileId));
      setOpenFileIds(prev => prev.filter(id => id !== edit.fileId));
      if (activeFileId === edit.fileId) setActiveFileId(null);
    }

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          pendingEdits: edits.map(e => 
            e.id === editId ? { ...e, status: "rejected" } : e
          )
        };
      }
      return s;
    }));
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + transcript);
    };
    recognition.start();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !modelId || !currentSessionId) {
      if (!modelId) {
        alert("Please save Model ID from API Settings!");
        setShowApiSettings(true);
      }
      return;
    }
    
    if (provider !== "ollama" && !token) {
      alert("Please save Token from API Settings!");
      setShowApiSettings(true);
      return;
    }

    const currentInput = input;
    setInput("");
    const userMsg: Message = { role: "user", content: currentInput };
    const newMessages = [...messages, userMsg];
    
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: newMessages,
          title: s.messages.length === 0 ? currentInput.slice(0, 30) + (currentInput.length > 30 ? "..." : "") : s.title
        };
      }
      return s;
    }));
    
    setIsLoading(true);

    try {
      if (chatMode === "image") {
        if (provider !== "huggingface") {
          alert("Sorry, image generation is only possible with Hugging Face provider.");
          setIsLoading(false);
          return;
        }
        const hf = new HfInference(token);
        const lowerInput = currentInput.toLowerCase();
        const sensitiveWords = ["nude", "naked", "porn", "sex", "sexy", "nsfw", "bikini", "lingerie", "hentai", "xxx"];
        const publicFigures = ["trump", "biden", "putin", "obama", "modi", "hasina", "musk", "zuckerberg"];
        
        if (sensitiveWords.some(word => lowerInput.includes(word)) || publicFigures.some(person => lowerInput.includes(person))) {
          const botMsg: Message = { 
            role: "assistant", 
            content: "Sorry, I cannot generate this type of image. Please try another prompt." 
          };
          setSessions(prev => prev.map(s => 
            s.id === currentSessionId ? { ...s, messages: [...s.messages, botMsg] } : s
          ));
          setIsLoading(false);
          return;
        }

        const response = await hf.textToImage({
          model: IMAGE_MODEL_ID,
          inputs: currentInput,
        });

        if (!((response as any) instanceof Blob)) throw new Error("Could not generate image.");

        const reader = new FileReader();
        reader.readAsDataURL(response as any);
        reader.onloadend = () => {
          const botMsg: Message = { 
            role: "assistant", 
            content: `I have generated an image for you: "${currentInput}"`,
            type: "image",
            imageUrl: reader.result as string
          };
          setSessions(prev => prev.map(s => 
            s.id === currentSessionId ? { ...s, messages: [...s.messages, botMsg] } : s
          ));
          setIsLoading(false);
        };
        return;
      }

      // --- STEP 1: Context Injection (File Tree, not full content) ---
      const generateFileTreeString = (): string => {
        if (projectItems.length === 0) return "(Empty project)";
        return projectItems.map(f => `${f.type === "folder" ? "📁" : "📄"} ${f.path}`).join("\n");
      };

      const fileTreeContext = `\n\n[PROJECT FILE TREE]\n${generateFileTreeString()}\n[END FILE TREE]`;

      const referencedFileContext = referencedFileIds.length > 0 
        ? "\n\nUser is specifically referring to these files:\n" + 
          projectItems.filter(item => referencedFileIds.includes(item.id)).map(f => {
            return `--- ${f.path} ---\n${f.content || "(empty)"}`;
          }).join("\n\n")
        : "";

      const fullSystemPrompt = SYSTEM_PROMPT + fileTreeContext + referencedFileContext;

      // --- STEP 2 & 3: Agent Loop ---
      let loopMessages = [...newMessages];
      const MAX_AGENT_TURNS = 6;
      let agentTurn = 0;
      let finalParsedMessages: Message[] = [];
      let finalEdits: PendingEdit[] = [];
      let newProjectFiles: ProjectItem[] = [];
      const affectedFileIds: string[] = [];

      agentLoop:
      while (agentTurn < MAX_AGENT_TURNS) {
        agentTurn++;
        let content = "";

        const chatMessages = [
          { role: "system", content: fullSystemPrompt },
          ...loopMessages.map(msg => ({ role: msg.role, content: msg.content }))
        ];

        // --- Call the LLM (all providers) ---
        if (provider === "huggingface") {
          const hf = new HfInference(token);
          try {
            const response = await hf.chatCompletion({
              model: modelId,
              messages: chatMessages,
              max_tokens: maxTokensState,
              temperature: temperature,
            });
            content = response.choices[0].message.content || "";
          } catch (chatError: any) {
            const prompt = fullSystemPrompt + "\n" + loopMessages.map(msg => `${msg.role}: ${msg.content}`).join("\n") + "\nassistant: ";
            const response = await hf.textGeneration({
              model: modelId,
              inputs: prompt,
              parameters: {
                max_new_tokens: maxTokensState,
                temperature: temperature,
                stop: ["user:", "\nuser"],
                // @ts-ignore
                wait_for_model: true,
              },
            });
            content = response.generated_text.split("assistant:").pop()?.trim() || response.generated_text;
          }
        } else if (provider === "openai" || provider === "custom" || provider === "glm" || provider === "agent_router") {
          let apiUrl = "https://api.openai.com/v1/chat/completions";
          if (provider === "custom" && baseUrl) apiUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
          if (provider === "glm") apiUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/chat/completions` : "https://open.bigmodel.cn/api/paas/v4/chat/completions";
          const sanitizedModelId = modelId.trim();

          if (provider === "agent_router") {
            apiUrl = "/api/proxy"; // Route through Next.js backend proxy
            
            const response = await fetch(apiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                targetUrl: "https://agentrouter.org/v1/chat/completions",
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "HTTP-Referer": "https://koragpt.vercel.app", // Required for some proxy/router services
                  "X-Title": "KoraGPT IDE"
                },
                body: {
                  model: sanitizedModelId,
                  messages: chatMessages,
                  max_tokens: maxTokensState,
                  temperature: temperature
                }
              })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message || "Agent Router API Error: " + JSON.stringify(data.error));
            if (!data.choices || !data.choices[0]) throw new Error("Invalid response from Agent Router: " + JSON.stringify(data));
            content = data.choices[0].message.content;
          } else {
            const response = await fetch(apiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                model: sanitizedModelId,
                messages: chatMessages,
                max_tokens: maxTokensState,
                temperature: temperature,
              })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message || "API Error");
            content = data.choices[0].message.content;
          }
        } else if (provider === "anthropic") {
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": token,
              "anthropic-version": "2023-06-01",
              "anthropic-dangerously-allow-browser": "true"
            },
            body: JSON.stringify({
              model: modelId,
              max_tokens: maxTokensState,
              temperature: temperature,
              system: fullSystemPrompt,
              messages: loopMessages.map(msg => ({ role: msg.role === "user" ? "user" : "assistant", content: msg.content }))
            })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message || "Anthropic API Error");
          content = data.content[0].text;
        } else if (provider === "gemini") {
          const sanitizedModelId = modelId.toLowerCase().replace(/[^a-z0-9-.]/g, "-");
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${sanitizedModelId}:generateContent?key=${token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: loopMessages.map(msg => ({
                role: msg.role === "user" ? "user" : "model",
                parts: [{ text: msg.content }]
              })),
              systemInstruction: { parts: [{ text: fullSystemPrompt }] },
              generationConfig: {
                temperature: temperature,
                maxOutputTokens: maxTokensState,
              }
            })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message || "Gemini API Error");
          content = data.candidates[0].content.parts[0].text;
        } else if (provider === "ollama") {
          const apiUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/api/chat` : "http://localhost:11434/api/chat";
          
          try {
            const response = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: modelId,
                messages: chatMessages,
                stream: false,
                options: {
                  temperature: temperature,
                  num_predict: maxTokensState
                }
              })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error || "Ollama API Error");
            content = data.message?.content || "";
          } catch (error) {
            console.error("Local Ollama Error:", error);
            alert("Failed to connect to Ollama. Please set OLLAMA_ORIGINS='https://koragpt.vercel.app' on your PC and restart Ollama.");
            throw error;
          }
        }

        if (!content) throw new Error("No response received from the model.");

        const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        // --- AGENT TOOL: <kora-read> (File Reading) ---
        const readRegex = /<kora-read\s+file="([^"]+)"\s*>\s*<\/kora-read>/g;
        let readMatch;
        const readRequests: { fileName: string }[] = [];
        while ((readMatch = readRegex.exec(cleanContent)) !== null) {
          readRequests.push({ fileName: readMatch[1].trim() });
        }

        if (readRequests.length > 0) {
          // Build tool response and auto-loop
          let toolResponse = "";
          const readActionMessages: Message[] = [];

          for (const req of readRequests) {
            const file = projectItems.find(f => f.path === req.fileName || f.name === req.fileName);
            if (file && file.content !== undefined) {
              toolResponse += `\n[FILE: ${file.path}]\n${file.content}\n[END FILE: ${file.path}]\n`;
              readActionMessages.push({
                role: "assistant",
                content: "",
                type: "file-action",
                fileAction: {
                  fileName: file.path,
                  linesAdded: 0,
                  linesRemoved: 0,
                  action: "reading"
                }
              });
            } else {
              toolResponse += `\n[ERROR: File "${req.fileName}" not found in project.]\n`;
            }
          }

          // Show file-action cards in the chat UI
          if (readActionMessages.length > 0) {
            setSessions(prev => prev.map(s => {
              if (s.id === currentSessionId) {
                return { ...s, messages: [...s.messages, ...readActionMessages] };
              }
              return s;
            }));
          }

          // Append AI's response and tool result to loop context (hidden from user)
          loopMessages.push({ role: "assistant", content: cleanContent });
          loopMessages.push({ role: "user", content: `[SYSTEM TOOL RESULT]\n${toolResponse}\nNow continue your task. Use kora-edit or kora-file to make changes, or provide your answer.` });

          continue agentLoop; // Re-call the LLM with file content
        }

        // --- At this point, AI is done reading and is providing its final answer ---
        let processedContent = cleanContent;

        // Fallback: Smart detection if AI forgets format but provides filename + code block
        const markdownCodeRegex = /([a-zA-Z0-9_.-]+)\s*[:\-]?\s*[\s\S]*?```(?:\w+)?\n([\s\S]*?)```/g;
        let mdMatch;
        while ((mdMatch = markdownCodeRegex.exec(cleanContent)) !== null) {
          const fileName = mdMatch[1].trim();
          const codeContent = mdMatch[2].trim();
          const fileExists = projectItems.find(f => f.name === fileName || f.path === fileName);
          
          if (fileExists && !cleanContent.includes(`<<<<EDIT_START: ${fileName}>>>>`)) {
            const fakeEditBlock = `<<<<EDIT_START: ${fileExists.path}>>>>\n${codeContent}\n<<<<EDIT_END>>>>`;
            processedContent = processedContent.replace(mdMatch[0], fakeEditBlock);
          }
        }

        // --- AGENT TOOL: <kora-edit> (Smart Diff Update) ---
        const koraEditRegex = /<kora-edit\s+file="([^"]+)">\s*<find>([\s\S]*?)<\/find>\s*<replace>([\s\S]*?)<\/replace>\s*<\/kora-edit>/g;
        let koraEditMatch;
        while ((koraEditMatch = koraEditRegex.exec(processedContent)) !== null) {
          const editFileName = koraEditMatch[1].trim();
          const findStr = koraEditMatch[2].trim();
          const replaceStr = koraEditMatch[3].trim();

          const fileToEdit = projectItems.find(f => f.path === editFileName || f.name === editFileName);
          if (fileToEdit && fileToEdit.content !== undefined) {
            if (fileToEdit.content.includes(findStr)) {
              const updatedContent = fileToEdit.content.replace(findStr, replaceStr);
              
              const editId = Math.random().toString(36).substr(2, 9);
              finalEdits.push({
                id: editId,
                fileId: fileToEdit.id,
                originalContent: fileToEdit.content,
                newContent: updatedContent,
                status: "pending",
                isNewFile: false
              });

              affectedFileIds.push(fileToEdit.id);
              
              finalParsedMessages.push({
                role: "assistant",
                content: `Suggested edit for ${fileToEdit.path}`,
                type: "diff",
                editId: editId
              });
            }
          }
          // Replace the raw XML with a clean badge
          processedContent = processedContent.replace(koraEditMatch[0], `\n\n**✏️ Edit Suggested:** \`${editFileName}\`\n\n`);
        }

        // --- <kora-file> (New File Creation or Smart Diff Update) ---
        processedContent = processedContent.replace(/<kora-file name="([^"]+)">([\s\S]*?)<\/kora-file>/g, (_fullMatch, fileName, codeContent) => {
          fileName = fileName.trim();
          codeContent = codeContent.trim();
          
          let existingFile = projectItems.find(item => item.path === fileName || item.name === fileName);
          
          if (existingFile) {
            const editId = Math.random().toString(36).substr(2, 9);
            finalEdits.push({
              id: editId,
              fileId: existingFile.id,
              originalContent: existingFile.content || "",
              newContent: codeContent,
              status: "pending",
              isNewFile: false
            });
            
            affectedFileIds.push(existingFile.id);
            
            finalParsedMessages.push({
              role: "assistant",
              content: `Suggested update for ${existingFile.path}`,
              type: "diff",
              editId: editId
            });
            
            return `\n\n**🔄 Update Suggested:** \`${fileName}\`\n\n`;
          } else {
            const extension = fileName.split('.').pop() || 'txt';
            const newFile: ProjectItem = {
              id: Math.random().toString(36).substr(2, 9),
              name: fileName.split('/').pop() || fileName,
              type: "file",
              path: fileName,
              content: "", // Start with empty content, show new content in PendingEdit
              language: extension,
              isOpen: true
            };
            newProjectFiles.push(newFile);
            affectedFileIds.push(newFile.id);

            const editId = Math.random().toString(36).substr(2, 9);
            finalEdits.push({
              id: editId,
              fileId: newFile.id,
              originalContent: "",
              newContent: codeContent,
              status: "pending",
              isNewFile: true
            });

            finalParsedMessages.push({
              role: "assistant",
              content: `New file created: ${newFile.path}`,
              type: "diff",
              editId: editId
            });
            
            return `\n\n**✨ New File Created:** \`${fileName}\`\n\n`;
          }
        });

        // --- <<<<EDIT_START>>>> (Full File Rewrite) ---
        const editRegex = /<<<<EDIT_START:?\s*(.*?)\s*>>>>([\s\S]*?)<<<<EDIT_END>>>>/gi;
        let match;
        let lastIndex = 0;

        while ((match = editRegex.exec(processedContent)) !== null) {
          const textBefore = processedContent.substring(lastIndex, match.index).trim();
          if (textBefore) finalParsedMessages.push({ role: "assistant", content: textBefore });

          const filePath = match[1].trim();
          const newFileContent = match[2].trim();
          let file = projectItems.find(item => item.path === filePath || item.name === filePath) ||
                     newProjectFiles.find(item => item.path === filePath || item.name === filePath);

          if (!file) {
            const extension = filePath.split('.').pop() || 'txt';
            file = {
              id: Math.random().toString(36).substr(2, 9),
              name: filePath.split('/').pop() || filePath,
              type: "file",
              path: filePath,
              content: "",
              language: extension,
              isOpen: true
            };
            newProjectFiles.push(file);
          }

          const editId = Math.random().toString(36).substr(2, 9);
          finalEdits.push({
            id: editId,
            fileId: file.id,
            originalContent: file.content || "",
            newContent: newFileContent,
            status: "pending",
            isNewFile: file.content === "" || file.content === undefined
          });
          
          finalParsedMessages.push({ 
            role: "assistant", 
            content: `Suggested edit for ${file.path}`,
            type: "diff",
            editId: editId
          });
          
          affectedFileIds.push(file.id);
          lastIndex = editRegex.lastIndex;
        }

        // Apply all state updates at once
        if (newProjectFiles.length > 0) {
          setProjectItems(prev => [...prev, ...newProjectFiles]);
        }
        
        if (affectedFileIds.length > 0) {
          setOpenFileIds(prev => {
            const newOpenIds = [...prev];
            affectedFileIds.forEach(id => {
              if (!newOpenIds.includes(id)) newOpenIds.push(id);
            });
            return newOpenIds;
          });
          setActiveFileId(affectedFileIds[affectedFileIds.length - 1]);
        }

        const remainingText = processedContent.substring(lastIndex).trim();
        if (remainingText && !finalParsedMessages.some(m => m.content === remainingText)) {
          finalParsedMessages.push({ role: "assistant", content: remainingText, isTyping: true });
        }

        // Final response reached — break out of the agent loop
        break agentLoop;
      } // end agentLoop

      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            messages: [...s.messages, ...finalParsedMessages],
            pendingEdits: [...(s.pendingEdits || []), ...finalEdits]
          };
        }
        return s;
      }));
      setReferencedFileIds([]);
    } catch (error: any) {
      let errorMessage = error?.message || "Unknown error";
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages: [...s.messages, { role: "assistant", content: errorMessage }] } : s
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen font-sans overflow-hidden bg-[#0d1117] text-white transition-colors duration-300 dark">
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
          createNewChat={createNewChat}
          projectItems={projectItems}
          toggleFolder={toggleFolder}
          removeItem={removeItem}
          createNewItem={createNewItem}
          setActiveFileId={setActiveFileHandler}
          setReferencedFileIds={setReferencedFileIds}
        activeFileId={activeFileId}
        sessions={sessions}
        setCurrentSessionId={setCurrentSessionId}
        currentSessionId={currentSessionId}
        deleteSession={deleteSession}
        showApiSettings={showApiSettings}
        setShowApiSettings={setShowApiSettings}
        token={token}
        setToken={setToken}
        modelId={modelId}
        setModelId={setModelId}
        provider={provider}
        setProvider={setProvider}
        baseUrl={baseUrl}
        setBaseUrl={setBaseUrl}
        saveSettings={saveSettings}
        fileInputRef={fileInputRef}
        folderInputRef={folderInputRef}
        handleFileUpload={handleFileUpload}
      />

      <div className={`flex-1 overflow-hidden relative ${mobileView === "editor" ? "flex" : "hidden"} md:flex`}>
        <EditorSection 
          activeFile={activeFile}
          openFiles={projectItems.filter(f => openFileIds.includes(f.id))}
          setActiveFileId={setActiveFileHandler}
          closeFile={closeFileHandler}
          getMonacoLanguage={getMonacoLanguage}
          handleEditorChange={handleEditorChange}
          pendingEdits={currentSession?.pendingEdits || []}
          handleAcceptEdit={handleAcceptEdit}
          handleRejectEdit={handleRejectEdit}
        />
        
        {/* Floating action button to go back to chat on mobile */}
        <button 
          onClick={() => setMobileView("chat")}
          className="md:hidden absolute bottom-6 right-6 bg-yellow-500 text-[#0a233b] p-3 rounded-full shadow-lg z-20"
        >
          <span className="text-xl">💬</span>
        </button>
      </div>

      <div className={`${mobileView === "chat" ? "flex" : "hidden"} md:flex w-full md:w-80 lg:w-96 flex-shrink-0 h-full`}>
        <ChatSection 
          messages={messages}
          currentSession={currentSession}
          handleAcceptEdit={handleAcceptEdit}
          handleRejectEdit={handleRejectEdit}
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
          referencedFileIds={referencedFileIds}
          projectItems={projectItems}
          setReferencedFileIds={setReferencedFileIds}
          sendMessage={sendMessage}
          chatMode={chatMode}
          setChatMode={setChatMode}
          toggleListening={toggleListening}
          isListening={isListening}
          input={input}
          setInput={setInput}
          createNewChat={createNewChat}
          setIsSidebarOpen={setIsSidebarOpen}
        />
      </div>
    </div>
  );
}
