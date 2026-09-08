/**
 * GetCalcu Embed SDK
 * Enables seamless embedding of any GetCalcu calculator on third-party sites.
 *
 * Usage:
 * <div class="getcalcu-embed" data-tool="mortgage-calculator" data-theme="light" data-width="100%"></div>
 * <script src="https://www.getcalcu.com/js/embed.js" async></script>
 */
(function() {
  const BASE_URL = 'https://www.getcalcu.com';

  function initEmbeds() {
    const targets = document.querySelectorAll('.getcalcu-embed, [data-getcalcu]');
    targets.forEach(el => {
      if (el.getAttribute('data-getcalcu-initialized')) return;
      el.setAttribute('data-getcalcu-initialized', 'true');

      const tool = el.getAttribute('data-tool') || el.getAttribute('data-getcalcu') || 'mortgage-calculator';
      const theme = el.getAttribute('data-theme') || 'light';
      const width = el.getAttribute('data-width') || '100%';
      const height = el.getAttribute('data-height') || '680px';

      const iframe = document.createElement('iframe');
      iframe.src = `${BASE_URL}/tool/${encodeURIComponent(tool)}?embed=1&theme=${encodeURIComponent(theme)}`;
      iframe.style.width = width;
      iframe.style.height = height;
      iframe.style.border = '1px solid #E2E8F0';
      iframe.style.borderRadius = '12px';
      iframe.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
      iframe.style.display = 'block';
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('title', `GetCalcu ${tool}`);

      const attribution = document.createElement('div');
      attribution.style.fontSize = '11px';
      attribution.style.color = '#94A3B8';
      attribution.style.marginTop = '6px';
      attribution.style.textAlign = 'right';
      attribution.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      attribution.innerHTML = `Powered by <a href="${BASE_URL}/tool/${encodeURIComponent(tool)}" target="_blank" rel="noopener" style="color:#6366F1;text-decoration:none;font-weight:600;">GetCalcu</a>`;

      el.innerHTML = '';
      el.appendChild(iframe);
      el.appendChild(attribution);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmbeds);
  } else {
    initEmbeds();
  }
})();
