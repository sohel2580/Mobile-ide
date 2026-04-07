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
        "absolute top-14 right-4 z-50 max-w-[280px] sm:max-w-xs w-full shadow-2xl rounded-xl border border-gray-700 bg-[#0d1117]/95 backdrop-blur-md p-3 transition-all duration-300 transform",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-200 truncate">{sender || "Community Member"}</p>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300);
          }}
          className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
