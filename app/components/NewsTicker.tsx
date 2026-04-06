/**
 * @copyright Copyright (c) 2026 Taskkora. All rights reserved.
 * @license AGPL-3.0
 */

import React, { useEffect, useState } from "react";

export const NewsTicker = () => {
  const [commits, setCommits] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLatestCommits = async () => {
      try {
        const response = await fetch("https://api.github.com/repos/alornishan014/KoraGPT_IDE/commits?per_page=5");
        if (!response.ok) {
          throw new Error("Failed to fetch commits");
        }
        const data = await response.json();
        
        // Extract the first line of the commit message, prefix with ✨, and join them
        const commitMessages = data.map((item: any) => {
          const firstLine = item.commit.message.split('\n')[0];
          return `✨ ${firstLine}`;
        });
        
        setCommits(commitMessages.join("  •  "));
      } catch (error) {
        console.error("Error fetching KoraGPT updates:", error);
        setCommits("✨ Failed to load latest updates");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestCommits();
  }, []);

  return (
    <div className="w-full bg-[#0d1117] border-t border-gray-800 text-gray-300 text-[11px] overflow-hidden flex-shrink-0 h-6 flex items-center">
      {isLoading ? (
        <div className="px-4 animate-pulse">Fetching latest KoraGPT updates...</div>
      ) : (
        <div className="whitespace-nowrap flex pl-full animate-marquee">
          <span className="pr-4">{commits}</span>
        </div>
      )}
    </div>
  );
};
