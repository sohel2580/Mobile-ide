/**
 * @copyright Copyright (c) 2026 Taskkora. All rights reserved.
 * @license AGPL-3.0
 * @description This file is part of Kora AI - Premium Code Editor, a product of the Taskkora ecosystem.
 * Unauthorized copying, modification, or distribution of this file without the 
 * explicit branding of "Taskkora" is strictly prohibited.
 */

import React, { RefObject, useEffect, useState, useRef } from "react";
import { Bot, Plus, User, File, X, ImageIcon, MicOff, Mic, Send, Users, Menu } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { TypewriterText } from "./TypewriterText";
import { CodeBlock } from "./CodeBlock";
import { DiffView } from "./DiffView";
import { Message, ChatSession, ProjectItem } from "../types";

interface ChatSectionProps {
  messages: Message[];
  currentSession: ChatSession | undefined;
  handleAcceptEdit: (editId: string) => void;
  handleRejectEdit: (editId: string) => void;
  isLoading: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  referencedFileIds: string[];
  projectItems: ProjectItem[];
  setReferencedFileIds: (updater: (prev: string[]) => string[]) => void;
  sendMessage: (e: React.FormEvent) => void;
  chatMode: "chat" | "image";
  setChatMode: (mode: "chat" | "image") => void;
  toggleListening: () => void;
  isListening: boolean;
  input: string;
  setInput: (input: string) => void;
  createNewChat: () => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export const ChatSection = ({
  messages,
  currentSession,
  handleAcceptEdit,
  handleRejectEdit,
  isLoading,
  messagesEndRef,
  referencedFileIds,
  projectItems,
  setReferencedFileIds,
  sendMessage,
  chatMode,
  setChatMode,
  toggleListening,
  isListening,
  input,
  setInput,
  createNewChat,
  setIsSidebarOpen,
}: ChatSectionProps) => {
  const [stats, setStats] = useState({ active: 1, total: 1 });
  const clientIdRef = useRef<string>("");

  useEffect(() => {
    let storedId = localStorage.getItem("kora_client_id");
    if (!storedId) {
      storedId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("kora_client_id", storedId);
    }
    clientIdRef.current = storedId;

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: clientIdRef.current })
        });
        if (res.ok) {
          const data = await res.json();
          setStats({ active: data.activeUsers, total: data.totalUsers });
        }
      } catch (e) {
        console.error("Failed to fetch stats:", e);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex flex-col h-full bg-[#0d1117] relative flex-shrink-0 border-l border-gray-800">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#0a233b]/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-1.5 -ml-2 text-gray-400 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-yellow-400" />
            <h2 className="text-sm font-bold text-gray-200">KoraGPT Chat</h2>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-700/50 px-2.5 py-1 rounded-full shadow-inner">
            <div className="flex items-center gap-1.5" title="Live Active Users">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
              <span className="text-[9px] font-medium text-green-400">{stats.active}</span>
            </div>
            <div className="w-px h-3 bg-gray-700"></div>
            <div className="flex items-center gap-1" title="Total Users">
              <Users className="w-2.5 h-2.5 text-gray-400" />
              <span className="text-[9px] font-medium text-gray-400">{stats.total}</span>
            </div>
          </div>

          <button onClick={createNewChat} className="p-1 text-gray-400 hover:text-white transition-colors" title="New Chat">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto w-full scroll-smooth custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
             <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                <span className="text-xl">🤖</span>
             </div>
             <h2 className="text-lg font-bold text-white mb-2">Start Chatting</h2>
             <p className="text-xs text-gray-400 leading-relaxed">Ask to edit code or ask any question.</p>
          </div>
        ) : (
          <div className="flex flex-col pb-32">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={cn(
                  "px-4 py-6 border-b transition-colors",
                  msg.role === "assistant" ? "bg-gray-900/30 border-gray-800" : "bg-transparent border-transparent"
                )}
              >
                <div className="flex gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center shadow-lg relative group/avatar",
                    msg.role === "user" ? "bg-blue-600" : "bg-yellow-400"
                  )}>
                    {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-[#0a233b]" />}
                  </div>
                  <div className="flex-1 text-gray-200 text-xs leading-relaxed overflow-hidden">
                    {msg.type === "diff" && msg.editId ? (
                      (() => {
                        const edits = currentSession?.pendingEdits || [];
                        const edit = edits.find(e => e.id === msg.editId);
                        const file = projectItems.find(f => f.id === edit?.fileId);
                        return edit && file ? (
                          <DiffView 
                            filePath={file.path}
                            original={edit.originalContent}
                            modified={edit.newContent}
                            status={edit.status}
                            onOpenDiff={() => {
                              // We just need to set the active file, EditorSection will handle showing the diff
                              const fileInput = document.querySelector(`[data-file-id="${file.id}"]`) as HTMLElement;
                              if (fileInput) fileInput.click();
                            }}
                          />
                        ) : null;
                      })()
                    ) : msg.role === "assistant" && msg.isTyping ? (
                      <TypewriterText content={msg.content} />
                    ) : (
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || "");
                            const language = match ? match[1] : "";
                            const value = String(children).replace(/\n$/, "");

                            return !inline ? (
                              <CodeBlock language={language} value={value} />
                            ) : (
                              <code className="bg-gray-800 px-1 py-0.5 rounded text-[10px] font-mono text-yellow-400" {...props}>
                                {children}
                              </code>
                            );
                          },
                          p: ({ children }) => <div className="mb-2 last:mb-0">{children}</div>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="px-4 py-6 bg-gray-900/30">
                <div className="flex gap-3 animate-pulse">
                  <div className="w-7 h-7 bg-yellow-400/50 rounded-lg" />
                  <div className="flex-1 h-4 bg-gray-800 rounded mt-2" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#0d1117] via-[#0d1117]/95 to-transparent pt-8 pb-4 px-4">
        {referencedFileIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 px-1">
            {referencedFileIds.map(id => {
              const file = projectItems.find(f => f.id === id);
              return file ? (
                <div key={id} className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md text-[10px] text-blue-400">
                  <File className="w-3 h-3" />
                  <span className="truncate max-w-[100px]">{file.name}</span>
                  <button onClick={() => setReferencedFileIds(prev => prev.filter(fid => fid !== id))} className="hover:text-white transition-colors">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : null;
            })}
          </div>
        )}
        <form 
          onSubmit={sendMessage} 
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const data = e.dataTransfer.getData("text/plain");
            if (data && data.startsWith("file_id:")) {
              const id = data.replace("file_id:", "");
              setReferencedFileIds(prev => prev.includes(id) ? prev : [...prev, id]);
            }
          }}
          className="relative flex items-center bg-gray-900 border border-gray-800 shadow-xl rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 transition-all"
        >
          <button
            type="button"
            onClick={() => setChatMode(chatMode === "chat" ? "image" : "chat")}
            className={cn(
              "ml-2 p-1.5 rounded-lg transition-all duration-300 flex items-center justify-center",
              chatMode === "image" 
                ? "bg-yellow-400 text-[#0a233b] shadow-inner" 
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            )}
            title={chatMode === "chat" ? "Image Generation Mode" : "Chat Mode"}
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleListening}
            className={cn(
              "ml-1 p-1.5 rounded-lg transition-all duration-300 flex items-center justify-center",
              isListening 
                ? "bg-red-500 text-white animate-pulse shadow-lg" 
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            )}
            title="Voice Input"
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
            }}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            rows={1}
            className="w-full py-3 pl-2 pr-10 text-xs text-gray-200 bg-transparent focus:outline-none resize-none overflow-y-auto max-h-36 leading-relaxed scrollbar-hide"
            placeholder={chatMode === "chat" ? "Ask Kora AI..." : "Describe the image..."}
          />
          <button type="submit" disabled={isLoading || !input.trim()} className="absolute right-2 p-1.5 bg-yellow-400 text-[#0a233b] rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-30">
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
