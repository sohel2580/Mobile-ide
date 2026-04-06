/**
 * @copyright Copyright (c) 2026 Taskkora. All rights reserved.
 * @license AGPL-3.0
 * @description This file is part of Kora AI - Premium Code Editor, a product of the Taskkora ecosystem.
 * Unauthorized copying, modification, or distribution of this file without the 
 * explicit branding of "Taskkora" is strictly prohibited.
 */

import React, { RefObject, useState, useEffect } from "react";
import { Bot, Plus, X, FilePlus, FolderPlus, Plus as PlusIcon, Folder, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectTree } from "./ProjectTree";
import { ProjectItem, ChatSession } from "../types";

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  createNewChat: () => void;
  projectItems: ProjectItem[];
  toggleFolder: (path: string) => void;
  removeItem: (path: string) => void;
  createNewItem: (type: "file" | "folder", parentPath?: string) => void;
  setActiveFileId: (id: string) => void;
  setReferencedFileIds: (updater: (prev: string[]) => string[]) => void;
  activeFileId: string | null;
  sessions: ChatSession[];
  setCurrentSessionId: (id: string) => void;
  currentSessionId: string | null;
  deleteSession: (id: string, e: React.MouseEvent) => void;
  showApiSettings: boolean;
  setShowApiSettings: (show: boolean) => void;
  token: string;
  setToken: (token: string) => void;
  modelId: string;
  setModelId: (modelId: string) => void;
  provider: string;
  setProvider: (provider: string) => void;
  baseUrl: string;
  setBaseUrl: (baseUrl: string) => void;
  saveSettings: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  folderInputRef: RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Sidebar = ({
  isSidebarOpen,
  setIsSidebarOpen,
  createNewChat,
  projectItems,
  toggleFolder,
  removeItem,
  createNewItem,
  setActiveFileId,
  setReferencedFileIds,
  activeFileId,
  sessions,
  setCurrentSessionId,
  currentSessionId,
  deleteSession,
  showApiSettings,
  setShowApiSettings,
  token,
  setToken,
  modelId,
  setModelId,
  provider,
  setProvider,
  baseUrl,
  setBaseUrl,
  saveSettings,
  fileInputRef,
  folderInputRef,
  handleFileUpload,
}: SidebarProps) => {
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const fetchOllamaModels = async () => {
    if (provider !== "ollama") return;
    setIsLoadingModels(true);
    try {
      const url = baseUrl ? `${baseUrl.replace(/\/$/, '')}/api/tags` : "http://localhost:11434/api/tags";
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          setOllamaModels(data.models.map((m: any) => m.name));
          if (data.models.length > 0 && !modelId) {
            setModelId(data.models[0].name);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch Ollama models:", error);
      alert("Failed to connect to Ollama. Please set OLLAMA_ORIGINS='https://koragpt.vercel.app' on your PC and restart Ollama.");
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    if (provider === "ollama" && showApiSettings) {
      fetchOllamaModels();
    }
  }, [provider, showApiSettings, baseUrl]);
  return (
    <>
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden transition-all duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={cn(
        "fixed md:relative inset-y-0 left-0 w-64 bg-[#0a233b] text-white flex flex-col h-full border-r border-gray-800 shadow-2xl z-30 transition-transform duration-300 ease-in-out flex-shrink-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-4 border-b border-gray-700 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-yellow-400 tracking-wider flex items-center gap-2">
              <Bot className="w-6 h-6" /> KoraGPT
            </h1>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <button 
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 bg-transparent border border-gray-600 hover:border-yellow-400 hover:text-yellow-400 transition-all py-2 rounded-xl text-xs font-medium group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> New Chat
          </button>
        </div>

        {/* Project Explorer Section */}
        <div className="p-4 border-b border-gray-700 flex flex-col gap-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Explorer</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => createNewItem("file")} className="p-1 text-gray-400 hover:text-blue-400 transition-colors" title="New File">
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => createNewItem("folder")} className="p-1 text-gray-400 hover:text-yellow-400 transition-colors" title="New Folder">
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="p-1 text-gray-400 hover:text-green-400 transition-colors" title="Upload File">
                <PlusIcon className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => folderInputRef.current?.click()} className="p-1 text-gray-400 hover:text-orange-400 transition-colors" title="Upload Folder">
                <Folder className="w-3.5 h-3.5" />
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" accept=".js,.ts,.jsx,.tsx,.py,.html,.css,.json,.md,.txt,.c,.cpp,.java,.go,.php,.rb" />
            <input type="file" ref={folderInputRef} onChange={handleFileUpload} className="hidden" 
              // @ts-ignore
              webkitdirectory="" 
              // @ts-ignore
              directory="" 
            />
          </div>
          
          <div className="max-h-64 overflow-y-auto custom-scrollbar -ml-2">
            {projectItems.length === 0 ? (
              <p className="text-[10px] text-gray-500 italic text-center py-2">Empty</p>
            ) : (
              <ProjectTree 
                items={projectItems} 
                onToggle={toggleFolder} 
                onRemove={removeItem} 
                onCreate={createNewItem}
                onFileSelect={setActiveFileId}
                onAddToContext={(id) => setReferencedFileIds(prev => prev.includes(id) ? prev : [...prev, id])}
                activeFileId={activeFileId}
              />
            )}
          </div>
        </div>

        {/* Recent Chats Section */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Recent</h2>
            <div className="space-y-1">
               {sessions.map((s) => (
                 <div 
                   key={s.id}
                   onClick={() => setCurrentSessionId(s.id)}
                   className={cn(
                     "group p-2 rounded-lg cursor-pointer truncate transition-all flex items-center justify-between",
                     currentSessionId === s.id 
                       ? "bg-gray-700/50 text-white" 
                       : "text-gray-400 hover:text-gray-200"
                   )}
                 >
                   <span className="truncate text-[11px]">{s.title}</span>
                   <button onClick={(e) => deleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400">
                     <X className="w-3 h-3" />
                   </button>
                 </div>
               ))}
            </div>
        </div>

        {/* API Settings Section */}
        <div className="p-4 border-t border-gray-700 bg-[#071829]/50">
          <button 
            onClick={() => setShowApiSettings(!showApiSettings)} 
            className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors py-2 text-xs"
          >
            API Settings {showApiSettings ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          
          {showApiSettings && (
            <div className="mt-4 space-y-4 animate-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 ml-1">API Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition-all"
                >
                  <option value="huggingface">Hugging Face</option>
                  <option value="openai">OpenAI (ChatGPT)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="glm">GLM (ZhipuAI)</option>
                  <option value="ollama">Ollama (Local)</option>
                  <option value="custom">Custom (OpenAI Compatible)</option>
                </select>
              </div>
              
              {provider !== "ollama" && (
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 ml-1">API Key / Token</label>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 placeholder-gray-600 transition-all"
                    placeholder={provider === "huggingface" ? "hf_..." : "sk-..."}
                  />
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-gray-400 ml-1">Model ID</label>
                  {provider === "ollama" && (
                    <button 
                      onClick={fetchOllamaModels} 
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      disabled={isLoadingModels}
                    >
                      <RefreshCw className={cn("w-3 h-3", isLoadingModels && "animate-spin")} /> 
                      {isLoadingModels ? "Refreshing..." : "Refresh"}
                    </button>
                  )}
                </div>
                
                {provider === "ollama" && ollamaModels.length > 0 ? (
                  <select
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition-all"
                  >
                    <option value="" disabled>Select a model</option>
                    {ollamaModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 placeholder-gray-600 transition-all"
                    placeholder={
                      provider === "huggingface" ? "meta-llama/Llama-3.2-3B-Instruct" :
                      provider === "openai" ? "gpt-4o" :
                      provider === "anthropic" ? "claude-3-5-sonnet-20241022" :
                      provider === "gemini" ? "gemini-1.5-pro" :
                      provider === "glm" ? "glm-4" :
                      provider === "ollama" ? "llama3" :
                      "model-name"
                    }
                  />
                )}
              </div>

              {(provider === "custom" || provider === "ollama" || provider === "glm") && (
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 ml-1">Base URL {provider === "ollama" ? "(Optional, default: http://localhost:11434)" : ""}</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 placeholder-gray-600 transition-all"
                    placeholder={
                      provider === "ollama" ? "http://localhost:11434" :
                      provider === "glm" ? "https://open.bigmodel.cn/api/paas/v4" :
                      "https://api.example.com/v1"
                    }
                  />
                </div>
              )}

              <button
                onClick={saveSettings}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-[#0a233b] font-bold py-2.5 rounded-xl transition-all shadow-lg active:scale-95 text-xs"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
