import { supabase } from "@/integrations/supabase/client";

export interface ExtractedFile {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  file_type: "code" | "image" | "other";
  file_size: number;
  storage_path: string;
  created_at: string;
}

export const extractionService = {
  async triggerExtraction(projectId: string): Promise<{
    success: boolean;
    projectType?: string;
    filesCount?: number;
    error?: string;
  }> {
    console.log("Triggering extraction for project:", projectId);
    
    const { data, error } = await supabase.functions.invoke("extract-project", {
      body: { projectId },
    });

    if (error) {
      console.error("Extraction error:", error);
      return { success: false, error: error.message };
    }

    console.log("Extraction result:", data);
    return data;
  },

  async getExtractedFiles(projectId: string): Promise<ExtractedFile[]> {
    // Using explicit typing since types may not be generated yet
    const { data, error } = await supabase
      .from("extracted_files" as any)
      .select("*")
      .eq("project_id", projectId)
      .order("file_path", { ascending: true });

    if (error) {
      console.error("Error fetching extracted files:", error);
      throw error;
    }

    return (data || []) as unknown as ExtractedFile[];
  },

  async getFileContent(storagePath: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from("extracted-files")
      .download(storagePath);

    if (error) {
      console.error("Error downloading file:", error);
      return null;
    }

    return await data.text();
  },

  getFileUrl(storagePath: string): string {
    const { data } = supabase.storage
      .from("extracted-files")
      .getPublicUrl(storagePath);
    
    return data.publicUrl;
  },

  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  },

  getFileIcon(fileType: string, fileName: string): string {
    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    
    const iconMap: Record<string, string> = {
      js: "📜",
      ts: "📘",
      jsx: "⚛️",
      tsx: "⚛️",
      html: "🌐",
      css: "🎨",
      scss: "🎨",
      json: "📋",
      md: "📝",
      dart: "🎯",
      png: "🖼️",
      jpg: "🖼️",
      jpeg: "🖼️",
      gif: "🖼️",
      svg: "🖼️",
    };

    return iconMap[extension] || (fileType === "code" ? "📄" : "📎");
  },
};
