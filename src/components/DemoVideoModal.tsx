import { X, Play } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import demoVideo from "@/assets/codepreviewer-demo.mp4.asset.json";

interface DemoVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DemoVideoModal = ({ open, onOpenChange }: DemoVideoModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl p-0 border-border/60 bg-card overflow-hidden rounded-2xl"
      >

        <DialogTitle className="sr-only">Démo de CodePreviewer</DialogTitle>
        <div className="relative">
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Fermer"
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-background/80 border border-border/60 flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-6 pt-5 pb-3">
            <Play className="w-4 h-4 text-primary" />
            <span className="font-display font-semibold text-foreground">
              Démo — de l'upload à l'aperçu
            </span>
          </div>
          <video
            key={open ? "open" : "closed"}
            src={demoVideo.url}
            controls
            autoPlay
            playsInline
            className="w-full aspect-video bg-background"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DemoVideoModal;
