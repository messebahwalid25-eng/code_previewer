import { Upload, Search, Shield, Monitor, Zap, FileCode } from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Upload sécurisé",
    description: "Glissez-déposez vos fichiers .zip ou .rar en toute sécurité avec chiffrement de bout en bout.",
  },
  {
    icon: Search,
    title: "Analyse automatique",
    description: "Détection intelligente du type de projet : HTML, CSS, JavaScript et plus encore.",
  },
  {
    icon: Monitor,
    title: "Preview responsive",
    description: "Visualisez votre site sur desktop, tablette et mobile instantanément.",
  },
  {
    icon: Shield,
    title: "Isolation Docker",
    description: "Chaque projet s'exécute dans un environnement isolé pour une sécurité maximale.",
  },
  {
    icon: Zap,
    title: "Rendu instantané",
    description: "Extraction et compilation ultra-rapides pour une prévisualisation en quelques secondes.",
  },
  {
    icon: FileCode,
    title: "Multi-framework",
    description: "Support prévu pour React, Flutter Web et d'autres frameworks modernes.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Fonctionnalités <span className="text-gradient">puissantes</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tout ce dont vous avez besoin pour prévisualiser vos projets web en un clic.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
