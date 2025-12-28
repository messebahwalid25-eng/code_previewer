import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();
    
    if (!projectId) {
      console.error("Missing projectId in request");
      return new Response(
        JSON.stringify({ error: "projectId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting extraction for project: ${projectId}`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("Project not found:", projectError);
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found project: ${project.name}, file_path: ${project.file_path}`);

    // Update project status to processing
    await supabase
      .from("projects")
      .update({ status: "processing" })
      .eq("id", projectId);

    // Download the zip file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("project-files")
      .download(project.file_path);

    if (downloadError || !fileData) {
      console.error("Failed to download file:", downloadError);
      await supabase
        .from("projects")
        .update({ status: "error", error_message: "Failed to download file" })
        .eq("id", projectId);
      return new Response(
        JSON.stringify({ error: "Failed to download project file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("File downloaded, size:", fileData.size);

    // Extract the zip file
    const zip = new JSZip();
    const arrayBuffer = await fileData.arrayBuffer();
    const contents = await zip.loadAsync(arrayBuffer);

    console.log("Zip loaded, files count:", Object.keys(contents.files).length);

    const extractedFiles: Array<{
      file_name: string;
      file_path: string;
      file_type: string;
      file_size: number;
      storage_path: string;
    }> = [];

    let detectedProjectType: "html_css_js" | "react" | "flutter_web" | "unknown" = "unknown";
    let hasPackageJson = false;
    let hasIndexHtml = false;
    let hasPubspec = false;

    // First pass: detect project type
    for (const [filePath] of Object.entries(contents.files)) {
      const fileName = filePath.split("/").pop()?.toLowerCase() || "";
      if (fileName === "package.json") hasPackageJson = true;
      if (fileName === "index.html") hasIndexHtml = true;
      if (fileName === "pubspec.yaml") hasPubspec = true;
    }

    if (hasPubspec) {
      detectedProjectType = "flutter_web";
    } else if (hasPackageJson) {
      detectedProjectType = "react";
    } else if (hasIndexHtml) {
      detectedProjectType = "html_css_js";
    }

    console.log("Detected project type:", detectedProjectType);

    // Second pass: extract files
    for (const [filePath, file] of Object.entries(contents.files)) {
      // Skip directories and hidden files
      if (file.dir || filePath.startsWith(".") || filePath.includes("/.")) {
        continue;
      }

      // Skip node_modules and other large directories
      if (filePath.includes("node_modules/") || filePath.includes(".git/")) {
        continue;
      }

      try {
        const content = await file.async("arraybuffer");
        const fileName = filePath.split("/").pop() || filePath;
        const fileExtension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "";
        
        // Determine file type
        let fileType = "other";
        const codeExtensions = ["js", "ts", "jsx", "tsx", "html", "css", "scss", "less", "json", "xml", "yaml", "yml", "md", "dart"];
        const imageExtensions = ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"];
        
        if (codeExtensions.includes(fileExtension || "")) {
          fileType = "code";
        } else if (imageExtensions.includes(fileExtension || "")) {
          fileType = "image";
        }

        // Generate storage path
        const storagePath = `${projectId}/${filePath}`;

        // Upload to extracted-files bucket
        const { error: uploadError } = await supabase.storage
          .from("extracted-files")
          .upload(storagePath, content, {
            contentType: getMimeType(fileExtension || ""),
            upsert: true,
          });

        if (uploadError) {
          console.error(`Failed to upload ${filePath}:`, uploadError);
          continue;
        }

        extractedFiles.push({
          file_name: fileName,
          file_path: filePath,
          file_type: fileType,
          file_size: content.byteLength,
          storage_path: storagePath,
        });

        console.log(`Extracted: ${filePath} (${content.byteLength} bytes)`);
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
      }
    }

    console.log(`Total files extracted: ${extractedFiles.length}`);

    // Insert extracted files records
    if (extractedFiles.length > 0) {
      const { error: insertError } = await supabase
        .from("extracted_files")
        .insert(
          extractedFiles.map((f) => ({
            project_id: projectId,
            file_name: f.file_name,
            file_path: f.file_path,
            file_type: f.file_type,
            file_size: f.file_size,
            storage_path: f.storage_path,
          }))
        );

      if (insertError) {
        console.error("Failed to insert extracted files:", insertError);
      }
    }

    // Update project status and type
    await supabase
      .from("projects")
      .update({ 
        status: "ready", 
        project_type: detectedProjectType,
        error_message: null 
      })
      .eq("id", projectId);

    console.log("Extraction complete!");

    return new Response(
      JSON.stringify({
        success: true,
        projectType: detectedProjectType,
        filesCount: extractedFiles.length,
        files: extractedFiles.slice(0, 20), // Return first 20 files
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Extraction error:", error);
    const errorMessage = error instanceof Error ? error.message : "Extraction failed";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    js: "application/javascript",
    ts: "application/typescript",
    jsx: "application/javascript",
    tsx: "application/typescript",
    html: "text/html",
    css: "text/css",
    scss: "text/x-scss",
    less: "text/x-less",
    json: "application/json",
    xml: "application/xml",
    yaml: "text/yaml",
    yml: "text/yaml",
    md: "text/markdown",
    dart: "text/x-dart",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    ico: "image/x-icon",
  };
  return mimeTypes[extension] || "application/octet-stream";
}
