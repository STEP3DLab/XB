(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const params = new URLSearchParams(location.search);
  const guestId = String(params.get('guest') || params.get('id') || '').trim();
  const apiUrl = String(window.XB_APPS_SCRIPT_URL || '').trim();
  const musicFile = String(window.XB_MUSIC_FILE || 'assets/ryazan-moya.mp3').trim();
  const phone = '79969662393';

  const scenarios = {
    'named-home': { named: true, church: true, afterparty: true, stay: false },
    'named-stay': { named: true, church: true, afterparty: true, stay: true },
    'general-home': { named: false, church: true, afterparty: true, stay: false },
    'general-stay': { named: false, church: true, afterparty: true, stay: true },
    'main-only': { named: false, church: false, afterparty: false, stay: false }
  };

  const fallbacks = {
    'evgeniy-larisa': { id: 'evgeniy-larisa', salutation: 'Дорогие', name: 'Евгений и Лариса', scenario: 'named-home' },
    'aleksey-natalya': { id: 'aleksey-natalya', salutation: 'Дорогие', name: 'Алексей и Наталья', scenario: 'named-home' },
    family: { id: 'family', salutation: 'Дорогая', name: 'семья', scenario: 'named-home' },
    'guests-1': { id: 'guests-1', salutation: 'Дорогие', name: 'гости', scenario: 'general-home' },
    'guests-2': { id: 'guests-2', salutation: 'Дорогие', name: 'гости', scenario: 'general-stay' }
  };

  const defaultHero = 'Ждём вас 25 июля 2026 года на нашей свадьбе в селе Ермо-Николаевка. Сбор гостей в 15:00. Праздник пройдёт во дворе дома, в шатре.';

  function asBool(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['0', 'false', 'нет', 'no', 'off'].includes(normalized)) return false;
    if (['1', 'true', 'да', 'yes', 'on', 'lukino'].includes(normalized)) return true;
    return fallback;
  }

  function normalize(raw = {}) {
    const scenarioName = String(raw.scenario || raw['Сценарий'] || 'general-home').trim();
    const base = scenarios[scenarioName] || scenarios['general-home'];
    return {
      id: String(raw.id || raw.ID || guestId || 'guests-1').trim(),
      salutation: String(raw.salutation || raw['Обращение'] || 'Дорогие').trim(),
      name: String(raw.name || raw['Имя'] || 'гости').trim(),
      scenario: scenarioName,
      named: asBool(raw.named ?? raw['Именное'], base.named),
      church: asBool(raw.showChurch ?? raw.church ?? raw['Показывать венчание'], base.church),
      afterparty: asBool(raw.showAfterparty ?? raw.afterparty ?? raw['Показывать продолжение'], base.afterparty),
      stay: asBool(raw.showStay ?? raw.stay ?? raw['Показывать ночёвку'], base.stay),
      heroText: String(raw.heroCopy || raw.heroText || raw['Персональный текст'] || defaultHero).trim(),
      active: asBool(raw.active ?? raw['Активно'], true)
    };
  }

  function queryOverrides(invite) {
    const next = { ...invite };
    if (params.has('church')) next.church = asBool(params.get('church'), next.church);
    if (params.has('after')) next.afterparty = asBool(params.get('after'), next.afterparty);
    if (params.has('stay')) next.stay = params.get('stay') === 'lukino' || asBool(params.get('stay'), next.stay);
    return next;
  }

  let invite = queryOverrides(normalize(fallbacks[guestId] || { id: guestId || 'guests-1' }));

  function show(selector, visible) {
    $$(selector).forEach((element) => { element.hidden = !visible; });
  }

  function applyInvite(raw = invite) {
    invite = queryOverrides(normalize(raw));
    if (!invite.active) invite = queryOverrides(normalize({ scenario: 'general-home' }));

    $('[data-salutation]').textContent = invite.salutation;
    $('[data-guest-name]').textContent = invite.name;
    $('[data-hero-copy]').textContent = invite.heroText || defaultHero;
    document.title = invite.named ? `ХВ • ${invite.name}` : 'Свадьба в деревне • ХВ';

    show('[data-section-church], [data-menu-church], [data-rsvp-church]', invite.church);
    show('[data-section-afterparty], [data-menu-afterparty], [data-rsvp-afterparty]', invite.afterparty);
    show('[data-section-stay], [data-menu-stay], [data-rsvp-stay]', invite.stay);

    const nameField = $('#nameField');
    const nameInput = $('#guestInput');
    const heading = $('[data-rsvp-heading]');
    if (invite.named) {
      nameField.hidden = true;
      nameInput.value = invite.name;
      heading.textContent = `${invite.name}, подтвердите участие`;
    } else {
      nameField.hidden = false;
      nameInput.value = '';
      heading.textContent = 'Подтвердить присутствие';
    }
  }

  function loadGuest() {
    if (!apiUrl || !guestId) return;
    const callback = `xbGuest_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const script = document.createElement('script');
    let timer;
    const cleanup = () => {
      clearTimeout(timer);
      delete window[callback];
      script.remove();
    };
    window[callback] = (payload) => {
      if (payload?.ok !== false && payload?.guest) applyInvite(payload.guest);
      cleanup();
    };
    script.onerror = cleanup;
    script.src = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=guest&id=${encodeURIComponent(guestId)}&callback=${encodeURIComponent(callback)}`;
    document.head.appendChild(script);
    timer = setTimeout(cleanup, 6500);
  }

  function initMenu() {
    const button = $('.menu-button');
    const menu = $('.menu');
    const setOpen = (open) => {
      document.body.classList.toggle('menu-open', open);
      menu.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    };
    button.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
    $$('a', menu).forEach((link) => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setOpen(false); });
    document.addEventListener('click', (event) => {
      if (menu.classList.contains('is-open') && !menu.contains(event.target) && !button.contains(event.target)) setOpen(false);
    });
  }

  function initCountdown() {
    const date = new Date('2026-07-25T15:00:00+03:00');
    const nodes = {
      days: $('[data-days]'), hours: $('[data-hours]'), minutes: $('[data-minutes]'), seconds: $('[data-seconds]')
    };
    const tick = () => {
      const diff = Math.max(0, date.getTime() - Date.now());
      nodes.days.textContent = String(Math.floor(diff / 86400000));
      nodes.hours.textContent = String(Math.floor(diff / 3600000) % 24).padStart(2, '0');
      nodes.minutes.textContent = String(Math.floor(diff / 60000) % 60).padStart(2, '0');
      nodes.seconds.textContent = String(Math.floor(diff / 1000) % 60).padStart(2, '0');
    };
    tick();
    setInterval(tick, 1000);
  }

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '—:—';
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  };

  function initMusic() {
    const audio = $('#ryazanAudio');
    const card = $('[data-music-card]');
    const button = $('#musicButton');
    const progress = $('#musicProgress');
    const current = $('#musicTime');
    const duration = $('#musicDuration');
    const status = $('#musicStatus');
    if (!audio || !button || !progress) return;

    audio.src = musicFile;
    let playable = false;
    const setPlaying = (playing) => {
      card.classList.toggle('is-playing', playing);
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', playing ? 'Поставить песню на паузу' : 'Включить песню');
    };
    audio.addEventListener('loadedmetadata', () => {
      playable = true;
      duration.textContent = formatTime(audio.duration);
      status.textContent = 'Нажмите кнопку, чтобы включить песню.';
    });
    audio.addEventListener('canplay', () => { playable = true; });
    audio.addEventListener('error', () => {
      playable = false;
      setPlaying(false);
      status.textContent = 'Песня будет добавлена позже.';
    });
    audio.addEventListener('play', () => setPlaying(true));
    audio.addEventListener('pause', () => setPlaying(false));
    audio.addEventListener('timeupdate', () => {
      const percent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      progress.value = String(percent);
      progress.style.setProperty('--progress', `${percent}%`);
      current.textContent = formatTime(audio.currentTime);
    });
    audio.addEventListener('ended', () => {
      setPlaying(false);
      progress.value = '0';
      progress.style.setProperty('--progress', '0%');
    });
    button.addEventListener('click', async () => {
      if (!playable && audio.readyState === 0) {
        audio.load();
        status.textContent = 'Проверяем аудиофайл…';
        setTimeout(() => { if (!playable) status.textContent = 'Песня будет добавлена позже.'; }, 1800);
        return;
      }
      try { if (audio.paused) await audio.play(); else audio.pause(); }
      catch { status.textContent = 'Песня будет добавлена позже.'; }
    });
    progress.addEventListener('input', () => {
      if (audio.duration) audio.currentTime = (Number(progress.value) / 100) * audio.duration;
    });
  }

  function formPayload() {
    const guestName = invite.named ? invite.name : $('#guestInput').value.trim();
    return {
      timestamp: new Date().toISOString(),
      id: invite.id,
      scenario: invite.scenario,
      salutation: invite.salutation,
      guestName,
      mainAttendance: $('input[name="mainAttendance"]:checked')?.value || 'Будем',
      church: invite.church ? ($('#churchCheck').checked ? 'Да' : 'Нет') : 'Не показывалось',
      afterparty: invite.afterparty ? ($('#afterpartyCheck').checked ? 'Да' : 'Нет') : 'Не показывалось',
      stay: invite.stay ? ($('#stayCheck').checked ? 'Да' : 'Нет') : 'Не предусмотрено',
      comment: $('#commentInput').value.trim(),
      source: location.href
    };
  }

  function validate(payload) {
    const input = $('#guestInput');
    const error = $('#nameError');
    if (!invite.named && !payload.guestName) {
      input.setAttribute('aria-invalid', 'true');
      error.textContent = 'Укажите имя и фамилию.';
      input.focus();
      return false;
    }
    input.removeAttribute('aria-invalid');
    error.textContent = '';
    return true;
  }

  function whatsappText(payload) {
    const lines = [
      'Владимир, отправляем подтверждение по приглашению.',
      `Гости: ${payload.guestName}.`,
      `Свадьба 25 июля: ${payload.mainAttendance}.`
    ];
    if (invite.church) lines.push(`Венчание 24 июля: ${payload.church}.`);
    if (invite.afterparty) lines.push(`Продолжение 26 июля: ${payload.afterparty}.`);
    if (invite.stay) lines.push(`Ночёвка в Лукино: ${payload.stay}.`);
    if (payload.comment) lines.push(`Комментарий: ${payload.comment}`);
    return lines.join('\n');
  }

  async function sendToSheet(payload) {
    if (!apiUrl) return false;
    await fetch(apiUrl, {
      method: 'POST', mode: 'no-cors', keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return true;
  }

  function initRsvp() {
    const form = $('#rsvpForm');
    const status = $('#formStatus');
    const button = $('#submitButton');
    const key = `xb_village_rsvp_${guestId || 'general'}`;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved?.guestName) status.textContent = `Последний ответ сохранён для: ${saved.guestName}.`;
    } catch { /* ignore damaged local data */ }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = formPayload();
      if (!validate(payload)) return;
      button.disabled = true;
      status.className = 'form-status';
      status.textContent = 'Отправляем ответ…';
      try {
        localStorage.setItem(key, JSON.stringify(payload));
        if (await sendToSheet(payload)) {
          status.className = 'form-status success';
          status.textContent = 'Спасибо! Ответ отправлен.';
        } else {
          status.textContent = 'Открываем сообщение Владимиру…';
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(whatsappText(payload))}`, '_blank', 'noopener');
        }
      } catch {
        status.textContent = 'Открываем сообщение Владимиру…';
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(whatsappText(payload))}`, '_blank', 'noopener');
      } finally {
        button.disabled = false;
      }
    });
  }

  applyInvite();
  initMenu();
  initCountdown();
  initMusic();
  initRsvp();
  loadGuest();
})();
