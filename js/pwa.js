/**
 * Cashly PWA & Offline Engine
 * Handles Service Worker registration, online/offline status banners, and mobile installation prompts.
 */

const PWA = {
    deferredPrompt: null,
    isInitialized: false,

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.registerServiceWorker();
        this.initNetworkStatus();
        this.initInstallPrompt();
    },

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                const basePath = typeof window.computeBasePath === 'function' ? window.computeBasePath() : '';
                const swPath = basePath + 'service-worker.js';

                navigator.serviceWorker.register(swPath)
                    .then((reg) => {
                        console.log('[PWA] Service Worker registered successfully:', reg.scope);
                        
                        // Listen for updates
                        reg.addEventListener('updatefound', () => {
                            const newWorker = reg.installing;
                            if (newWorker) {
                                newWorker.addEventListener('statechange', () => {
                                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                        console.log('[PWA] New update available.');
                                        PWA.showToast('App update available! Refresh to load the latest version.', 'info');
                                    }
                                });
                            }
                        });
                    })
                    .catch((err) => {
                        console.warn('[PWA] Service Worker registration failed:', err);
                    });
            });
        }
    },

    initNetworkStatus() {
        // Initial state check
        if (!navigator.onLine) {
            this.updateOnlineStatus(false);
        }

        window.addEventListener('online', () => {
            this.updateOnlineStatus(true);
        });

        window.addEventListener('offline', () => {
            this.updateOnlineStatus(false);
        });
    },

    updateOnlineStatus(isOnline) {
        let banner = document.getElementById('pwa-network-banner');
        
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'pwa-network-banner';
            banner.className = 'pwa-network-banner';
            document.body.appendChild(banner);
        }

        if (isOnline) {
            banner.className = 'pwa-network-banner online';
            banner.innerHTML = `
                <div class="pwa-banner-content">
                    <span class="pwa-dot green"></span>
                    <span>Back online. Cashly is connected!</span>
                </div>
            `;
            // Auto hide after 3.5 seconds
            setTimeout(() => {
                if (banner && banner.classList.contains('online')) {
                    banner.classList.remove('show', 'online');
                }
            }, 3500);
        } else {
            banner.className = 'pwa-network-banner offline show';
            banner.innerHTML = `
                <div class="pwa-banner-content">
                    <span class="pwa-dot orange"></span>
                    <span>⚡ Offline Mode — Data is saved locally</span>
                </div>
            `;
        }
    },

    initInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            this.deferredPrompt = e;

            console.log('[PWA] Install prompt intercepted.');

            // Show install trigger if appropriate
            this.showInstallBanner();
        });

        window.addEventListener('appinstalled', () => {
            console.log('[PWA] Cashly was installed as a PWA.');
            this.deferredPrompt = null;
            this.hideInstallBanner();
            if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Cashly installed successfully! You can now launch it offline.', 'success');
            }
        });
    },

    showInstallBanner() {
        // Check if already running standalone or if user previously dismissed prompt
        if (window.matchMedia('(display-mode: standalone)').matches || localStorage.getItem('pwa_install_dismissed') === 'true') {
            return;
        }

        let installBanner = document.getElementById('pwa-install-banner');
        if (!installBanner) {
            installBanner = document.createElement('div');
            installBanner.id = 'pwa-install-banner';
            installBanner.className = 'pwa-install-banner';
            installBanner.innerHTML = `
                <div class="pwa-install-icon">
                    <i data-lucide="download"></i>
                </div>
                <div class="pwa-install-info">
                    <div class="pwa-install-title">Install Cashly App</div>
                    <div class="pwa-install-desc">Use offline anytime on your home screen</div>
                </div>
                <div class="pwa-install-actions">
                    <button type="button" class="btn-pwa-install" id="btn-pwa-install-now">Install</button>
                    <button type="button" class="btn-pwa-dismiss" id="btn-pwa-install-dismiss" aria-label="Close">&times;</button>
                </div>
            `;
            document.body.appendChild(installBanner);

            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }

            document.getElementById('btn-pwa-install-now').addEventListener('click', () => {
                this.promptInstall();
            });

            document.getElementById('btn-pwa-install-dismiss').addEventListener('click', () => {
                this.hideInstallBanner();
                localStorage.setItem('pwa_install_dismissed', 'true');
            });
        }

        setTimeout(() => {
            installBanner.classList.add('show');
        }, 1000);
    },

    hideInstallBanner() {
        const installBanner = document.getElementById('pwa-install-banner');
        if (installBanner) {
            installBanner.classList.remove('show');
        }
    },

    promptInstall() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('[PWA] User accepted the install prompt');
                } else {
                    console.log('[PWA] User dismissed the install prompt');
                }
                this.deferredPrompt = null;
                this.hideInstallBanner();
            });
        }
    },

    showToast(message, type = 'info') {
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(message, type);
        } else {
            console.log(`[PWA Toast] ${type.toUpperCase()}: ${message}`);
        }
    }
};

// Expose globally
window.PWA = PWA;
