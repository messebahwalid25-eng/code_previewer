import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Folder, File, FileCode, Image as ImageIcon, Loader2, Eye, Code, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { projectService, Project } from "@/services/projectService";
import { useExtractedFiles } from "@/hooks/useExtractedFiles";
import { extractionService, ExtractedFile } from "@/services/extractionService";
import { previewService } from "@/services/previewService";
import CodeViewer from "@/components/CodeViewer";
import ProjectTypeBadge from "@/components/ProjectTypeBadge";
import ReactPreview from "@/components/ReactPreview";

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<ExtractedFile | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [viewMode, setViewMode] = useState<"code" | "preview">("code");
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [reactFileContents, setReactFileContents] = useState<Record<string, string>>({});
  const [isLoadingReactFiles, setIsLoadingReactFiles] = useState(false);

  const { files, isLoading: isLoadingFiles } = useExtractedFiles(id || null);

  const hasHtmlFile = files.some(f => f.file_name.toLowerCase().endsWith(".html"));
  const canPreview = project?.project_type === "html_css_js" || hasHtmlFile;
  const canPreviewReact = project?.project_type === "react";
  const isFlutter = project?.project_type === "flutter_web";
  const selectedIsHtml = selectedFile?.file_type === "code" && selectedFile.file_name.toLowerCase().endsWith(".html");

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

  // Auto-select index.html or first code file, and expand parent directories
  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      // Prioritize index.html
      const indexHtml = files.find(f => f.file_name === "index.html");
      const fileToSelect = indexHtml || files.find(f => f.file_type === "code");
      
      if (fileToSelect) {
        // Auto-expand parent directories
        const parts = fileToSelect.file_path.split("/");
        parts.pop(); // Remove filename
        const dirs = new Set<string>();
        let currentPath = "";
        parts.forEach(part => {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          dirs.add(currentPath);
        });
        setExpandedDirs(dirs);
        
        handleFileClick(fileToSelect);
      }
    }
  }, [files, selectedFile]);

  // Load all React files for preview
  useEffect(() => {
    const loadReactFiles = async () => {
      if (project?.project_type !== "react" || files.length === 0) return;
      
      setIsLoadingReactFiles(true);
      const contents: Record<string, string> = {};
      
      // Load all code files
      const codeFiles = files.filter(f => f.file_type === "code");
      
      await Promise.all(
        codeFiles.map(async (file) => {
          const content = await extractionService.getFileContent(file.storage_path);
          if (content) {
            contents[file.storage_path] = content;
          }
        })
      );
      
      setReactFileContents(contents);
      setIsLoadingReactFiles(false);
    };
    
    loadReactFiles();
  }, [project?.project_type, files]);

  const handleFileClick = async (file: ExtractedFile) => {
    setSelectedFile(file);
    setPreviewHtml(null);
    setIsLoadingPreview(false);
    
    if (file.file_type === "code") {
      setIsLoadingContent(true);
      try {
        const content = await extractionService.getFileContent(file.storage_path);
        setFileContent(content);
      } catch (error) {
        console.error("Error loading file content:", error);
        setFileContent(null);
      } finally {
        setIsLoadingContent(false);
      }
    } else if (file.file_type === "image") {
      setFileContent(null);
    }
  };

  useEffect(() => {
    if (!selectedFile || selectedFile.file_type !== "code" || !selectedFile.file_name.toLowerCase().endsWith(".html") || !fileContent || !id) {
      return;
    }

    let isActive = true;
    setIsLoadingPreview(true);

    previewService
      .buildPreviewHtml(fileContent, id, files)
      .then((builtHtml) => {
        if (isActive) {
          setPreviewHtml(builtHtml);
        }
      })
      .catch((error) => {
        console.error("Error building HTML preview:", error);
        if (isActive) {
          setPreviewHtml(null);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingPreview(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedFile, fileContent, id, files]);

  const toggleDir = (dir: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(dir)) {
        next.delete(dir);
      } else {
        next.add(dir);
      }
      return next;
    });
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "code":
        return <FileCode className="h-4 w-4 text-primary" />;
      case "image":
        return <ImageIcon className="h-4 w-4 text-green-500" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Build file tree structure
  const buildFileTree = (files: ExtractedFile[]) => {
    const tree: Record<string, { files: ExtractedFile[]; dirs: Set<string> }> = { "": { files: [], dirs: new Set() } };
    
    files.forEach(file => {
      const parts = file.file_path.split("/");
      const fileName = parts.pop() || "";
      const dirPath = parts.join("/");
      
      // Ensure all parent directories exist
      let currentPath = "";
      parts.forEach(part => {
        if (!tree[currentPath]) {
          tree[currentPath] = { files: [], dirs: new Set() };
        }
        tree[currentPath].dirs.add(part);
        currentPath = currentPath ? `${currentPath}/${part}` : part;
      });
      
      if (!tree[dirPath]) {
        tree[dirPath] = { files: [], dirs: new Set() };
      }
      tree[dirPath].files.push(file);
    });
    
    return tree;
  };

  const fileTree = buildFileTree(files);

  const renderFileTree = (dirPath: string = "", depth: number = 0) => {
    const node = fileTree[dirPath];
    if (!node) return null;

    const dirs = Array.from(node.dirs).sort();
    const sortedFiles = [...node.files].sort((a, b) => a.file_name.localeCompare(b.file_name));

    return (
      <>
        {dirs.map(dir => {
          const fullPath = dirPath ? `${dirPath}/${dir}` : dir;
          const isExpanded = expandedDirs.has(fullPath);
          
          return (
            <div key={fullPath}>
              <button
                onClick={() => toggleDir(fullPath)}
                className="w-full flex items-center gap-1 py-1.5 px-2 text-sm rounded-md hover:bg-muted text-left text-muted-foreground"
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
              >
                <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                <Folder className="h-4 w-4 text-amber-500" />
                <span className="truncate">{dir}</span>
              </button>
              {isExpanded && renderFileTree(fullPath, depth + 1)}
            </div>
          );
        })}
        
        {sortedFiles.map(file => (
          <button
            key={file.id}
            onClick={() => handleFileClick(file)}
            className={`w-full flex items-center gap-2 py-1.5 px-2 text-sm rounded-md transition-colors text-left ${
              selectedFile?.id === file.id
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            }`}
            style={{ paddingLeft: `${depth * 12 + 20}px` }}
          >
            {getFileIcon(file.file_type)}
            <span className="truncate flex-1">{file.file_name}</span>
            <span className="text-xs text-muted-foreground">
              {extractionService.formatFileSize(file.file_size)}
            </span>
          </button>
        ))}
      </>
    );
  };

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{project.name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span>{projectService.formatFileSize(project.file_size)}</span>
                  <span>•</span>
                  <span>{files.length} fichiers</span>
                </div>
              </div>
            </div>
            
            <ProjectTypeBadge projectType={project.project_type} canPreview={canPreview || canPreviewReact} />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Tree */}
        <aside className="w-72 border-r border-border bg-card overflow-y-auto shrink-0">
          <div className="p-3">
            <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm px-2">
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
              <div className="space-y-0.5">
                {renderFileTree()}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedFile ? (
            <>
              {/* File Header */}
              <div className="px-4 py-2 border-b border-border bg-card flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {getFileIcon(selectedFile.file_type)}
                  <span className="text-sm font-medium">{selectedFile.file_path}</span>
                </div>
                
                {selectedIsHtml || canPreviewReact ? (
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <Button
                      variant={viewMode === "code" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("code")}
                      className="h-7 px-3"
                    >
                      <Code className="h-3 w-3 mr-1" />
                      Code
                    </Button>
                    <Button
                      variant={viewMode === "preview" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("preview")}
                      className="h-7 px-3"
                      disabled={(!selectedIsHtml && canPreviewReact && isLoadingReactFiles) || (selectedIsHtml && isLoadingPreview)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Aperçu
                    </Button>
                  </div>
                ) : null}
              </div>

              {/* File Content */}
              <div className="flex-1 overflow-hidden">
                {isLoadingContent ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : viewMode === "preview" && selectedIsHtml ? (
                  isLoadingPreview ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Préparation de l’aperçu HTML...</span>
                    </div>
                  ) : previewHtml ? (
                    <iframe
                      srcDoc={previewHtml}
                      title="Preview"
                      className="w-full h-full border-0 bg-white"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Aperçu indisponible pour ce fichier HTML
                    </div>
                  )
                ) : viewMode === "preview" && canPreviewReact ? (
                  isLoadingReactFiles ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Chargement du projet React...</span>
                    </div>
                  ) : (
                    <ReactPreview 
                      files={files} 
                      fileContents={reactFileContents}
                      className="h-full"
                    />
                  )
                ) : selectedFile.file_type === "code" && fileContent ? (
                  <CodeViewer 
                    code={fileContent} 
                    fileName={selectedFile.file_name}
                    className="h-full rounded-none"
                  />
                ) : selectedFile.file_type === "image" ? (
                  <div className="h-full flex items-center justify-center p-8 bg-muted/30">
                    <img 
                      src={extractionService.getFileUrl(selectedFile.storage_path)} 
                      alt={selectedFile.file_name}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                  </div>
                ) : selectedFile.file_type === "code" ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Fichier vide
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-8 text-center">
                    <File className="h-12 w-12 opacity-50" />
                    <div>
                      <p className="font-medium">Fichier binaire</p>
                      <p className="text-sm">Ce type de fichier ne peut pas être affiché en texte.</p>
                    </div>
                    <a
                      href={extractionService.getFileUrl(selectedFile.storage_path)}
                      download={selectedFile.file_name}
                      className="text-sm text-primary hover:underline"
                    >
                      Télécharger
                    </a>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/30">
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
