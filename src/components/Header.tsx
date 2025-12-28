import { Code2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Code2 className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">
            Code<span className="text-primary">Previewer</span>
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
            Fonctionnalités
          </a>
          <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
            Comment ça marche
          </a>
          <a href="#users" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
            Utilisateurs
          </a>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" size="sm">
            Connexion
          </Button>
          <Button variant="hero" size="sm">
            Commencer
          </Button>
        </div>

        <button 
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-card border-b border-border animate-fade-in">
          <nav className="container mx-auto px-6 py-4 flex flex-col gap-4">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors py-2">
              Fonctionnalités
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors py-2">
              Comment ça marche
            </a>
            <a href="#users" className="text-muted-foreground hover:text-foreground transition-colors py-2">
              Utilisateurs
            </a>
            <div className="flex flex-col gap-3 pt-4 border-t border-border">
              <Button variant="ghost">Connexion</Button>
              <Button variant="hero">Commencer</Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
