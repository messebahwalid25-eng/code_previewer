import { AlertTriangle, CheckCircle, Globe, Code, Smartphone } from "lucide-react";

interface ProjectTypeBadgeProps {
  projectType: "html_css_js" | "react" | "flutter_web" | "unknown";
  canPreview: boolean;
}

const projectTypeConfig = {
  html_css_js: {
    label: "HTML/CSS/JS",
    icon: Globe,
    color: "text-green-500 bg-green-500/10 border-green-500/30",
    description: "Prévisualisation disponible",
  },
  react: {
    label: "React",
    icon: Code,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
    description: "Nécessite compilation",
  },
  flutter_web: {
    label: "Flutter",
    icon: Smartphone,
    color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30",
    description: "Nécessite compilation",
  },
  unknown: {
    label: "Projet",
    icon: Code,
    color: "text-muted-foreground bg-muted border-border",
    description: "Type non détecté",
  },
};

const ProjectTypeBadge = ({ projectType, canPreview }: ProjectTypeBadgeProps) => {
  const config = projectTypeConfig[projectType];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.color}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
      
      <div className="flex items-center gap-1.5 text-sm">
        {canPreview ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-green-500">Prévisualisation disponible</span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-amber-500">Lecture de code uniquement</span>
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectTypeBadge;
