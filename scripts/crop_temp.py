from PIL import Image
img_path = 'frontend/public/atlantic-logo.png'
img = Image.open(img_path)
print('Original:', img.size, img.mode)
if img.mode != 'RGBA':
    img = img.convert('RGBA')
width, height = img.size
left, top, right, bottom = width, height, 0, 0
for y in range(height):
    for x in range(width):
        r, g, b, a = img.getpixel((x, y))
        if a > 100 and not (r > 235 and g > 235 and b > 235):
            left = min(left, x)
            top = min(top, y)
            right = max(right, x)
            bottom = max(bottom, y)
if left < width:
    pad = 10
    left, top = max(0, left - pad), max(0, top - pad)
    right, bottom = min(width, right + pad), min(height, bottom + pad)
    cropped = img.crop((left, top, right, bottom))
    max_d = max(cropped.size)
    final = Image.new('RGBA', (max_d, max_d), (0, 0, 0, 0))
    ox = (max_d - cropped.width) // 2
    oy = (max_d - cropped.height) // 2
    final.paste(cropped, (ox, oy), cropped)
    final.save(img_path, 'PNG')
    print('Saved!', final.size)
else:
    print('No content found')
