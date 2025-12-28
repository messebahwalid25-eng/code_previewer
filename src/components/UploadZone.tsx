import { useState, useCallback } from "react";
import { Upload, FileArchive, CheckCircle2, Loader2 } from "lucide-react";

const UploadZone = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validExtensions = ['.zip', '.rar'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      alert('Veuillez uploader un fichier .zip ou .rar');
      return;
    }

    setFileName(file.name);
    setUploadState('uploading');

    // Simulate upload
    setTimeout(() => {
      setUploadState('success');
    }, 2000);
  };

  return (
    <div
      className={`
        relative max-w-2xl mx-auto p-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
        ${isDragging 
          ? 'border-primary bg-primary/10 scale-[1.02]' 
          : uploadState === 'success'
            ? 'border-green-500/50 bg-green-500/5'
            : 'border-border bg-card/50 hover:border-primary/50 hover:bg-card'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept=".zip,.rar"
        className="hidden"
        onChange={handleFileInput}
      />

      <div className="flex flex-col items-center gap-4">
        {uploadState === 'idle' && (
          <>
            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
              ${isDragging ? 'bg-primary/20 text-primary scale-110' : 'bg-secondary text-muted-foreground'}
            `}>
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

        {uploadState === 'uploading' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-medium mb-1 flex items-center gap-2">
                <FileArchive className="w-4 h-4 text-primary" />
                {fileName}
              </p>
              <p className="text-muted-foreground text-sm">
                Analyse en cours...
              </p>
            </div>
            <div className="w-full max-w-xs h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-shimmer" style={{ 
                backgroundImage: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent)',
                backgroundSize: '200% 100%',
                width: '100%'
              }} />
            </div>
          </>
        )}

        {uploadState === 'success' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-medium mb-1 flex items-center gap-2">
                <FileArchive className="w-4 h-4 text-green-500" />
                {fileName}
              </p>
              <p className="text-green-500 text-sm font-medium">
                Projet HTML/CSS/JS détecté ! Prévisualisation prête.
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
