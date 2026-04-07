import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  isSelf: boolean;
}

interface CommunityChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
}

export const CommunityChatPanel: React.FC<CommunityChatPanelProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
}) => {
  const [input, setInput] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Close panel on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Allow clicking inside the panel or on the toggle button
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest("[data-community-toggle]")
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute top-14 right-4 z-50 w-72 sm:w-80 max-h-96 flex flex-col shadow-2xl rounded-xl border border-gray-700 bg-[#0d1117]/95 backdrop-blur-md transition-all duration-200 transform origin-top-right",
        isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#0a233b]/40 rounded-t-xl">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold text-gray-200">Community Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
          title="Close chat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-[200px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 gap-2">
            <MessageSquare className="w-8 h-8 opacity-20" />
            <p className="text-[11px]">No messages yet.<br/>Say hi to the community!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col max-w-[85%]",
                msg.isSelf ? "items-end ml-auto" : "items-start"
              )}
            >
              <span className="text-[9px] text-gray-500 mb-0.5 px-1">
                {msg.isSelf ? "You" : msg.sender}
              </span>
              <div
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs leading-relaxed break-words",
                  msg.isSelf
                    ? "bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-tr-none"
                    : "bg-gray-800/50 border border-gray-700/50 text-gray-200 rounded-tl-none"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/50 rounded-b-xl">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-gray-900 border border-gray-700 text-xs text-gray-200 rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-shadow placeholder:text-gray-600"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-1.5 p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-md transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
