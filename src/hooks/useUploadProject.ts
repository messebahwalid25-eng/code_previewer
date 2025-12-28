import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { extractionService } from "@/services/extractionService";

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

  const uploadProject = async (file: File): Promise<UploadResult | null> => {
    const validExtensions = [".zip", ".rar"];
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Format non supporté",
        description: "Veuillez uploader un fichier .zip ou .rar",
        variant: "destructive",
      });
      return null;
    }

    setFileName(file.name);
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
        title: "Projet uploadé !",
        description: `Votre projet a été uploadé avec succès. ${extractionResult.filesCount || 0} fichiers extraits.`,
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
