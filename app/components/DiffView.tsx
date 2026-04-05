import { FileCode2 } from "lucide-react";
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
    const oLines = original.split('\n');
    const mLines = modified.split('\n');
    
    let additions = 0;
    let deletions = 0;

    // Very simple diff calculation just for the UI numbers
    const mSet = new Set(mLines);
    const oSet = new Set(oLines);

    mLines.forEach(line => { if (!oSet.has(line)) additions++; });
    oLines.forEach(line => { if (!mSet.has(line)) deletions++; });

    return { additions, deletions };
  };

  const { additions, deletions } = calculateDiffStats();

  return (
    <div className="flex items-center justify-between bg-[#1e1e1e] border border-gray-800 rounded-md px-3 py-2 my-2 hover:bg-[#252526] transition-colors group">
      <div className="flex items-center gap-2 overflow-hidden">
        <FileCode2 className="w-4 h-4 text-yellow-400 flex-shrink-0" />
        <span className="text-[11px] text-gray-300 font-mono truncate" title={filePath}>
          {filePath}
        </span>
      </div>
      
      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          {additions > 0 && <span className="text-green-400">+{additions}</span>}
          {deletions > 0 && <span className="text-red-400">-{deletions}</span>}
          {additions === 0 && deletions === 0 && <span className="text-gray-500">~0</span>}
        </div>
        
        {status === "pending" ? (
          <button 
            onClick={onOpenDiff}
            className="px-2 py-1 text-[10px] bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white rounded border border-gray-700 transition-all"
          >
            Open Diff
          </button>
        ) : (
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded", 
            status === "accepted" ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
          )}>
            {status === "accepted" ? "Applied" : "Rejected"}
          </span>
        )}
      </div>
    </div>
  );
};
