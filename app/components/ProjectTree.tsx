import { ChevronRight, ChevronDown, Folder, File, MessageSquare, FilePlus, FolderPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectItem } from "../types";

interface ProjectTreeProps {
  items: ProjectItem[];
  onToggle: (path: string) => void;
  onRemove: (path: string) => void;
  onCreate: (type: "file" | "folder", parentPath?: string) => void;
  onFileSelect: (id: string) => void;
  onAddToContext: (id: string) => void;
  activeFileId: string | null;
  parentPath?: string;
}

export const ProjectTree = ({ 
  items, 
  onToggle, 
  onRemove, 
  onCreate, 
  onFileSelect,
  onAddToContext,
  activeFileId,
  parentPath = "" 
}: ProjectTreeProps) => {
  const currentLevelItems = items.filter(item => {
    const relativePath = parentPath ? item.path.replace(`${parentPath}/`, "") : item.path;
    return !relativePath.includes("/");
  }).sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === "folder" ? -1 : 1;
  });

  return (
    <div className="space-y-1 ml-2">
      {currentLevelItems.map((item) => (
        <div key={item.path} className="group">
          <div 
            data-file-id={item.id}
            draggable={item.type === "file"}
            onDragStart={(e) => {
              if (item.type === "file") {
                e.dataTransfer.setData("text/plain", `file_id:${item.id}`);
              }
            }}
            className={cn(
            "flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors group/item",
            item.type === "file" && activeFileId === item.id ? "bg-blue-500/20 text-blue-400" : "hover:bg-gray-800/50"
          )}>
            <div 
              className="flex items-center gap-2 flex-1 truncate"
              onClick={() => {
                if (item.type === "folder") {
                  onToggle(item.path);
                } else {
                  onFileSelect(item.id);
                }
              }}
            >
              {item.type === "folder" ? (
                <>
                  {item.isOpen ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
                  <Folder className="w-4 h-4 text-yellow-500 fill-yellow-500/20" />
                </>
              ) : (
                <>
                  <div className="w-3" /> {/* Space for chevron */}
                  <File className="w-4 h-4 text-blue-400 fill-blue-400/10" />
                </>
              )}
              <span className="text-[11px] truncate">{item.name}</span>
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
              {item.type === "file" && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onAddToContext(item.id); }}
                  className="p-1 hover:text-green-400"
                  title="চ্যাটে মেনশন করুন"
                >
                  <MessageSquare className="w-3 h-3" />
                </button>
              )}
              {item.type === "folder" && (
                <>
                  <button 
                    onClick={() => onCreate("file", item.path)}
                    className="p-1 hover:text-blue-400"
                    title="নতুন ফাইল"
                  >
                    <FilePlus className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => onCreate("folder", item.path)}
                    className="p-1 hover:text-yellow-400"
                    title="নতুন ফোল্ডার"
                  >
                    <FolderPlus className="w-3 h-3" />
                  </button>
                </>
              )}
              <button 
                onClick={() => onRemove(item.path)}
                className="p-1 hover:text-red-400"
                title="ডিলিট"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          {item.type === "folder" && item.isOpen && (
            <ProjectTree 
              items={items.filter(i => i.path.startsWith(`${item.path}/`))} 
              onToggle={onToggle} 
              onRemove={onRemove}
              onCreate={onCreate}
              onFileSelect={onFileSelect}
              onAddToContext={onAddToContext}
              activeFileId={activeFileId}
              parentPath={item.path} 
            />
          )}
        </div>
      ))}
    </div>
  );
};
