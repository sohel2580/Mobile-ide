import { FileCode2, Terminal, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiffViewProps {
  filePath: string;
  original: string;
  modified: string;
  onOpenDiff: () => void;
  status: "pending" | "accepted" | "rejected";
}

export const DiffView = ({ 
  filePath,
  original, 
  modified, 
  onOpenDiff,
  status
}: DiffViewProps) => {
  // Calculate basic line differences for the UI
  const calculateDiffStats = () => {
    const oLines = original.trim() === "" ? [] : original.split('\n');
    const mLines = modified.trim() === "" ? [] : modified.split('\n');
    
    // For new files (original is empty), it's all additions
    if (oLines.length === 0) {
      return { additions: mLines.length, deletions: 0 };
    }

    let additions = 0;
    let deletions = 0;

    // Simple diff calculation for UI numbers
    const mSet = new Set(mLines.map(l => l.trim()));
    const oSet = new Set(oLines.map(l => l.trim()));

    mLines.forEach(line => { if (!oSet.has(line.trim())) additions++; });
    oLines.forEach(line => { if (!mSet.has(line.trim())) deletions++; });

    return { additions, deletions };
  };

  const { additions, deletions } = calculateDiffStats();
  const fileName = filePath.split('/').pop() || filePath;
  const folderPath = filePath.split('/').slice(0, -1).join('/') || './';

  return (
    <div className="flex flex-col gap-1 w-full max-w-full overflow-hidden">
      <div className={cn(
        "flex items-center justify-between bg-[#1a1a1a] border border-gray-800/60 rounded-lg px-4 py-2.5 hover:bg-[#222222] transition-all group shadow-lg",
        status !== "pending" && "opacity-75"
      )}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-1.5 bg-yellow-400/10 rounded-md">
            <Code2 className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-white font-bold truncate">
                {fileName}
              </span>
              <span className="text-[10px] text-gray-500 font-mono truncate max-w-[150px]">
                {folderPath}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px]">
              {additions > 0 && (
                <span className="flex items-center gap-0.5 text-green-400">
                  <span className="opacity-70">+</span>{additions}
                </span>
              )}
              {deletions > 0 && (
                <span className="flex items-center gap-0.5 text-red-400">
                  <span className="opacity-70">-</span>{deletions}
                </span>
              )}
              {additions === 0 && deletions === 0 && (
                <span className="text-gray-500">no changes</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {status === "pending" ? (
            <button 
              onClick={onOpenDiff}
              className="px-3 py-1.5 text-[11px] font-semibold bg-[#2d2d2d] text-gray-200 hover:bg-[#3d3d3d] hover:text-white rounded-md border border-gray-700/50 transition-all flex items-center gap-1.5 shadow-sm"
            >
              Open Diff
            </button>
          ) : (
            <div className={cn(
              "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-tighter", 
              status === "accepted" ? "text-green-400 bg-green-400/5 border border-green-500/20" : "text-red-400 bg-red-400/5 border border-red-500/20"
            )}>
              {status === "accepted" ? "Accepted" : "Rejected"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
