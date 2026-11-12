/* Shared by privacy.html and terms.html: shows one language block and remembers the choice. */
(function () {
  const pick = () => {
    const q = new URLSearchParams(location.search).get('lang');
    const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
    return ['uz', 'ru', 'en'].find(l => l === q) || ['uz', 'ru', 'en'].find(l => l === get('bilimdon_hlang') || l === get('bilimdon_lang')) || 'uz';
  };
  const show = l => {
    document.querySelectorAll('[data-lang]').forEach(el => el.hidden = el.dataset.lang !== l);
    document.querySelectorAll('.langs button').forEach(b => b.classList.toggle('on', b.dataset.l === l));
    document.documentElement.lang = l;
  };
  document.querySelectorAll('.langs button').forEach(b => b.onclick = () => show(b.dataset.l));
  show(pick());
})();
