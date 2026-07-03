const WEDDING_CONFIG = {
  weddingDateIso: '2026-07-19T16:00:00+03:00',
  formEndpoint: '',
  guests: {
    mama_i_papa: {
      displayName: 'мама и папа',
      inviteType: 'full_day',
      showAlcoholForm: true
    },
    viktor_yuliya: {
      displayName: 'Виктор и Юлия',
      inviteType: 'full_day',
      showAlcoholForm: true
    },
    banquet_demo: {
      displayName: 'гости банкета',
      inviteType: 'banquet_only',
      showAlcoholForm: true
    },
    child_demo: {
      displayName: 'юный гость',
      inviteType: 'child',
      showAlcoholForm: false
    }
  }
};

const params = new URLSearchParams(window.location.search);
const guestId = params.get('guest') || 'guest';
const guest = WEDDING_CONFIG.guests[guestId] || {
  displayName: 'гости',
  inviteType: 'full_day',
  showAlcoholForm: true
};

document.body.dataset.inviteType = guest.inviteType;

const guestNameNode = document.querySelector('[data-guest-name]');
if (guestNameNode) guestNameNode.textContent = guest.displayName;

const guestIdField = document.querySelector('[data-guest-id-field]');
if (guestIdField) guestIdField.value = guestId;

const surveySection = document.querySelector('[data-survey-section]');
if (surveySection && !guest.showAlcoholForm) surveySection.remove();

const surveyMenu = document.querySelector('[data-menu-survey]');
if (surveyMenu && !guest.showAlcoholForm) surveyMenu.remove();

const programIntro = document.querySelector('[data-program-intro]');
if (programIntro && guest.inviteType === 'banquet_only') {
  programIntro.textContent = 'Для вашего приглашения показана банкетная часть вечера.';
}

const menuButton = document.querySelector('[data-menu-button]');
const menu = document.querySelector('[data-menu]');
if (menuButton && menu) {
  const closeMenu = () => {
    menu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    menuButton.setAttribute('aria-expanded', 'false');
  };
  menuButton.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    document.body.classList.toggle('menu-open', isOpen);
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}

const targetDate = new Date(WEDDING_CONFIG.weddingDateIso).getTime();
const countdownNodes = {
  days: document.querySelector('[data-days]'),
  hours: document.querySelector('[data-hours]'),
  minutes: document.querySelector('[data-minutes]'),
  seconds: document.querySelector('[data-seconds]')
};
function pad(value) {
  return String(value).padStart(2, '0');
}
function updateCountdown() {
  const now = Date.now();
  const diff = Math.max(0, targetDate - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  if (countdownNodes.days) countdownNodes.days.textContent = pad(days);
  if (countdownNodes.hours) countdownNodes.hours.textContent = pad(hours);
  if (countdownNodes.minutes) countdownNodes.minutes.textContent = pad(minutes);
  if (countdownNodes.seconds) countdownNodes.seconds.textContent = pad(seconds);
}
updateCountdown();
setInterval(updateCountdown, 1000);

const form = document.querySelector('[data-survey-form]');
if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = form.querySelector('[data-form-status]');
    const formData = new FormData(form);
    const drinks = formData.getAll('drinks');
    const payload = {
      guest_id: guestId,
      display_name: guest.displayName,
      invite_type: guest.inviteType,
      drinks,
      custom_drink: String(formData.get('custom_drink') || '').trim(),
      updated_at: new Date().toISOString()
    };

    if (status) status.textContent = 'Сохраняем ответ...';

    const endpoint = WEDDING_CONFIG.formEndpoint.trim();
    if (endpoint) {
      try {
        await fetch(endpoint, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        if (status) status.textContent = 'Спасибо, ответ отправлен.';
        form.reset();
      } catch (error) {
        if (status) status.textContent = 'Не удалось отправить ответ. Пожалуйста, попробуйте позже.';
      }
      return;
    }

    localStorage.setItem(`wedding-survey:${guestId}`, JSON.stringify(payload));
    if (status) status.textContent = 'Спасибо, мы сохранили ваш выбор.';
    form.reset();
  });
}
