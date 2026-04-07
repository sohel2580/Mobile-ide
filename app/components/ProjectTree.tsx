import { MouseEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { FaFileAlt, FaFolder, FaFolderOpen, FaFileCode } from "react-icons/fa";
import { SiPython, SiJavascript, SiHtml5, SiCss, SiJson } from "react-icons/si";
import { cn } from "@/lib/utils";
import { ProjectItem } from "../types";

export interface ClipboardState {
  item: ProjectItem | null;
  action: "copy" | "cut";
}

interface ContextMenuState {
  x: number;
  y: number;
  itemId: string;
}

interface ProjectTreeProps {
  items: ProjectItem[];
  activeFileId: string | null;
  selectedFolderId: string | null;
  clipboard: ClipboardState;
  onOpenFile: (id: string) => void;
  onToggleFolder: (id: string) => void;
  onSelectFolder: (id: string | null) => void;
  onCreateInFolder: (type: "file" | "folder", folderId: string) => void;
  onImportIntoFolder: (folderId: string, target: "file" | "folder") => void;
  onRename: (id: string, nextName: string) => void;
  onDelete: (id: string) => void;
  onCopy: (id: string) => void;
  onCut: (id: string) => void;
  onPasteIntoFolder: (folderId: string) => void;
  onShareToChat: (id: string) => void;
  onDownloadFile: (id: string) => void;
  onRunConsole: (id: string) => void;
  onDownloadFolder: (id: string) => void;
  onDropIntoFolder: (draggedId: string, folderId: string) => void;
}

const getFileIcon = (item: ProjectItem) => {
  if (item.type === "folder") {
    return item.isOpen ? <FaFolderOpen className="w-4 h-4 text-yellow-500" /> : <FaFolder className="w-4 h-4 text-yellow-500" />;
  }

  const ext = item.name.split(".").pop()?.toLowerCase();
  if (ext === "py") return <SiPython className="w-4 h-4 text-blue-400" />;
  if (ext === "js" || ext === "jsx") return <SiJavascript className="w-4 h-4 text-yellow-400" />;
  if (ext === "html") return <SiHtml5 className="w-4 h-4 text-orange-500" />;
  if (ext === "css") return <SiCss className="w-4 h-4 text-blue-500" />;
  if (ext === "json") return <SiJson className="w-4 h-4 text-emerald-400" />;
  if (["ts", "tsx"].includes(ext || "")) return <FaFileCode className="w-4 h-4 text-sky-400" />;
  return <FaFileAlt className="w-4 h-4 text-gray-400" />;
};

const FileTreeNode = ({
  item,
  depth,
  activeFileId,
  selectedFolderId,
  onOpenFile,
  onToggleFolder,
  onSelectFolder,
  onRightClick,
  onDropIntoFolder,
}: {
  item: ProjectItem;
  depth: number;
  activeFileId: string | null;
  selectedFolderId: string | null;
  onOpenFile: (id: string) => void;
  onToggleFolder: (id: string) => void;
  onSelectFolder: (id: string | null) => void;
  onRightClick: (event: MouseEvent, itemId: string) => void;
  onDropIntoFolder: (draggedId: string, folderId: string) => void;
}) => {
  const sortedChildren = useMemo(
    () =>
      [...(item.children || [])].sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === "folder" ? -1 : 1;
      }),
    [item.children]
  );

  return (
    <div>
      <div
        data-file-id={item.id}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", item.id);
        }}
        onDragOver={(event) => {
          if (item.type === "folder") {
            event.preventDefault();
          }
        }}
        onDrop={(event) => {
          if (item.type !== "folder") return;
          event.preventDefault();
          const draggedId = event.dataTransfer.getData("text/plain");
          if (draggedId) onDropIntoFolder(draggedId, item.id);
        }}
        onContextMenu={(event) => onRightClick(event, item.id)}
        className={cn(
          "group/item flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] hover:bg-gray-800/60",
          item.type === "file" && activeFileId === item.id ? "bg-blue-500/20 text-blue-400" : "text-gray-300",
          item.type === "folder" && selectedFolderId === item.id ? "bg-cyan-500/20 text-cyan-300" : ""
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (item.type === "folder") onToggleFolder(item.id);
          }}
          className="w-3 h-3 text-gray-500"
        >
          {item.type === "folder" ? (item.isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />) : null}
        </button>

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => {
            if (item.type === "folder") {
              onSelectFolder(item.id);
              onToggleFolder(item.id);
            } else {
              onSelectFolder(null);
              onOpenFile(item.id);
            }
          }}
        >
          {getFileIcon(item)}
          <span className="truncate">{item.name}</span>
        </button>

        <button
          type="button"
          className="opacity-0 transition-opacity group-hover/item:opacity-100 text-gray-400 hover:text-white"
          onClick={(event) => onRightClick(event, item.id)}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {item.type === "folder" && item.isOpen && sortedChildren.map((child) => (
        <FileTreeNode
          key={child.id}
          item={child}
          depth={depth + 1}
          activeFileId={activeFileId}
          selectedFolderId={selectedFolderId}
          onOpenFile={onOpenFile}
          onToggleFolder={onToggleFolder}
          onSelectFolder={onSelectFolder}
          onRightClick={onRightClick}
          onDropIntoFolder={onDropIntoFolder}
        />
      ))}
    </div>
  );
};

