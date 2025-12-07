import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

const SYNC_API_URL = process.env.SYNC_API_URL || 'http://127.0.0.1:3000';

async function proxyRequest(req: Request, res: Response, basePath: string) {
  try {
    // Use req.originalUrl to get the full path
    // Backend routes: /api/organizations, /api/applications, /device, /api/services, /api/query, /api/library
    const originalPath = req.originalUrl.split('?')[0]; // Remove query string
    let targetPath: string;
    
    // basePath tells us what the backend expects
    // For /api/device -> convert to /device
    // For everything else -> keep as-is (basePath matches the route)
    if (basePath === '/device' && originalPath.startsWith('/api/device')) {
      targetPath = originalPath.replace('/api/device', '/device');
    } else {
      // Keep path as-is (basePath should match the route prefix)
      targetPath = originalPath;
    }
    
    const queryString = req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '';
    const url = `${SYNC_API_URL}${targetPath}${queryString}`;
    
    console.log(`[Proxy] ${req.method} ${req.originalUrl} -> ${url}`);
    if (req.body) {
      console.log(`[Proxy] Body:`, JSON.stringify(req.body));
    }
    
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && { Authorization: req.headers.authorization as string }),
      },
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'DELETE' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, fetchOptions);

    // Forward response headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Handle binary content (images, files, etc.)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.startsWith('image/') || contentType.startsWith('application/octet-stream')) {
      // For images and binary content, pipe the response directly
      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: text });
      }
      const buffer = await response.arrayBuffer();
      res.status(response.status).send(Buffer.from(buffer));
      return;
    }

    // Handle JSON responses
    let data;
    if (contentType.includes('application/json')) {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('[Proxy] Failed to parse JSON:', text);
        return res.status(response.status).json({ 
          error: 'Invalid JSON response from Sync API',
          raw: text 
        });
      }
    } else {
      const text = await response.text();
      data = { message: text };
    }

    if (!response.ok) {
      console.error(`[Proxy] Error response from SyncAPI: ${response.status} -`, data);
      return res.status(response.status).json(data);
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Proxy] Connection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[Proxy] Full error:', { message: errorMessage, stack: errorStack });
    res.status(500).json({ 
      error: 'Failed to connect to Sync API',
      message: errorMessage,
      url: SYNC_API_URL,
      hint: 'Make sure SyncAPI is running on port 3000'
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Proxy routes to SyncAPI - app.use automatically matches all sub-paths
  // Keep paths as-is since backend expects /api/organizations, etc.
  // These must be registered BEFORE any catch-all routes
  app.use('/api/organizations', (req, res) => proxyRequest(req, res, '/api/organizations'));
  app.use('/api/applications', (req, res) => proxyRequest(req, res, '/api/applications'));
  app.use('/api/device', (req, res) => proxyRequest(req, res, '/device'));
  app.use('/api/connectors', (req, res) => proxyRequest(req, res, '/api/connectors'));
  app.use('/api/services', (req, res) => proxyRequest(req, res, '/api/services'));
  app.use('/api/query', (req, res) => proxyRequest(req, res, '/api/query'));
  app.use('/api/library', (req, res) => proxyRequest(req, res, '/api/library'));

  const httpServer = createServer(app);

  return httpServer;
}
