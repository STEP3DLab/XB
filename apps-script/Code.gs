const SPREADSHEET_ID = '19jAF-t281LpO0XlkYnX6t0p5CqJCTGJ1Ub7ZRLqR9IM';
const GUESTS_SHEET = 'Гости 25.07';
const RESPONSES_SHEET = 'Ответы 25.07';
const BASE_URL = 'https://raw.githack.com/STEP3DLab/XB/village-wedding/index.html';

const DEFAULT_HERO_COPY =
  'Ждём вас 25 июля 2026 года в селе Ермо-Николаевка. ' +
  'Сбор гостей — в 15:00. Праздник пройдёт во дворе дома.';

const SCENARIOS = {
  'named-home':   { named: true,  showChurch: true,  showAfterparty: true,  showStay: false },
  'named-stay':   { named: true,  showChurch: true,  showAfterparty: true,  showStay: true  },
  'general-home': { named: false, showChurch: true,  showAfterparty: true,  showStay: false },
  'general-stay': { named: false, showChurch: true,  showAfterparty: true,  showStay: true  },
  'main-only':    { named: false, showChurch: false, showAfterparty: false, showStay: false }
};

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Свадебный сайт 25.07')
    .addItem('Проверить 2 новых листа', 'setupWeddingWorkbook')
    .addItem('Обновить ссылки гостей', 'refreshGuestLinks')
    .addToUi();
}

function setupWeddingWorkbook() {
  const ss = getSpreadsheet_();
  ensureSheet_(ss, GUESTS_SHEET, [
    'id', 'Обращение', 'Имя', 'Сценарий',
    'Именное (override)', 'Венчание (override)',
    'Продолжение (override)', 'Ночёвка (override)',
    'Персональный текст', 'Активно', 'Ссылка',
    'Кому отправлено', 'Статус рассылки', 'Комментарий'
  ]);
  ensureSheet_(ss, RESPONSES_SHEET, [
    'Дата и время', 'id', 'Сценарий', 'Обращение', 'Гости',
    '25 июля', 'Венчание 24 июля', 'Ночёвка', 'Комментарий', 'Источник'
  ]);
  refreshGuestLinks();
  SpreadsheetApp.getUi().alert('Листы «Гости 25.07» и «Ответы 25.07» проверены. Старые листы не изменялись.');
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== GUESTS_SHEET || e.range.getRow() < 2) return;
  if ([1, 4, 10].indexOf(e.range.getColumn()) === -1) return;
  updateGuestLinkRow_(sheet, e.range.getRow());
}

function refreshGuestLinks() {
  const sheet = getSpreadsheet_().getSheetByName(GUESTS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return;
  for (let row = 2; row <= sheet.getLastRow(); row++) {
    updateGuestLinkRow_(sheet, row);
  }
}

function updateGuestLinkRow_(sheet, row) {
  const id = String(sheet.getRange(row, 1).getDisplayValue() || '').trim();
  const active = String(sheet.getRange(row, 10).getDisplayValue() || 'Да').trim();
  const linkCell = sheet.getRange(row, 11);

  if (!id || !isYes_(active)) {
    linkCell.clearContent();
    return;
  }

  linkCell.setValue(BASE_URL + '?guest=' + encodeURIComponent(id));
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = String(params.action || 'health').toLowerCase();

  if (action === 'guest') {
    const id = String(params.id || '').trim();
    const guest = getGuestById_(id);
    return output_(
      guest ? { ok: true, guest: guest } : { ok: false, error: 'guest_not_found', id: id },
      params.callback
    );
  }

  return output_({
    ok: true,
    service: 'XB village wedding 25.07',
    timestamp: new Date().toISOString()
  }, params.callback);
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const ss = getSpreadsheet_();
    const sheet = ensureSheet_(ss, RESPONSES_SHEET, [
      'Дата и время', 'id', 'Сценарий', 'Обращение', 'Гости',
      '25 июля', 'Венчание 24 июля', 'Ночёвка', 'Комментарий', 'Источник'
    ]);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet.appendRow([
        new Date(),
        safe_(payload.id),
        safe_(payload.scenario),
        safe_(payload.salutation),
        safe_(payload.guestName),
        safe_(payload.mainAttendance),
        safe_(payload.church),
        safe_(payload.stay),
        safe_(payload.comment),
        safe_(payload.source)
      ]);
    } finally {
      lock.releaseLock();
    }

    return output_({ ok: true });
  } catch (error) {
    return output_({ ok: false, error: String(error && error.message || error) });
  }
}

function parsePayload_(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (ignore) {}
  }
  return e.parameter || {};
}

function getGuestById_(id) {
  if (!id) return null;

  const sheet = getSpreadsheet_().getSheetByName(GUESTS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return null;

  const row = sheetObjects_(sheet)
    .find(item => String(item.id || '').trim() === id);

  if (!row || !isYes_(row['Активно'] || 'Да')) return null;

  const scenarioName = String(row['Сценарий'] || 'general-home').trim();
  const scenario = SCENARIOS[scenarioName] || SCENARIOS['general-home'];

  return {
    id: String(row.id || '').trim(),
    salutation: String(row['Обращение'] || 'Дорогие').trim(),
    name: String(row['Имя'] || 'гости').trim(),
    scenario: scenarioName,
    named: resolveOverride_(row['Именное (override)'], scenario.named),
    showChurch: resolveOverride_(row['Венчание (override)'], scenario.showChurch),
    showAfterparty: resolveOverride_(row['Продолжение (override)'], scenario.showAfterparty),
    showStay: resolveOverride_(row['Ночёвка (override)'], scenario.showStay),
    heroCopy: String(row['Персональный текст'] || DEFAULT_HERO_COPY).trim()
  };
}

function resolveOverride_(value, fallback) {
  const text = String(value || '').trim().toLowerCase();
  if (!text || text === 'по сценарию') return Boolean(fallback);
  return isYes_(text);
}

function sheetObjects_(sheet) {
  const values = sheet.getDataRange().getDisplayValues();
  if (!values.length) return [];
  const headers = values[0];
  return values.slice(1)
    .filter(row => row.some(Boolean))
    .map(row => {
      const item = {};
      headers.forEach((header, index) => item[header] = row[index]);
      return item;
    });
}

function isYes_(value) {
  return ['да', 'yes', 'true', '1', 'on']
    .indexOf(String(value || '').trim().toLowerCase()) !== -1;
}

function safe_(value) {
  return value === undefined || value === null ? '' : String(value).slice(0, 5000);
}

function output_(payload, callback) {
  const json = JSON.stringify(payload);
  const safeCallback = String(callback || '').replace(/[^a-zA-Z0-9_.$]/g, '');
  const text = safeCallback ? safeCallback + '(' + json + ')' : json;
  const mime = safeCallback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON;
  return ContentService.createTextOutput(text).setMimeType(mime);
}
