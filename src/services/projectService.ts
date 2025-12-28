import { supabase } from "@/integrations/supabase/client";

export interface Project {
  id: string;
  name: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  status: "pending" | "processing" | "ready" | "error";
  project_type: "html_css_js" | "react" | "flutter_web" | "unknown";
  preview_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export const projectService = {
  async getProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching projects:", error);
      throw error;
    }

    return data as Project[];
  },

  async getProject(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching project:", error);
      throw error;
    }

    return data as Project | null;
  },

  async deleteProject(id: string): Promise<void> {
    // First get the project to get the file path
    const project = await this.getProject(id);
    
    if (project) {
      // Delete the file from storage
      const { error: storageError } = await supabase.storage
        .from("project-files")
        .remove([project.file_path]);

      if (storageError) {
        console.error("Error deleting project file:", storageError);
      }
    }

    // Delete the project record
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  },

  async updateProjectStatus(
    id: string, 
    status: Project["status"], 
    additionalFields?: Partial<Pick<Project, "project_type" | "preview_url" | "error_message">>
  ): Promise<Project> {
    const { data, error } = await supabase
      .from("projects")
      .update({ status, ...additionalFields })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating project status:", error);
      throw error;
    }

    return data as Project;
  },

  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  getStatusLabel(status: Project["status"]): string {
    const labels: Record<Project["status"], string> = {
      pending: "En attente",
      processing: "En cours d'analyse",
      ready: "Prêt",
      error: "Erreur",
    };
    return labels[status];
  },

  getProjectTypeLabel(type: Project["project_type"]): string {
    const labels: Record<Project["project_type"], string> = {
      html_css_js: "HTML/CSS/JS",
      react: "React",
      flutter_web: "Flutter Web",
      unknown: "Non détecté",
    };
    return labels[type];
  },
};
