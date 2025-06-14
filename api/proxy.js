export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Get target URL from query parameter or request body
    let url = req.query.url;
    
    // If POST request, try to get URL from body
    if (req.method === 'POST' && req.body && req.body.url) {
      url = req.body.url;
    }
    
    
    if (!url) {
      return res.status(400).json({ 
        error: 'Missing url parameter',
        usage: 'GET /api/proxy?url=https://example.com/api/endpoint OR POST with {"url": "https://example.com/api/endpoint"}'
      });
    }

    // Validate URL
    let targetUrl;
    try {
      targetUrl = new URL(url);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid URL format',
        provided: url
      });
    }

    // Prepare fetch options
    const fetchOptions = {
      method: req.method,
      headers: {}
    };

    // Copy all headers except hop-by-hop headers (RFC 7230) and platform-specific headers
    // These headers are connection-specific and should not be forwarded by proxies
    const excludedHeaders = [
      'host',                   // Target host conflicts with original host
      'connection',             // HTTP connection management 
      'upgrade',                // Protocol upgrade (WebSocket, etc.)
      'keep-alive',             // Connection persistence management
      'proxy-authenticate',     // Proxy authentication (internal use)
      'proxy-authorization',    // Proxy authorization (internal use)
      'te',                     // Transfer encoding negotiation
      'trailer',                // Chunked encoding trailers
      'transfer-encoding',      // Transfer method specification
      // Vercel/platform specific headers
      'x-vercel-id',
      'x-vercel-deployment-url',
      'x-vercel-forwarded-for',
      'x-vercel-proxy-signature',
      'x-vercel-proxy-signature-ts',
      'x-vercel-oidc-token',
      'forwarded',
      'x-forwarded-host',
      'x-forwarded-for',
      'x-forwarded-proto',
      // CloudFlare headers
      'cf-ray',
      'cf-visitor',
      'cf-connecting-ip'
    ];

    Object.keys(req.headers).forEach(key => {
      if (!excludedHeaders.includes(key.toLowerCase())) {
        fetchOptions.headers[key] = req.headers[key];
      }
    });

    // Set appropriate headers for API requests - use original user-agent if available
    if (!fetchOptions.headers['user-agent']) {
      fetchOptions.headers['user-agent'] = req.headers['user-agent'] || 'CORS-Proxy/1.0.0';
    }

    // Add request body for POST/PUT requests
    if (req.method === 'POST' || req.method === 'PUT') {
      fetchOptions.body = JSON.stringify(req.body);
      fetchOptions.headers['content-type'] = 'application/json';
    }

    // Make the request
    const response = await fetch(targetUrl.toString(), fetchOptions);
    const data = await response.text();

    // Set response headers
    res.status(response.status);
    
    // Copy response headers
    response.headers.forEach((value, key) => {
      // Skip headers that might cause issues
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Try to parse as JSON, fallback to text
    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch {
      res.send(data);
    }

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy request failed',
      message: error.message
    });
  }
}