import React, { useEffect, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastNotificationProps {
  message: string | null;
  sender: string | null;
  onDismiss: () => void;
}

export const LiveToastNotification: React.FC<ToastNotificationProps> = ({ message, sender, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for fade out animation
      }, 4000); // 4 seconds before auto-dismiss
      
      return () => clearTimeout(timer);
    }
  }, [message, onDismiss]);

  if (!message && !isVisible) return null;

  return (
    <div
      className={cn(
        "absolute top-16 right-4 z-50 max-w-[280px] w-auto shadow-[0_8px_30px_rgb(0,0,0,0.5)] rounded-2xl border border-gray-700/50 bg-[#0d1117]/80 backdrop-blur-xl p-3.5 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
        isVisible 
          ? "translate-y-0 opacity-100 scale-100" 
          : "-translate-y-6 opacity-0 scale-95 pointer-events-none"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-full"></div>
          <div className="relative flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-400/30 flex items-center justify-center shadow-inner">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[11px] font-bold text-gray-200 truncate pr-2">{sender || "Community Member"}</p>
            <span className="text-[9px] text-blue-400 font-medium px-1.5 py-0.5 bg-blue-500/10 rounded-md whitespace-nowrap">New</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onDismiss, 500);
          }}
          className="flex-shrink-0 -mr-1 -mt-1 p-1 text-gray-500 hover:text-white hover:bg-gray-800/50 rounded-full transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
