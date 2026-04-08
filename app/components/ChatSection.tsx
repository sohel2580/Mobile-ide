/**
 * @copyright Copyright (c) 2026 Taskkora. All rights reserved.
 * @license AGPL-3.0
 * @description This file is part of Kora AI - Premium Code Editor, a product of the Taskkora ecosystem.
 * Unauthorized copying, modification, or distribution of this file without the 
 * explicit branding of "Taskkora" is strictly prohibited.
 */

import React, { Dispatch, RefObject, SetStateAction, useEffect, useState, useRef } from "react";
import { Plus, User, File, Folder, X, ImageIcon, MicOff, Mic, Send, Users, Menu, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Pusher from "pusher-js";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { TypewriterText } from "./TypewriterText";
import { CodeBlock } from "./CodeBlock";
import { DiffView } from "./DiffView";
import { Message, ChatSession, ProjectItem } from "../types";
import { LiveToastNotification } from "./LiveToastNotification";
import { CommunityChatPanel } from "./CommunityChatPanel";

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
  setInput: Dispatch<SetStateAction<string>>;
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
  const [mentionIndex, setMentionIndex] = useState(0);

  const mentionMatch = input.match(/(?:^|\s)@([^\s@]*)$/);
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : null;
  const mentionCandidates = mentionQuery !== null
    ? projectItems
        .filter((item) => (item.path || item.name).toLowerCase().includes(mentionQuery))
        .slice(0, 8)
    : [];

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionQuery]);

  const selectMention = (itemId: string) => {
    const item = projectItems.find((candidate) => candidate.id === itemId);
    if (!item) return;
    setReferencedFileIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
    setInput((prev) => prev.replace(/@([^\s@]*)$/, `@${item.path || item.name} `));
  };

  // Community Chat State
  const [isCommunityChatOpen, setIsCommunityChatOpen] = useState(false);
  const [communityMessages, setCommunityMessages] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<{ content: string; sender: string } | null>(null);

  // Initialize Pusher and Fetch Initial Messages
  useEffect(() => {
    // Ensure clientId is set first
    let storedId = localStorage.getItem("kora_client_id");
    if (!storedId) {
      storedId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("kora_client_id", storedId);
    }
    clientIdRef.current = storedId;

    // Fetch initial messages from MongoDB (to show history on load)
    const fetchMessages = async () => {
      try {
        const res = await fetch("/api/community-chat");
        if (res.ok) {
          const data = await res.json();
          // Map backend data to UI expected format
          const formattedMessages = data.map((msg: any) => ({
            id: msg.id || msg._id,
            sender: msg.sender,
            content: msg.content,
            timestamp: new Date(msg.timestamp || Date.now()),
            isSelf: msg.clientId === clientIdRef.current,
          }));
          setCommunityMessages(formattedMessages);
        }
      } catch (error) {
        console.error("Failed to load community messages:", error);
      }
    };
    fetchMessages();

    // Initialize Pusher Client using environment variables
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (pusherKey && pusherCluster) {
      const pusher = new Pusher(pusherKey, { cluster: pusherCluster });
      const channel = pusher.subscribe("community-chat");

      channel.bind("new-message", (data: any) => {
        // Prevent duplicating own message if already added optimistically
        if (data.clientId === clientIdRef.current) return;

        const newMsg = {
          id: data.id,
          sender: data.sender,
          content: data.content,
          timestamp: new Date(data.timestamp),
          isSelf: false,
        };

        setCommunityMessages((prev) => {
          // Double check it's not already there to prevent duplicates
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Show toast notification if panel is closed
        setIsCommunityChatOpen((currentOpenState) => {
          if (!currentOpenState) {
            setToastMessage({ content: newMsg.content, sender: newMsg.sender });
          }
          return currentOpenState;
        });
      });

      // Cleanup subscription when component unmounts
      return () => {
        channel.unbind_all();
        pusher.unsubscribe("community-chat");
        pusher.disconnect();
      };
    } else {
      console.warn("Pusher keys are missing. Real-time chat will not work.");
    }
  }, []);

  const handleSendCommunityMessage = async (content: string) => {
    // 1. Optimistic UI Update for snappy feel
    const optimisticMsg = {
      id: Math.random().toString(36).substring(2, 9), // Temporary ID
      sender: "You",
      content,
      timestamp: new Date(),
      isSelf: true,
      clientId: clientIdRef.current, // Used by Pusher client to ignore self
    };
    setCommunityMessages((prev) => [...prev, optimisticMsg]);

    // 2. Send to Backend without awaiting (fire and forget)
    fetch("/api/pusher/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: "User" + clientIdRef.current.substring(0, 3), // Generate a dummy name
        content,
        clientId: clientIdRef.current,
      }),
    }).catch((error) => {
      console.error("Failed to send message to Pusher API:", error);
    });
  };

  useEffect(() => {
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
      <header className="flex items-center justify-between px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3 border-b border-gray-800 bg-[#0a233b]/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden -ml-2 min-w-10 min-h-10 p-2 text-gray-300 hover:text-white transition-colors touch-manipulation relative z-20 pointer-events-auto"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Image src="/koragpt.png" alt="KoraGPT Logo" width={18} height={18} className="rounded-sm" />
            <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <span>KoraGPT Chat</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                Beta
              </span>
            </h2>
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

          <div className="relative">
            <button 
              data-community-toggle
              onClick={() => setIsCommunityChatOpen(!isCommunityChatOpen)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                isCommunityChatOpen ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              )}
              title="Community Chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <CommunityChatPanel 
              isOpen={isCommunityChatOpen}
              onClose={() => setIsCommunityChatOpen(false)}
              messages={communityMessages}
              onSendMessage={handleSendCommunityMessage}
            />
          </div>

          <button onClick={createNewChat} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-md transition-colors" title="New Chat">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </header>

      <LiveToastNotification 
        message={toastMessage?.content || null} 
        sender={toastMessage?.sender || null} 
        onDismiss={() => setToastMessage(null)} 
      />

      <div className="flex-1 overflow-y-auto w-full scroll-smooth custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
             <div className="w-12 h-12 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                <Image src="/koragpt.png" alt="KoraGPT Logo" width={28} height={28} className="rounded-md" />
             </div>
             <h2 className="text-lg font-bold text-white mb-2">Start Chatting</h2>
             <p className="text-xs text-gray-400 leading-relaxed">Ask to edit code or ask any question.</p>
          </div>
        ) : (
          <div className="flex flex-col pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-32">
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
                    {msg.role === "user" ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Image src="/koragpt.png" alt="KoraGPT Logo" width={16} height={16} className="rounded-sm" />
                    )}
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

      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#0d1117] via-[#0d1117]/95 to-transparent pt-8 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4 px-4">
        {referencedFileIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 px-1">
            {referencedFileIds.map(id => {
              const file = projectItems.find(f => f.id === id);
              return file ? (
                <div key={id} className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md text-[10px] text-blue-400">
                  {file.type === "folder" ? <Folder className="w-3 h-3" /> : <File className="w-3 h-3" />}
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
              if (mentionCandidates.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIndex((prev) => (prev + 1) % mentionCandidates.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIndex((prev) => (prev - 1 + mentionCandidates.length) % mentionCandidates.length);
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  selectMention(mentionCandidates[mentionIndex].id);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setInput((prev) => prev.replace(/@([^\s@]*)$/, ""));
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            rows={1}
            className="w-full py-3 pl-2 pr-10 text-xs text-gray-200 bg-transparent focus:outline-none resize-none overflow-y-auto max-h-36 leading-relaxed scrollbar-hide"
            placeholder={chatMode === "chat" ? "Ask Kora AI..." : "Describe the image..."}
          />
          {mentionCandidates.length > 0 && (
            <div className="absolute bottom-[110%] left-2 right-2 z-20 max-h-48 overflow-y-auto rounded-lg border border-gray-700 bg-[#111827] p-1 shadow-2xl">
              {mentionCandidates.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs",
                    index === mentionIndex ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800"
                  )}
                  onClick={() => selectMention(item.id)}
                >
                  {item.type === "folder" ? <Folder className="w-3.5 h-3.5 text-yellow-400" /> : <File className="w-3.5 h-3.5 text-blue-400" />}
                  <span className="truncate">{item.path || item.name}</span>
                </button>
              ))}
            </div>
          )}
          <button type="submit" disabled={isLoading || !input.trim()} className="absolute right-2 p-1.5 bg-yellow-400 text-[#0a233b] rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-30">
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
