"""
Generate the static image assets from the site's own code (run once, commit the results):

  public/hero-fallback.webp   still frame of the hero point cloud (shown instantly / on low-power devices)
  public/og-image.png         1200x630 social sharing image
  public/favicon-32.png, public/apple-touch-icon.png, public/icon-512.png

Usage (from the project root, after `npm run build`):
  npx astro preview --port 4321 &
  python3 scripts/generate_assets.py
Requires: pip install playwright pillow && playwright install chromium
"""
import glob
import io
import os
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

BASE = os.environ.get("SITE", "http://localhost:4321")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")

chunks = glob.glob(os.path.join(ROOT, "dist", "_astro", "hero-pointcloud.*.js"))
if not chunks:
    sys.exit("Build first: npm run build")
CHUNK = "/_astro/" + os.path.basename(chunks[0])

FAVICON = open(os.path.join(PUBLIC, "favicon.svg")).read().replace(' rx="10"', "")


def render_cloud(page, w, h, t=12.0):
    """Mount the point cloud into a fixed-size box and return a PNG of it."""
    page.set_viewport_size({"width": w, "height": h})
    page.goto(BASE + "/404")
    page.evaluate(
        """async ([chunk, w, h, t]) => {
            document.body.innerHTML = '';
            document.body.style.margin = '0';
            const box = document.createElement('div');
            box.id = 'box';
            box.style.cssText = `width:${w}px;height:${h}px;position:fixed;inset:0`;
            document.body.appendChild(box);
            const m = await import(chunk);
            m.mountPointCloud(box, null, { stillAt: t });
        }""",
        [CHUNK, w, h, t],
    )
    page.wait_for_timeout(400)
    return page.locator("#box canvas").screenshot()


with sync_playwright() as p:
    browser = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    page = browser.new_page(device_scale_factor=1)

    # 1) Hero fallback still (16:9), saved as WebP
    png = render_cloud(page, 1600, 900, 7.4)
    Image.open(io.BytesIO(png)).convert("RGB").save(os.path.join(PUBLIC, "hero-fallback.webp"), "WEBP", quality=72, method=6)

    # 2) Open Graph image: point-cloud texture + wordmark + headline
    cloud = render_cloud(page, 1600, 900, 7.9)
    import base64
    cloud_b64 = base64.b64encode(cloud).decode()
    page.set_viewport_size({"width": 1200, "height": 630})
    page.goto(BASE + "/404")
    page.wait_for_load_state("networkidle")
    page.evaluate(
        """(b64) => {
        document.body.innerHTML = `
          <div id="og" style="position:fixed;inset:0;width:1200px;height:630px;background:#0B0C0A url(data:image/png;base64,${b64}) center/cover;">
            <div style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(11,12,10,.97) 0%,rgba(11,12,10,.6) 45%,rgba(11,12,10,.15) 100%)"></div>
            <div style="position:absolute;left:72px;top:64px;font:500 44px 'Chakra Petch';color:#ECECE4">mendel<span style="color:#C6F432">X</span></div>
            <div style="position:absolute;left:72px;bottom:74px;right:72px;font:600 70px/1.02 'Chakra Petch';letter-spacing:.04em;text-transform:uppercase;color:#ECECE4">Shaping the future<br/>of agriculture</div>
            <div style="position:absolute;right:72px;top:80px;font:500 15px 'Chakra Petch';letter-spacing:.16em;color:#8A8A80">37.97°N 23.72°E</div>
          </div>`;
        }""",
        cloud_b64,
    )
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(300)
    page.locator("#og").screenshot(path=os.path.join(PUBLIC, "og-image.png"))

    # 3) Icons from the favicon SVG
    for size, name in [(32, "favicon-32.png"), (180, "apple-touch-icon.png"), (512, "icon-512.png")]:
        page.set_viewport_size({"width": size, "height": size})
        page.set_content(f'<html><body style="margin:0">{FAVICON.replace("<svg ", f"<svg width={size} height={size} ")}</body></html>')
        page.locator("svg").screenshot(path=os.path.join(PUBLIC, name))

    browser.close()

for f in ["hero-fallback.webp", "og-image.png", "favicon-32.png", "apple-touch-icon.png", "icon-512.png"]:
    print(f, os.path.getsize(os.path.join(PUBLIC, f)) // 1024, "KB")
