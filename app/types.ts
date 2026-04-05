export interface ProjectItem {
  id: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  language?: string;
  path: string;
  isOpen?: boolean;
}

export interface PendingEdit {
  id: string;
  fileId: string;
  originalContent: string;
  newContent: string;
  status: "pending" | "accepted" | "rejected";
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  isTyping?: boolean;
  type?: "text" | "image" | "diff";
  imageUrl?: string;
  editId?: string; // Link to PendingEdit
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  pendingEdits: PendingEdit[];
  createdAt: number;
}
