from PIL import Image
from pathlib import Path

img_path = Path(r"c:\Users\silen\OneDrive\Desktop\Business Projects\Security Dashboard\frontend\public\atlantic-logo.png")
img = Image.open(img_path).convert("RGBA")

pixels = img.getdata()
new_pixels = []
threshold = 30  # near-black
for r, g, b, a in pixels:
    if r < threshold and g < threshold and b < threshold:
        new_pixels.append((r, g, b, 0))
    else:
        new_pixels.append((r, g, b, a))

img.putdata(new_pixels)
img.save(img_path, format="PNG", optimize=True)
print("Updated logo with transparent background:", img_path)
