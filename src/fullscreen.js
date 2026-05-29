// A small fullscreen toggle button. Uses the Fullscreen API where available
// (most mobile browsers except iOS Safari, which doesn't allow it — there the
// button hides itself so we don't show a dead control).

export function createFullscreenButton() {
  const supported =
    document.documentElement.requestFullscreen ||
    document.documentElement.webkitRequestFullscreen;
  if (!supported) return; // iOS Safari etc. — skip

  const btn = document.createElement('button');
  btn.dataset.control = 'fullscreen';
  btn.textContent = '⛶';
  btn.title = 'Toggle fullscreen';
  btn.style.cssText = `
    position: fixed; right: 12px; top: 12px; z-index: 40;
    width: 40px; height: 40px; border-radius: 8px; border: none;
    background: rgba(0,0,0,.45); color: #fff; font-size: 20px;
    cursor: pointer; touch-action: none; user-select: none;
  `;
  document.body.appendChild(btn);

  const enter = () =>
    (document.documentElement.requestFullscreen ||
     document.documentElement.webkitRequestFullscreen)
      .call(document.documentElement);
  const exit = () =>
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);

  btn.addEventListener('click', () => {
    const fs = document.fullscreenElement || document.webkitFullscreenElement;
    (fs ? exit() : enter())?.catch?.(() => {});
  });

  const sync = () => {
    const fs = document.fullscreenElement || document.webkitFullscreenElement;
    btn.textContent = fs ? '⊠' : '⛶';
  };
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
}
