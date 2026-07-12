window.XB_APPS_SCRIPT_URL = '';
window.XB_MUSIC_FILE = 'assets/ryazan-moya.mp3';
window.XB_CONTACT_PHONE = '79969662393';
document.documentElement.style.setProperty('--daisies-image', "url('assets/daisy-cutout.webp')");
(() => {
  if (document.querySelector('link[data-final-wedding-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'final.css';
  link.dataset.finalWeddingCss = 'true';
  document.head.appendChild(link);
})();
