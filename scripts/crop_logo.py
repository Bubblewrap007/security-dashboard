#!/usr/bin/env python3
"""Crop logo to show just the bird with transparent background"""

from PIL import Image
import sys
import os

def crop_logo():
    img_path = r'frontend\public\atlantic-logo.png'
    
    # Load image
    img = Image.open(img_path)
    print('Original size:', img.size)
    print('Mode:', img.mode)
    
    # Convert to RGBA
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    width, height = img.size
    
    # Find bounding box of non-transparent content
    left, top = width, height
    right, bottom = 0, 0
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = img.getpixel((x, y))
            # Look for meaningful content (not background)
            if a > 100 and not (r > 235 and g > 235 and b > 235):
                left = min(left, x)
                top = min(top, y)
                right = max(right, x)
                bottom = max(bottom, y)
    
    if left == width:  # No content found
        print('No non-background content found')
        return False
    
    # Add padding
    padding = 10
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(width, right + padding)
    bottom = min(height, bottom + padding)
    
    print('Bounding box:', (left, top, right, bottom))
    
    # Crop
    cropped = img.crop((left, top, right, bottom))
    crop_w, crop_h = cropped.size
    print('Cropped size:', crop_w, 'x', crop_h)
    
    # Make square
    max_dim = max(crop_w, crop_h)
    final = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))
    x_off = (max_dim - crop_w) // 2
    y_off = (max_dim - crop_h) // 2
    final.paste(cropped, (x_off, y_off), cropped)
    
    # Save
    final.save(img_path, 'PNG')
    print('Saved to:', img_path)
    print('New size:', final.size)
    return True

if __name__ == '__main__':
    try:
        if crop_logo():
            print('Success!')
        else:
            sys.exit(1)
    except Exception as e:
        print('Error:', e)
        sys.exit(1)

