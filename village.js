(() => {
  'use strict';

  const API_URL = String(window.XB_APPS_SCRIPT_URL || '').trim();

  const SCENARIOS = {
    'named-home': { named: true, showChurch: true, showAfterparty: true, showStay: false },
    'named-stay': { named: true, showChurch: true, showAfterparty: true, showStay: true },
    'general-home': { named: false, showChurch: true, showAfterparty: true, showStay: false },
    'general-stay': { named: false, showChurch: true, showAfterparty: true, showStay: true },
    'main-only': { named: false, showChurch: false, showAfterparty: false, showStay: false }
  };

  const FALLBACK_INVITES = {
    'evgeniy-larisa': { id: 'evgeniy-larisa', salutation: 'Дорогие', name: 'Евгений и Лариса', scenario: 'named-home' },
    'aleksey-natalya': { id: 'aleksey-natalya', salutation: 'Дорогие', name: 'Алексей и Наталья', scenario: 'named-home' },
    'family': { id: 'family', salutation: 'Дорогая', name: 'семья', scenario: 'named-home' },
    'guests-1': { id: 'guests-1', salutation: 'Дорогие', name: 'гости', scenario: 'general-home' },
    'guests-2': { id: 'guests-2', salutation: 'Дорогие', name: 'гости', scenario: 'general-stay' }
  };

  const params = new URLSearchParams(location.search);
  const guestId = (params.get('guest') || params.get('id') || '').trim();
  const DEFAULT_COPY = 'Ждём вас 25 июля 2026 года на нашей свадьбе в селе Ермо-Николаевка. Праздник пройдёт во дворе дома, в шатре.';

  let invite = normalizeInvite(FALLBACK_INVITES[guestId] || {
    id: guestId || 'guests-1',
    salutation: 'Дорогие',
    name: 'гости',
    scenario: 'general-home'
  });

  function toBool(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    return !['0', 'false', 'нет', 'no', 'off'].includes(String(value).trim().toLowerCase());
  }

  function normalizeInvite(raw) {
    const scenarioName = raw.scenario || raw['Сценарий'] || 'general-home';
    const scenario = SCENARIOS[scenarioName] || SCENARIOS['general-home'];
    const normalized = {
      id: raw.id || raw.ID || guestId || 'guests-1',
      salutation: raw.salutation || raw['Обращение'] || 'Дорогие',
      name: raw.name || raw['Имя'] || 'гости',
      scenario: scenarioName,
      named: toBool(raw.named ?? raw['Именное'], scenario.named),
      showChurch: toBool(raw.showChurch ?? raw['Показывать венчание'], scenario.showChurch),
      showAfterparty: toBool(raw.showAfterparty ?? raw['Показывать продолжение'], scenario.showAfterparty),
      showStay: toBool(raw.showStay ?? raw['Показывать ночёвку'], scenario.showStay),
      heroCopy: raw.heroCopy || raw['Персональный текст'] || DEFAULT_COPY
    };

    if (params.has('church')) normalized.showChurch = toBool(params.get('church'), normalized.showChurch);
    if (params.has('after')) normalized.showAfterparty = toBool(params.get('after'), normalized.showAfterparty);
    if (params.has('stay')) normalized.showStay = toBool(params.get('stay'), normalized.showStay) || params.get('stay') === 'lukino';
    return normalized;
  }

  function applyInvite() {
    document.querySelector('[data-salutation]').textContent = invite.salutation;
    document.querySelector('[data-guest-name]').textContent = invite.name;
    document.querySelector('[data-hero-copy]').textContent = invite.heroCopy;
    document.title = `ХВ • ${invite.named ? invite.name : 'свадьба в деревне'}`;

    toggleBlock('[data-section-church]', '[data-menu-church]', '[data-rsvp-church]', invite.showChurch);
    toggleBlock('[data-section-afterparty]', '[data-menu-afterparty]', '[data-rsvp-afterparty]', invite.showAfterparty);
    toggleBlock('[data-section-stay]', '[data-menu-stay]', '[data-rsvp-stay]', invite.showStay);

    const nameField = document.getElementById('nameField');
    const guestInput = document.getElementById('guestInput');
    const rsvpTitle = document.querySelector('[data-rsvp-title]');
    if (invite.named) {
      nameField.hidden = true;
      guestInput.value = invite.name;
      rsvpTitle.textContent = `${invite.name}, подтвердите участие`;
    } else {
      nameField.hidden = false;
      rsvpTitle.textContent = 'Подтвердить присутствие';
    }
  }

  function toggleBlock(sectionSelector, menuSelector, formSelector, visible) {
    const section = document.querySelector(sectionSelector);
    const menu = document.querySelector(menuSelector);
    const form = document.querySelector(formSelector);
    if (section) section.hidden = !visible;
    if (menu) menu.hidden = !visible;
    if (form) form.hidden = !visible;
  }

  function loadInviteFromApi() {
    if (!API_URL || !guestId) return;
    const callback = `xbGuest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const cleanup = () => {
      delete window[callback];
      script.remove();
    };
    window[callback] = data => {
      if (data && data.ok && data.guest) {
        invite = normalizeInvite(data.guest);
        applyInvite();
      }
      cleanup();
    };
    const script = document.createElement('script');
    script.src = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=guest&id=${encodeURIComponent(guestId)}&callback=${encodeURIComponent(callback)}`;
    script.onerror = cleanup;
    document.head.appendChild(script);
  }

  function setupMenu() {
    const button = document.querySelector('.burger');
    const menu = document.querySelector('.menu');
    button.addEventListener('click', () => {
      const open = document.body.classList.toggle('open-menu');
      menu.classList.toggle('on', open);
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      document.body.classList.remove('open-menu');
      menu.classList.remove('on');
    }));
  }

  function setupCountdown() {
    const weddingDate = new Date('2026-07-25T15:00:00+03:00');
    const tick = () => {
      const diff = Math.max(0, weddingDate - new Date());
      const days = Math.floor(diff / 864e5);
      const hours = Math.floor(diff / 36e5) % 24;
      const minutes = Math.floor(diff / 6e4) % 60;
      const seconds = Math.floor(diff / 1e3) % 60;
      document.querySelector('[data-days]').textContent = days;
      document.querySelector('[data-hours]').textContent = String(hours).padStart(2, '0');
      document.querySelector('[data-minutes]').textContent = String(minutes).padStart(2, '0');
      document.querySelector('[data-seconds]').textContent = String(seconds).padStart(2, '0');
    };
    tick();
    setInterval(tick, 1000);
  }

  function setupMusic() {
    const audio = document.getElementById('ryazanAudio');
    const button = document.getElementById('musicButton');
    const status = document.getElementById('musicStatus');
    let available = false;

    const redrawIcon = icon => {
      const iconNode = button.querySelector('[data-lucide]');
      iconNode.setAttribute('data-lucide', icon);
      if (window.lucide) window.lucide.createIcons();
    };

    audio.addEventListener('canplay', () => {
      available = true;
      status.textContent = 'Песня готова к прослушиванию.';
    }, { once: true });
    audio.addEventListener('error', () => {
      available = false;
      status.textContent = 'Аудиофайл будет добавлен позже.';
    });
    audio.addEventListener('ended', () => {
      button.querySelector('span').textContent = 'Включить';
      redrawIcon('play');
    });

    button.addEventListener('click', async () => {
      if (!available && audio.readyState === 0) audio.load();
      if (audio.paused) {
        try {
          await audio.play();
          button.querySelector('span').textContent = 'Пауза';
          redrawIcon('pause');
          status.textContent = 'Сейчас играет «Рязань моя».';
        } catch (error) {
          status.textContent = 'Аудиофайл будет добавлен позже.';
        }
      } else {
        audio.pause();
        button.querySelector('span').textContent = 'Продолжить';
        redrawIcon('play');
        status.textContent = 'Пауза.';
      }
    });
  }

  function setupRsvp() {
    const form = document.getElementById('rsvpForm');
    const status = document.getElementById('formStatus');
    const guestInput = document.getElementById('guestInput');

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const guestName = invite.named ? invite.name : guestInput.value.trim();
      if (!guestName) {
        status.textContent = 'Укажите имя и фамилию.';
        guestInput.focus();
        return;
      }

      const mainAttendance = form.querySelector('input[name="mainAttendance"]:checked')?.value || 'Нет ответа';
      const church = invite.showChurch && document.getElementById('churchCheck').checked ? 'Да' : 'Нет';
      const afterparty = invite.showAfterparty && document.getElementById('afterpartyCheck').checked ? 'Да' : 'Нет';
      const stay = invite.showStay && document.getElementById('stayCheck').checked ? 'Да' : 'Нет';
      const comment = document.getElementById('commentInput').value.trim();
      const payload = {
        timestamp: new Date().toISOString(),
        id: invite.id || guestId || 'general',
        scenario: invite.scenario,
        salutation: invite.salutation,
        guestName,
        mainAttendance,
        church,
        afterparty,
        stay,
        comment,
        source: location.href
      };

      localStorage.setItem('xb_village_rsvp', JSON.stringify(payload));
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      status.textContent = 'Отправляем ответ…';

      if (API_URL) {
        try {
          await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
          });
          status.textContent = 'Спасибо! Ответ отправлен.';
          submitButton.querySelector('span').textContent = 'Ответ отправлен';
          return;
        } catch (error) {
          // Ниже откроется резервный способ через WhatsApp.
        }
      }

      const lines = [
        'Подтверждение по приглашению на свадьбу:',
        `Гости: ${guestName}`,
        `25 июля: ${mainAttendance}`,
        invite.showChurch ? `Венчание 24 июля: ${church}` : null,
        invite.showAfterparty ? `Продолжение 26 июля: ${afterparty}` : null,
        invite.showStay ? `Ночёвка в Лукино: ${stay}` : null,
        comment ? `Комментарий: ${comment}` : null
      ].filter(Boolean);
      status.textContent = 'Открываем сообщение Владимиру…';
      window.open(`https://wa.me/79969662393?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
      submitButton.disabled = false;
    });
  }

  function initIcons() {
    if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.7 } });
  }

  applyInvite();
  setupMenu();
  setupCountdown();
  setupMusic();
  setupRsvp();
  initIcons();
  loadInviteFromApi();
})();
