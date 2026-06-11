import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'og-image.png');

const wheelSvg = readFileSync(
  join(__dirname, '..', 'public', 'favicon.svg'),
  'utf-8'
);

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px;
    height: 630px;
    background: #0a0e1a;
    font-family: 'Cormorant Garamond', Georgia, serif;
    overflow: hidden;
    position: relative;
  }

  .wheel-glow {
    position: absolute;
    top: 60px;
    right: 100px;
    width: 460px;
    height: 460px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(235,160,190,0.07) 0%, rgba(201,162,39,0.05) 40%, transparent 70%);
    pointer-events: none;
  }

  .content {
    position: relative;
    z-index: 1;
    display: flex;
    height: 100%;
    padding: 72px 80px;
    gap: 40px;
  }

  .left {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 20px;
  }

  .logo-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .logo-row svg {
    width: 48px;
    height: 48px;
  }

  .brand {
    font-size: 50px;
    font-weight: 700;
    color: #e8e0d0;
    letter-spacing: 0.02em;
  }

  .tagline {
    font-size: 26px;
    font-weight: 400;
    font-style: italic;
    color: #c9a227;
    line-height: 1.4;
    max-width: 460px;
  }

  .description {
    font-size: 18px;
    font-weight: 400;
    color: #8a8a8a;
    line-height: 1.6;
    max-width: 460px;
    font-family: -apple-system, sans-serif;
  }

  .features {
    display: flex;
    gap: 24px;
    margin-top: 8px;
  }

  .feature {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #8a8a8a;
    font-size: 15px;
    font-weight: 400;
    font-family: -apple-system, sans-serif;
  }

  .feature-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #c9a227;
    flex-shrink: 0;
  }

  .right {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 380px;
  }

  .wheel-container {
    position: relative;
  }

  .wheel-container svg {
    width: 380px;
    height: 380px;
    filter: drop-shadow(0 0 40px rgba(235,160,190,0.10)) drop-shadow(0 0 80px rgba(201,162,39,0.06));
  }

  .url {
    position: absolute;
    bottom: 40px;
    left: 80px;
    font-size: 16px;
    color: #5a5a58;
    letter-spacing: 0.08em;
    font-family: -apple-system, sans-serif;
  }
</style>
</head>
<body>
  <div class="wheel-glow"></div>
  <div class="content">
    <div class="left">
      <div class="logo-row">
        <span class="brand">The Archeometer</span>
      </div>
      <div class="tagline">Key to All Religions and<br>All Sciences of Antiquity.</div>
      <div class="description">
        The first complete English translation of Saint-Yves d'Alveydre's masterwork, with interactive tools.
      </div>
      <div class="features">
        <div class="feature"><div class="feature-dot"></div>Read Online</div>
        <div class="feature"><div class="feature-dot"></div>Gematria Player</div>
        <div class="feature"><div class="feature-dot"></div>Natal Chart</div>
      </div>
    </div>
    <div class="right">
      <div class="wheel-container">
        ${wheelSvg.replace(/width="32"/, 'width="380"').replace(/height="32"/, 'height="380"')}
      </div>
    </div>
  </div>
  <div class="url">thearcheometer.com</div>
</body>
</html>`;

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({
    path: OUT,
    clip: { x: 0, y: 0, width: 1200, height: 630 },
  });

  await browser.close();
  console.log(`OG image saved to: ${OUT}`);
}

run().catch(console.error);
