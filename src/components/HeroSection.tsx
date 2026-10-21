import { useState } from "react";
import { Upload, ArrowRight, Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import UploadZone from "./UploadZone";
import DemoVideoModal from "./DemoVideoModal";

const HeroSection = () => {
  const [demoOpen, setDemoOpen] = useState(false);

  const scrollToUpload = () => {
    const uploadZone = document.querySelector('[data-upload-zone]');
    if (uploadZone) {
      uploadZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };


  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 animate-fade-up">
            <Sparkles className="w-4 h-4" />
            <span>Prévisualisez vos projets instantanément</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Uploadez votre code,
            <br />
            <span className="text-gradient">visualisez le rendu</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            CodePreviewer analyse automatiquement vos projets .zip ou .rar et génère 
            une prévisualisation interactive de vos sites web HTML, CSS et JavaScript.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <Button variant="hero" size="xl" className="group" onClick={scrollToUpload}>
              <Upload className="w-5 h-5" />
              Uploader un projet
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="heroOutline" size="xl" onClick={() => setDemoOpen(true)}>
              <Play className="w-5 h-5" />
              Voir une démo
            </Button>

          </div>

          {/* Upload Zone */}
          <div className="animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <UploadZone />
          </div>
        </div>
      </div>
      <DemoVideoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </section>
  );
};


export default HeroSection;
