/* Let Me ChatGPT That For You — all logic, no dependencies. */
(function () {
  'use strict';

  var MAX_LEN = 2000;
  var DEFAULT_AI = 'chatgpt';

  var AIS = {
    chatgpt:    { name: 'ChatGPT',        url: 'https://chatgpt.com/?q=',
                  hint: 'What can I help with?',     placeholder: 'Ask anything' },
    claude:     { name: 'Claude',         url: 'https://claude.ai/new?q=',
                  hint: 'How can I help you today?', placeholder: 'Chat with Claude' },
    perplexity: { name: 'Perplexity',     url: 'https://www.perplexity.ai/search?q=',
                  hint: 'perplexity',                placeholder: 'Ask anything…' },
    grok:       { name: 'Grok',           url: 'https://grok.com/?q=',
                  hint: 'Grok',                      placeholder: 'What do you want to know?' },
    copilot:    { name: 'Copilot',        url: 'https://copilot.microsoft.com/?q=',
                  hint: 'Hey, what’s on your mind?', placeholder: 'Message Copilot' },
    aimode:     { name: 'Google AI Mode', url: 'https://www.google.com/search?udm=50&q=',
                  hint: 'AI Mode',                   placeholder: 'Ask AI Mode' }
  };

  var $ = function (id) { return document.getElementById(id); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  // Cap length without ever splitting a UTF-16 surrogate pair (a lone high
  // surrogate would make encodeURIComponent throw "URI malformed").
  function clampLen(s) {
    s = s.slice(0, MAX_LEN);
    var c = s.charCodeAt(s.length - 1);
    if (c >= 0xD800 && c <= 0xDBFF) s = s.slice(0, -1);
    return s;
  }

  // ---- parse params (q is NEVER inserted as HTML, only textContent) ----
  var params = new URLSearchParams(location.search);
  var q = clampLen(params.get('q') || '');
  var aiParam = (params.get('ai') || '').toLowerCase();
  var aiKey = Object.prototype.hasOwnProperty.call(AIS, aiParam) ? aiParam : DEFAULT_AI;
  // Undocumented test hook: ?noredirect=1 runs the full show but never leaves.
  var noRedirect = params.get('noredirect') === '1';

  if (q.trim().length > 0) {
    initPlayback(q, aiKey);
  } else {
    initCreator();
  }

  // ======================= CREATOR MODE =======================

  function initCreator() {
    $('creator').hidden = false;
    initHeroDemo();

    var input = $('prompt-input');
    var charCount = $('char-count');
    var picker = document.querySelectorAll('.pill');
    var generateBtn = $('generate-btn');
    var result = $('result');
    var shareUrl = $('share-url');
    var copyBtn = $('copy-btn');
    var previewBtn = $('preview-btn');
    var selectedAi = DEFAULT_AI;
    var copyResetTimer;
    var coarsePointer = window.matchMedia &&
      window.matchMedia('(pointer: coarse)').matches;

    input.addEventListener('input', function () {
      charCount.textContent = String(input.value.length);
      input.classList.remove('error');
    });

    picker.forEach(function (pill) {
      pill.addEventListener('click', function () {
        picker.forEach(function (p) {
          p.classList.remove('selected');
          p.setAttribute('aria-checked', 'false');
        });
        pill.classList.add('selected');
        pill.setAttribute('aria-checked', 'true');
        selectedAi = pill.getAttribute('data-ai');
      });
    });

    generateBtn.addEventListener('click', function () {
      var prompt = clampLen(input.value.trim());
      if (!prompt) {
        input.classList.add('error');
        input.focus();
        return;
      }
      var link = baseUrl() + '?q=' + encodeURIComponent(prompt) + '&ai=' + selectedAi;
      shareUrl.value = link;
      result.hidden = false;
      // On touch devices skip the auto-focus: it pops the keyboard and (on
      // iOS) zooms the page; the user will just tap Copy anyway.
      if (!coarsePointer) {
        shareUrl.focus();
        shareUrl.select();
      }
    });

    shareUrl.addEventListener('click', function () { shareUrl.select(); });

    copyBtn.addEventListener('click', function () {
      copyText(shareUrl.value, shareUrl).then(function (ok) {
        copyBtn.textContent = ok ? 'Copied!' : 'Copy failed';
        copyBtn.classList.remove(ok ? 'copy-error' : 'copied');
        copyBtn.classList.add(ok ? 'copied' : 'copy-error');
        clearTimeout(copyResetTimer);
        copyResetTimer = setTimeout(function () {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('copied');
          copyBtn.classList.remove('copy-error');
        }, 1500);
      });
    });

    previewBtn.addEventListener('click', function () {
      if (shareUrl.value) window.open(shareUrl.value, '_blank', 'noopener');
    });
  }

  // ---- hero demo: decorative looping showcase of the playback stage ----
  // Everything below is driven by hardcoded constants (never user input),
  // all text lands via textContent, and nothing is ever focusable.

  function initHeroDemo() {
    var root = $('hero-demo');
    if (!root) return;

    var THEMES = ['chatgpt', 'claude', 'perplexity', 'grok', 'copilot', 'aimode'];
    var DEMO_PROMPTS = [
      'how do I convert a PDF to Word',
      'what time is it in Tokyo right now',
      'why is my wifi slow',
      'how to boil an egg',
      'is it down or is it just me',
      'what does "http" actually stand for'
    ];

    var logoUse = $('demo-logo-use');
    var heading = $('demo-heading');
    var placeholder = $('demo-placeholder');
    var typed = $('demo-typed');
    var caret = $('demo-caret');
    var composer = $('demo-composer');
    var sendBtn = $('demo-send');
    var overlay = $('demo-overlay');
    var idx = 0;

    function setTheme(key) {
      // key comes from the static THEMES list above — safe in a class name.
      root.className = 'hero-demo theme-' + key;
      logoUse.setAttribute('href', '#logo-' + key);
      heading.textContent = AIS[key].hint;
      placeholder.textContent = AIS[key].placeholder;
    }

    function resetFrame() {
      typed.textContent = '';
      caret.hidden = true;
      caret.classList.remove('typing');
      placeholder.hidden = false;
      composer.classList.remove('focused');
      composer.classList.remove('has-text');
      sendBtn.classList.remove('pressed');
      overlay.hidden = true;
      overlay.classList.remove('fading');
    }

    // Reduced motion: one static, fully-typed frame. No loop, no flashing.
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTheme(THEMES[0]);
      placeholder.hidden = true;
      typed.textContent = DEMO_PROMPTS[0];
      composer.classList.add('has-text');
      return;
    }

    function typeDemo(text) {
      // Wall-clock progress (performance.now()): background tabs clamp
      // timers to ~1Hz, so a tick-counting loop would crawl for minutes
      // there. Elapsed-time progress just snaps to done instead.
      var totalMs = Math.max(600, text.length * 35);
      var startT = performance.now();
      caret.classList.add('typing');
      return new Promise(function (resolve) {
        var timer = setInterval(function () {
          var frac = Math.min(1, (performance.now() - startT) / totalMs);
          var n = Math.min(text.length, Math.ceil(frac * text.length));
          composer.classList.add('has-text');
          typed.textContent = text.slice(0, n); // hardcoded demo strings only
          if (n >= text.length) {
            clearInterval(timer);
            caret.classList.remove('typing');
            resolve();
          }
        }, 35);
      });
    }

    function loop() {
      var key = THEMES[idx % THEMES.length];
      var prompt = DEMO_PROMPTS[idx % DEMO_PROMPTS.length];
      idx += 1;
      resetFrame();
      setTheme(key);
      sleep(900)
        .then(function () {
          composer.classList.add('focused');
          placeholder.hidden = true;
          caret.hidden = false;
          return sleep(350);
        })
        .then(function () { return typeDemo(prompt); })
        .then(function () { return sleep(420); })
        .then(function () {
          sendBtn.classList.add('pressed');
          return sleep(170);
        })
        .then(function () {
          sendBtn.classList.remove('pressed');
          caret.hidden = true;
          return sleep(220);
        })
        .then(function () {
          overlay.hidden = false;
          return sleep(1400);
        })
        .then(function () {
          overlay.classList.add('fading');
          return sleep(320);
        })
        .then(loop);
    }

    loop();
  }

  // Share-URL base: the page's own URL minus query/hash. Preserves subpaths
  // (e.g. GitHub Pages project sites) and also works on file://.
  function baseUrl() {
    return location.href.split(/[?#]/)[0];
  }

  function copyText(text, fallbackInput) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(fallbackInput); }
      );
    }
    return Promise.resolve(legacyCopy(fallbackInput));
  }

  function legacyCopy(inputEl) {
    try {
      inputEl.focus();
      inputEl.select();
      inputEl.setSelectionRange(0, inputEl.value.length);
      return document.execCommand('copy');
    } catch (e) {
      return false;
    }
  }

  // ======================= PLAYBACK MODE =======================

  function initPlayback(prompt, key) {
    var ai = AIS[key];
    var target = ai.url + encodeURIComponent(prompt);

    document.title = 'Someone prepared a question for you…';
    // Playback permutations are infinite and shouldn't be indexed.
    // robots.txt already disallows /*?q= — this is defense in depth.
    var robotsMeta = document.createElement('meta');
    robotsMeta.setAttribute('name', 'robots');
    robotsMeta.setAttribute('content', 'noindex');
    document.head.appendChild(robotsMeta);
    $('playback').hidden = false;
    // key is validated against the static AIS map above, so it is safe to
    // splice into a class name / fragment href. All user text stays in
    // textContent — never markup.
    document.body.classList.add('playback-stage', 'theme-' + key);
    // Sync the browser-chrome color to the stage background (the static
    // meta is near-black, which clashes with the light stages on mobile).
    var STAGE_BG = { chatgpt: '#212121', claude: '#faf9f5', perplexity: '#191a1a',
                     grok: '#000000', copilot: '#f7f3ee', aimode: '#ffffff' };
    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', STAGE_BG[key]);
    $('stage-logo-use').setAttribute('href', '#logo-' + key);
    // textContent only — XSS-safe (values come from the static AIS map)
    $('chat-hint').textContent = ai.hint;
    $('placeholder').textContent = ai.placeholder;

    var skip = $('skip-link');
    skip.href = target;
    skip.addEventListener('click', function (e) {
      e.preventDefault();
      finish(target);
    });

    runAnimation(prompt, target);
  }

  // Final hop. With ?noredirect=1 (test hook) the overlay simply stays and
  // the would-be destination is printed instead of navigating.
  function finish(target) {
    if (!noRedirect) {
      location.replace(target);
      return;
    }
    $('overlay').hidden = false;
    var dest = $('dest-url');
    dest.textContent = target; // textContent only — XSS-safe
    dest.hidden = false;
  }

  function runAnimation(prompt, target) {
    var cursor = $('cursor');
    var composer = $('composer');
    var composerInput = $('composer-input');
    var typed = $('typed-text');
    var caret = $('caret');
    var placeholder = $('placeholder');
    var sendBtn = $('send-btn');
    var overlay = $('overlay');

    // Touch devices have no mouse cursor — an animated desktop arrow would
    // give the joke away. Keep the cursor hidden and let the focus ring,
    // typing, and send-button press imply a finger tap instead.
    var touch = window.matchMedia &&
      window.matchMedia('(pointer: coarse)').matches;
    // Reduced-motion users still get the typing — the typed text IS the
    // content (and the joke); only the gliding fake cursor is real motion.
    var reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var noCursor = touch || reduceMotion;

    function moveCursorTo(x, y) {
      cursor.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    }

    function pointIn(el, fx, fy) {
      var r = el.getBoundingClientRect();
      return { x: r.left + r.width * fx, y: r.top + r.height * fy };
    }

    function typeOut(text) {
      // ~40ms/char, but total capped at ~4s for long prompts.
      var TICK = 36;
      var totalMs = Math.min(4000, text.length * 40);
      // Wall-clock based: background tabs clamp timers to ~1Hz, and a
      // tick-counting loop would stretch 4s of typing into minutes there.
      var startT = performance.now();
      // Real carets stay solid while you type.
      caret.classList.add('typing');
      // Layout shifts as the composer grows — re-pin the cursor each tick
      // with a short linear transition so it tracks the input.
      if (!noCursor) cursor.style.transition = 'transform 80ms linear';
      return new Promise(function (resolve) {
        var timer = setInterval(function () {
          var frac = Math.min(1, (performance.now() - startT) / totalMs);
          var n = Math.min(text.length, Math.ceil(frac * text.length));
          // First characters typed: reveal the ChatGPT send button
          composer.classList.add('has-text');
          typed.textContent = text.slice(0, n); // textContent only — XSS-safe
          composerInput.scrollTop = composerInput.scrollHeight;
          if (!noCursor) {
            var p = pointIn(composerInput, 0.18, 0.55);
            moveCursorTo(p.x, p.y);
          }
          if (n >= text.length) {
            clearInterval(timer);
            caret.classList.remove('typing');
            if (!noCursor) cursor.style.transition = '';
            resolve();
          }
        }, TICK);
      });
    }

    if (!noCursor) {
      // start just off the lower-right of the chat window
      var start = pointIn($('playback'), 0.85, 0.95);
      cursor.hidden = false;
      cursor.style.transition = 'none';
      moveCursorTo(start.x, start.y);
      // force layout so the start position applies before the glide
      void cursor.offsetWidth;
      cursor.style.transition = '';
    }

    sleep(500)
      .then(function () {
        if (noCursor) return sleep(200);
        var p = pointIn(composerInput, 0.18, 0.55);
        moveCursorTo(p.x, p.y);
        return sleep(800);
      })
      .then(function () {
        composer.classList.add('focused');
        placeholder.hidden = true;
        caret.hidden = false;
        return sleep(300);
      })
      .then(function () { return typeOut(prompt); })
      .then(function () { return sleep(400); })
      .then(function () {
        if (noCursor) return sleep(250);
        var p = pointIn(sendBtn, 0.5, 0.5);
        moveCursorTo(p.x, p.y);
        return sleep(750);
      })
      .then(function () {
        sendBtn.classList.add('pressed');
        return sleep(170);
      })
      .then(function () {
        sendBtn.classList.remove('pressed');
        caret.hidden = true;
        return sleep(280);
      })
      .then(function () {
        overlay.hidden = false;
        return sleep(1200);
      })
      .then(function () {
        finish(target);
      });
  }
})();
