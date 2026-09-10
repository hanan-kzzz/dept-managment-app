/**
 * Universal PhonePe-Style Page Loader with 3D Flipping Logo Entrance - Cashly
 */

(function() {
    const LOADER_ID = 'page-preloader';
    const MIN_LOADER_TIME = 600; // Smooth display duration for 3D logo flip entrance
    const MAX_SAFETY_TIMEOUT = 1200;
    const startTime = Date.now();

    function injectLoaderStyles() {
        if (document.getElementById('page-preloader-inline-styles')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'page-preloader-inline-styles';
        styleEl.textContent = `
            .page-preloader {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: linear-gradient(135deg, #1b0933 0%, #5f259f 50%, #3e126e 100%) !important;
                z-index: 99999999 !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                opacity: 1 !important;
                visibility: visible !important;
                transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.4s !important;
                pointer-events: none !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            .page-preloader.fade-out {
                opacity: 0 !important;
                transform: scale(1.08) !important;
                visibility: hidden !important;
                display: none !important;
            }
            .phonepe-loader-container {
                position: relative !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 18px !important;
            }
            .phonepe-badge-wrap {
                position: relative !important;
                width: 84px !important;
                height: 84px !important;
                perspective: 800px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            .phonepe-badge {
                position: relative !important;
                width: 76px !important;
                height: 76px !important;
                border-radius: 50% !important;
                background: rgba(255, 255, 255, 0.14) !important;
                backdrop-filter: blur(12px) !important;
                -webkit-backdrop-filter: blur(12px) !important;
                border: 2px solid rgba(255, 255, 255, 0.3) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35) !important;
                animation: phonepeLogoFlipEntrance 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, phonepeIconSpinFlip 2.4s 0.7s ease-in-out infinite alternate !important;
                transform-style: preserve-3d !important;
                z-index: 2 !important;
            }
            .phonepe-icon-wrap {
                color: #ffffff !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            .phonepe-icon-wrap svg {
                width: 34px !important;
                height: 34px !important;
                flex-shrink: 0 !important;
                display: block !important;
                filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25)) !important;
            }
            .phonepe-spinner-arc {
                position: absolute !important;
                inset: -6px !important;
                border-radius: 50% !important;
                border: 3px solid transparent !important;
                border-top-color: #00d2ff !important;
                border-right-color: #ffffff !important;
                animation: phonepeArcSpin 0.85s linear infinite !important;
                z-index: 3 !important;
            }
            .phonepe-ripple-ring {
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                width: 76px !important;
                height: 76px !important;
                border-radius: 50% !important;
                background: rgba(255, 255, 255, 0.12) !important;
                transform: translate(-50%, -50%) scale(1) !important;
                animation: phonepeRipple 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) infinite !important;
                pointer-events: none !important;
                z-index: 1 !important;
            }
            .phonepe-ripple-ring.ring-2 {
                animation-delay: 0.6s !important;
            }
            .phonepe-brand-title {
                font-size: 1.55rem !important;
                font-weight: 900 !important;
                color: #ffffff !important;
                letter-spacing: -0.4px !important;
                font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
                text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
                animation: phonepeTitleSlideUp 0.6s 0.2s cubic-bezier(0.25, 1, 0.5, 1) both !important;
            }
            .phonepe-dots-loader {
                display: flex !important;
                gap: 8px !important;
                align-items: center !important;
                margin-top: 2px !important;
                animation: phonepeTitleSlideUp 0.6s 0.3s cubic-bezier(0.25, 1, 0.5, 1) both !important;
            }
            .phonepe-dots-loader span {
                width: 8px !important;
                height: 8px !important;
                border-radius: 50% !important;
                background-color: #ffffff !important;
                opacity: 0.4 !important;
                animation: phonepeDotBounce 1.2s ease-in-out infinite !important;
            }
            .phonepe-dots-loader span:nth-child(2) {
                animation-delay: 0.2s !important;
            }
            .phonepe-dots-loader span:nth-child(3) {
                animation-delay: 0.4s !important;
            }
            @keyframes phonepeLogoFlipEntrance {
                0% {
                    opacity: 0;
                    transform: perspective(800px) rotateY(-180deg) scale(0.2);
                }
                70% {
                    opacity: 1;
                    transform: perspective(800px) rotateY(15deg) scale(1.12);
                }
                100% {
                    opacity: 1;
                    transform: perspective(800px) rotateY(0deg) scale(1);
                }
            }
            @keyframes phonepeIconSpinFlip {
                0% { transform: perspective(600px) rotateY(0deg); }
                50% { transform: perspective(600px) rotateY(180deg); }
                100% { transform: perspective(600px) rotateY(360deg); }
            }
            @keyframes phonepeTitleSlideUp {
                0% { opacity: 0; transform: translateY(16px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes phonepeArcSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes phonepeRipple {
                0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.6; }
                100% { transform: translate(-50%, -50%) scale(2.3); opacity: 0; }
            }
            @keyframes phonepeDotBounce {
                0%, 100% { transform: translateY(0); opacity: 0.4; }
                50% { transform: translateY(-6px); opacity: 1; background-color: #00d2ff; }
            }
        `;
        (document.head || document.documentElement).appendChild(styleEl);
    }

    function getPreloaderHtml() {
        return `
            <div class="phonepe-loader-container">
                <div class="phonepe-badge-wrap">
                    <div class="phonepe-ripple-ring ring-1"></div>
                    <div class="phonepe-ripple-ring ring-2"></div>
                    <div class="phonepe-badge">
                        <div class="phonepe-icon-wrap">
                            <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                        </div>
                        <div class="phonepe-spinner-arc"></div>
                    </div>
                </div>

                <div class="phonepe-brand-title">Cashly</div>
                
                <div class="phonepe-dots-loader">
                    <span></span>
                    <span></span>
                    <span></span>
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
            } else if (document.documentElement) {
                document.documentElement.appendChild(loader);
            }
        }
        return loader;
    }

    injectLoaderStyles();
    ensureLoaderElement();

    let isHidden = false;
    function hideLoaderNow() {
        if (isHidden) return;
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADER_TIME - elapsedTime);

        setTimeout(() => {
            if (isHidden) return;
            isHidden = true;
            const loader = document.getElementById(LOADER_ID);
            if (loader) {
                loader.classList.add('fade-out');
                loader.style.setProperty('display', 'none', 'important');
                setTimeout(() => {
                    try { loader.remove(); } catch(e) {}
                }, 400);
            }
        }, remainingTime);
    }

    if (document.readyState === 'complete') {
        hideLoaderNow();
    } else {
        document.addEventListener('DOMContentLoaded', hideLoaderNow);
        window.addEventListener('load', hideLoaderNow);
    }
    setTimeout(hideLoaderNow, MAX_SAFETY_TIMEOUT);

    // Global APIs
    window.showPageLoader = function() {};
    window.hidePageLoader = hideLoaderNow;

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
