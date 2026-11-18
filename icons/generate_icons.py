import zlib
import struct
import math
import os

def create_png(width, height, get_pixel):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0) # Filter byte 0 (None)
        for x in range(width):
            r, g, b, a = get_pixel(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    compressed = zlib.compress(raw_data)
    
    def chunk(tag, data):
        length = struct.pack('!I', len(data))
        crc = struct.pack('!I', zlib.crc32(tag + data) & 0xffffffff)
        return length + tag + data + crc

    png = b'\x89PNG\r\n\x1a\n'
    # IHDR chunk
    png += chunk(b'IHDR', struct.pack('!IIBBBBB', width, height, 8, 6, 0, 0, 0))
    # IDAT chunk
    png += chunk(b'IDAT', compressed)
    # IEND chunk
    png += chunk(b'IEND', b'')
    return png

def get_geetkosh_pixel(x, y, w, h):
    cx, cy = w / 2.0, h / 2.0
    radius = (min(w, h) / 2.0) - 1.0
    dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    
    # Outer circle anti-aliasing
    if dist > radius:
        return (0, 0, 0, 0)
    
    alpha = 255
    if dist > radius - 1.0:
        alpha = int(255 * (radius - dist))
    
    # Simrik Vermilion Base (#C81E1E -> 200, 30, 30)
    base_r, base_g, base_b = 200, 30, 30
    
    # Draw stylized eighth note (notehead + stem + flag)
    # Relative normalized coordinates (-1 to 1)
    nx = (x - cx) / (radius * 0.75)
    ny = (y - cy) / (radius * 0.75)
    
    # Notehead at bottom-left: center around (-0.3, 0.35), tilted ellipse
    head_dist = math.sqrt(((nx + 0.3) * 1.3 + (ny - 0.35) * 0.7) ** 2 + ((ny - 0.35) * 1.3 - (nx + 0.3) * 0.7) ** 2)
    is_head = head_dist < 0.32
    
    # Stem: from (-0.08, -0.55) down to (-0.08, 0.35)
    is_stem = (-0.14 <= nx <= -0.02) and (-0.55 <= ny <= 0.35)
    
    # Flag: curved at top right
    is_flag = (-0.02 <= nx <= 0.38) and (-0.55 <= ny <= -0.15) and (nx - ny > 0.15) and (nx - ny < 0.6)
    
    if is_head or is_stem or is_flag:
        return (255, 255, 255, alpha)
    
    return (base_r, base_g, base_b, alpha)

icons_dir = os.path.dirname(os.path.abspath(__file__))
sizes = [16, 32, 48, 128]
for s in sizes:
    png_bytes = create_png(s, s, get_geetkosh_pixel)
    out_path = os.path.join(icons_dir, f'icon{s}.png')
    with open(out_path, 'wb') as f:
        f.write(png_bytes)
    print(f"Generated {out_path} ({s}x{s})")
