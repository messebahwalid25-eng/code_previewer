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
    let packageJsonContent = "";

    // First pass: detect project type
    for (const [filePath, file] of Object.entries(contents.files)) {
      if (file.dir) continue;
      const fileName = filePath.split("/").pop()?.toLowerCase() || "";
      if (fileName === "package.json" && !filePath.includes("node_modules/")) {
        hasPackageJson = true;
        try { packageJsonContent = await file.async("string"); } catch {}
      }
      if (fileName === "index.html") hasIndexHtml = true;
      if (fileName === "pubspec.yaml") hasPubspec = true;
    }

    if (hasPubspec) {
      detectedProjectType = "flutter_web";
    } else if (hasPackageJson) {
      // Detect framework from package.json
      const pkg = packageJsonContent.toLowerCase();
      if (pkg.includes('"react"') || pkg.includes('"next"')) {
        detectedProjectType = "react";
      } else {
        detectedProjectType = "react"; // default for node projects
      }
    } else if (hasIndexHtml) {
      detectedProjectType = "html_css_js";
    }

    console.log("Detected project type:", detectedProjectType);

    // Second pass: extract files (parallel)
    const fileEntries = Object.entries(contents.files);
    const uploadPromises: Promise<void>[] = [];

    for (const [filePath, file] of fileEntries) {
      // Skip directories and hidden files
      if (file.dir) {
        continue;
      }

      // Skip heavy/irrelevant directories
      if (
        filePath.includes("node_modules/") ||
        filePath.includes(".git/") ||
        filePath.includes("__MACOSX/") ||
        filePath.endsWith(".DS_Store") ||
        filePath.includes("/build/") ||
        filePath.includes("/dist/") && !filePath.endsWith("index.html")
      ) {
        continue;
      }

      const task = (async () => {
        try {
        const content = await file.async("arraybuffer");
        // Skip empty files and files > 5MB
        if (content.byteLength === 0 || content.byteLength > 5 * 1024 * 1024) {
          return;
        }
        const fileName = filePath.split("/").pop() || filePath;
        const fileExtension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "";

        // Determine file type — be inclusive
        const codeExtensions = new Set([
          "js","mjs","cjs","ts","jsx","tsx","html","htm","css","scss","sass","less",
          "json","jsonc","xml","yaml","yml","md","mdx","markdown","txt","log",
          "dart","py","rb","java","kt","kts","go","rs","php","swift","scala","groovy",
          "c","h","cpp","hpp","cc","cs","m","mm","sh","bash","zsh","fish","ps1","bat",
          "sql","graphql","gql","proto","toml","ini","conf","cfg","env","lock",
          "vue","svelte","astro","ejs","hbs","handlebars","pug","liquid",
          "r","jl","lua","pl","tcl","vim","el","clj","ex","exs","erl","hs","ml","fs",
          "gradle","cmake","mk","makefile","dockerfile","gitignore","gitattributes",
          "editorconfig","prettierrc","eslintrc","babelrc","npmrc","nvmrc"
        ]);
        const imageExtensions = new Set(["png","jpg","jpeg","gif","svg","webp","ico","bmp","avif"]);
        const lowerName = fileName.toLowerCase();
        const noExtTextFiles = new Set([
          "readme","license","licence","makefile","dockerfile","procfile",
          "gemfile","rakefile","pipfile",".env",".gitignore",".gitattributes",
          ".editorconfig",".npmrc",".nvmrc",".prettierrc",".eslintrc",".babelrc"
        ]);

        let fileType = "other";
        if (codeExtensions.has(fileExtension || "")) {
          fileType = "code";
        } else if (imageExtensions.has(fileExtension || "")) {
          fileType = "image";
        } else if (noExtTextFiles.has(lowerName)) {
          fileType = "code";
        } else if (!fileExtension) {
          // Try to detect text vs binary by sampling
          const bytes = new Uint8Array(content.slice(0, Math.min(512, content.byteLength)));
          let nonPrintable = 0;
          for (const b of bytes) {
            if (b === 0) { nonPrintable = bytes.length; break; }
            if (b < 9 || (b > 13 && b < 32)) nonPrintable++;
          }
          if (bytes.length > 0 && nonPrintable / bytes.length < 0.1) {
            fileType = "code";
          }
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
          return;
        }

        extractedFiles.push({
          file_name: fileName,
          file_path: filePath,
          file_type: fileType,
          file_size: content.byteLength,
          storage_path: storagePath,
        });
        } catch (err) {
          console.error(`Error processing ${filePath}:`, err);
        }
      })();
      uploadPromises.push(task);

      // Throttle: process in batches of 10
      if (uploadPromises.length >= 10) {
        await Promise.all(uploadPromises);
        uploadPromises.length = 0;
      }
    }
    await Promise.all(uploadPromises);

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
