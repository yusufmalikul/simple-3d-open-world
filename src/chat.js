// Bottom-left chat box: a scrolling message log + an input field.
// Press Enter to focus the input, type, Enter again to send, Escape to cancel.
// While typing, movement keys are suppressed (see main.js wiring via isTyping()).

export class Chat {
  constructor(onSend) {
    this.onSend = onSend;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Stylesheet (classes keep the responsive media query readable).
    const style = document.createElement('style');
    style.textContent = `
      #chat {
        position: fixed; left: 12px; bottom: 12px; width: 320px; z-index: 20;
        font: 13px/1.4 system-ui, sans-serif; color: #fff;
      }
      #chat-log {
        max-height: 180px; overflow-y: auto; margin-bottom: 6px;
        display: flex; flex-direction: column; gap: 2px;
        text-shadow: 0 1px 2px rgba(0,0,0,.8);
      }
      #chat-row { display: flex; gap: 6px; }
      #chat-input {
        flex: 1; box-sizing: border-box; padding: 7px 10px;
        border: none; border-radius: 6px; outline: none;
        background: rgba(0,0,0,.45); color: #fff; font: inherit;
      }
      #chat-send {
        display: none; padding: 7px 12px; border-radius: 6px;
        background: rgba(0,0,0,.55); color: #fff; align-items: center;
        font: inherit; touch-action: none;
      }
      /* On phones: shrink, lift above the joystick, show a tap-to-send button. */
      @media (max-width: 900px), (pointer: coarse) {
        #chat { width: 240px; bottom: 170px; }
        #chat-log { max-height: 96px; font-size: 12px; }
        #chat-send { display: flex; }
      }
    `;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.id = 'chat';

    this.log = document.createElement('div');
    this.log.id = 'chat-log';

    const row = document.createElement('div');
    row.id = 'chat-row';

    this.input = document.createElement('input');
    this.input.id = 'chat-input';
    this.input.type = 'text';
    this.input.maxLength = 200;
    this.input.placeholder = isTouch ? 'Tap to chat…' : 'Press Enter to chat…';

    // Tap-to-send button (visible only on touch via CSS).
    this.send = document.createElement('button');
    this.send.id = 'chat-send';
    this.send.dataset.control = 'chat';
    this.send.textContent = 'Send';
    this.send.addEventListener('click', () => this._submit());

    row.append(this.input, this.send);
    wrap.append(this.log, row);
    document.body.appendChild(wrap);

    // Global Enter focuses the input when not already typing.
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' && document.activeElement !== this.input) {
        e.preventDefault();
        this.input.focus();
      }
    });

    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // don't let WASD etc. leak to the game while typing
      if (e.code === 'Enter') {
        this._submit();
      } else if (e.code === 'Escape') {
        this.input.value = '';
        this.input.blur();
      }
    });
  }

  _submit() {
    const text = this.input.value.trim();
    if (text) this.onSend(text);
    this.input.value = '';
    this.input.blur(); // also dismisses the mobile keyboard
  }

  // main.js checks this to freeze movement while the user is typing.
  isTyping() {
    return document.activeElement === this.input;
  }

  _line(html, color = '#fff') {
    const el = document.createElement('div');
    el.style.color = color;
    el.innerHTML = html;
    this.log.appendChild(el);
    // Keep only the last ~50 lines.
    while (this.log.children.length > 50) this.log.removeChild(this.log.firstChild);
    this.log.scrollTop = this.log.scrollHeight;
  }

  // Escape user-controlled strings before inserting as HTML.
  _esc(s) {
    return String(s).replace(/[&<>"]/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  message(name, text) {
    this._line(`<b>${this._esc(name)}:</b> ${this._esc(text)}`);
  }

  system(text) {
    this._line(this._esc(text), '#ffd64a');
  }
}
