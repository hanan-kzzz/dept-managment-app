/**
 * Barcode Service — js/barcode.js
 * Handles barcode generation, checksum calculation, validation, machine-readable visual rendering,
 * label downloading (PNG/SVG), and printing.
 */

const BarcodeService = {
    /**
     * Calculate standard EAN-13 / UPC modulo-10 checksum digit.
     * @param {string} digits12 - 12-digit string
     * @returns {number} checksum digit (0-9)
     */
    calculateEanChecksum(digits12) {
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            const digit = parseInt(digits12[i], 10);
            sum += (i % 2 === 0) ? digit : digit * 3;
        }
        const mod = sum % 10;
        return (mod === 0) ? 0 : 10 - mod;
    },

    /**
     * Validate an EAN-13 barcode string including checksum.
     * @param {string} code 
     * @returns {boolean}
     */
    isValidEan13(code) {
        if (!/^\d{13}$/.test(code)) return false;
        const expectedCheck = this.calculateEanChecksum(code.slice(0, 12));
        return parseInt(code[12], 10) === expectedCheck;
    },

    /**
     * Sanitize user-entered or scanned barcode string (removes whitespace/hidden chars).
     * @param {string} barcode 
     * @returns {string}
     */
    sanitize(barcode) {
        if (!barcode) return '';
        return String(barcode).trim().replace(/\s+/g, '');
    },

    /**
     * Check if a barcode is already assigned to another product in storage.
     * @param {string} barcode 
     * @param {string|null} excludeProductId 
     * @returns {{isDuplicate: boolean, conflictProduct: object|null}}
     */
    checkDuplicate(barcode, excludeProductId = null) {
        const cleanCode = this.sanitize(barcode);
        if (!cleanCode) return { isDuplicate: false, conflictProduct: null };

        const products = Storage.getProducts();
        const conflict = products.find(p => {
            if (excludeProductId && p.id === excludeProductId) return false;
            return this.sanitize(p.barcode) === cleanCode;
        });

        return {
            isDuplicate: !!conflict,
            conflictProduct: conflict || null
        };
    },

    /**
     * Generate a collision-free unique internal retail barcode for a product.
     * Uses Code 128 format by default (e.g. GROC-XXXXXX or numeric retail barcode).
     * @param {string} prefix - default 'GROC'
     * @returns {string}
     */
    generateUniqueBarcode(prefix = 'GROC') {
        const products = Storage.getProducts();
        const existingCodes = new Set(products.map(p => this.sanitize(p.barcode)).filter(Boolean));

        let attempts = 0;
        let generated = '';

        while (attempts < 1000) {
            attempts++;
            // Generate a 7-digit random number
            const randNum = Math.floor(100000 + Math.random() * 900000);
            const candidate = `${prefix}-${randNum}`;

            if (!existingCodes.has(candidate)) {
                generated = candidate;
                break;
            }
        }

        // Fallback with timestamp if random collision occurs
        if (!generated) {
            generated = `${prefix}-${Date.now().toString().slice(-7)}`;
        }

        return generated;
    },

    /**
     * Generate a valid 13-digit internal EAN-13 code with valid checksum digit.
     * Prefix '200' is standard reserved prefix for in-store retail internal items.
     * @returns {string}
     */
    generateUniqueEan13() {
        const products = Storage.getProducts();
        const existingCodes = new Set(products.map(p => this.sanitize(p.barcode)).filter(Boolean));

        let attempts = 0;
        let generated = '';

        while (attempts < 1000) {
            attempts++;
            // Prefix 200 + 9 random digits = 12 digits
            const rand9 = Math.floor(100000000 + Math.random() * 900000000).toString();
            const first12 = `200${rand9}`;
            const checksum = this.calculateEanChecksum(first12);
            const candidate = `${first12}${checksum}`;

            if (!existingCodes.has(candidate)) {
                generated = candidate;
                break;
            }
        }

        if (!generated) {
            const timePart = Date.now().toString().slice(-9);
            const first12 = `200${timePart}`;
            generated = `${first12}${this.calculateEanChecksum(first12)}`;
        }

        return generated;
    },

    /**
     * Bulk generate barcodes for all products that currently lack one.
     * Does NOT overwrite existing barcodes.
     * @returns {{updatedCount: number, updatedProducts: Array}}
     */
    generateMissingBarcodes() {
        const products = Storage.getProducts();
        const updatedProducts = [];
        let count = 0;

        products.forEach(p => {
            const currentBarcode = this.sanitize(p.barcode);
            if (!currentBarcode) {
                const newBarcode = this.generateUniqueBarcode('GROC');
                p.barcode = newBarcode;
                p.updatedDate = new Date().toISOString();
                updatedProducts.push(p);
                count++;
            }
        });

        if (count > 0) {
            Storage.saveProducts(products);
        }

        return { updatedCount: count, updatedProducts };
    },

    /**
     * Auto-detect optimal barcode format for JsBarcode rendering.
     * @param {string} code 
     * @returns {string} format string ('EAN13', 'EAN8', 'UPC', 'CODE128')
     */
    detectFormat(code) {
        const clean = this.sanitize(code);
        if (/^\d{13}$/.test(clean) && this.isValidEan13(clean)) {
            return 'EAN13';
        }
        if (/^\d{8}$/.test(clean)) {
            return 'EAN8';
        }
        if (/^\d{12}$/.test(clean)) {
            return 'UPC';
        }
        return 'CODE128';
    },

    /**
     * Render a real machine-readable barcode onto an SVG or Canvas element.
     * @param {HTMLElement|string} target - SVG/Canvas element or selector
     * @param {string} value - barcode string
     * @param {object} options - rendering options
     */
    render(target, value, options = {}) {
        const cleanCode = this.sanitize(value);
        if (!cleanCode) return false;

        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return false;

        const format = options.format || this.detectFormat(cleanCode);
        const defaultOpts = {
            format: format,
            width: options.width || 2,
            height: options.height || 64,
            displayValue: options.displayValue !== undefined ? options.displayValue : true,
            text: options.text || cleanCode,
            fontOptions: "600",
            font: "Plus Jakarta Sans, sans-serif",
            fontSize: options.fontSize || 14,
            textMargin: 4,
            margin: options.margin !== undefined ? options.margin : 10,
            background: options.background || "#FFFFFF",
            lineColor: options.lineColor || "#17191C"
        };

        if (typeof JsBarcode === 'function') {
            try {
                JsBarcode(el, cleanCode, defaultOpts);
                return true;
            } catch (err) {
                console.warn(`JsBarcode failed with format ${format}, retrying with CODE128 fallback:`, err);
                try {
                    JsBarcode(el, cleanCode, { ...defaultOpts, format: "CODE128" });
                    return true;
                } catch (e) {
                    console.error("JsBarcode rendering failed completely:", e);
                    this._renderSvgFallback(el, cleanCode, defaultOpts);
                    return true;
                }
            }
        } else {
            this._renderSvgFallback(el, cleanCode, defaultOpts);
            return true;
        }
    },

    /**
     * Fallback SVG barcode renderer (Simple Code 128 / Pattern) if JsBarcode is unavailable.
     */
    _renderSvgFallback(svgEl, code, opts) {
        if (svgEl.tagName && svgEl.tagName.toLowerCase() !== 'svg') {
            svgEl.innerHTML = `<span style="font-family: monospace; font-weight: bold; letter-spacing: 2px;">${code}</span>`;
            return;
        }
        
        // Generate pseudo-pattern bars based on string hash for visual representation
        let pattern = '';
        for (let i = 0; i < code.length; i++) {
            const charCode = code.charCodeAt(i);
            const binary = (charCode % 16).toString(2).padStart(4, '0');
            pattern += binary + '1';
        }
        pattern = '1010' + pattern + '101011'; // Guard patterns

        const barWidth = opts.width || 2;
        const barHeight = opts.height || 60;
        const totalWidth = pattern.length * barWidth + (opts.margin * 2 || 20);
        const totalHeight = barHeight + 30;

        let barsSvg = '';
        let x = opts.margin || 10;
        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] === '1') {
                barsSvg += `<rect x="${x}" y="10" width="${barWidth}" height="${barHeight}" fill="${opts.lineColor || '#000'}"/>`;
            }
            x += barWidth;
        }

        const textY = barHeight + 24;
        const textX = totalWidth / 2;

        svgEl.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
        svgEl.setAttribute('width', '100%');
        svgEl.setAttribute('height', 'auto');
        svgEl.innerHTML = `
            <rect width="${totalWidth}" height="${totalHeight}" fill="${opts.background || '#FFF'}"/>
            ${barsSvg}
            <text x="${textX}" y="${textY}" font-family="monospace" font-size="13" font-weight="700" fill="${opts.lineColor || '#000'}" text-anchor="middle">${code}</text>
        `;
    },

    /**
     * Create a complete printable/downloadable label canvas element.
     * @param {object} product 
     * @returns {HTMLCanvasElement}
     */
    createLabelCanvas(product) {
        const cleanCode = this.sanitize(product.barcode || product.sku || 'GROC-000');
        const canvas = document.createElement('canvas');
        const width = 400;
        const height = 260;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Header: Shop / Product Name
        ctx.fillStyle = '#17191C';
        ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        
        // Truncate product name if too long
        let displayName = product.productName || 'Product Name';
        if (displayName.length > 28) displayName = displayName.substring(0, 26) + '...';
        ctx.fillText(displayName, width / 2, 34);

        // Subtitle: Category & Unit Price
        ctx.font = '13px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#737982';
        const rateStr = typeof Utils !== 'undefined' ? Utils.formatCurrency(product.sellingRate) : `₹${product.sellingRate}`;
        ctx.fillText(`MRP: ${rateStr} / ${product.unit || 'pc'}`, width / 2, 58);

        // Draw barcode directly to canvas via JsBarcode if possible
        if (typeof JsBarcode === 'function') {
            const barcodeCanvas = document.createElement('canvas');
            try {
                JsBarcode(barcodeCanvas, cleanCode, {
                    format: this.detectFormat(cleanCode),
                    width: 2,
                    height: 70,
                    displayValue: true,
                    fontSize: 14,
                    font: "Plus Jakarta Sans, monospace",
                    margin: 8
                });
                const bX = (width - barcodeCanvas.width) / 2;
                ctx.drawImage(barcodeCanvas, Math.max(10, bX), 74);
            } catch (e) {
                console.error("Barcode canvas draw error:", e);
            }
        }

        // Border around label
        ctx.strokeStyle = '#E1E5EA';
        ctx.lineWidth = 2;
        ctx.strokeRect(4, 4, width - 8, height - 8);

        return canvas;
    },

    /**
     * Download barcode label as PNG or SVG file.
     * @param {object} product 
     * @param {'png'|'svg'} format 
     */
    downloadBarcode(product, format = 'png') {
        const cleanCode = this.sanitize(product.barcode || product.sku || 'GROC-000');
        const filename = `${product.productName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_barcode_${cleanCode}.${format}`;

        if (format === 'svg') {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            this.render(svg, cleanCode, {
                width: 2.2,
                height: 80,
                displayValue: true,
                fontSize: 15,
                margin: 16
            });
            const xml = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (typeof Utils !== 'undefined') Utils.showToast("✓ Barcode SVG downloaded", "success");
        } else {
            // PNG download
            const canvas = this.createLabelCanvas(product);
            setTimeout(() => {
                const url = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                if (typeof Utils !== 'undefined') Utils.showToast("✓ Barcode PNG downloaded", "success");
            }, 50);
        }
    },

    /**
     * Open print dialog for a single product barcode sticker label.
     * @param {object} product 
     */
    printBarcode(product) {
        const cleanCode = this.sanitize(product.barcode || product.sku || 'GROC-000');
        const rateStr = typeof Utils !== 'undefined' ? Utils.formatCurrency(product.sellingRate) : `₹${product.sellingRate}`;

        // Create temporary print container
        let printFrame = document.getElementById('barcode-print-iframe');
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'barcode-print-iframe';
            printFrame.style.position = 'fixed';
            printFrame.style.right = '0';
            printFrame.style.bottom = '0';
            printFrame.style.width = '0';
            printFrame.style.height = '0';
            printFrame.style.border = '0';
            document.body.appendChild(printFrame);
        }

        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.render(tempSvg, cleanCode, {
            width: 2.2,
            height: 70,
            displayValue: true,
            fontSize: 14,
            margin: 8
        });
        const svgHtml = tempSvg.outerHTML;

        const doc = printFrame.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Barcode - ${product.productName}</title>
                <style>
                    @page {
                        size: auto;
                        margin: 4mm;
                    }
                    body {
                        margin: 0;
                        padding: 10px;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        background: #FFF;
                    }
                    .label-card {
                        width: 60mm;
                        padding: 8px;
                        border: 1px dashed #777;
                        border-radius: 4px;
                        text-align: center;
                        box-sizing: border-box;
                    }
                    .prod-name {
                        font-size: 13px;
                        font-weight: 800;
                        color: #000;
                        margin-bottom: 2px;
                        word-break: break-word;
                    }
                    .prod-meta {
                        font-size: 11px;
                        font-weight: 600;
                        color: #333;
                        margin-bottom: 6px;
                    }
                    .barcode-box svg {
                        max-width: 100%;
                        height: auto;
                    }
                </style>
            </head>
            <body>
                <div class="label-card">
                    <div class="prod-name">${product.productName}</div>
                    <div class="prod-meta">MRP: ${rateStr} / ${product.unit || 'pc'}</div>
                    <div class="barcode-box">
                        ${svgHtml}
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.focus();
                        window.print();
                    };
                </script>
            </body>
            </html>
        `);
        doc.close();
    }
};

// Expose globally
window.BarcodeService = BarcodeService;
