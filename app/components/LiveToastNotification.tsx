import React, { useEffect, useState } from "react";
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
        "absolute top-16 right-4 z-50 max-w-[220px] w-auto shadow-[0_0_15px_rgba(34,197,94,0.5)] rounded-lg border border-green-500 bg-black/90 backdrop-blur-xl px-4 py-2 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
        isVisible 
          ? "translate-y-0 opacity-100 scale-100" 
          : "-translate-y-6 opacity-0 scale-95 pointer-events-none"
      )}
    >
      <div className="flex items-center justify-center">
        <p className="text-xs font-medium text-green-400 leading-relaxed text-center break-words">{message}</p>
      </div>
    </div>
  );
};
