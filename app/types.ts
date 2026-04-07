export interface ProjectItem {
  id: string;
  name: string;
  type: "file" | "folder";
  parentId: string | null;
  content?: string;
  children?: ProjectItem[];
  language?: string;
  isOpen?: boolean;
  path: string;
}

export interface PendingEdit {
  id: string;
  fileId: string;
  originalContent: string;
  newContent: string;
  status: "pending" | "accepted" | "rejected";
  isNewFile?: boolean;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  isTyping?: boolean;
  type?: "text" | "image" | "diff" | "file-action";
  imageUrl?: string;
  editId?: string; // Link to PendingEdit
  fileAction?: {
    fileName: string;
    linesAdded: number;
    linesRemoved: number;
    action: "created" | "edited" | "reading";
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  pendingEdits: PendingEdit[];
  createdAt: number;
}
