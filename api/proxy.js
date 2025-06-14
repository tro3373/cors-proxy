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

    // Copy relevant headers (exclude host, connection, etc.)
    const allowedHeaders = [
      'content-type',
      'authorization',
      'x-api-key',
      'x-requested-with',
      'accept',
      'accept-language',
      'user-agent'
    ];

    Object.keys(req.headers).forEach(key => {
      if (allowedHeaders.includes(key.toLowerCase())) {
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