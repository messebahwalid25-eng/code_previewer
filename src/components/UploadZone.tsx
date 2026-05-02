import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileArchive, CheckCircle2, Loader2, AlertCircle, RotateCcw, ArrowRight, Package, Folder } from "lucide-react";
import { useUploadProject } from "@/hooks/useUploadProject";
import { Button } from "@/components/ui/button";

const UploadZone = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { uploadState, progress, fileName, projectId, uploadProject, reset } = useUploadProject();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const items = e.dataTransfer.items;
    // Try to read as folder via DataTransferItemList
    if (items && items.length > 0 && (items[0] as any).webkitGetAsEntry) {
      const allFiles: File[] = [];
      const traverseEntry = async (entry: any, path: string): Promise<void> => {
        if (entry.isFile) {
          await new Promise<void>((resolve) => {
            entry.file((file: File) => {
              Object.defineProperty(file, "webkitRelativePath", { value: path + file.name });
              allFiles.push(file);
              resolve();
            });
          });
        } else if (entry.isDirectory) {
          const reader = entry.createReader();
          const entries: any[] = await new Promise((resolve) => {
            const collected: any[] = [];
            const readBatch = () => reader.readEntries((batch: any[]) => {
              if (batch.length === 0) resolve(collected);
              else { collected.push(...batch); readBatch(); }
            });
            readBatch();
          });
          for (const child of entries) {
            await traverseEntry(child, path + entry.name + "/");
          }
        }
      };
      const entries: any[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = (items[i] as any).webkitGetAsEntry();
        if (entry) entries.push(entry);
      }
      // If single file (zip), short-circuit
      if (entries.length === 1 && entries[0].isFile && e.dataTransfer.files[0]?.name.toLowerCase().endsWith(".zip")) {
        uploadProject(e.dataTransfer.files[0]);
        return;
      }
      for (const entry of entries) {
        await traverseEntry(entry, "");
      }
      if (allFiles.length > 0) {
        uploadProject(allFiles);
        return;
      }
    }
    // Fallback
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadProject(files);
    }
  }, [uploadProject]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadProject(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = "";
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFolderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    folderInputRef.current?.click();
  };

  const handleViewProject = () => {
    if (projectId) {
      navigate(`/project/${projectId}`);
    }
  };

  const isInteractive = uploadState === "idle" || uploadState === "error";
  const isProcessing = uploadState === "uploading" || uploadState === "processing" || uploadState === "extracting";

  return (
    <div
      data-upload-zone
      className={`
        relative max-w-2xl mx-auto p-8 rounded-2xl border-2 border-dashed transition-all duration-300
        ${isInteractive ? "cursor-pointer hover:border-primary/50 hover:bg-card" : "cursor-default"}
        ${uploadState === "success"
          ? "border-green-500/50 bg-green-500/5"
          : uploadState === "error"
            ? "border-destructive/50 bg-destructive/5"
            : "border-border bg-card/50"
        }
      `}
      onDragOver={isInteractive ? handleDragOver : undefined}
      onDragLeave={isInteractive ? handleDragLeave : undefined}
      onDrop={isInteractive ? handleDrop : undefined}
      onClick={isInteractive ? handleClick : undefined}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleFileInput}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error - non-standard but widely supported
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      <div className="flex flex-col items-center gap-4">
        {uploadState === "idle" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground">
              <Upload className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-medium mb-1">
                Glissez-déposez votre projet ici
              </p>
              <p className="text-muted-foreground text-sm">
                un fichier .zip ou un dossier complet
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleClick(); }}>
                <FileArchive className="w-4 h-4 mr-2" />
                Fichier .zip
              </Button>
              <Button variant="outline" size="sm" onClick={handleFolderClick}>
                <Folder className="w-4 h-4 mr-2" />
                Dossier
              </Button>
            </div>
          </>
        )}

        {isProcessing && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
              {uploadState === "extracting" ? (
                <Package className="w-8 h-8 text-primary animate-pulse" />
              ) : (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              )}
            </div>
            <div className="text-center">
              <p className="text-foreground font-medium mb-1 flex items-center gap-2 justify-center">
                <FileArchive className="w-4 h-4 text-primary" />
                {fileName}
              </p>
              <p className="text-muted-foreground text-sm">
                {uploadState === "uploading" && "Upload en cours..."}
                {uploadState === "processing" && "Création du projet..."}
                {uploadState === "extracting" && "Extraction des fichiers..."}
              </p>
            </div>
            <div className="w-full max-w-xs h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}

        {uploadState === "success" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-medium mb-1 flex items-center gap-2 justify-center">
                <FileArchive className="w-4 h-4 text-green-500" />
                {fileName}
              </p>
              <p className="text-green-500 text-sm font-medium">
                Projet uploadé et extrait avec succès !
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Nouveau
              </Button>
              <Button 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProject();
                }}
              >
                Voir le projet
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {uploadState === "error" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-destructive/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-medium mb-1">
                Erreur lors de l'upload
              </p>
              <p className="text-muted-foreground text-sm">
                Cliquez pour réessayer
              </p>
            </div>
          </>
        )}
      </div>

      {/* Corner decorations */}
      <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-primary/30 rounded-tl" />
      <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-primary/30 rounded-tr" />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-primary/30 rounded-bl" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-primary/30 rounded-br" />
    </div>
  );
};

export default UploadZone;
