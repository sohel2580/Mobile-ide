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
import { TopMenuBar } from "./components/TopMenuBar";
import { LiveToastNotification } from "./components/LiveToastNotification";
import { ProjectItem, ChatSession, Message, PendingEdit } from "./types";
import { ClipboardState } from "./components/ProjectTree";
import { IMAGE_MODEL_ID, SYSTEM_PROMPT, MONACO_LANGUAGE_MAPPING } from "./constants";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const createId = () => Math.random().toString(36).slice(2, 11);

const cloneItem = (item: ProjectItem): ProjectItem => ({
  ...item,
  children: (item.children || []).map(cloneItem),
});

const flattenTree = (items: ProjectItem[], parentPath = ""): ProjectItem[] => {
  const output: ProjectItem[] = [];
  for (const item of items) {
    const path = parentPath ? `${parentPath}/${item.name}` : item.name;
    const normalized: ProjectItem = {
      ...item,
      path,
      language: item.type === "file" ? (item.language || item.name.split(".").pop() || "txt") : undefined,
    };
    output.push(normalized);
    if (item.type === "folder") {
      output.push(...flattenTree(item.children || [], path));
    }
  }
  return output;
};

const findNodeById = (items: ProjectItem[], id: string): ProjectItem | null => {
  for (const item of items) {
    if (item.id === id) return item;
    const found = findNodeById(item.children || [], id);
    if (found) return found;
  }
  return null;
};

const updateNodeById = (items: ProjectItem[], id: string, updater: (item: ProjectItem) => ProjectItem): ProjectItem[] =>
  items.map((item) => {
    if (item.id === id) return updater(item);
    if (item.children?.length) {
      return { ...item, children: updateNodeById(item.children, id, updater) };
    }
    return item;
  });

const removeNodeById = (items: ProjectItem[], id: string): ProjectItem[] =>
  items
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      children: item.children ? removeNodeById(item.children, id) : [],
    }));

const isDescendant = (items: ProjectItem[], parentId: string, candidateId: string): boolean => {
  const parent = findNodeById(items, parentId);
  if (!parent) return false;
  const walk = (node: ProjectItem): boolean => {
    if (node.id === candidateId) return true;
    return (node.children || []).some(walk);
  };
  return (parent.children || []).some(walk);
};