export const ProjectTree = ({
  items,
  activeFileId,
  selectedFolderId,
  clipboard,
  onOpenFile,
  onToggleFolder,
  onSelectFolder,
  onCreateInFolder,
  onImportIntoFolder,
  onRename,
  onDelete,
  onCopy,
  onCut,
  onPasteIntoFolder,
  onShareToChat,
  onDownloadFile,
  onRunConsole,
  onDownloadFolder,
  onDropIntoFolder,
}: ProjectTreeProps) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const findById = (nodes: ProjectItem[], id: string): ProjectItem | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findById(node.children || [], id);
      if (found) return found;
    }
    return null;
  };

  const menuItem = contextMenu ? findById(items, contextMenu.itemId) : null;

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const runAction = (callback: () => void, feedback?: string) => {
    callback();
    setContextMenu(null);
    if (feedback) {
      setActionFeedback(feedback);
      window.setTimeout(() => setActionFeedback(null), 1200);
    }
  };

  const sortedRoots = [...items].sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === "folder" ? -1 : 1;
  });

  return (
    <div className="relative">
      {sortedRoots.map((item) => (
        <FileTreeNode
          key={item.id}
          item={item}
          depth={0}
          activeFileId={activeFileId}
          selectedFolderId={selectedFolderId}
          onOpenFile={onOpenFile}
          onToggleFolder={onToggleFolder}
          onSelectFolder={onSelectFolder}
          onDropIntoFolder={onDropIntoFolder}
          onRightClick={(event, itemId) => {
            event.preventDefault();
            event.stopPropagation();
            setContextMenu({ x: event.clientX, y: event.clientY, itemId });
          }}
        />
      ))}

      {contextMenu && menuItem && (
        <div
          className="fixed z-[100] w-52 rounded-md border border-gray-700 bg-[#111827] p-1 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {menuItem.type === "file" && (
            <>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-700" onClick={() => runAction(() => onOpenFile(menuItem.id))}>Open</button>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-700" onClick={() => { setRenamingItemId(menuItem.id); setRenamingValue(menuItem.name); setContextMenu(null); }}>Rename</button>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-700" onClick={() => runAction(() => onShareToChat(menuItem.id), "Shared to AI chat")}>Share to AI Chat</button>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-700" onClick={() => runAction(() => onDownloadFile(menuItem.id), "Download started")}>Download</button>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-700" onClick={() => runAction(() => onRunConsole(menuItem.id), "Sent to console")}>Run Console</button>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-700" onClick={() => runAction(() => onCopy(menuItem.id), "Copied")}>Copy</button>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-700" onClick={() => runAction(() => onCut(menuItem.id), "Cut")}>Move (Cut)</button>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs text-red-400 hover:bg-gray-700" onClick={() => runAction(() => onDelete(menuItem.id), "Deleted")}>Delete</button>
            </>
          )}
          {menuItem.type === "folder" && (
            <>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-700" onClick={() => runAction(() => onCreateInFolder("file", menuItem.id), "File created")}>Create File</button>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-700" onClick={() => runAction(() => onCreateInFolder("folder", menuItem.id), "Folder created")}>Create Folder</button>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-700" onClick={() => runAction(() => onImportIntoFolder(menuItem.id, "file"), "Select file to import")}>Import File</button>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-700" onClick={() => runAction(() => onImportIntoFolder(menuItem.id, "folder"), "Select folder to import")}>Import Folder</button>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-700" onClick={() => { setRenamingItemId(menuItem.id); setRenamingValue(menuItem.name); setContextMenu(null); }}>Rename</button>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-700" onClick={() => runAction(() => onCopy(menuItem.id), "Copied")}>Copy</button>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-700" onClick={() => runAction(() => onCut(menuItem.id), "Cut")}>Move (Cut)</button>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-700" onClick={() => runAction(() => onDownloadFolder(menuItem.id), "Download started")}>Download Folder</button>
              <button
                className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-700 disabled:opacity-50"
                disabled={!clipboard.item}
                onClick={() => runAction(() => onPasteIntoFolder(menuItem.id), "Pasted")}
              >
                Paste
              </button>
              <button className="w-full rounded px-2 py-1.5 text-left text-xs text-red-400 hover:bg-gray-700" onClick={() => runAction(() => onDelete(menuItem.id), "Deleted")}>Delete</button>
            </>
          )}
        </div>
      )}
      {actionFeedback && (
        <div className="fixed bottom-4 left-4 z-[120] rounded border border-emerald-500/40 bg-[#0f172a] px-3 py-1.5 text-xs text-emerald-300 shadow-lg">
          {actionFeedback}
        </div>
      )}

      {renamingItemId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40">
          <div className="w-80 rounded-md border border-gray-700 bg-[#111827] p-4">
            <p className="mb-2 text-xs text-gray-400">Rename item</p>
            <input
              value={renamingValue}
              onChange={(event) => setRenamingValue(event.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button className="rounded bg-gray-700 px-3 py-1 text-xs" onClick={() => setRenamingItemId(null)}>Cancel</button>
              <button
                className="rounded bg-blue-600 px-3 py-1 text-xs"
                onClick={() => {
                  if (renamingValue.trim()) onRename(renamingItemId, renamingValue.trim());
                  setRenamingItemId(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
