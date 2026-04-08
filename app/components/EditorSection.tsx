/**
 * @copyright Copyright (c) 2026 Taskkora. All rights reserved.
 * @license AGPL-3.0
 * @description This file is part of Kora AI - Premium Code Editor, a product of the Taskkora ecosystem.
 * Unauthorized copying, modification, or distribution of this file without the 
 * explicit branding of "Taskkora" is strictly prohibited.
 */

import React, { useState, useEffect, useRef } from "react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { File, Check, X, ChevronRight } from "lucide-react";
import { emmetCSS, emmetHTML } from "emmet-monaco-es";
import html2canvas from "html2canvas";
import type * as Monaco from "monaco-editor";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ProjectItem, PendingEdit } from "../types";
import { NewsTicker } from "./NewsTicker";

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
  const [isEditorContextMenuOpen, setIsEditorContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [hasSelectedText, setHasSelectedText] = useState(false);
  const [snapshotHtml, setSnapshotHtml] = useState("");
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState(false);
  const diffNavigatorRef = useRef<{ next: () => void } | null>(null);
  const editorInstanceRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoInstanceRef = useRef<typeof Monaco | null>(null);
  const snapshotCardRef = useRef<HTMLDivElement | null>(null);
  const enhancementInitializedRef = useRef(false);
  const enhancementDisposersRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    const closeContextMenu = () => setIsEditorContextMenuOpen(false);
    window.addEventListener("click", closeContextMenu);
    return () => window.removeEventListener("click", closeContextMenu);
  }, []);

  useEffect(() => {
    return () => {
      enhancementDisposersRef.current.forEach((dispose) => dispose());
      enhancementDisposersRef.current = [];
      enhancementInitializedRef.current = false;
    };
  }, []);

  const updateSelectionState = () => {
    const editor = editorInstanceRef.current;
    if (!editor) {
      setHasSelectedText(false);
      return;
    }
    const model = editor.getModel();
    const selection = editor.getSelection();
    if (!model || !selection) {
      setHasSelectedText(false);
      return;
    }
    const selectedText = model.getValueInRange(selection).trim();
    setHasSelectedText(selectedText.length > 0);
  };

  const captureSelectedCodeSnapshot = async () => {
    const editor = editorInstanceRef.current;
    const monaco = monacoInstanceRef.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    const selection = editor.getSelection();
    if (!model || !selection) return;

    const selectedText = model.getValueInRange(selection);
    if (!selectedText.trim()) return;

    const language = model.getLanguageId();
    const colorizedHtml = await monaco.editor.colorize(selectedText, language, {});
    setSnapshotHtml(colorizedHtml);
    setIsCapturingSnapshot(true);
    setIsEditorContextMenuOpen(false);

    window.requestAnimationFrame(() => {
      window.setTimeout(async () => {
        if (!snapshotCardRef.current) {
          setIsCapturingSnapshot(false);
          return;
        }

        const canvas = await html2canvas(snapshotCardRef.current, {
          backgroundColor: null,
          scale: 2,
        });
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "KoraGPT-Snippet.png";
        link.click();
        setIsCapturingSnapshot(false);
      }, 80);
    });
  };

  const initializeEditorEnhancements = (monaco: typeof Monaco) => {
    if (enhancementInitializedRef.current) return;
    enhancementInitializedRef.current = true;

    const emmetHtmlDisposer = emmetHTML(monaco, ["html"]);
    const emmetCssDisposer = emmetCSS(monaco, ["css", "scss", "less"]);
    enhancementDisposersRef.current.push(emmetHtmlDisposer, emmetCssDisposer);

    const createSnippetProvider = (
      language: string,
      snippets: Array<{ label: string; insertText: string; detail: string }>
    ) => {
      const provider = monaco.languages.registerCompletionItemProvider(language, {
        provideCompletionItems(model, position) {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          return {
            suggestions: snippets.map((snippet) => ({
              label: snippet.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: snippet.insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: snippet.detail,
              detail: snippet.detail,
              range,
            })),
          };
        },
      });

      enhancementDisposersRef.current.push(() => provider.dispose());
    };

    const jsTsSnippets = [
      {
        label: "clg",
        detail: "Console log",
        insertText: "console.log($1);",
      },
      {
        label: "rfc",
        detail: "React Functional Component",
        insertText: "export default function ${1:ComponentName}() {\n\treturn (\n\t\t<div>\n\t\t\t$0\n\t\t</div>\n\t);\n}",
      },
      {
        label: "uses",
        detail: "React useState",
        insertText: "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialState});",
      },
      {
        label: "imp",
        detail: "Named import",
        insertText: "import { $1 } from '$2';",
      },
    ];

    const pythonSnippets = [
      {
        label: "def",
        detail: "Python function",
        insertText: "def ${1:function_name}(${2:args}):\n\t${0:pass}",
      },
      {
        label: "class",
        detail: "Python class",
        insertText: "class ${1:ClassName}:\n\tdef __init__(self, ${2:args}):\n\t\t${0:pass}",
      },
      {
        label: "ifmain",
        detail: "Python main guard",
        insertText: "if __name__ == \"__main__\":\n\t${0:main()}",
      },
    ];

    createSnippetProvider("javascript", jsTsSnippets);
    createSnippetProvider("typescript", jsTsSnippets);
    createSnippetProvider("javascriptreact", jsTsSnippets);
    createSnippetProvider("python", pythonSnippets);
  };

  const registerSnapshotShortcut = (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyS,
      () => {
        const model = editor.getModel();
        const selection = editor.getSelection();
        const text = model && selection ? model.getValueInRange(selection).trim() : "";
        if (text) {
          void captureSelectedCodeSnapshot();
        }
      }
    );
  };

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
          {/* Action buttons removed in favor of floating overlay */}
        </div>
      </div>

      {/* Monaco Editor Area */}
      <div className="flex-1 relative min-h-0">
        {/* Hidden snapshot card for image capture */}
        {isCapturingSnapshot && (
          <div className="fixed -left-[9999px] top-0 z-[-1]">
            <div
              ref={snapshotCardRef}
              className="p-10 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #4f46e5 100%)",
              }}
            >
              <div
                className="w-[900px] rounded-xl shadow-2xl overflow-hidden"
                style={{
                  backgroundColor: "#0d1117",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="h-10 px-4 flex items-center" style={{ backgroundColor: "#161b22" }}>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                    <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                  </div>
                </div>
                <div
                  className="p-6 text-[14px] leading-6 font-mono whitespace-pre-wrap"
                  style={{ color: "#f3f4f6" }}
                  dangerouslySetInnerHTML={{ __html: snapshotHtml }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Floating Accept/Reject Overlay */}
        {activePendingEdit && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-[#2d2d2d]/90 backdrop-blur-md border border-blue-500/30 px-4 py-2 rounded-full shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-2 mr-2 pr-3 border-r border-gray-700">
              <Image src="/koragpt.png" alt="KoraGPT Logo" width={16} height={16} className="rounded-sm" />
              <span className="text-[11px] font-semibold text-gray-200 uppercase tracking-wider">AI Suggestion</span>
            </div>
            <button 
              onClick={() => handleRejectEdit(activePendingEdit.id)}
              className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full border border-red-500/20 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </button>
            <button 
              onClick={handleAccept}
              className="flex items-center gap-1.5 px-4 py-1 text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-500 rounded-full shadow-lg shadow-blue-600/20 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Accept
            </button>
          </div>
        )}

        {activeFile ? (
          activePendingEdit ? (
            activePendingEdit.isNewFile ? (
              /* For new files, show a regular editor with the new content, but keep the overlay */
              <div className="h-full relative">
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language={getMonacoLanguage(activeFile.language)}
                  value={activePendingEdit.newContent}
                  onMount={(_editor, monaco) => initializeEditorEnhancements(monaco)}
                  options={{
                    fontSize: 14,
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 20 },
                    readOnly: true,
                    fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
                  }}
                />
              </div>
            ) : (
              <div className="h-full relative group">
                <DiffEditor
                  height="100%"
                  theme="vs-dark"
                  language={getMonacoLanguage(activeFile.language)}
                  original={activePendingEdit.originalContent}
                  modified={activePendingEdit.newContent}
                  onMount={(editor, monaco) => {
                    initializeEditorEnhancements(monaco);
                    // Modern Monaco versions handle diff navigation directly via editor commands
                    // or via the DiffEditor API, createDiffNavigator is deprecated/removed in newer versions.
                    
                    // We can implement a simple "next change" logic manually using the editor's line changes
                    const navigateToNextChange = () => {
                      const changes = editor.getLineChanges();
                      if (!changes || changes.length === 0) return;
                      
                      const modifiedEditor = editor.getModifiedEditor();
                      const currentPosition = modifiedEditor.getPosition();
                      if (!currentPosition) return;

                      // Find the first change that comes after the current cursor position
                      let nextChange = changes.find(change => change.modifiedStartLineNumber > currentPosition.lineNumber);
                      
                      // If no change is after current position, wrap around to the first change
                      if (!nextChange) {
                        nextChange = changes[0];
                      }

                      modifiedEditor.setPosition({ lineNumber: nextChange.modifiedStartLineNumber, column: 1 });
                      modifiedEditor.revealLineInCenter(nextChange.modifiedStartLineNumber);
                    };

                    diffNavigatorRef.current = { next: navigateToNextChange };
                    
                    // Add shortcut to navigate diffs
                    editor.getModifiedEditor().addCommand(monaco.KeyMod.Alt | monaco.KeyCode.F5, navigateToNextChange);
                    editor.getOriginalEditor().addCommand(monaco.KeyMod.Alt | monaco.KeyCode.F5, navigateToNextChange);
                  }}
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
                    useInlineViewWhenSpaceIsLimited: false,
                  }}
                />
                <div className="absolute bottom-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => diffNavigatorRef.current?.next()}
                    className="bg-[#2d2d2d] border border-gray-700 p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-all shadow-xl"
                    title="Next Change (Alt+F5)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
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
                initializeEditorEnhancements(monaco);
                monacoInstanceRef.current = monaco;
                editorInstanceRef.current = editor;

                // Disable native context menu and render custom menu for snapshot action.
                editor.updateOptions({ contextmenu: false });

                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                  alert("File saved locally (auto-sync is on)");
                });
                registerSnapshotShortcut(editor, monaco);
                
                // Track cursor position
                editor.onDidChangeCursorPosition((e) => {
                  setCursorPosition({ line: e.position.lineNumber, column: e.position.column });
                });
                editor.onDidChangeCursorSelection(() => {
                  updateSelectionState();
                });
                editor.onContextMenu((event) => {
                  event.event.preventDefault();
                  setContextMenuPosition({ x: event.event.posx, y: event.event.posy });
                  updateSelectionState();
                  setIsEditorContextMenuOpen(true);
                });
              }}
            />
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 bg-[#1e1e1e]">
            <Image src="/koragpt.png" alt="KoraGPT Logo" width={64} height={64} className="mb-4 opacity-30" />
            <p className="text-sm font-medium">Select a file to edit</p>
          </div>
        )}

        {isEditorContextMenuOpen && !activePendingEdit && (
          <div
            className="fixed z-[120] w-64 rounded-md border border-gray-700 bg-[#111827] p-1 shadow-2xl"
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {hasSelectedText ? (
              <button
                type="button"
                onClick={() => void captureSelectedCodeSnapshot()}
                className="w-full rounded px-2 py-2 text-left text-xs text-gray-200 hover:bg-gray-700"
                title="Create image from selected code (Ctrl/Cmd + Alt + Shift + S)"
              >
                📸 Screenshot Selected Code
              </button>
            ) : (
              <div className="rounded px-2 py-2 text-xs text-gray-500">
                Select code to enable screenshot
              </div>
            )}
          </div>
        )}
      </div>

      {/* News Ticker - Above Status Bar */}
      <NewsTicker />

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

