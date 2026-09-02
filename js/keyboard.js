const KEYBOARD_LAYOUT = [
  [
    { key: 'q', kr: 'ㅂ' }, { key: 'w', kr: 'ㅈ' }, { key: 'e', kr: 'ㄷ' }, { key: 'r', kr: 'ㄱ' },
    { key: 't', kr: 'ㅅ' }, { key: 'y', kr: 'ㅛ' }, { key: 'u', kr: 'ㅕ' }, { key: 'i', kr: 'ㅑ' },
    { key: 'o', kr: 'ㅐ' }, { key: 'p', kr: 'ㅔ' }
  ],
  [
    { key: 'a', kr: 'ㅁ' }, { key: 's', kr: 'ㄴ' }, { key: 'd', kr: 'ㅇ' }, { key: 'f', kr: 'ㄹ' },
    { key: 'g', kr: 'ㅎ' }, { key: 'h', kr: 'ㅗ' }, { key: 'j', kr: 'ㅓ' }, { key: 'k', kr: 'ㅏ' },
    { key: 'l', kr: 'ㅣ' }, { key: ';', kr: ';' }
  ],
  [
    { key: 'z', kr: 'ㅋ' }, { key: 'x', kr: 'ㅌ' }, { key: 'c', kr: 'ㅊ' }, { key: 'v', kr: 'ㅍ' },
    { key: 'b', kr: 'ㅠ' }, { key: 'n', kr: 'ㅜ' }, { key: 'm', kr: 'ㅡ' }, { key: ',', kr: ',' },
    { key: '.', kr: '.' }, { key: '/', kr: '/' }
  ]
];

export class Keyboard {
  constructor(container) {
    this.container = container;
    this.keyEls = {};
  }

  render() {
    this.container.innerHTML = '';

    KEYBOARD_LAYOUT.forEach((row) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'keyboard-row';

      row.forEach(({ key, kr }) => {
        const keyEl = document.createElement('div');
        keyEl.className = 'key';
        keyEl.dataset.key = key;
        keyEl.innerHTML = `
          <span class="key-en">${key.toUpperCase()}</span>
          <span class="key-kr">${kr}</span>
        `;

        this.keyEls[key] = keyEl;
        rowEl.appendChild(keyEl);
      });

      this.container.appendChild(rowEl);
    });
  }

  highlightStageKeys(keys) {
    Object.values(this.keyEls).forEach((keyEl) => {
      keyEl.classList.remove('key--highlight');
    });

    keys.forEach((key) => {
      if (this.keyEls[key]) {
        this.keyEls[key].classList.add('key--highlight');
      }
    });
  }

  // 한글 IME 상태에서는 event.key가 'ㅅ', 'Process' 등으로 오기 때문에
  // 물리 키 위치를 나타내는 event.code로 키를 찾는다.
  static keyFromCode(code) {
    if (typeof code !== 'string') {
      return null;
    }
    if (code.startsWith('Key')) {
      return code.slice(3).toLowerCase();
    }
    const punctuation = { Semicolon: ';', Comma: ',', Period: '.', Slash: '/' };
    return punctuation[code] ?? null;
  }

  pressKey(code) {
    const key = Keyboard.keyFromCode(code);
    if (key && this.keyEls[key]) {
      this.keyEls[key].classList.add('key--pressed');
    }
  }

  releaseKey(code) {
    const key = Keyboard.keyFromCode(code);
    if (key && this.keyEls[key]) {
      this.keyEls[key].classList.remove('key--pressed');
    }
  }

  resetPressed() {
    Object.values(this.keyEls).forEach((keyEl) => {
      keyEl.classList.remove('key--pressed');
    });
  }
}
