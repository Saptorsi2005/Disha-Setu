/**
 * Script to convert app_logo.svg to PNG files for Expo app icons.
 * Generates:
 * - icon.png (1024x1024) - main app icon
 * - splash-icon.png (200x200) - splash screen icon  
 * - android-icon-foreground.png (1024x1024) - adaptive icon foreground
 * - android-icon-monochrome.png (1024x1024) - monochrome adaptive icon
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const svgPath = path.join(__dirname, '../assets/images/app_logo.svg');
const assetsDir = path.join(__dirname, '../assets/images');

const tasks = [
  {
    output: path.join(assetsDir, 'icon.png'),
    width: 1024,
    height: 1024,
    label: 'icon.png (1024x1024)',
  },
  {
    output: path.join(assetsDir, 'splash-icon.png'),
    width: 200,
    height: 200,
    label: 'splash-icon.png (200x200)',
  },
  {
    output: path.join(assetsDir, 'android-icon-foreground.png'),
    width: 1024,
    height: 1024,
    label: 'android-icon-foreground.png (1024x1024)',
  },
  {
    output: path.join(assetsDir, 'android-icon-monochrome.png'),
    width: 1024,
    height: 1024,
    label: 'android-icon-monochrome.png (1024x1024)',
    grayscale: true,
  },
];

(async () => {
  for (const task of tasks) {
    let pipeline = sharp(svgPath).resize(task.width, task.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // transparent background
    });

    if (task.grayscale) {
      pipeline = pipeline.grayscale();
    }

    await pipeline.png().toFile(task.output);
    console.log(`✓ Generated ${task.label}`);
  }

  console.log('\nAll icons generated successfully!');
})();
