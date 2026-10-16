import { useEffect, useMemo, useRef, useState } from "react";
import { extractionService, type ExtractedFile } from "@/services/extractionService";
import { compilePreview } from "@/lib/preview/compiler";
import { Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReactPreviewProps {
  files: ExtractedFile[];
  fileContents: Record<string, string>;
  className?: string;
}

const ReactPreview = ({ files, fileContents, className = "" }: ReactPreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const input = useMemo(() => Object.fromEntries(files.flatMap(file => {
    const content = fileContents[file.storage_path];
    return content === undefined ? [] : [[file.file_path, content]];
  })), [files, fileContents]);
  const assets = useMemo(() => Object.fromEntries(files.filter(file => file.file_type !== "code").map(file => [file.file_path, extractionService.getFileUrl(file.storage_path)])), [files]);

  useEffect(() => {
    let active = true;
    setHtml(null);
    setError(null);
    compilePreview(input, assets).then(result => { if (active) setHtml(result); }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : String(reason));
    });
    return () => { active = false; };
  }, [input, assets, attempt]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || event.data?.type !== "react-preview-error") return;
      setError(String(event.data.message));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return <div className={`relative min-h-[600px] h-full w-full ${className}`}>
    {error ? <div role="alert" className="flex h-full min-h-[600px] flex-col items-center justify-center gap-4 bg-background p-6 text-foreground">
      <p className="font-medium">Impossible de lancer l’aperçu</p>
      <pre className="max-w-full whitespace-pre-wrap break-words text-sm text-destructive">{error}</pre>
      <Button variant="outline" onClick={() => setAttempt(value => value + 1)}><RotateCw className="mr-2 h-4 w-4" />Réessayer</Button>
    </div> : html ? <iframe ref={iframeRef} srcDoc={html} title="React Preview" className="w-full h-full min-h-[600px] border-0" sandbox="allow-scripts allow-forms allow-popups allow-modals" /> :
      <div className="flex min-h-[600px] h-full items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Préparation de l’aperçu React...</div>}
  </div>;
};

export default ReactPreview;
