export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Get target URL from query parameter
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'Missing url parameter',
        usage: 'GET /api/proxy?url=https://example.com/api/endpoint'
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

    // Copy all headers except hop-by-hop headers (RFC 7230)
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
      'transfer-encoding'       // Transfer method specification
    ];

    Object.keys(req.headers).forEach(key => {
      if (!excludedHeaders.includes(key.toLowerCase())) {
        fetchOptions.headers[key] = req.headers[key];
      }
    });

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