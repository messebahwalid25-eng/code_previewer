import { useCallback } from "react";
import { Upload, FileArchive, CheckCircle2, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { useUploadProject } from "@/hooks/useUploadProject";
import { Button } from "@/components/ui/button";

const UploadZone = () => {
  const { uploadState, progress, fileName, uploadProject, reset } = useUploadProject();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadProject(files[0]);
    }
  }, [uploadProject]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadProject(files[0]);
    }
  };

  const isInteractive = uploadState === "idle" || uploadState === "error";

  return (
    <div
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
      onClick={isInteractive ? () => document.getElementById("file-input")?.click() : undefined}
    >
      <input
        id="file-input"
        type="file"
        accept=".zip,.rar"
        className="hidden"
        onChange={handleFileInput}
        disabled={!isInteractive}
      />

      <div className="flex flex-col items-center gap-4">
        {uploadState === "idle" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground">
              <Upload className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-medium mb-1">
                Glissez-déposez votre fichier ici
              </p>
              <p className="text-muted-foreground text-sm">
                ou cliquez pour sélectionner (.zip, .rar)
              </p>
            </div>
          </>
        )}

        {(uploadState === "uploading" || uploadState === "processing") && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-medium mb-1 flex items-center gap-2 justify-center">
                <FileArchive className="w-4 h-4 text-primary" />
                {fileName}
              </p>
              <p className="text-muted-foreground text-sm">
                {uploadState === "uploading" ? "Upload en cours..." : "Analyse en cours..."}
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
                Projet uploadé avec succès !
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              className="mt-2"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Uploader un autre projet
            </Button>
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
