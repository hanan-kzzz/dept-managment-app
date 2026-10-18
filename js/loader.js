/**
 * Universal Page Loader & Navigation Transition Manager - Cashly
 */

(function() {
    // Clean .html and /index.html from browser URL address bar only on production hosts
    try {
        const isLocalDev = Boolean(
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname === '[::1]' ||
            window.location.protocol === 'file:'
        );
        if (!isLocalDev) {
            const p = window.location.pathname;
            if (p.endsWith('/index.html')) {
                const clean = p.slice(0, -10) || '/';
                window.history.replaceState(null, '', clean + window.location.search + window.location.hash);
            } else if (p.endsWith('.html')) {
                const clean = p.slice(0, -5);
                window.history.replaceState(null, '', clean + window.location.search + window.location.hash);
            }
        }
    } catch (e) {}

    // Auto-inject PWA manifest, mobile web app meta tags, and PWA manager script
    try {
        const path = (window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
        let base = '';
        if (path.includes('/pages/settings/') && !path.endsWith('/pages/settings/settings.html') && !path.endsWith('/pages/settings/notifications.html') && !path.endsWith('/pages/settings/settings') && !path.endsWith('/pages/settings/notifications')) {
            base = '../../../';
        } else if (path.includes('/pages/customers/') || path.includes('/pages/inventory/') || path.includes('/pages/sales/') || path.includes('/pages/settings/')) {
            base = '../../';
        } else if (path.includes('/auth/')) {
            base = '../';
        }

        // Ensure manifest link exists
        if (!document.querySelector('link[rel="manifest"]')) {
            const manifestLink = document.createElement('link');
            manifestLink.rel = 'manifest';
            manifestLink.href = base + 'manifest.json';
            document.head.appendChild(manifestLink);
        }

        // Ensure meta theme-color exists
        if (!document.querySelector('meta[name="theme-color"]')) {
            const themeMeta = document.createElement('meta');
            themeMeta.name = 'theme-color';
            themeMeta.content = '#2563EB';
            document.head.appendChild(themeMeta);
        }

        // Ensure iOS Safari / PWA meta tags
        if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
            const appleCap = document.createElement('meta');
            appleCap.name = 'apple-mobile-web-app-capable';
            appleCap.content = 'yes';
            document.head.appendChild(appleCap);

            const appleStatus = document.createElement('meta');
            appleStatus.name = 'apple-mobile-web-app-status-bar-style';
            appleStatus.content = 'black-translucent';
            document.head.appendChild(appleStatus);

            const appleTitle = document.createElement('meta');
            appleTitle.name = 'apple-mobile-web-app-title';
            appleTitle.content = 'Cashly';
            document.head.appendChild(appleTitle);
        }

        // Ensure pwa-manager.js script is loaded
        if (!document.getElementById('pwa-manager-script')) {
            const pwaScript = document.createElement('script');
            pwaScript.id = 'pwa-manager-script';
            pwaScript.src = base + 'js/pwa-manager.js';
            document.head.appendChild(pwaScript);
        }
    } catch (e) {}

    const LOADER_ID = 'page-preloader';
    const MIN_LOADER_TIME = 250; // Minimum time in ms to display loader
    const startTime = Date.now();

    // Inject strict inline CSS into <head> immediately to guarantee correct sizing & fixed positioning
    function injectLoaderStyles() {
        if (document.getElementById('page-preloader-inline-styles')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'page-preloader-inline-styles';
        styleEl.textContent = `
            .page-preloader {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background-color: var(--page-bg, #f4f6f8) !important;
                z-index: 999999 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                opacity: 1 !important;
                visibility: visible !important;
                pointer-events: auto !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            [data-theme="dark"] .page-preloader {
                background-color: var(--page-bg, #090d16) !important;
            }
            .page-preloader.fade-out {
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
                display: none !important;
            }
            .preloader-content {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 14px !important;
            }
            .preloader-logo-ring {
                position: relative !important;
                width: 72px !important;
                height: 72px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            .preloader-spinner-outer {
                position: absolute !important;
                inset: 0 !important;
                border-radius: 50% !important;
                border: 3px solid rgba(37, 99, 235, 0.12) !important;
                border-top-color: var(--primary, #2563eb) !important;
                border-right-color: #06b6d4 !important;
                animation: preloaderSpin 0.9s linear infinite !important;
            }
            .preloader-spinner-inner {
                position: absolute !important;
                inset: 7px !important;
                border-radius: 50% !important;
                border: 2px solid transparent !important;
                border-bottom-color: var(--primary, #2563eb) !important;
                animation: preloaderSpinReverse 1.3s linear infinite !important;
            }
            .preloader-icon {
                width: 28px !important;
                height: 28px !important;
                max-width: 28px !important;
                max-height: 28px !important;
                color: var(--primary, #2563eb) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                animation: preloaderPulse 1.4s ease-in-out infinite alternate !important;
            }
            .preloader-icon svg {
                width: 26px !important;
                height: 26px !important;
                max-width: 26px !important;
                max-height: 26px !important;
                flex-shrink: 0 !important;
                display: block !important;
            }
            .preloader-brand {
                font-size: 1.25rem !important;
                font-weight: 800 !important;
                color: var(--text-primary, #0f172a) !important;
                letter-spacing: -0.4px !important;
            }
            [data-theme="dark"] .preloader-brand {
                color: #f8fafc !important;
            }
        `;
        (document.head || document.documentElement).appendChild(styleEl);
    }

    function getPreloaderHtml() {
        return `
            <div class="preloader-content">
                <div class="preloader-logo-ring">
                    <div class="preloader-spinner-outer"></div>
                    <div class="preloader-spinner-inner"></div>
                    <div class="preloader-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 26px !important; height: 26px !important; max-width: 26px !important; max-height: 26px !important;"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                    </div>
                </div>
                <div class="preloader-brand">Cashly</div>
                <div class="preloader-dots">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
            </div>
        `;
    }

    function ensureLoaderElement() {
        injectLoaderStyles();
        let loader = document.getElementById(LOADER_ID);
        if (!loader) {
            loader = document.createElement('div');
            loader.id = LOADER_ID;
            loader.className = 'page-preloader';
            loader.innerHTML = getPreloaderHtml();
            if (document.body) {
                document.body.insertBefore(loader, document.body.firstChild);
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    if (!document.getElementById(LOADER_ID)) {
                        document.body.insertBefore(loader, document.body.firstChild);
                    }
                });
            }
        } else {
            // Fix existing loader svg sizing attributes
            const svg = loader.querySelector('.preloader-icon svg');
            if (svg) {
                svg.setAttribute('width', '26');
                svg.setAttribute('height', '26');
                svg.style.cssText = 'width: 26px !important; height: 26px !important; max-width: 26px !important; max-height: 26px !important;';
            }
        }
        return loader;
    }

    injectLoaderStyles();

    // Ensure loader is present & properly hidden when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureLoaderElement);
    } else {
        ensureLoaderElement();
    }

    function hideLoader() {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADER_TIME - elapsedTime);

        setTimeout(() => {
            const loader = document.getElementById(LOADER_ID);
            if (loader) {
                loader.classList.add('fade-out');
                loader.style.display = 'none';
            }
        }, remainingTime);
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        hideLoader();
    } else {
        window.addEventListener('load', hideLoader);
    }
    // Safety fallback
    setTimeout(hideLoader, 300);

    // Global APIs
    window.showPageLoader = function(message) {
        const loader = ensureLoaderElement();
        if (loader) {
            const brandEl = loader.querySelector('.preloader-brand');
            if (brandEl && message) {
                brandEl.textContent = message;
            }
            loader.style.display = 'flex';
            loader.classList.remove('fade-out');
        }
    };

    window.hidePageLoader = function() {
        hideLoader();
    };

    window.showBtnSpinner = function(btn) {
        if (!btn || btn.classList.contains('btn-loading')) return;
        btn.dataset.originalHtml = btn.innerHTML;
        btn.classList.add('btn-loading');
        btn.disabled = true;
        btn.innerHTML = `<span class="btn-spinner"></span> <span>Loading...</span>`;
    };

    window.hideBtnSpinner = function(btn) {
        if (!btn || !btn.classList.contains('btn-loading')) return;
        btn.classList.remove('btn-loading');
        btn.disabled = false;
        if (btn.dataset.originalHtml) {
            btn.innerHTML = btn.dataset.originalHtml;
            delete btn.dataset.originalHtml;
        }
    };
})();
