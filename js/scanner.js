/**
 * Mobile Camera Barcode Scanner Controller — js/scanner.js
 * High-performance, low-latency mobile camera scanning, supporting EAN-13, EAN-8, UPC-A, Code 128.
 * Features: Viewfinder UI, Torch Toggle, Camera Switching, Cashier Beep, Haptic Feedback,
 * Fast POS Continuous Scanning, Unknown Barcode Detection, Out-of-Stock Handling, Manual Code Entry.
 */

class BarcodeScannerModal {
    constructor() {
        this.html5QrCode = null;
        this.isScanning = false;
        this.currentCameraId = null;
        this.cameras = [];
        this.currentCameraIndex = 0;
        this.torchEnabled = false;
        this.lastScannedCode = null;
        this.lastScanTime = 0;
        this.onScanCallback = null;
        this.mode = 'pos'; // 'pos' (continuous), 'lookup', 'input'
        this.audioCtx = null;
        this.isHandlingResult = false;

        this._injectScannerDOM();
    }

    /**
     * Play synthetic POS cashier scanner beep via Web Audio API.
     */
    playBeep() {
        try {
            if (!this.audioCtx) {
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                if (AudioCtxClass) this.audioCtx = new AudioCtxClass();
            }
            if (this.audioCtx) {
                if (this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1800, this.audioCtx.currentTime); // Crisp high beep
                gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.12);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start();
                osc.stop(this.audioCtx.currentTime + 0.12);
            }
        } catch (e) {
            console.debug("Audio beep not supported:", e);
        }

