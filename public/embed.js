(function(){
  const s=document.currentScript;
  if(!s)return;

  const base=new URL('.',s.src);
  const target=document.getElementById(s.dataset.target||'mjr-scholarships');
  if(!target)return;

  target.setAttribute('data-mjr-scholarships','');
  target.dataset.embedded='true';
  target.dataset.feed=new URL('scholarships.json',base).href;
  target.innerHTML='<div style="max-width:1180px;margin:0 auto;padding:28px;text-align:center;font:700 15px Roboto,Arial,sans-serif;color:#192a56;background:#f5f7fb;border:1px solid #dfe5ee">Loading scholarship opportunities…</div>';

  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href=new URL('styles.css',base).href;
  document.head.appendChild(css);

  const app=document.createElement('script');
  app.src=new URL('app.js',base).href;
  app.onerror=function(){
    target.innerHTML='<div style="padding:28px;text-align:center;font:700 15px Arial,sans-serif;color:#7a1f1f;background:#fff3f3;border:1px solid #e9bcbc">The scholarship finder could not be loaded. Please refresh the page.</div>';
  };
  document.body.appendChild(app);
})();
