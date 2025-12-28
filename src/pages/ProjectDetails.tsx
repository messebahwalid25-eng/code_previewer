import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Folder, File, FileCode, Image, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { projectService, Project } from "@/services/projectService";
import { useExtractedFiles } from "@/hooks/useExtractedFiles";
import { extractionService } from "@/services/extractionService";

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  const { files, isLoading: isLoadingFiles } = useExtractedFiles(id || null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;
      
      try {
        const projectData = await projectService.getProject(id);
        setProject(projectData);
      } catch (error) {
        console.error("Error fetching project:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  const handleFileClick = async (storagePath: string, fileType: string) => {
    if (fileType !== "code") return;
    
    setSelectedFile(storagePath);
    setIsLoadingContent(true);
    
    try {
      const content = await extractionService.getFileContent(storagePath);
      setFileContent(content);
    } catch (error) {
      console.error("Error loading file content:", error);
      setFileContent(null);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "code":
        return <FileCode className="h-4 w-4 text-primary" />;
      case "image":
        return <Image className="h-4 w-4 text-green-500" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Group files by directory
  const groupedFiles = files.reduce((acc, file) => {
    const parts = file.file_path.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
    if (!acc[dir]) acc[dir] = [];
    acc[dir].push(file);
    return acc;
  }, {} as Record<string, typeof files>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Projet non trouvé</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{project.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                  {projectService.getProjectTypeLabel(project.project_type)}
                </span>
                <span>•</span>
                <span>{projectService.formatFileSize(project.file_size)}</span>
                <span>•</span>
                <span>{files.length} fichiers</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* File Tree */}
        <aside className="w-80 border-r border-border bg-card overflow-y-auto">
          <div className="p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Folder className="h-4 w-4" />
              Fichiers
            </h2>
            
            {isLoadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : files.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun fichier extrait
              </p>
            ) : (
              <div className="space-y-1">
                {Object.entries(groupedFiles).map(([dir, dirFiles]) => (
                  <div key={dir}>
                    {dir && (
                      <div className="flex items-center gap-2 py-1 px-2 text-sm text-muted-foreground">
                        <Folder className="h-3 w-3" />
                        <span className="truncate">{dir}</span>
                      </div>
                    )}
                    {dirFiles.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => handleFileClick(file.storage_path, file.file_type)}
                        className={`w-full flex items-center gap-2 py-1.5 px-3 text-sm rounded-md transition-colors text-left ${
                          selectedFile === file.storage_path
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        } ${file.file_type !== "code" ? "opacity-60" : ""}`}
                        style={{ paddingLeft: dir ? "1.5rem" : "0.75rem" }}
                      >
                        {getFileIcon(file.file_type)}
                        <span className="truncate flex-1">{file.file_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {extractionService.formatFileSize(file.file_size)}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Code Viewer */}
        <main className="flex-1 overflow-hidden bg-muted/30">
          {selectedFile ? (
            <div className="h-full flex flex-col">
              <div className="px-4 py-2 border-b border-border bg-card flex items-center gap-2">
                <FileCode className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {selectedFile.split("/").pop()}
                </span>
              </div>
              <div className="flex-1 overflow-auto">
                {isLoadingContent ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : fileContent ? (
                  <pre className="p-4 text-sm font-mono text-foreground whitespace-pre-wrap break-words">
                    {fileContent}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Impossible de charger le contenu
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez un fichier pour voir son contenu</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProjectDetails;
