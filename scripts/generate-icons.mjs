import sharp from 'sharp';
import { writeFileSync } from 'fs';

/**
 * Generate PWA icons from SVG or create placeholder icons
 */

const sizes = [192, 512];

// Create a simple placeholder icon with gradient background
async function createPlaceholderIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f43f5e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.15}"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="${size * 0.35}" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="central"
      >ACM</text>
    </svg>
  `;

  return Buffer.from(svg);
}

async function generateIcons() {
  console.log('Generating PWA icons...');

  for (const size of sizes) {
    try {
      const svgBuffer = await createPlaceholderIcon(size);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(`client/public/icon-${size}.png`);
      
      console.log(`✓ Generated icon-${size}.png`);
    } catch (error) {
      console.error(`✗ Failed to generate icon-${size}.png:`, error.message);
    }
  }

  // Generate favicon
  try {
    const svgBuffer = await createPlaceholderIcon(32);
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile('client/public/favicon.png');
    console.log('✓ Generated favicon.png');
  } catch (error) {
    console.error('✗ Failed to generate favicon.png:', error.message);
  }

  // Generate apple-touch-icon
  try {
    const svgBuffer = await createPlaceholderIcon(180);
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile('client/public/apple-touch-icon.png');
    console.log('✓ Generated apple-touch-icon.png');
  } catch (error) {
    console.error('✗ Failed to generate apple-touch-icon.png:', error.message);
  }

  console.log('\n✨ Icon generation complete!');
  console.log('Icons saved to client/public/');
}

generateIcons().catch(console.error);
