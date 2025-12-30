import { extractionService, ExtractedFile } from "./extractionService";

export const previewService = {
  /**
   * Build a complete HTML document with all CSS and JS inlined
   * so it can be rendered in an iframe
   */
  async buildPreviewHtml(
    htmlContent: string,
    projectId: string,
    files: ExtractedFile[]
  ): Promise<string> {
    let processedHtml = htmlContent;

    // Find all CSS and JS files in the project
    const cssFiles = files.filter(f => f.file_name.endsWith(".css"));
    const jsFiles = files.filter(f => f.file_name.endsWith(".js"));

    // Load all CSS contents
    const cssContents: Record<string, string> = {};
    for (const cssFile of cssFiles) {
      const content = await extractionService.getFileContent(cssFile.storage_path);
      if (content) {
        cssContents[cssFile.file_name] = content;
        cssContents[cssFile.file_path] = content;
      }
    }

    // Load all JS contents
    const jsContents: Record<string, string> = {};
    for (const jsFile of jsFiles) {
      const content = await extractionService.getFileContent(jsFile.storage_path);
      if (content) {
        jsContents[jsFile.file_name] = content;
        jsContents[jsFile.file_path] = content;
      }
    }

    // Replace <link rel="stylesheet" href="..."> with inline <style>
    processedHtml = processedHtml.replace(
      /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi,
      (match, href) => {
        const fileName = href.split("/").pop() || href;
        const css = cssContents[fileName] || cssContents[href];
        if (css) {
          return `<style>/* ${fileName} */\n${css}</style>`;
        }
        return match; // Keep original if not found
      }
    );

    // Also handle href before rel
    processedHtml = processedHtml.replace(
      /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*\/?>/gi,
      (match, href) => {
        const fileName = href.split("/").pop() || href;
        const css = cssContents[fileName] || cssContents[href];
        if (css) {
          return `<style>/* ${fileName} */\n${css}</style>`;
        }
        return match;
      }
    );

    // Replace <script src="..."> with inline <script>
    processedHtml = processedHtml.replace(
      /<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi,
      (match, src) => {
        // Skip external scripts (http, https, //)
        if (src.startsWith("http") || src.startsWith("//")) {
          return match;
        }
        const fileName = src.split("/").pop() || src;
        const js = jsContents[fileName] || jsContents[src];
        if (js) {
          return `<script>/* ${fileName} */\n${js}</script>`;
        }
        return match;
      }
    );

    // Replace image src with actual storage URLs
    const imageFiles = files.filter(f => f.file_type === "image");
    for (const imgFile of imageFiles) {
      const imgUrl = extractionService.getFileUrl(imgFile.storage_path);
      // Replace relative image references
      const escapedName = imgFile.file_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const imgRegex = new RegExp(`(src|href)=["']([^"']*${escapedName})["']`, 'gi');
      processedHtml = processedHtml.replace(imgRegex, `$1="${imgUrl}"`);
    }

    // Add base styles to ensure proper rendering
    if (!processedHtml.includes("<head>")) {
      processedHtml = processedHtml.replace(
        "<html>",
        "<html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head>"
      );
    }

    return processedHtml;
  },
};
