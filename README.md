# CORS Proxy Server

Simple proxy server to bypass CORS restrictions when making API requests from the browser.

## Features

- ✅ Bypass CORS restrictions
- ✅ Support for all HTTP methods (GET, POST, PUT, DELETE, etc.)
- ✅ Header forwarding
- ✅ JSON and text response handling
- ✅ Error handling and validation
- ✅ Deployed on Vercel for easy access

## Usage

### Basic Usage

```javascript
// Instead of making a direct request that gets blocked by CORS:
// fetch('https://api.example.com/data') // ❌ CORS error

// Use the proxy:
fetch('https://your-proxy-domain.vercel.app/api/proxy?url=https://api.example.com/data')
  .then(response => response.json())
  .then(data => console.log(data));
```

### With different HTTP methods

```javascript
// GET request
fetch('https://your-proxy-domain.vercel.app/api/proxy?url=https://api.example.com/users')

// POST request
fetch('https://your-proxy-domain.vercel.app/api/proxy?url=https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com'
  })
})
```

## Deploy to Vercel

1. Fork or clone this repository
2. Connect to Vercel
3. Deploy with default settings

### Manual deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## API Endpoint

### `/api/proxy`

**Query Parameters:**
- `url` (required): The target URL to proxy the request to

**Supported Methods:**
- GET, POST, PUT, DELETE, OPTIONS

**Headers:**
- All standard headers are forwarded
- CORS headers are automatically added

## Security Notes

- This proxy allows requests to any URL
- Consider implementing URL whitelist for production use
- Be aware of rate limits from target APIs
- Don't expose sensitive data through proxy requests

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000/api/proxy?url=https://api.example.com` to test locally.

## Error Handling

The proxy returns appropriate HTTP status codes and error messages:

- `400`: Missing or invalid URL parameter
- `500`: Proxy request failed
- Other status codes are forwarded from the target API

## License

MIT