export default function ChatApp() {
  const [provider, setProvider] = useState<string>("huggingface");
  const [token, setToken] = useState<string>("");
  const [modelId, setModelId] = useState<string>("");
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [chatMode, setChatMode] = useState<"chat" | "image">("chat");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardState>({ item: null, action: "copy" });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastErrorMessage, setToastErrorMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [tabs, setTabs] = useState<string[]>([]);
  const [referencedFileIds, setReferencedFileIds] = useState<string[]>([]);
  const [showApiSettings, setShowApiSettings] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokensState, setMaxTokensState] = useState<number>(4000);

  const [mobileView, setMobileView] = useState<"chat" | "editor">("chat");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const flatProjectItems = flattenTree(projectItems);
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];
  const activeFile = flatProjectItems.find(item => item.id === activeFileId);

  const setActiveFileHandler = (id: string) => {
    setActiveFileId(id);
    if (!tabs.includes(id)) {
      setTabs(prev => [...prev, id]);
    }
    if (window.innerWidth < 768) {
      setMobileView("editor");
      setIsSidebarOpen(false);
    }
  };

  const closeFileHandler = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTabs(prev => {
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

    const apiSettingsRaw = localStorage.getItem("api_settings");
    if (apiSettingsRaw) {
      try {
        const parsed = JSON.parse(apiSettingsRaw) as { provider?: string; apiKey?: string; modelId?: string };
        // Prevent stale OpenRouter api_settings from overriding the selected provider.
        if (parsed.provider === "openrouter" && savedProvider === "openrouter") {
          if (parsed.apiKey) setToken(parsed.apiKey);
          if (parsed.modelId) setModelId(parsed.modelId);
          setProvider("openrouter");
        }
      } catch {
        // Ignore invalid api_settings
      }
    }
    if (savedItems) {
      try {
        const parsed = JSON.parse(savedItems) as ProjectItem[];
        setProjectItems(parsed);
      } catch {
        setProjectItems([]);
      }
    }

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
    const timer = window.setTimeout(() => {
      localStorage.setItem("hf_project_items", JSON.stringify(projectItems));
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [projectItems]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getMonacoLanguage = (ext: string | undefined) => {
    if (!ext) return "plaintext";
    return MONACO_LANGUAGE_MAPPING[ext.toLowerCase()] || "plaintext";
  };

  const saveSettings = () => {
    // For Agent Router, users may leave token empty to use built-in keys (daily-limited).
    if (provider !== "ollama" && provider !== "agent_router" && !token) {
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
    if (provider === "openrouter") {
      const apiSettings = {
        provider: "openrouter",
        apiKey: token,
        modelId,
      };
      localStorage.setItem("api_settings", JSON.stringify(apiSettings));
    } else {
      // Clear stale OpenRouter settings so they don't override the UI provider on refresh.
      localStorage.removeItem("api_settings");
    }
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, targetFolderId?: string | null) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const relativePath = (file as any).webkitRelativePath || file.name;
        const parts = relativePath.split("/").filter(Boolean);

        setProjectItems((prev) => {
          const next = [...prev];
          let currentLevel = next;
          let parentId: string | null = null;
          let currentPath = "";

          if (targetFolderId) {
            const targetNode = findNodeById(next, targetFolderId);
            const targetPath = flattenTree(next).find((node) => node.id === targetFolderId)?.path || "";
            if (targetNode && targetNode.type === "folder") {
              targetNode.children = targetNode.children || [];
              currentLevel = targetNode.children;
              parentId = targetNode.id;
              currentPath = targetPath;
            }
          }

          parts.forEach((part: string, index: number) => {
            const isLeaf = index === parts.length - 1;
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            let existing = currentLevel.find((item) => item.name === part && item.parentId === parentId);

            if (!existing) {
              existing = {
                id: createId(),
                name: part,
                type: isLeaf ? "file" : "folder",
                parentId,
                path: currentPath,
                content: isLeaf ? content : undefined,
                language: isLeaf ? (part.split(".").pop() || "txt") : undefined,
                isOpen: true,
                children: isLeaf ? [] : [],
              };
              currentLevel.push(existing);
            } else if (isLeaf && existing.type === "file") {
              existing.content = content;
            }

            if (existing.type === "folder") {
              existing.children = existing.children || [];
              currentLevel = existing.children;
              parentId = existing.id;
            }
          });

          return next;
        });
      };
      reader.readAsText(file);
    });
  };

  const createNewItem = (type: "file" | "folder", parentId?: string | null) => {
    const name = prompt(`Enter name for new ${type}:`);
    if (!name?.trim()) return;
    const newItem: ProjectItem = {
      id: createId(),
      name: name.trim(),
      type,
      parentId: parentId || null,
      path: name.trim(),
      content: type === "file" ? "" : undefined,
      language: type === "file" ? (name.split(".").pop() || "txt") : undefined,
      children: type === "folder" ? [] : [],
      isOpen: true,
    };

    setProjectItems((prev) => {
      if (!parentId) return [...prev, newItem];
      return updateNodeById(prev, parentId, (node) => ({
        ...node,
        isOpen: true,
        children: [...(node.children || []), newItem],
      }));
    });
  };

  const renameItem = (id: string, nextName: string) => {
    setProjectItems((prev) => updateNodeById(prev, id, (item) => ({ ...item, name: nextName })));
  };

  const removeItem = (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    setProjectItems((prev) => removeNodeById(prev, id));
    setTabs((prev) => prev.filter((tabId) => tabId !== id));
    if (activeFileId === id) setActiveFileId(null);
  };

  const toggleFolder = (id: string) => {
    setProjectItems((prev) => updateNodeById(prev, id, (item) => ({ ...item, isOpen: !item.isOpen })));
  };

  const handleEditorChange = (value: string | undefined) => {
    if (!activeFileId) return;
    setProjectItems((prev) => updateNodeById(prev, activeFileId, (item) => ({ ...item, content: value || "" })));
  };

  const handleAcceptEdit = (editId: string) => {
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session) return;
    
    const edits = session.pendingEdits || [];
    const edit = edits.find(e => e.id === editId);
    if (!edit) return;

    setProjectItems((prevItems) => updateNodeById(prevItems, edit.fileId, (item) => ({ ...item, content: edit.newContent })));

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
      setTabs(prev => prev.filter(id => id !== edit.fileId));
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

  const copyItem = (id: string) => {
    const item = findNodeById(projectItems, id);
    if (!item) return;
    setClipboard({ item: cloneItem(item), action: "copy" });
  };

  const cutItem = (id: string) => {
    const item = findNodeById(projectItems, id);
    if (!item) return;
    setClipboard({ item: cloneItem(item), action: "cut" });
  };

  const pasteIntoFolder = (folderId: string) => {
    if (!clipboard.item) return;
    const clipboardItem = clipboard.item;
    setProjectItems((prev) => {
      const folder = findNodeById(prev, folderId);
      if (!folder || folder.type !== "folder") return prev;

      let source: ProjectItem = clipboardItem;
      let next = prev;
      if (clipboard.action === "cut") {
        if (source.id === folderId || isDescendant(prev, source.id, folderId)) return prev;
        next = removeNodeById(prev, source.id);
      } else {
        source = cloneItem({ ...clipboardItem, id: createId() });
      }

      source.parentId = folderId;
      const merged = updateNodeById(next, folderId, (node) => ({
        ...node,
        isOpen: true,
        children: [...(node.children || []), source],
      }));
      return merged;
    });
    if (clipboard.action === "cut") setClipboard({ item: null, action: "copy" });
  };

  const shareFileToChat = (id: string) => {
    const file = flatProjectItems.find((item) => item.id === id && item.type === "file");
    if (!file) return;
    setReferencedFileIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setInput((prev) => {
      const prefix = prev.trim() ? `${prev}\n` : "";
      return `${prefix}I need help with this file:\n@${file.path}`;
    });
    if (window.innerWidth < 768) setMobileView("chat");
  };

  const downloadFile = (id: string) => {
    const file = flatProjectItems.find((item) => item.id === id && item.type === "file");
    if (!file) return;
    const blob = new Blob([file.content || ""], { type: "text/plain;charset=utf-8" });
    saveAs(blob, file.name);
  };

  const runFileInConsole = (id: string) => {
    const file = flatProjectItems.find((item) => item.id === id && item.type === "file");
    if (!file) return;
    const logMessage: Message = {
      role: "assistant",
      content: `Console run requested for \`${file.name}\`.\n\n${file.content || ""}`,
    };
    setSessions((prev) => prev.map((session) => (
      session.id === currentSessionId ? { ...session, messages: [...session.messages, logMessage] } : session
    )));
  };

  const addNodeToZip = (zip: JSZip, node: ProjectItem, parentPath = "") => {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    if (node.type === "folder") {
      if (node.name === "node_modules" || node.name === ".git") return;
      const folder = zip.folder(currentPath);
      (node.children || []).forEach((child) => {
        if (folder) addNodeToZip(zip, child, currentPath);
      });
      return;
    }
    zip.file(currentPath, node.content || "");
  };

  const downloadFolder = async (id: string) => {
    const folder = findNodeById(projectItems, id);
    if (!folder || folder.type !== "folder") return;
    const zip = new JSZip();
    addNodeToZip(zip, folder);
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, `${folder.name}.zip`);
  };

  const downloadProject = async () => {
    const zip = new JSZip();
    projectItems.forEach((item) => addNodeToZip(zip, item));
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "kora-project.zip");
  };

  const moveByDragDrop = (draggedId: string, folderId: string) => {
    if (draggedId === folderId) return;
    setProjectItems((prev) => {
      const dragged = findNodeById(prev, draggedId);
      const folder = findNodeById(prev, folderId);
      if (!dragged || !folder || folder.type !== "folder") return prev;
      if (isDescendant(prev, draggedId, folderId)) return prev;
      const withoutDragged = removeNodeById(prev, draggedId);
      const moved = { ...cloneItem(dragged), parentId: folderId };
      return updateNodeById(withoutDragged, folderId, (node) => ({
        ...node,
        isOpen: true,
        children: [...(node.children || []), moved],
      }));
    });
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
    
    if (provider !== "ollama" && provider !== "agent_router" && !token) {
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
        if (flatProjectItems.length === 0) return "(Empty project)";
        return flatProjectItems.map(f => `${f.type === "folder" ? "📁" : "📄"} ${f.path}`).join("\n");
      };

      const fileTreeContext = `\n\n[PROJECT FILE TREE]\n${generateFileTreeString()}\n[END FILE TREE]`;

      const referencedFileContext = referencedFileIds.length > 0 
        ? "\n\nUser is specifically referring to these files:\n" + 
          flatProjectItems.filter(item => referencedFileIds.includes(item.id)).map(f => {
            if (f.type === "folder") {
              return `--- [FOLDER] ${f.path} ---\nUse this folder as context for related files.`;
            }
            return `--- ${f.path} ---\n${f.content || "(empty)"}`;
          }).join("\n\n")
        : "";

      const fullSystemPrompt = SYSTEM_PROMPT + fileTreeContext + referencedFileContext;

      // --- STEP 2 & 3: Agent Loop ---
      let loopMessages = [...newMessages];
      const MAX_AGENT_TURNS = provider === "openrouter" ? 1 : 6;
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
        } else if (provider === "openai" || provider === "custom" || provider === "glm" || provider === "agent_router" || provider === "openrouter") {
          let apiUrl = "https://api.openai.com/v1/chat/completions";
          if (provider === "custom" && baseUrl) apiUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
          if (provider === "glm") apiUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/chat/completions` : "https://open.bigmodel.cn/api/paas/v4/chat/completions";
          const sanitizedModelId = modelId.trim();

          if (provider === "agent_router") {
            const userApiKey = token.trim();
            const usingBuiltInKeys = !userApiKey;

            const today = (() => {
              const now = new Date();
              const yyyy = now.getFullYear();
              const mm = String(now.getMonth() + 1).padStart(2, "0");
              const dd = String(now.getDate()).padStart(2, "0");
              return `${yyyy}-${mm}-${dd}`;
            })();

            const readLocalUsage = (): { date: string; count: number } => {
              const raw = localStorage.getItem("koragpt_agent_usage");
              if (!raw) return { date: today, count: 0 };
              try {
                const parsed = JSON.parse(raw) as { date?: string; count?: number };
                if (parsed?.date !== today) return { date: today, count: 0 };
                return {
                  date: today,
                  count: typeof parsed.count === "number" ? parsed.count : 0,
                };
              } catch {
                return { date: today, count: 0 };
              }
            };

            const updateLocalUsage = (usage: { date: string; count: number }) => {
              localStorage.setItem("koragpt_agent_usage", JSON.stringify(usage));
            };

            let pendingUsageToIncrement: { date: string; count: number } | null = null;

            // Daily free limit only applies to built-in keys (when userApiKey is empty).
            if (usingBuiltInKeys) {
              const usage = readLocalUsage();
              if (usage.count >= 4) {
                setToastErrorMessage(
                  "Daily limit of 4 free messages reached. Please add your own Agent Router API Key in settings."
                );
                return;
              }
              pendingUsageToIncrement = usage;
            }

            // Read OpenAI-style SSE stream and stitch it into a final text response.
            const readAgentRouterSSE = async (stream: ReadableStream<Uint8Array>): Promise<string> => {
              const decoder = new TextDecoder("utf-8");
              let buffer = "";
              let result = "";
              const reader = stream.getReader();

              while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // SSE: parse line-by-line.
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;

                  const dataStr = trimmed.replace(/^data:\s*/, "");
                  if (!dataStr) continue;

                  if (dataStr === "[DONE]") return result;

                  try {
                    const json = JSON.parse(dataStr) as any;
                    const delta = json?.choices?.[0]?.delta;
                    const piece: string | undefined = delta?.content ?? delta?.reasoning_content ?? delta?.text;
                    if (piece) result += piece;
                  } catch {
                    // Ignore non-JSON SSE chunks.
                  }
                }
              }

              return result;
            };

            const response = await fetch("/api/agent-router", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: chatMessages,
                modelId: sanitizedModelId,
                userApiKey,
                // Prefer non-stream JSON in production for stability.
                stream: false,
              }),
            });

            if (!response.ok) {
              // Try to parse structured proxy error.
              let message = `Agent Router request failed (HTTP ${response.status}).`;
              try {
                const data = await response.json();
                message =
                  data?.error?.message ||
                  data?.error?.raw?.message ||
                  data?.message ||
                  message;
              } catch {
                const text = await response.text().catch(() => "");
                if (text) message = text;
              }
              setToastErrorMessage(message);
              throw new Error(message);
            }

            const contentType = response.headers.get("content-type") || "";

            // Fallback: if upstream returns non-SSE JSON, parse it.
            if (contentType.includes("application/json")) {
              const data = await response.json().catch(() => null) as any;
              const msg = data?.choices?.[0]?.message;
              content =
                msg?.content ||
                msg?.reasoning_content ||
                data?.choices?.[0]?.text ||
                data?.error?.message ||
                "";
            } else {
              if (!response.body) {
                throw new Error("Agent Router streaming response missing response body.");
              }
              content = await readAgentRouterSSE(response.body);
            }

            // Increment free-tier usage only after we got a non-empty response.
            if (usingBuiltInKeys && pendingUsageToIncrement && content.trim()) {
              updateLocalUsage({ ...pendingUsageToIncrement, count: pendingUsageToIncrement.count + 1 });
            }
          } else if (provider === "openrouter") {
            let apiKeyToUse = token;
            let modelIdToUse = sanitizedModelId;
            const stored = localStorage.getItem("api_settings");
            if (stored) {
              try {
                const parsed = JSON.parse(stored) as { provider?: string; apiKey?: string; modelId?: string };
                if (parsed.provider === "openrouter") {
                  if (parsed.apiKey) apiKeyToUse = parsed.apiKey;
                  if (parsed.modelId) modelIdToUse = parsed.modelId;
                }
              } catch {
                // ignore invalid api_settings
              }
            }

            if (!apiKeyToUse || !modelIdToUse) {
              throw new Error("Please configure your OpenRouter API Key and Model ID in the settings first.");
            }

            // Use server-side proxy to avoid browser CORS/provider restrictions.
            apiUrl = "/api/openrouter";

            const response = await fetch(apiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                apiKey: apiKeyToUse,
                model: modelIdToUse,
                messages: chatMessages,
              }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
              const message =
                (data && (data.error?.message || data.error)) ||
                `OpenRouter request failed (HTTP ${response.status})`;
              throw new Error(typeof message === "string" ? message : JSON.stringify(message));
            }
            if (data?.error) {
              const message = data.error?.message || data.error || "OpenRouter API Error";
              throw new Error(typeof message === "string" ? message : JSON.stringify(message));
            }
            content = data?.choices?.[0]?.message?.content || "";
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

        const stripped = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        const cleanContent = stripped || content.trim();

        // OpenRouter should be a single-turn chat completion (avoid multi-turn tool loops).
        if (provider === "openrouter") {
          finalParsedMessages.push({ role: "assistant", content: cleanContent, isTyping: true });
          break agentLoop;
        }

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
            const file = flatProjectItems.find(f => f.path === req.fileName || f.name === req.fileName);
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
          const fileExists = flatProjectItems.find(f => f.name === fileName || f.path === fileName);
          
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

          const fileToEdit = flatProjectItems.find(f => f.path === editFileName || f.name === editFileName);
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
          
          let existingFile = flatProjectItems.find(item => item.path === fileName || item.name === fileName);
          
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
              id: createId(),
              name: fileName.split('/').pop() || fileName,
              type: "file",
              parentId: null,
              path: fileName,
              content: "", // Start with empty content, show new content in PendingEdit
              language: extension,
              isOpen: true,
              children: [],
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
          let file = flatProjectItems.find(item => item.path === filePath || item.name === filePath) ||
                     newProjectFiles.find(item => item.path === filePath || item.name === filePath);

          if (!file) {
            const extension = filePath.split('.').pop() || 'txt';
            file = {
              id: createId(),
              name: filePath.split('/').pop() || filePath,
              type: "file",
              parentId: null,
              path: filePath,
              content: "",
              language: extension,
              isOpen: true,
              children: [],
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
          setTabs(prev => {
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
      if (provider === "agent_router") {
        setToastErrorMessage(errorMessage);
      }
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages: [...s.messages, { role: "assistant", content: errorMessage }] } : s
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] md:h-screen font-sans overflow-hidden bg-[#0d1117] text-white transition-colors duration-300 dark relative">
      <LiveToastNotification
        message={toastErrorMessage}
        sender={null}
        onDismiss={() => setToastErrorMessage(null)}
        variant="error"
      />
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
          renameItem={renameItem}
          clipboard={clipboard}
          copyItem={copyItem}
          cutItem={cutItem}
          pasteIntoFolder={pasteIntoFolder}
          shareFileToChat={shareFileToChat}
          downloadFile={downloadFile}
          runFileInConsole={runFileInConsole}
          downloadFolder={downloadFolder}
          downloadProject={downloadProject}
          moveByDragDrop={moveByDragDrop}
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

      <div className={`flex-1 overflow-hidden relative flex-col ${mobileView === "editor" ? "flex" : "hidden"} md:flex`}>
        <TopMenuBar
          onNewFile={() => createNewItem("file")}
          onNewFolder={() => createNewItem("folder")}
          onDownloadProject={downloadProject}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        <div className="flex-1 min-h-0 flex">
          <EditorSection 
            activeFile={activeFile}
            openFiles={flatProjectItems.filter(f => tabs.includes(f.id))}
            setActiveFileId={setActiveFileHandler}
            closeFile={closeFileHandler}
            getMonacoLanguage={getMonacoLanguage}
            handleEditorChange={handleEditorChange}
            pendingEdits={currentSession?.pendingEdits || []}
            handleAcceptEdit={handleAcceptEdit}
            handleRejectEdit={handleRejectEdit}
          />
        </div>
        
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
          projectItems={flatProjectItems}
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
