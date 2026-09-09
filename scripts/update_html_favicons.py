import os

base_dir = "c:/Users/hanan/Documents/debt management"

html_files = []
for root, dirs, files in os.walk(base_dir):
    if "node_modules" in root or ".git" in root:
        continue
    for file in files:
        if file.endswith(".html"):
            html_files.append(os.path.join(root, file))

print(f"Found {len(html_files)} HTML files to process.")

for filepath in html_files:
    rel_path = os.path.relpath(filepath, base_dir).replace("\\", "/")
    depth = rel_path.count("/")
    prefix = "../" * depth if depth > 0 else ""
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Skip if already has favicon link tag
    if 'rel="icon"' in content or 'rel="apple-touch-icon"' in content:
        print(f"Skipping {rel_path} (already has icon link tag)")
        continue

    icon_tags = f"""    <!-- Favicon & PWA App Icons -->
    <link rel="icon" type="image/x-icon" href="{prefix}favicon.ico">
    <link rel="icon" type="image/png" sizes="32x32" href="{prefix}favicon.png">
    <link rel="apple-touch-icon" sizes="180x180" href="{prefix}images/apple-touch-icon.png">
    <link rel="manifest" href="{prefix}manifest.json">"""

    if "</head>" in content:
        content = content.replace("</head>", f"{icon_tags}\n</head>", 1)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {rel_path}")
    else:
        print(f"No </head> tag found in {rel_path}")

print("Completed updating all HTML files!")
