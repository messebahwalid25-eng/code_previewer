import { Code2, Github, Twitter, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border bg-card/50">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">
              Code<span className="text-primary">Previewer</span>
            </span>
          </a>

          {/* Links */}
          <nav className="flex items-center gap-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Fonctionnalités
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Comment ça marche
            </a>
            <a href="#users" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Utilisateurs
            </a>
          </nav>

          {/* Social */}
          <div className="flex items-center gap-4">
            <a 
              href="#" 
              className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <a 
              href="#" 
              className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a 
              href="#" 
              className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            >
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-muted-foreground text-sm">
            © 2025 CodePreviewer. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
