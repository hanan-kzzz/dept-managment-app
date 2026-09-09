import os

base_dir = "c:/Users/hanan/Documents/debt management"

html_files = []
for root, dirs, files in os.walk(base_dir):
    if "node_modules" in root or ".git" in root:
        continue
    for file in files:
        if file.endswith(".html"):
            html_files.append(os.path.join(root, file))

print(f"Found {len(html_files)} HTML files.")

for filepath in html_files:
    rel_path = os.path.relpath(filepath, base_dir).replace("\\", "/")
    depth = rel_path.count("/")
    prefix = "../" * depth if depth > 0 else ""
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if "favicon.ico" in content and "apple-touch-icon" in content and "manifest.json" in content:
        print(f"Skipping {rel_path} (all icon tags present)")
        continue

    # Remove partial icon tags if any
    lines = content.splitlines()
    new_lines = []
    for line in lines:
        if "favicon.ico" in line or "favicon.png" in line or "apple-touch-icon" in line or 'rel="manifest"' in line or "Favicon & PWA App Icons" in line:
            continue
        new_lines.append(line)
    
    content = "\n".join(new_lines)

    icon_tags = f"""    <!-- Favicon & PWA App Icons -->
    <link rel="icon" type="image/x-icon" href="{prefix}favicon.ico">
    <link rel="icon" type="image/png" sizes="32x32" href="{prefix}favicon.png">
    <link rel="apple-touch-icon" sizes="180x180" href="{prefix}images/apple-touch-icon.png">
    <link rel="manifest" href="{prefix}manifest.json">"""

    if "</head>" in content:
        content = content.replace("</head>", f"{icon_tags}\n</head>", 1)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Successfully updated {rel_path}")
    else:
        print(f"WARNING: No </head> tag in {rel_path}")

print("Done updating all HTML files!")
