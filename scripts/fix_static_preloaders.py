import os

base_dir = "c:/Users/hanan/Documents/debt management"

html_files = []
for root, dirs, files in os.walk(base_dir):
    if "node_modules" in root or ".git" in root:
        continue
    for file in files:
        if file.endswith(".html"):
            html_files.append(os.path.join(root, file))

print(f"Updating static preloader tags across {len(html_files)} HTML files...")

count = 0
for filepath in html_files:
    rel_path = os.path.relpath(filepath, base_dir).replace("\\", "/")
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update <div id="page-preloader" class="page-preloader"> to include inline display:none initially
    old_div = '<div id="page-preloader" class="page-preloader">'
    new_div = '<div id="page-preloader" class="page-preloader" style="display: none !important;">'
    
    # 2. Add explicit inline dimensions to any static preloader SVG
    old_svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"'
    new_svg = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" style="width:26px !important;height:26px !important;max-width:26px !important;max-height:26px !important;" viewBox="0 0 24 24"'

    modified = False
    if old_div in content:
        content = content.replace(old_div, new_div)
        modified = True
    
    if old_svg in content:
        content = content.replace(old_svg, new_svg)
        modified = True

    if modified:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        count += 1
        print(f"Fixed preloader in {rel_path}")

print(f"Completed! Fixed {count} HTML files.")
