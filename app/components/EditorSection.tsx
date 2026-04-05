/**
 * @copyright Copyright (c) 2024 Kora AI. All rights reserved.
 * @license AGPL-3.0
 * @description This file is part of Kora AI - Premium Code Editor.
 * Unauthorized copying, modification, or distribution of this file without the 
 * explicit branding of "Kora AI" is strictly prohibited.
 */

import React, { useState, useEffect } from "react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { File, Bot, Check, X, Undo, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectItem, PendingEdit } from "../types";

interface EditorSectionProps {
  activeFile: ProjectItem | undefined;
  openFiles: ProjectItem[];
  setActiveFileId: (id: string) => void;
  closeFile: (id: string, e?: React.MouseEvent) => void;
  getMonacoLanguage: (ext: string | undefined) => string;
  handleEditorChange: (value: string | undefined) => void;
  pendingEdits: PendingEdit[];
  handleAcceptEdit: (editId: string) => void;
  handleRejectEdit: (editId: string) => void;
}

export const EditorSection = ({
  activeFile,
  openFiles,
  setActiveFileId,
  closeFile,
  getMonacoLanguage,
  handleEditorChange,
  pendingEdits,
  handleAcceptEdit,
  handleRejectEdit,
}: EditorSectionProps) => {
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  const activePendingEdit = activeFile 
    ? pendingEdits.find(e => e.fileId === activeFile.id && e.status === "pending")
    : null;

  const handleAccept = () => {
    if (activePendingEdit) {
      handleAcceptEdit(activePendingEdit.id);
      setShowSuccessMsg(true);
      setTimeout(() => setShowSuccessMsg(false), 3000);
    }
  };

  // Generate breadcrumbs from file path
  const renderBreadcrumbs = () => {
    if (!activeFile) return null;
    const parts = activeFile.path.split('/');
    return (
      <div className="flex items-center text-[11px] text-gray-500 font-mono overflow-hidden whitespace-nowrap">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="w-3 h-3 mx-0.5 opacity-50 flex-shrink-0" />}
            <span className={cn(
              "truncate hover:text-gray-300 transition-colors cursor-default",
              index === parts.length - 1 ? "text-gray-300" : ""
            )}>
              {part}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] border-r border-gray-800 min-w-0">
      
      {/* File Tabs */}
      <div className="flex bg-[#181818] border-b border-gray-800 overflow-x-auto custom-scrollbar h-9 flex-shrink-0">
        {openFiles.length === 0 ? (
          <div className="flex-1" /> // Empty space if no tabs
        ) : (
          openFiles.map(file => (
            <div 
              key={file.id}
              onClick={() => setActiveFileId(file.id)}
              className={cn(
                "flex items-center gap-2 px-3 min-w-[120px] max-w-[200px] border-r border-gray-800 cursor-pointer group transition-colors select-none",
                activeFile?.id === file.id 
                  ? "bg-[#1e1e1e] border-t-2 border-t-blue-500 text-blue-400" 
                  : "bg-[#2d2d2d] text-gray-400 hover:bg-[#252525]"
              )}
            >
              <File className={cn("w-3.5 h-3.5 flex-shrink-0", activeFile?.id === file.id ? "text-blue-400" : "text-gray-500")} />
              <span className="text-[11px] font-mono truncate flex-1">{file.name}</span>
              <button 
                onClick={(e) => closeFile(file.id, e)}
                className={cn(
                  "p-0.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-700 transition-all",
                  activeFile?.id === file.id ? "opacity-100" : ""
                )}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Editor Header / Breadcrumbs & Actions */}
      <div className="h-8 bg-[#1e1e1e] flex items-center px-4 justify-between relative shadow-sm z-10 flex-shrink-0">
        
        {/* Success Message Toast */}
        {showSuccessMsg && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 flex items-center gap-2 bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded shadow-lg text-[11px] font-medium animate-in slide-in-from-top-2">
            <Check className="w-3.5 h-3.5" />
            Changes were successfully applied. Please confirm.
          </div>
        )}

        <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
          {renderBreadcrumbs()}
        </div>
        
        <div className="flex items-center gap-4 flex-shrink-0">
          {activePendingEdit && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleRejectEdit(activePendingEdit.id)}
                className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white rounded border border-gray-700 transition-all"
              >
                <Undo className="w-3 h-3" />
                Undo
              </button>
              <button 
                onClick={handleAccept}
                className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium bg-blue-600 text-white hover:bg-blue-500 rounded transition-all"
              >
                Keep
                <Check className="w-3 h-3 ml-0.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Monaco Editor Area */}
      <div className="flex-1 relative min-h-0">
        {activeFile ? (
          activePendingEdit ? (
            <DiffEditor
              height="100%"
              theme="vs-dark"
              language={getMonacoLanguage(activeFile.language)}
              original={activePendingEdit.originalContent}
              modified={activePendingEdit.newContent}
              options={{
                fontSize: 14,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 20 },
                renderSideBySide: true,
                readOnly: true,
                originalEditable: false,
                fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
              }}
            />
          ) : (
            <Editor
              height="100%"
              theme="vs-dark"
              language={getMonacoLanguage(activeFile.language)}
              value={activeFile.content}
              onChange={handleEditorChange}
              options={{
                fontSize: 14,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 20 },
                formatOnPaste: true,
                formatOnType: true,
                tabSize: 2,
                cursorBlinking: "smooth",
                smoothScrolling: true,
                fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
              }}
              onMount={(editor, monaco) => {
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                  alert("File saved locally (auto-sync is on)");
                });
                
                // Track cursor position
                editor.onDidChangeCursorPosition((e) => {
                  setCursorPosition({ line: e.position.lineNumber, column: e.position.column });
                });
              }}
            />
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 bg-[#1e1e1e]">
            <Bot className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-sm font-medium">এডিট করার জন্য একটি ফাইল সিলেক্ট করুন</p>
          </div>
        )}
      </div>

      {/* Status Bar */}
      {activeFile && (
        <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[10px] font-mono flex-shrink-0 select-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
              <Check className="w-3 h-3" /> 0 Errors
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
              Ln {cursorPosition.line}, Col {cursorPosition.column}
            </span>
            <span className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer">
              UTF-8
            </span>
            <span className="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer uppercase">
              {activeFile.language || "Plain Text"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

