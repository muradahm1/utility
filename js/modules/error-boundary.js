/**
 * error-boundary.js — Global Error Boundary for GetCalcu
 *
 * Catches unhandled JavaScript errors and promise rejections,
 * displays a friendly recovery UI instead of a blank page,
 * and provides a "Report a problem" button.
 *
 * @module modules/error-boundary
 */

/**
 * Initialize the global error boundary.
 * Call this once on every page (or at least on tool pages).
 */
export function initErrorBoundary() {
    // Prevent duplicate handlers
    if (window.__GETCALCU_ERROR_BOUNDARY__) return;
    window.__GETCALCU_ERROR_BOUNDARY__ = true;

    const showError = (message, error) => {
        const container = document.getElementById('tool-runner-container')
            || document.querySelector('.content-body')
            || document.body;

        if (!container) return;

        // Don't override if we're already showing an error
        if (container.querySelector('.error-boundary')) return;

        const errText = error && error.message ? error.message : (message || 'Something went wrong');
        const safeMsg = errText.replace(/</g, '<').replace(/>/g, '>');

        container.innerHTML = `
            <div class="error-boundary" style="padding:40px;text-align:center;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-lg);max-width:520px;margin:0 auto;">
                <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
                <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;color:var(--text-primary);">Something went wrong</h2>
                <p style="color:var(--text-secondary);font-size:14px;line-height:1.6;margin-bottom:20px;">
                    An unexpected error occurred. The page has been partially loaded.
                    You can try refreshing, or report this issue to help us fix it.
                </p>
                <div style="background:rgba(239,68,68,0.08);border-radius:var(--radius-md);padding:12px 16px;margin-bottom:20px;text-align:left;font-size:12px;color:var(--text-secondary);font-family:monospace;word-break:break-word;max-height:120px;overflow:auto;">
                    ${safeMsg}
                </div>
                <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                    <button class="btn btn-primary" onclick="window.location.reload()" style="min-width:120px;">
                        <i class="fa-solid fa-rotate-right"></i> Refresh
                    </button>
                    <button class="btn btn-outline" id="report-error-btn" style="min-width:120px;">
                        <i class="fa-solid fa-bug"></i> Report a problem
                    </button>
                </div>
            </div>
        `;

        // Wire up the report button
        const reportBtn = document.getElementById('report-error-btn');
        if (reportBtn) {
            reportBtn.addEventListener('click', () => {
                const subject = encodeURIComponent('GetCalcu Error Report');
                const body = encodeURIComponent(
                    'Error: ' + errText + '\n\n' +
                    'URL: ' + window.location.href + '\n' +
                    'User Agent: ' + navigator.userAgent + '\n\n' +
                    'Please describe what you were doing when this error occurred:'
                );
                window.location.href = 'mailto:support@getcalcu.com?subject=' + subject + '&body=' + body;
            });
        }
    };

    // Catch synchronous errors
    window.addEventListener('error', (event) => {
        console.error('[ErrorBoundary] Unhandled error:', event.error || event.message);
        showError(event.message || 'An unexpected error occurred', event.error);
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('[ErrorBoundary] Unhandled promise rejection:', event.reason);
        showError('A network or processing error occurred', event.reason);
    });
}
