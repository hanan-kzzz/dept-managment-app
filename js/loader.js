/**
 * Universal Page Loader & Navigation Transition Manager - Cashly
 */

(function() {
    const LOADER_ID = 'page-preloader';
    const MIN_LOADER_TIME = 350; // Minimum time in ms to display loader for smooth transition
    const startTime = Date.now();

    function getPreloaderHtml() {
        return `
            <div class="preloader-content">
                <div class="preloader-logo-ring">
                    <div class="preloader-spinner-outer"></div>
                    <div class="preloader-spinner-inner"></div>
                    <div class="preloader-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
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
        }
        return loader;
    }

    // Ensure loader is present immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureLoaderElement);
    } else {
        ensureLoaderElement();
    }

    // Hide loader smoothly
    function hideLoader() {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADER_TIME - elapsedTime);

        setTimeout(() => {
            const loader = document.getElementById(LOADER_ID);
            if (loader) {
                loader.classList.add('fade-out');
            }
        }, remainingTime);
    }

    // Show loader on page load finish
    if (document.readyState === 'complete') {
        hideLoader();
    } else {
        window.addEventListener('load', hideLoader);
        // Fallback safety timeout if window load takes too long
        setTimeout(hideLoader, 1500);
    }

    // Page Transition Link Click Interceptor
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        const target = link.getAttribute('target');

        // Ignore anchors, javascript links, new tab links, or external protocol links
        if (!href || 
            href.startsWith('#') || 
            href.startsWith('javascript:') || 
            href.startsWith('tel:') || 
            href.startsWith('mailto:') || 
            target === '_blank' ||
            e.ctrlKey || e.metaKey || e.shiftKey) {
            return;
        }

        // Show page transition loader
        const loader = ensureLoaderElement();
        if (loader) {
            loader.classList.remove('fade-out');
        }
    }, true);

    // Global APIs
    window.showPageLoader = function(message) {
        const loader = ensureLoaderElement();
        if (loader) {
            const brandEl = loader.querySelector('.preloader-brand');
            if (brandEl && message) {
                brandEl.textContent = message;
            }
            loader.classList.remove('fade-out');
        }
    };

    window.hidePageLoader = function() {
        const loader = document.getElementById(LOADER_ID);
        if (loader) {
            loader.classList.add('fade-out');
        }
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
