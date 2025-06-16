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

    // Extract OGP data
    const ogImage = extractOGPImage(html);
    const ogTitle = extractOGPTitle(html);
    const ogDescription = extractOGPDescription(html);
    
    // Extract fallback data
    const heroImage = ogImage ? null : extractHeroImage(html);
    const title = ogTitle || extractTitle(html);
    const description = ogDescription || extractDescription(html);

    const imageUrl = ogImage || heroImage;

    res.json({
      url: targetUrl.toString(),
      title: title || null,
      description: description || null,
      image: imageUrl ? (imageUrl.startsWith('http') 
        ? imageUrl 
        : new URL(imageUrl, targetUrl).toString()) : null,
      type: {
        title: ogTitle ? 'og:title' : (title ? 'title' : null),
        description: ogDescription ? 'og:description' : (description ? 'meta' : null),
        image: ogImage ? 'og:image' : (heroImage ? 'hero' : null)
      }
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

function extractOGPTitle(html) {
  // Look for og:title meta tag
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                       html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["'][^>]*>/i);
  
  return ogTitleMatch ? ogTitleMatch[1] : null;
}

function extractOGPDescription(html) {
  // Look for og:description meta tag
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["'][^>]*>/i);
  
  return ogDescMatch ? ogDescMatch[1] : null;
}

function extractTitle(html) {
  // First try to get the title tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  // Fallback to h1 tag
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  return h1Match ? h1Match[1].trim() : null;
}

function extractDescription(html) {
  // Look for meta description tag
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);
  
  return metaDescMatch ? metaDescMatch[1] : null;
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