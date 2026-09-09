import os

base_dir = "c:/Users/hanan/Documents/debt management"

html_files = []
for root, dirs, files in os.walk(base_dir):
    if "node_modules" in root or ".git" in root:
        continue
    for file in files:
        if file.endswith(".html"):
            html_files.append(os.path.join(root, file))

print(f"Checking {len(html_files)} HTML files for raw SVG favicon data links...")

count = 0
for filepath in html_files:
    rel_path = os.path.relpath(filepath, base_dir).replace("\\", "/")
    
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    modified = False
    new_lines = []
    for line in lines:
        if "data:image/svg+xml" in line and "<svg" in line:
            modified = True
            continue
        new_lines.append(line)

    if modified:
        with open(filepath, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        count += 1
        print(f"Cleaned raw SVG favicon from {rel_path}")

print(f"Done! Cleaned {count} HTML files.")
