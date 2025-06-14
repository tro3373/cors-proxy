export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
  }

  try {
    const url = req.query.url;

    if (!url) {
      return res.status(400).json({
        error: 'Missing url parameter',
        usage: 'GET /api/ogp?url=https://example.com'
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

    // Fetch the HTML content
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OGP-Bot/1.0.0; +https://cors-proxy.vercel.app)'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to fetch URL',
        status: response.status,
        statusText: response.statusText
      });
    }

    const html = await response.text();

    // Extract OGP image
    const ogImage = extractOGPImage(html);
    
    // Extract hero image as fallback
    const heroImage = ogImage ? null : extractHeroImage(html);

    const imageUrl = ogImage || heroImage;

    if (!imageUrl) {
      return res.status(404).json({
        error: 'No image found',
        message: 'Could not find og:image or hero image on the page'
      });
    }

    // Convert relative URLs to absolute URLs
    const absoluteImageUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : new URL(imageUrl, targetUrl).toString();

    res.json({
      url: targetUrl.toString(),
      image: absoluteImageUrl,
      type: ogImage ? 'og:image' : 'hero'
    });

  } catch (error) {
    console.error('OGP extraction error:', error);
    res.status(500).json({
      error: 'OGP extraction failed',
      message: error.message
    });
  }
}

function extractOGPImage(html) {
  // Look for og:image meta tag
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                       html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i);
  
  return ogImageMatch ? ogImageMatch[1] : null;
}

function extractHeroImage(html) {
  // Try multiple strategies to find a hero/main image
  
  // Strategy 1: Look for images with hero/banner related class names or IDs
  const heroSelectors = [
    /class=["'][^"']*hero[^"']*["'][^>]*src=["']([^"']+)["']/i,
    /class=["'][^"']*banner[^"']*["'][^>]*src=["']([^"']+)["']/i,
    /class=["'][^"']*featured[^"']*["'][^>]*src=["']([^"']+)["']/i,
    /id=["'][^"']*hero[^"']*["'][^>]*src=["']([^"']+)["']/i
  ];

  for (const selector of heroSelectors) {
    const match = html.match(selector);
    if (match) return match[1];
  }

  // Strategy 2: Look for the first large image (assume it might be a hero image)
  // This is a simple heuristic - look for img tags and try to find ones that might be significant
  const imgMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  
  if (imgMatches) {
    for (const imgTag of imgMatches) {
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
      if (srcMatch) {
        const src = srcMatch[1];
        // Skip small images, icons, and common UI elements
        if (!src.match(/\b(icon|logo|avatar|thumb|small|btn|button)\b/i) &&
            !src.match(/\.(svg)$/i) &&
            !src.includes('data:image')) {
          return src;
        }
      }
    }
  }

  return null;
}