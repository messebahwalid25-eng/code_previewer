import { Upload, Cpu, Eye, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Upload,
    number: "01",
    title: "Uploadez",
    description: "Glissez votre archive .zip ou .rar contenant votre projet web.",
  },
  {
    icon: Cpu,
    number: "02",
    title: "Analysez",
    description: "Notre système extrait et détecte automatiquement le type de projet.",
  },
  {
    icon: Eye,
    number: "03",
    title: "Prévisualisez",
    description: "Visualisez le rendu de votre site en temps réel sur tous les écrans.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Comment ça <span className="text-gradient">marche</span> ?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Trois étapes simples pour visualiser votre projet.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50" />

            {steps.map((step, index) => (
              <div key={step.number} className="relative flex flex-col items-center text-center group">
                {/* Step number badge */}
                <div className="relative mb-6">
                  <div className="w-32 h-32 rounded-3xl bg-card border border-border group-hover:border-primary/50 flex items-center justify-center transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/10">
                    <step.icon className="w-12 h-12 text-primary" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-primary text-primary-foreground font-mono font-bold text-sm flex items-center justify-center shadow-lg shadow-primary/30">
                    {step.number}
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  {step.description}
                </p>

                {/* Arrow for mobile */}
                {index < steps.length - 1 && (
                  <ArrowRight className="md:hidden w-6 h-6 text-primary mt-6 rotate-90" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
