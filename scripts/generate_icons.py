import os
from PIL import Image, ImageDraw

def draw_wallet_icon(draw, size, offset_x, offset_y, stroke_width, color):
    s = size / 24.0
    def px(x, y):
        return (offset_x + x * s, offset_y + y * s)

    body_left, body_top = px(3, 5)
    body_right, body_bottom = px(21, 20)
    
    # Outer wallet outline with rounded rectangle
    draw.rounded_rectangle([body_left, body_top, body_right, body_bottom], radius=int(3.5*s), outline=color, width=stroke_width)
    
    # Top flap line
    flap_y = offset_y + 9 * s
    draw.line([px(3, 9)[0], flap_y, px(21, 9)[0], flap_y], fill=color, width=stroke_width)
    
    # Lock / Clasp box
    clasp_left, clasp_top = px(14.5, 11.5)
    clasp_right, clasp_bottom = px(21, 16.5)
    draw.rounded_rectangle([clasp_left, clasp_top, clasp_right, clasp_bottom], radius=int(2*s), fill=color, outline=color, width=stroke_width)
    
    # Inner dot in clasp
    dot_x, dot_y = px(17.5, 14)
    r = 1.2 * s
    draw.ellipse([dot_x - r, dot_y - r, dot_x + r, dot_y + r], fill="#2563EB")

def create_cashly_icon(size):
    scale = 4  # anti-aliasing supersampling
    img_size = size * scale
    img = Image.new("RGBA", (img_size, img_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    corner_radius = int(img_size * 0.22)
    
    for y in range(img_size):
        r = int(37 + (29 - 37) * (y / img_size))
        g = int(99 + (78 - 99) * (y / img_size))
        b = int(235 + (216 - 235) * (y / img_size))
        draw.line([(0, y), (img_size, y)], fill=(r, g, b, 255))

    mask = Image.new("L", (img_size, img_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, img_size, img_size], radius=corner_radius, fill=255)
    
    output = Image.new("RGBA", (img_size, img_size), (0, 0, 0, 0))
    output.paste(img, (0, 0), mask)
    draw = ImageDraw.Draw(output)

    icon_viewport_size = img_size * 0.55
    offset = (img_size - icon_viewport_size) / 2.0
    stroke_w = max(2, int(img_size * 0.055))
    
    draw_wallet_icon(draw, icon_viewport_size, offset, offset, stroke_w, (255, 255, 255, 255))

    final_img = output.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

os.makedirs("c:/Users/hanan/Documents/debt management/assets/icons", exist_ok=True)
os.makedirs("c:/Users/hanan/Documents/debt management/images", exist_ok=True)

icon512 = create_cashly_icon(512)
icon512.save("c:/Users/hanan/Documents/debt management/assets/icons/icon-512.png", "PNG")

icon192 = create_cashly_icon(192)
icon192.save("c:/Users/hanan/Documents/debt management/assets/icons/icon-192.png", "PNG")

icon180 = create_cashly_icon(180)
icon180.save("c:/Users/hanan/Documents/debt management/images/apple-touch-icon.png", "PNG")

icon64 = create_cashly_icon(64)
icon64.save("c:/Users/hanan/Documents/debt management/favicon.png", "PNG")
icon64.save("c:/Users/hanan/Documents/debt management/images/favicon.png", "PNG")

icon32 = create_cashly_icon(32)
icon32.save("c:/Users/hanan/Documents/debt management/favicon.ico", format="ICO", sizes=[(16,16), (32,32), (64,64)])

print("Successfully generated all Cashly app icons!")
