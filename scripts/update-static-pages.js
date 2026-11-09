const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const rootFiles = ['about.html', 'auth.html', 'contact.html', 'cookie-policy.html', 'history.html', 'privacy.html', 'terms.html', 'tool.html'];

const linkedInSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="vertical-align: -2px;"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>';

const newAnalytics = `<!-- Preconnect for performance -->
    <link rel="preconnect" href="https://www.googletagmanager.com" crossorigin>
    <link rel="preconnect" href="https://www.google-analytics.com" crossorigin>

    <!-- Google Analytics & Tag Manager Non-blocking Init -->
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-M2PTXPP9QG');
      
      (function() {
        function loadAnalytics() {
          var ga = document.createElement('script');
          ga.async = true;
          ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-M2PTXPP9QG';
          document.head.appendChild(ga);

          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-WT5JT9KH');
        }

        if (window.requestIdleCallback) {
          requestIdleCallback(function() { setTimeout(loadAnalytics, 50); }, { timeout: 1500 });
        } else {
          window.addEventListener('load', function() { setTimeout(loadAnalytics, 50); });
        }
      })();
    </script>`;

rootFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace preconnect & analytics
  const analyticsBlockRegex = /<!-- Preconnect for performance -->[\s\S]*?<!-- End Google Tag Manager -->/;
  if (analyticsBlockRegex.test(content)) {
    content = content.replace(analyticsBlockRegex, newAnalytics);
  }

  // Remove duplicate unused preconnects
  content = content.replace(/<link rel="preconnect" href="https:\/\/cdnjs\.cloudflare\.com">\s*<link rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net">\s*/g, '');

  // Replace LinkedIn icon with SVG
  content = content.replace(/<i class="fa-brands fa-linkedin"><\/i>/g, linkedInSvg);

  // Replace script references
  content = content.replace(/<script src="\/js\/tools\.js"/g, '<script src="/js/tools.min.js"');
  content = content.replace(/<script src="\/js\/app\.js"/g, '<script src="/js/app.min.js"');

  // Fix theme toggle switch aria-label
  content = content.replace(/<input type="checkbox" id="theme-toggle-switch">/g, '<input type="checkbox" id="theme-toggle-switch" aria-label="Toggle dark mode">');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Updated static page: ${file}`);
});
