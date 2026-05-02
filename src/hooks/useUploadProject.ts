import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { extractionService } from "@/services/extractionService";
import JSZip from "jszip";

export type UploadState = "idle" | "uploading" | "processing" | "extracting" | "success" | "error";

interface UploadResult {
  projectId: string;
  status: string;
}

export const useUploadProject = () => {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  const uploadProject = async (input: File | FileList | File[]): Promise<UploadResult | null> => {
    let file: File;
    let displayName: string;

    // Convert FileList/array (folder upload) into a single zip
    const filesArray: File[] = Array.isArray(input)
      ? input
      : input instanceof FileList
        ? Array.from(input)
        : [input];

    if (filesArray.length === 0) return null;

    if (filesArray.length === 1 && filesArray[0].name.toLowerCase().endsWith(".zip")) {
      file = filesArray[0];
      displayName = file.name;
    } else if (filesArray.length === 1 && filesArray[0].name.toLowerCase().endsWith(".rar")) {
      toast({
        title: "Format .rar non supporté",
        description: "Compressez votre projet en .zip ou glissez le dossier directement.",
        variant: "destructive",
      });
      return null;
    } else {
      // Folder or multiple files → zip them client-side
      setFileName("Compression du dossier...");
      setUploadState("processing");
      setProgress(5);

      try {
        const zip = new JSZip();
        // Determine root folder name
        const firstPath = (filesArray[0] as any).webkitRelativePath || filesArray[0].name;
        const rootName = firstPath.split("/")[0] || "project";

        for (const f of filesArray) {
          const relPath = (f as any).webkitRelativePath || f.name;
          // Skip useless files
          if (
            relPath.includes("node_modules/") ||
            relPath.includes(".git/") ||
            relPath.includes("__MACOSX/") ||
            relPath.endsWith(".DS_Store")
          ) continue;
          zip.file(relPath, f);
        }

        const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
        file = new File([blob], `${rootName}.zip`, { type: "application/zip" });
        displayName = `${rootName} (${filesArray.length} fichiers)`;
      } catch (err) {
        toast({
          title: "Erreur de compression",
          description: err instanceof Error ? err.message : "Impossible de zipper le dossier",
          variant: "destructive",
        });
        setUploadState("error");
        return null;
      }
    }

    setFileName(displayName);
    setUploadState("uploading");
    setProgress(10);

    try {
      // Generate unique file path
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `uploads/${timestamp}_${safeName}`;

      setProgress(30);

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setProgress(50);
      setUploadState("processing");

      // Create project record
      const projectName = file.name.replace(/\.(zip|rar)$/i, "");
      
      const { data: project, error: insertError } = await supabase
        .from("projects")
        .insert({
          name: projectName,
          original_filename: file.name,
          file_path: filePath,
          file_size: file.size,
          status: "pending",
          project_type: "unknown",
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create project: ${insertError.message}`);
      }

      setProjectId(project.id);
      setProgress(70);
      setUploadState("extracting");

      // Trigger extraction
      const extractionResult = await extractionService.triggerExtraction(project.id);

      if (!extractionResult.success) {
        console.warn("Extraction warning:", extractionResult.error);
        // Don't fail the upload, just warn
      }

      setProgress(100);
      setUploadState("success");

      toast({
        title: "Projet prêt !",
        description: `${extractionResult.filesCount || 0} fichiers extraits.`,
      });

      return {
        projectId: project.id,
        status: "ready",
      };
    } catch (error) {
      console.error("Upload error:", error);
      setUploadState("error");
      
      toast({
        title: "Erreur d'upload",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
      
      return null;
    }
  };

  const reset = () => {
    setUploadState("idle");
    setProgress(0);
    setFileName(null);
    setProjectId(null);
  };

  return {
    uploadState,
    progress,
    fileName,
    projectId,
    uploadProject,
    reset,
  };
};
