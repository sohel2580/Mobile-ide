import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Info, Users, Terminal, Eye, FileText, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

type MenuId = "file" | "edit" | "view" | "terminal" | "instruction" | "community" | "about";

interface TopMenuBarProps {
  onNewFile: () => void;
  onNewFolder: () => void;
  onDownloadProject: () => void;
  onToggleSidebar: () => void;
}

const MenuButton = ({
  id,
  label,
  activeMenu,
  onToggleWithAnchor,
}: {
  id: MenuId;
  label: string;
  activeMenu: MenuId | null;
  onToggleWithAnchor: (id: MenuId, rect: DOMRect) => void;
}) => {
  const isActive = activeMenu === id;
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors",
        isActive ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800/60 hover:text-white"
      )}
      onClick={(event) => {
        const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
        onToggleWithAnchor(id, rect);
      }}
    >
      {label}
      <ChevronDown className="w-3 h-3 opacity-60" />
    </button>
  );
};

export const TopMenuBar = ({ onNewFile, onNewFolder, onDownloadProject, onToggleSidebar }: TopMenuBarProps) => {
  const [activeMenu, setActiveMenu] = useState<MenuId | null>(null);
  const [anchorPosition, setAnchorPosition] = useState<{ left: number; top: number } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onWindowClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (e.target instanceof Node && rootRef.current.contains(e.target)) return;
      setActiveMenu(null);
    };
    window.addEventListener("click", onWindowClick);
    return () => window.removeEventListener("click", onWindowClick);
  }, []);

  const dropdownContent = useMemo(() => {
    const item = (label: string, onClick: () => void, icon?: React.ReactNode, hint?: string) => (
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-700"
        onClick={() => {
          onClick();
          setActiveMenu(null);
        }}
      >
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
        {hint ? <span className="text-[10px] text-gray-400">{hint}</span> : null}
      </button>
    );

    const sectionTitle = (label: string) => (
      <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </div>
    );

    if (!activeMenu) return null;

    if (activeMenu === "file") {
      return (
        <div className="w-56 rounded-md border border-gray-700 bg-[#111827] p-1 shadow-2xl">
          {sectionTitle("File")}
          {item("New File", onNewFile, <FileText className="w-4 h-4 text-blue-400" />)}
          {item("New Folder", onNewFolder, <FileText className="w-4 h-4 text-yellow-400" />)}
          {item("Download Project (ZIP)", onDownloadProject, <FileText className="w-4 h-4 text-cyan-300" />)}
        </div>
      );
    }

    if (activeMenu === "edit") {
      return (
        <div className="w-56 rounded-md border border-gray-700 bg-[#111827] p-1 shadow-2xl">
          {sectionTitle("Edit")}
          {item("Undo", () => {}, <Pencil className="w-4 h-4 text-gray-300" />, "Ctrl+Z")}
          {item("Redo", () => {}, <Pencil className="w-4 h-4 text-gray-300" />, "Ctrl+Y")}
        </div>
      );
    }

    if (activeMenu === "view") {
      return (
        <div className="w-56 rounded-md border border-gray-700 bg-[#111827] p-1 shadow-2xl">
          {sectionTitle("View")}
          {item("Toggle Sidebar", onToggleSidebar, <Eye className="w-4 h-4 text-gray-300" />)}
        </div>
      );
    }

    if (activeMenu === "terminal") {
      return (
        <div className="w-64 rounded-md border border-gray-700 bg-[#111827] p-1 shadow-2xl">
          {sectionTitle("Terminal")}
          <div className="rounded px-2 py-2 text-xs text-gray-400">
            Terminal UI is planned. This menu is reserved for upcoming terminal integration.
          </div>
        </div>
      );
    }

    if (activeMenu === "instruction") {
      return (
        <div className="w-72 rounded-md border border-gray-700 bg-[#111827] p-1 shadow-2xl">
          {sectionTitle("Instruction")}
          <div className="rounded px-2 py-2 text-xs text-gray-300">
            - Use <span className="font-mono text-yellow-300">@"file"</span> to mention files in chat<br />
            - Use Emmet abbreviations in HTML/CSS<br />
            - Use <span className="font-mono text-yellow-300">Ctrl/Cmd + Alt + Shift + S</span> to snapshot selected code
          </div>
        </div>
      );
    }

    if (activeMenu === "community") {
      return (
        <div className="w-64 rounded-md border border-gray-700 bg-[#111827] p-1 shadow-2xl">
          {sectionTitle("Community")}
          <div className="rounded px-2 py-2 text-xs text-gray-300">
            Community features are available in the chat panel header. This menu is a quick-access placeholder.
          </div>
        </div>
      );
    }

    return (
      <div className="w-64 rounded-md border border-gray-700 bg-[#111827] p-1 shadow-2xl">
        {sectionTitle("About")}
        <div className="rounded px-2 py-2 text-xs text-gray-300">
          KoraGPT IDE (Beta) — Browser-based AI coding environment inspired by modern editors.
        </div>
      </div>
    );
  }, [activeMenu, onDownloadProject, onNewFile, onNewFolder, onToggleSidebar]);

  const handleToggleWithAnchor = (id: MenuId, rect: DOMRect) => {
    setActiveMenu((prev) => {
      const next = prev === id ? null : id;
      if (next) {
        setAnchorPosition({
          left: rect.left,
          top: rect.bottom,
        });
      } else {
        setAnchorPosition(null);
      }
      return next;
    });
  };

  return (
    <div ref={rootRef} className="hidden md:flex items-center justify-between h-9 px-3 bg-[#0b1220] border-b border-gray-800 select-none">
      <div className="flex items-center gap-1">
        <MenuButton id="file" label="File" activeMenu={activeMenu} onToggleWithAnchor={handleToggleWithAnchor} />
        <MenuButton id="edit" label="Edit" activeMenu={activeMenu} onToggleWithAnchor={handleToggleWithAnchor} />
        <MenuButton id="view" label="View" activeMenu={activeMenu} onToggleWithAnchor={handleToggleWithAnchor} />
        <MenuButton id="terminal" label="Terminal" activeMenu={activeMenu} onToggleWithAnchor={handleToggleWithAnchor} />
        <MenuButton id="instruction" label="Instruction" activeMenu={activeMenu} onToggleWithAnchor={handleToggleWithAnchor} />
        <MenuButton id="community" label="Community" activeMenu={activeMenu} onToggleWithAnchor={handleToggleWithAnchor} />
        <MenuButton id="about" label="About" activeMenu={activeMenu} onToggleWithAnchor={handleToggleWithAnchor} />
      </div>

      <div className="flex items-center gap-2 text-[10px] text-gray-500">
        <Terminal className="w-3.5 h-3.5" />
        <Users className="w-3.5 h-3.5" />
        <Info className="w-3.5 h-3.5" />
      </div>

      {activeMenu && anchorPosition && dropdownContent ? (
        <div
          className="fixed z-[150]"
          style={{ left: anchorPosition.left, top: anchorPosition.top + 2 }}
        >
          <div onClick={(e) => e.stopPropagation()}>{dropdownContent}</div>
        </div>
      ) : null}
    </div>
  );
};

