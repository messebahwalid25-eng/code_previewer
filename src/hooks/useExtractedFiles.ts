import { useState, useEffect } from "react";
import { extractionService, ExtractedFile } from "@/services/extractionService";

interface UseExtractedFilesReturn {
  files: ExtractedFile[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useExtractedFiles = (projectId: string | null): UseExtractedFilesReturn => {
  const [files, setFiles] = useState<ExtractedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    if (!projectId) {
      setFiles([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const extractedFiles = await extractionService.getExtractedFiles(projectId);
      setFiles(extractedFiles);
    } catch (err) {
      console.error("Error fetching extracted files:", err);
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  return {
    files,
    isLoading,
    error,
    refresh: fetchFiles,
  };
};
