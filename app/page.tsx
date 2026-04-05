/**
 * @copyright Copyright (c) 2024 Kora AI. All rights reserved.
 * @license AGPL-3.0
 * @description This file is part of Kora AI - Premium Code Editor.
 * Unauthorized copying, modification, or distribution of this file without the 
 * explicit branding of "Kora AI" is strictly prohibited.
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
  const [token, setToken] = useState<string>("");
  const [modelId, setModelId] = useState<string>("");
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
    const savedToken = localStorage.getItem("hf_token");
    const savedModel = localStorage.getItem("hf_model");
    const savedSessions = localStorage.getItem("hf_sessions");
    const savedItems = localStorage.getItem("hf_project_items");
    const savedTemp = localStorage.getItem("hf_temp");
    const savedMaxTokens = localStorage.getItem("hf_max_tokens");

    if (savedToken) setToken(savedToken);
    if (savedModel) setModelId(savedModel);
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
    if (!token || !modelId) {
      alert("দয়া করে টোকেন এবং মডেল আইডি দিন!");
      return;
    }
    localStorage.setItem("hf_token", token);
    localStorage.setItem("hf_model", modelId);
    localStorage.setItem("hf_temp", temperature.toString());
    localStorage.setItem("hf_max_tokens", maxTokensState.toString());
    alert("সেটিংস সেভ হয়েছে!");
  };

  const createNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: "নতুন চ্যাট",
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
    const name = prompt(`নতুন ${type === "file" ? "ফাইলের" : "ফোল্ডারের"} নাম দিন:`);
    if (!name) return;

    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    
    setProjectItems(prev => {
      if (prev.some(i => i.path === fullPath)) {
        alert("এই নামে অলরেডি ফাইল বা ফোল্ডার আছে!");
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
    if (!confirm("আপনি কি নিশ্চিতভাবে এটি ডিলিট করতে চান?")) return;
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
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const edits = s.pendingEdits || [];
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
      alert("আপনার ব্রাউজার ভয়েস ইনপুট সাপোর্ট করে না।");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'bn-BD';
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
    if (!input.trim() || !token || !modelId || !currentSessionId) {
      if (!token || !modelId) {
        alert("API Settings থেকে টোকেন এবং মডেল আইডি সেভ করুন!");
        setShowApiSettings(true);
      }
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
      const hf = new HfInference(token);
      
      if (chatMode === "image") {
        const lowerInput = currentInput.toLowerCase();
        const sensitiveWords = ["nude", "naked", "porn", "sex", "sexy", "nsfw", "bikini", "lingerie", "hentai", "xxx"];
        const publicFigures = ["trump", "biden", "putin", "obama", "modi", "hasina", "musk", "zuckerberg"];
        
        if (sensitiveWords.some(word => lowerInput.includes(word)) || publicFigures.some(person => lowerInput.includes(person))) {
          const botMsg: Message = { 
            role: "assistant", 
            content: "দুঃখিত, আমি এই ধরনের ছবি তৈরি করতে পারি না। দয়া করে অন্য কোনো প্রম্পট চেষ্টা করুন।" 
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

        if (!((response as any) instanceof Blob)) throw new Error("ইমেজ জেনারেট করা সম্ভব হয়নি।");

        const reader = new FileReader();
        reader.readAsDataURL(response as any);
        reader.onloadend = () => {
          const botMsg: Message = { 
            role: "assistant", 
            content: `আমি আপনার জন্য একটি ছবি তৈরি করেছি: "${currentInput}"`,
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

      let content = "";
      const projectFileContext = projectItems.length > 0 ? "\n\nProject Structure & Files:\n" + projectItems
          .filter(item => item.type === "file")
          .map(f => `--- FILE: ${f.path} ---\n${f.content}`)
          .join("\n\n") : "";

      const referencedFileContext = referencedFileIds.length > 0 ? "\n\nUser is specifically referring to these files:\n" + 
          projectItems.filter(item => referencedFileIds.includes(item.id)).map(f => f.path).join(", ") : "";

      const fullSystemPrompt = projectFileContext + referencedFileContext + "\n\n" + SYSTEM_PROMPT;

      const chatMessages = [
        { role: "system", content: fullSystemPrompt },
        ...newMessages.map(msg => ({ role: msg.role, content: msg.content }))
      ];

      try {
        const response = await hf.chatCompletion({
          model: modelId,
          messages: chatMessages,
          max_tokens: maxTokensState,
          temperature: temperature,
        });
        content = response.choices[0].message.content || "";
      } catch (chatError: any) {
        const prompt = fullSystemPrompt + "\n" + newMessages.map(msg => `${msg.role}: ${msg.content}`).join("\n") + "\nassistant: ";
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

      if (!content) throw new Error("মডেল থেকে কোনো উত্তর পাওয়া যায়নি।");

      const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      
      // ১. স্মার্ট ডিটেকশন (fallback): এআই যদি নির্দিষ্ট ফরম্যাট ভুলে যায় কিন্তু ফাইল নেম এবং কোড ব্লক দেয়
      let processedContent = cleanContent;
      const markdownCodeRegex = /([a-zA-Z0-9_.-]+)\s*[:\-]?\s*[\s\S]*?```(?:\w+)?\n([\s\S]*?)```/g;
      let mdMatch;
      while ((mdMatch = markdownCodeRegex.exec(cleanContent)) !== null) {
        const fileName = mdMatch[1].trim();
        const codeContent = mdMatch[2].trim();
        const fileExists = projectItems.find(f => f.name === fileName || f.path === fileName);
        
        // যদি ফাইলটি প্রোজেক্টে থাকে এবং ইতিমধ্যে EDIT_START ফরম্যাটে না থাকে
        if (fileExists && !cleanContent.includes(`<<<<EDIT_START: ${fileName}>>>>`)) {
          const fakeEditBlock = `<<<<EDIT_START: ${fileExists.path}>>>>\n${codeContent}\n<<<<EDIT_END>>>>`;
          // কন্টেন্টে রিপ্লেস করা (সতর্কতা: এটি সিম্পল রিপ্লেসমেন্ট)
          processedContent = processedContent.replace(mdMatch[0], fakeEditBlock);
        }
      }

      // ২. এডিট ব্লক পার্স করা (মোর ফ্লেক্সিবল রিজেক্স)
      const editRegex = /<<<<EDIT_START:?\s*(.*?)\s*>>>>([\s\S]*?)<<<<EDIT_END>>>>/gi;
      let match;
      const parsedMessages: Message[] = [];
      let lastIndex = 0;
      const newEdits: PendingEdit[] = [];

      while ((match = editRegex.exec(processedContent)) !== null) {
        const textBefore = processedContent.substring(lastIndex, match.index).trim();
        if (textBefore) parsedMessages.push({ role: "assistant", content: textBefore });

        const filePath = match[1].trim();
        const newFileContent = match[2].trim();
        const file = projectItems.find(item => item.path === filePath || item.name === filePath);

        if (file) {
          const editId = Math.random().toString(36).substr(2, 9);
          newEdits.push({
            id: editId,
            fileId: file.id,
            originalContent: file.content || "",
            newContent: newFileContent,
            status: "pending"
          });
          parsedMessages.push({ 
            role: "assistant", 
            content: `Suggested edit for ${file.path}`,
            type: "diff",
            editId: editId
          });
          setActiveFileId(file.id);
        }
        lastIndex = editRegex.lastIndex;
      }

      const remainingText = processedContent.substring(lastIndex).trim();
      if (remainingText || parsedMessages.length === 0) {
        parsedMessages.push({ role: "assistant", content: remainingText || processedContent, isTyping: true });
      }

      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            messages: [...s.messages, ...parsedMessages],
            pendingEdits: [...(s.pendingEdits || []), ...newEdits]
          };
        }
        return s;
      }));
      setReferencedFileIds([]);
    } catch (error: any) {
      let errorMessage = error?.message || "অজানা সমস্যা";
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages: [...s.messages, { role: "assistant", content: errorMessage }] } : s
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen font-sans overflow-hidden bg-[#0d1117] text-white transition-colors duration-300 dark">
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
        saveSettings={saveSettings}
        fileInputRef={fileInputRef}
        folderInputRef={folderInputRef}
        handleFileUpload={handleFileUpload}
      />

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
      />
    </div>
  );
}
