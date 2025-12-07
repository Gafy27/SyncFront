import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { type Server } from "http";
import { nanoid } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Dynamic imports for vite (only needed in development)
  // Use eval to prevent esbuild from statically analyzing the import
  const viteModuleName = "vite";
  const viteConfigPath = "../vite.config";
  
  let viteModule: any;
  let viteConfig: any;
  
  try {
    // Use eval to create a dynamic import that esbuild can't analyze at build time
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    viteModule = await eval(`import("${viteModuleName}")`);
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    viteConfig = await eval(`import("${viteConfigPath}")`);
  } catch (error) {
    throw new Error("Vite is required for development mode. Make sure vite is installed.");
  }
  
  const createViteServer = viteModule.createServer;
  const createLogger = viteModule.createLogger;
  const viteLogger = createLogger();
  
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig.default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg: string, options?: any) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      
      // Inject runtime demo mode configuration
      const demoMode = process.env.VITE_DEMO_MODE || 'true';
      const scriptTag = `<script>window.__RUNTIME_DEMO_MODE__ = ${demoMode === 'true' || demoMode === '1' ? 'true' : 'false'};</script>`;
      
      // Inject before closing </head> tag, or at the beginning if no head tag
      if (template.includes('</head>')) {
        template = template.replace('</head>', `${scriptTag}</head>`);
      } else {
        template = scriptTag + template;
      }
      
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    let html = await fs.promises.readFile(indexPath, "utf-8");
    
    // Inject runtime demo mode configuration
    const demoMode = process.env.VITE_DEMO_MODE || 'true';
    const scriptTag = `<script>window.__RUNTIME_DEMO_MODE__ = ${demoMode === 'true' || demoMode === '1' ? 'true' : 'false'};</script>`;
    
    // Inject before closing </head> tag, or at the beginning if no head tag
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${scriptTag}</head>`);
    } else {
      html = scriptTag + html;
    }
    
    res.status(200).set({ "Content-Type": "text/html" }).send(html);
  });
}
