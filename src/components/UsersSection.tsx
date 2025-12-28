import { GraduationCap, Users, Code2, Briefcase } from "lucide-react";

const userTypes = [
  {
    icon: GraduationCap,
    title: "Étudiants",
    description: "Testez rapidement vos projets de cours et partagez-les avec vos professeurs.",
    color: "primary",
  },
  {
    icon: Users,
    title: "Enseignants",
    description: "Évaluez les travaux de vos étudiants sans configuration complexe.",
    color: "accent",
  },
  {
    icon: Code2,
    title: "Développeurs juniors",
    description: "Présentez vos premiers projets de manière professionnelle.",
    color: "primary",
  },
  {
    icon: Briefcase,
    title: "Recruteurs",
    description: "Visualisez les portfolios des candidats instantanément.",
    color: "accent",
  },
];

const UsersSection = () => {
  return (
    <section id="users" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Conçu pour <span className="text-gradient">vous</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Une solution adaptée à tous les acteurs de l'écosystème tech.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {userTypes.map((user, index) => (
            <div
              key={user.title}
              className="group relative p-6 rounded-2xl bg-card border border-border overflow-hidden transition-all duration-300 hover:border-primary/30"
            >
              {/* Glow effect on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${user.color === 'primary' ? 'from-primary/10' : 'from-accent/10'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl ${user.color === 'primary' ? 'bg-primary/10 border-primary/20' : 'bg-accent/10 border-accent/20'} border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <user.icon className={`w-7 h-7 ${user.color === 'primary' ? 'text-primary' : 'text-accent'}`} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {user.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {user.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UsersSection;
