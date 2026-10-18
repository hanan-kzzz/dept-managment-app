/**
 * Cashly Mobile PWA & Offline Experience Manager
 * Handles Service Worker Registration, Offline Status Banner, and PWA Install Prompt.
 */

(function() {
    'use strict';

    class PWAManager {
        constructor() {
            this.deferredPrompt = null;
            this.offlineBanner = null;
            this.installBanner = null;
            this.init();
        }

        init() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.start());
            } else {
                this.start();
            }
        }

        start() {
            this.registerServiceWorker();
            this.setupOfflineListeners();
            this.setupInstallPrompt();
        }

        // --- 1. SERVICE WORKER REGISTRATION ---
        registerServiceWorker() {
            if (!('serviceWorker' in navigator)) return;

            const basePath = (typeof window.computeBasePath === 'function') ? window.computeBasePath() : '';
            const swPath = basePath + 'service-worker.js';

            window.addEventListener('load', () => {
                navigator.serviceWorker.register(swPath)
                    .then((registration) => {
                        console.log('[Cashly PWA] ServiceWorker registered with scope:', registration.scope);
                        
                        // Check for updates on navigation
                        registration.onupdatefound = () => {
                            const installingWorker = registration.installing;
                            if (installingWorker == null) return;
                            installingWorker.onstatechange = () => {
                                if (installingWorker.state === 'installed') {
                                    if (navigator.serviceWorker.controller) {
                                        console.log('[Cashly PWA] New content available; please refresh.');
                                        if (typeof Utils !== 'undefined' && Utils.showToast) {
                                            Utils.showToast('App update available! Refresh to update.', 'info');
                                        }
                                    }
                                }
                            };
                        };
                    })
                    .catch((err) => {
                        console.warn('[Cashly PWA] ServiceWorker registration failed:', err);
                    });
            });
        }

        // --- 2. OFFLINE / ONLINE DETECTOR & BANNER ---
        setupOfflineListeners() {
            window.addEventListener('offline', () => this.updateOnlineStatus(false));
            window.addEventListener('online', () => this.updateOnlineStatus(true));

            // Initial check
            if (!navigator.onLine) {
                this.updateOnlineStatus(false);
            }
        }

        updateOnlineStatus(isOnline) {
            let banner = document.getElementById('cashly-offline-banner');

            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'cashly-offline-banner';
                banner.className = 'cashly-network-banner';
                document.body.appendChild(banner);
            }

            if (!isOnline) {
                banner.className = 'cashly-network-banner offline-mode show';
                banner.innerHTML = `
                    <div class="network-banner-content">
                        <span class="pulse-offline-dot"></span>
                        <span class="network-banner-text">⚡ <strong>Offline Mode</strong> — Data saved locally</span>
                    </div>
                `;
            } else {
                banner.className = 'cashly-network-banner online-mode show';
                banner.innerHTML = `
                    <div class="network-banner-content">
                        <span class="pulse-online-dot"></span>
                        <span class="network-banner-text">🟢 <strong>Back Online</strong> — Connection restored</span>
                    </div>
                `;

                setTimeout(() => {
                    banner.classList.remove('show');
                }, 3200);
            }
        }

        // --- 3. PWA INSTALL PROMPT & BANNER ---
        setupInstallPrompt() {
            // Check if already running as installed PWA app
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                                 window.navigator.standalone === true || 
                                 document.referrer.includes('android-app://');

            if (isStandalone) {
                console.log('[Cashly PWA] Running in standalone PWA mode');
                return;
            }

            window.addEventListener('beforeinstallprompt', (e) => {
                // Prevent Chrome 67 and earlier from automatically showing prompt
                e.preventDefault();
                this.deferredPrompt = e;

                // Check user preference (if dismissed in this session)
                if (sessionStorage.getItem('cashly_pwa_dismissed') === 'true') {
                    return;
                }

                this.showInstallBanner();
            });

            window.addEventListener('appinstalled', () => {
                console.log('[Cashly PWA] App was successfully installed!');
                this.deferredPrompt = null;
                this.hideInstallBanner();
                if (typeof Utils !== 'undefined' && Utils.showToast) {
                    Utils.showToast('Cashly installed successfully!', 'success');
                }
            });

            // iOS Safari detection helper
            const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS && !isStandalone && !sessionStorage.getItem('cashly_pwa_dismissed')) {
                // Delay slightly before showing iOS banner
                setTimeout(() => {
                    this.showIOSInstallBanner();
                }, 4000);
            }
        }

        showInstallBanner() {
            if (document.getElementById('cashly-pwa-install-banner')) return;

            const banner = document.createElement('div');
            banner.id = 'cashly-pwa-install-banner';
            banner.className = 'pwa-install-banner';
            banner.innerHTML = `
                <div class="pwa-install-card">
                    <div class="pwa-install-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                    </div>
                    <div class="pwa-install-info">
                        <div class="pwa-install-title">Install Cashly App</div>
                        <div class="pwa-install-desc">Install on mobile for fast, offline access anytime.</div>
                    </div>
                    <div class="pwa-install-actions">
                        <button type="button" class="btn-pwa-install" id="btn-pwa-install-now">Install</button>
                        <button type="button" class="btn-pwa-dismiss" id="btn-pwa-install-later" aria-label="Dismiss">&times;</button>
                    </div>
                </div>
            `;
            document.body.appendChild(banner);

            setTimeout(() => banner.classList.add('show'), 300);

            document.getElementById('btn-pwa-install-now').addEventListener('click', () => {
                this.triggerInstall();
            });

            document.getElementById('btn-pwa-install-later').addEventListener('click', () => {
                this.hideInstallBanner();
                sessionStorage.setItem('cashly_pwa_dismissed', 'true');
            });
        }

        showIOSInstallBanner() {
            if (document.getElementById('cashly-pwa-install-banner')) return;

            const banner = document.createElement('div');
            banner.id = 'cashly-pwa-install-banner';
            banner.className = 'pwa-install-banner ios-banner';
            banner.innerHTML = `
                <div class="pwa-install-card">
                    <div class="pwa-install-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    </div>
                    <div class="pwa-install-info">
                        <div class="pwa-install-title">Add Cashly to Home Screen</div>
                        <div class="pwa-install-desc">Tap <strong style="color: var(--primary, #2563eb);">Share</strong> then select <strong>'Add to Home Screen'</strong> to use offline.</div>
                    </div>
                    <button type="button" class="btn-pwa-dismiss" id="btn-pwa-ios-dismiss" aria-label="Dismiss">&times;</button>
                </div>
            `;
            document.body.appendChild(banner);

            setTimeout(() => banner.classList.add('show'), 300);

            document.getElementById('btn-pwa-ios-dismiss').addEventListener('click', () => {
                this.hideInstallBanner();
                sessionStorage.setItem('cashly_pwa_dismissed', 'true');
            });
        }

        triggerInstall() {
            if (!this.deferredPrompt) {
                console.warn('[Cashly PWA] No deferred prompt available');
                return;
            }

            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('[Cashly PWA] User accepted the install prompt');
                } else {
                    console.log('[Cashly PWA] User dismissed the install prompt');
                }
                this.deferredPrompt = null;
                this.hideInstallBanner();
            });
        }

        hideInstallBanner() {
            const banner = document.getElementById('cashly-pwa-install-banner');
            if (banner) {
                banner.classList.remove('show');
                setTimeout(() => banner.remove(), 400);
            }
        }
    }

    // Expose global instance
    window.PWAManager = new PWAManager();
})();