        // Haptic vibration
        if (navigator.vibrate) {
            try {
                navigator.vibrate(60);
            } catch (e) {}
        }
    }

    /**
     * Injects the scanner overlay markup into document body if not already present.
     */
    _injectScannerDOM() {
        if (document.getElementById('pos-camera-scanner-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'pos-camera-scanner-overlay';
        overlay.className = 'scanner-modal-overlay';
        overlay.style.display = 'none';

        overlay.innerHTML = `
            <div class="scanner-modal-card">
                <!-- Scanner Header -->
                <div class="scanner-modal-header">
                    <div class="scanner-header-left">
                        <button type="button" class="scanner-btn-icon" id="scanner-btn-close" aria-label="Close Scanner" title="Close">
                            <i data-lucide="arrow-left"></i>
                        </button>
                        <div class="scanner-modal-title">Scan Barcode</div>
                    </div>
                    <div class="scanner-header-right">
                        <button type="button" class="scanner-btn-icon" id="scanner-btn-torch" aria-label="Toggle Flashlight" title="Flashlight" style="display: none;">
                            <i data-lucide="flashlight"></i>
                        </button>
                        <button type="button" class="scanner-btn-icon" id="scanner-btn-switch-cam" aria-label="Switch Camera" title="Switch Camera" style="display: none;">
                            <i data-lucide="camera"></i>
                        </button>
                    </div>
                </div>

                <!-- Live Camera Viewport Container -->
                <div class="scanner-viewport-container">
                    <div id="scanner-video-reader" class="scanner-video-reader"></div>

                    <!-- Viewfinder Cutout Mask Overlay -->
                    <div class="scanner-viewfinder-mask">
                        <div class="scanner-viewfinder-box">
                            <div class="viewfinder-corner tl"></div>
                            <div class="viewfinder-corner tr"></div>
                            <div class="viewfinder-corner bl"></div>
                            <div class="viewfinder-corner br"></div>
                            <div class="scanner-laser-line"></div>
                        </div>
                    </div>

                    <!-- Instant Scan Confirmation Toast Overlay -->
                    <div id="scanner-instant-toast" class="scanner-instant-toast" style="display: none;">
                        <i data-lucide="check-circle" class="scanner-toast-icon"></i>
                        <div class="scanner-toast-content">
                            <span class="scanner-toast-name" id="scanner-toast-prod-name">Product</span>
                            <span class="scanner-toast-meta" id="scanner-toast-prod-meta">Added ×1</span>
                        </div>
                    </div>

                    <!-- Camera Error / Permission Fallback View -->
                    <div id="scanner-error-view" class="scanner-fallback-view" style="display: none;">
                        <div class="scanner-fallback-icon"><i data-lucide="camera-off"></i></div>
                        <h4 class="scanner-fallback-title" id="scanner-error-title">Camera Unavailable</h4>
                        <p class="scanner-fallback-text" id="scanner-error-msg">Camera access is needed to scan product barcodes.</p>
                        <div class="scanner-fallback-actions">
                            <button type="button" class="btn btn-primary" id="scanner-btn-retry">Try Again</button>
                            <button type="button" class="btn btn-secondary" id="scanner-btn-fallback-manual">Enter Barcode Manually</button>
                        </div>
                    </div>
                </div>

                <!-- Scanner Footer & Helper Bar -->
                <div class="scanner-modal-footer">
                    <p class="scanner-guide-text">Align barcode inside the frame to scan automatically.</p>
                    <button type="button" class="scanner-btn-manual" id="scanner-btn-manual-toggle">
                        <i data-lucide="keyboard"></i> Enter barcode manually
                    </button>
                </div>

                <!-- Modal Sub-Dialog: Unknown Barcode Detected -->
                <div id="scanner-unknown-dialog" class="scanner-subdialog-overlay" style="display: none;">
                    <div class="scanner-subdialog-card">
                        <div class="scanner-subdialog-icon warning">
                            <i data-lucide="alert-triangle"></i>
                        </div>
                        <h3 class="scanner-subdialog-title">Barcode Not Recognized</h3>
                        <div class="scanner-subdialog-code" id="scanner-unknown-code-val">8901234567890</div>
                        <p class="scanner-subdialog-text">No product in your inventory matches this barcode.</p>
                        <div class="scanner-subdialog-actions">
                            <button type="button" class="btn btn-primary" id="scanner-btn-add-unknown-product">
                                <i data-lucide="plus"></i> + Add as New Product
                            </button>
                            <button type="button" class="btn btn-secondary" id="scanner-btn-unknown-rescan">
                                <i data-lucide="scan-barcode"></i> Scan Again
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Modal Sub-Dialog: Out of Stock Alert -->
                <div id="scanner-outofstock-dialog" class="scanner-subdialog-overlay" style="display: none;">
                    <div class="scanner-subdialog-card">
                        <div class="scanner-subdialog-icon danger">
                            <i data-lucide="package-x"></i>
                        </div>
                        <h3 class="scanner-subdialog-title" style="color: var(--danger);">OUT OF STOCK</h3>
                        <div class="scanner-subdialog-prod-name" id="scanner-oos-prod-name">Product Name</div>
                        <p class="scanner-subdialog-text" id="scanner-oos-prod-stock">0 packets available in stock.</p>
                        <div class="scanner-subdialog-actions">
                            <button type="button" class="btn btn-secondary" id="scanner-btn-oos-close">
                                Continue Scanning
                            </button>
                            <button type="button" class="btn btn-outline" id="scanner-btn-oos-view">
                                View Product Details
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Modal Sub-Dialog: Manual Barcode Entry Drawer -->
                <div id="scanner-manual-dialog" class="scanner-subdialog-overlay" style="display: none;">
                    <div class="scanner-subdialog-card">
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 12px;">
                            <h3 class="scanner-subdialog-title" style="margin: 0;">Enter Barcode</h3>
                            <button type="button" class="modal-close" id="scanner-btn-manual-close"><i data-lucide="x"></i></button>
                        </div>
                        <form id="scanner-form-manual" style="width: 100%; display: flex; flex-direction: column; gap: 12px;">
                            <div class="custom-search-wrapper" style="margin-bottom: 0;">
                                <i data-lucide="barcode" class="custom-search-icon"></i>
                                <input type="text" id="scanner-input-manual-code" class="custom-search-input" placeholder="Type barcode or SKU..." autocomplete="off" required>
                            </div>
                            <div class="scanner-subdialog-actions">
                                <button type="submit" class="btn btn-primary" style="flex: 1; height: 48px;">
                                    <i data-lucide="search"></i> Find Product
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this._bindEventListeners();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    /**
     * Bind all interactive button listeners.
     */
    _bindEventListeners() {
        // Close scanner
        document.getElementById('scanner-btn-close')?.addEventListener('click', () => this.close());
        
        // Manual entry toggle
        document.getElementById('scanner-btn-manual-toggle')?.addEventListener('click', () => {
            this._showManualDialog(true);
        });
        document.getElementById('scanner-btn-manual-close')?.addEventListener('click', () => {
            this._showManualDialog(false);
        });
        document.getElementById('scanner-btn-fallback-manual')?.addEventListener('click', () => {
            this._showManualDialog(true);
        });

        // Form Manual Entry Submit
        document.getElementById('scanner-form-manual')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('scanner-input-manual-code');
            const code = BarcodeService.sanitize(input.value);
            if (code) {
                this._showManualDialog(false);
                this.handleBarcodeScanned(code);
            }
        });

        // Retry camera on error
        document.getElementById('scanner-btn-retry')?.addEventListener('click', () => {
            this._hideErrorView();
            this._startCameraStream();
        });

        // Torch toggle
        document.getElementById('scanner-btn-torch')?.addEventListener('click', () => this.toggleTorch());

        // Camera switcher
        document.getElementById('scanner-btn-switch-cam')?.addEventListener('click', () => this.switchCamera());

        // Rescan on unknown dialog
        document.getElementById('scanner-btn-unknown-rescan')?.addEventListener('click', () => {
            this._showUnknownDialog(false);
            this.isHandlingResult = false;
        });

        // Add unknown product action
        document.getElementById('scanner-btn-add-unknown-product')?.addEventListener('click', () => {
            const unknownCode = this.lastScannedCode;
            this.close();
            this._navigateToAddProductWithBarcode(unknownCode);
        });

        // OOS dialog buttons
        document.getElementById('scanner-btn-oos-close')?.addEventListener('click', () => {
            this._showOosDialog(false);
            this.isHandlingResult = false;
        });
    }

    /**
     * Route user to Add Product with barcode prefilled.
     */
    _navigateToAddProductWithBarcode(barcode) {
        const page = document.body.dataset.page;
        if (page === 'stock') {
            if (typeof openAddProductModal === 'function') {
                openAddProductModal(null, barcode);
            }
        } else {
            window.location.href = (window.BASE_PATH || '') + `pages/inventory/stock.html?openAddProduct=true&barcode=${encodeURIComponent(barcode)}`;
        }
    }

    /**
     * Open camera barcode scanner.
     * @param {Function} onScan - callback `(barcode, product) => void`
     * @param {'pos'|'lookup'|'input'} mode 
     */
    async open(onScan = null, mode = 'pos') {
        this.onScanCallback = onScan;
        this.mode = mode;
        this.isHandlingResult = false;
        this.lastScannedCode = null;
        this.lastScanTime = 0;

        const overlay = document.getElementById('pos-camera-scanner-overlay');
        if (overlay && typeof Utils !== 'undefined') {
            Utils.openModal(overlay);
        } else if (overlay) {
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        this._hideErrorView();
        this._showUnknownDialog(false);
        this._showOosDialog(false);
        this._showManualDialog(false);

        if (typeof lucide !== 'undefined') lucide.createIcons();

        await this._startCameraStream();
    }

    /**
     * Close camera scanner and completely release camera hardware tracks.
     */
    async close() {
        this.isScanning = false;
        this.isHandlingResult = false;

        const overlay = document.getElementById('pos-camera-scanner-overlay');
        if (overlay && typeof Utils !== 'undefined') {
            Utils.closeModal(overlay);
        } else if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }

        if (this.html5QrCode) {
            try {
                if (this.html5QrCode.isScanning) {
                    await this.html5QrCode.stop();
                }
                this.html5QrCode.clear();
            } catch (err) {
                console.debug("Scanner stop cleanup error:", err);
            }
            this.html5QrCode = null;
        }

        // Clean up video stream tracks
        const video = document.querySelector('#scanner-video-reader video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
    }

    /**
     * Initialize Html5Qrcode and begin scanning video frames.
     */
    async _startCameraStream() {
        const readerEl = document.getElementById('scanner-video-reader');
        if (!readerEl) return;

        // Check if Html5Qrcode is loaded
        if (typeof Html5Qrcode === 'undefined') {
            this._showErrorView(
                "Scanner Library Initializing",
                "Barcode scanner components are loading. Please check connection or enter barcode manually."
            );
            return;
        }

        try {
            // Enumerate available cameras
            const devices = await Html5Qrcode.getCameras();
            if (!devices || devices.length === 0) {
                this._showErrorView(
                    "No Camera Found",
                    "Camera scanning isn't available on this device. You can enter the barcode manually."
                );
                return;
            }

            this.cameras = devices;
            
            // Prefer rear camera ("environment" / "back")
            let preferredCam = devices.find(d => 
                d.label.toLowerCase().includes('back') || 
                d.label.toLowerCase().includes('rear') ||
                d.label.toLowerCase().includes('environment')
            );
            if (!preferredCam) {
                preferredCam = devices[devices.length - 1]; // usually rear camera is last in list
            }

            this.currentCameraIndex = devices.indexOf(preferredCam);
            this.currentCameraId = preferredCam.id;

            // Show camera switch button if multiple cameras
            const switchBtn = document.getElementById('scanner-btn-switch-cam');
            if (switchBtn) {
                switchBtn.style.display = devices.length > 1 ? 'flex' : 'none';
            }

            this.html5QrCode = new Html5Qrcode("scanner-video-reader", {
                verbose: false,
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.ITF,
                    Html5QrcodeSupportedFormats.QR_CODE
                ]
            });

            // Start scanning with optimal aspect ratio and fps
            const config = {
                fps: 15,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    const width = Math.floor(minEdge * 0.85);
                    const height = Math.floor(width * 0.65);
                    return { width, height };
                },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: false // handled by custom button
            };

            await this.html5QrCode.start(
                this.currentCameraId,
                config,
                (decodedText, decodedResult) => {
                    this._onBarcodeDetected(decodedText);
                },
                (errorMessage) => {
                    // Frame scan failed (normal when barcode not yet aligned)
                }
            );

            this.isScanning = true;

            // Check torch capabilities
            this._checkTorchSupport();

        } catch (err) {
            console.error("Camera startup error:", err);
            let userMsg = "Camera access is needed to scan product barcodes.";
            if (err.name === 'NotAllowedError' || String(err).includes('Permission')) {
                userMsg = "Camera permission was denied. Please allow camera access in browser settings and try again.";
            } else if (err.name === 'NotFoundError') {
                userMsg = "No camera was detected on this device.";
            } else if (err.name === 'NotReadableError') {
                userMsg = "Camera is currently in use by another application.";
            }
            this._showErrorView("Camera Access Error", userMsg);
        }
    }

    /**
     * Check if torch / flashlight is supported by the active video track.
     */
    async _checkTorchSupport() {
        const torchBtn = document.getElementById('scanner-btn-torch');
        if (!torchBtn) return;

        try {
            const video = document.querySelector('#scanner-video-reader video');
            if (video && video.srcObject) {
                const track = video.srcObject.getVideoTracks()[0];
                const capabilities = track.getCapabilities ? track.getCapabilities() : {};
                if (capabilities.torch) {
                    torchBtn.style.display = 'flex';
                    return;
                }
            }
        } catch (e) {}
        torchBtn.style.display = 'none';
    }

    /**
     * Toggle device flashlight / torch.
     */
    async toggleTorch() {
        try {
            const video = document.querySelector('#scanner-video-reader video');
            if (!video || !video.srcObject) return;
            const track = video.srcObject.getVideoTracks()[0];
            this.torchEnabled = !this.torchEnabled;
            await track.applyConstraints({
                advanced: [{ torch: this.torchEnabled }]
            });
            const torchBtn = document.getElementById('scanner-btn-torch');
            if (torchBtn) {
                torchBtn.classList.toggle('active', this.torchEnabled);
            }
        } catch (err) {
            console.warn("Torch toggle not supported:", err);
        }
    }

    /**
     * Switch to next camera in list.
     */
    async switchCamera() {
        if (this.cameras.length < 2) return;
        this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
        this.currentCameraId = this.cameras[this.currentCameraIndex].id;

        if (this.html5QrCode && this.isScanning) {
            await this.html5QrCode.stop();
            await this._startCameraStream();
        }
    }

    /**
     * Internal handler for raw barcode text received from camera.
     */
    _onBarcodeDetected(rawText) {
        const cleanCode = BarcodeService.sanitize(rawText);
        if (!cleanCode) return;

        const now = Date.now();
        // Prevent duplicate spam triggers of the same barcode within 1.2s
        if (cleanCode === this.lastScannedCode && (now - this.lastScanTime) < 1200) {
            return;
        }

        if (this.isHandlingResult) return;

        this.lastScannedCode = cleanCode;
        this.lastScanTime = now;

        this.handleBarcodeScanned(cleanCode);
    }

    /**
     * Process a scanned or manually entered barcode against inventory.
     * @param {string} barcode 
     */
    handleBarcodeScanned(barcode) {
        const cleanCode = BarcodeService.sanitize(barcode);
        if (!cleanCode) return;

        this.playBeep();

        // Query product in LocalStorage
        const product = Storage.getProductByBarcode(cleanCode);

        if (this.mode === 'input') {
            // Simply return barcode to form
            if (typeof this.onScanCallback === 'function') {
                this.onScanCallback(cleanCode, product);
            }
            this.close();
            return;
        }

        if (product) {
            const qty = parseFloat(product.currentQuantity) || 0;
            const min = parseFloat(product.minimumStockLevel) || 0;

            if (qty <= 0) {
                // Out of stock
                this._showOutOfStockDialog(product);
                return;
            }

            // In stock: Show subtle low stock warning if applicable
            if (qty <= min) {
                if (typeof Utils !== 'undefined') {
                    Utils.showToast(`Low stock — ${qty} ${product.unit} remaining`, "warning");
                }
            }

            // Trigger callback (e.g. SalesService addToCart)
            if (typeof this.onScanCallback === 'function') {
                this.onScanCallback(cleanCode, product);
            }

            // Show instant visual confirmation badge on scanner
            this._showInstantConfirmation(product);

            // In POS mode, scanner stays active for next product!
            if (this.mode === 'lookup') {
                this.close();
            }
        } else {
            // Barcode not recognized
            this._showUnknownBarcodeDialog(cleanCode);
        }
    }

    /**
     * Show instant feedback banner over camera viewfinder.
     */
    _showInstantConfirmation(product) {
        const toast = document.getElementById('scanner-instant-toast');
        const nameEl = document.getElementById('scanner-toast-prod-name');
        const metaEl = document.getElementById('scanner-toast-prod-meta');

        if (!toast || !nameEl || !metaEl) return;

        nameEl.textContent = product.productName;
        const rateStr = typeof Utils !== 'undefined' ? Utils.formatCurrency(product.sellingRate) : `₹${product.sellingRate}`;
        metaEl.textContent = `Added ×1 &middot; ${rateStr}/${product.unit}`;

        toast.style.display = 'flex';
        toast.classList.remove('animate-pop');
        void toast.offsetWidth; // trigger reflow
        toast.classList.add('animate-pop');

        setTimeout(() => {
            toast.style.display = 'none';
        }, 1500);
    }

    /**
     * Show Unknown Barcode Dialog.
     */
    _showUnknownBarcodeDialog(barcode) {
        this.isHandlingResult = true;
        document.getElementById('scanner-unknown-code-val').textContent = barcode;
        this._showUnknownDialog(true);
    }

    /**
     * Show Out of Stock Dialog.
     */
    _showOutOfStockDialog(product) {
        this.isHandlingResult = true;
        const nameEl = document.getElementById('scanner-oos-prod-name');
        const stockEl = document.getElementById('scanner-oos-prod-stock');
        const viewBtn = document.getElementById('scanner-btn-oos-view');

        if (nameEl) nameEl.textContent = product.productName;
        if (stockEl) stockEl.textContent = `0 ${product.unit}(s) available in stock.`;

        if (viewBtn) {
            viewBtn.onclick = () => {
                this.close();
                window.location.href = (window.BASE_PATH || '') + `pages/inventory/product-details.html?id=${product.id}`;
            };
        }

        this._showOosDialog(true);
    }

    _showUnknownDialog(show) {
        const d = document.getElementById('scanner-unknown-dialog');
        if (d) d.style.display = show ? 'flex' : 'none';
    }

    _showOosDialog(show) {
        const d = document.getElementById('scanner-outofstock-dialog');
        if (d) d.style.display = show ? 'flex' : 'none';
    }

    _showManualDialog(show) {
        const d = document.getElementById('scanner-manual-dialog');
        if (d) {
            d.style.display = show ? 'flex' : 'none';
            if (show) {
                const input = document.getElementById('scanner-input-manual-code');
                if (input) {
                    input.value = '';
                    setTimeout(() => input.focus(), 100);
                }
            }
        }
    }

    _showErrorView(title, msg) {
        const errView = document.getElementById('scanner-error-view');
        const t = document.getElementById('scanner-error-title');
        const m = document.getElementById('scanner-error-msg');
        if (t) t.textContent = title;
        if (m) m.textContent = msg;
        if (errView) errView.style.display = 'flex';
    }

    _hideErrorView() {
        const errView = document.getElementById('scanner-error-view');
        if (errView) errView.style.display = 'none';
    }
}

// Global Singleton Instance
window.BarcodeScanner = new BarcodeScannerModal();
