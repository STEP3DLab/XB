const SHEETS = {
  guests: 'Гости',
  scenarios: 'Сценарии',
  responses: 'Ответы',
  settings: 'Настройки'
};

const DEFAULT_HERO_COPY = 'Ждём вас 25 июля 2026 года на нашей свадьбе в селе Ермо-Николаевка. Праздник пройдёт во дворе дома, в шатре.';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Свадебный сайт')
    .addItem('Проверить структуру таблицы', 'setupWeddingWorkbook')
    .addItem('Обновить ссылки гостей', 'refreshGuestLinks')
    .addToUi();
}

function setupWeddingWorkbook() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEETS.guests, [
    'id', 'Обращение', 'Имя', 'Сценарий', 'Именное (override)',
    'Венчание (override)', 'Продолжение (override)', 'Ночёвка (override)',
    'Персональный текст', 'Активно', 'Ссылка', 'Кому отправлено',
    'Статус рассылки', 'Комментарий'
  ]);
  ensureSheet_(ss, SHEETS.scenarios, [
    'scenario', 'Описание', 'Именное', 'Показывать венчание',
    'Показывать продолжение', 'Показывать ночёвку'
  ]);
  ensureSheet_(ss, SHEETS.responses, [
    'Дата и время', 'id', 'Сценарий', 'Обращение', 'Гости',
    '25 июля', 'Венчание 24 июля', 'Продолжение 26 июля',
    'Ночёвка', 'Комментарий', 'Источник'
  ]);
  ensureSheet_(ss, SHEETS.settings, ['Ключ', 'Значение', 'Описание']);
  refreshGuestLinks();
  SpreadsheetApp.getUi().alert('Структура таблицы проверена.');
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
  if (sheet.getName() !== SHEETS.guests || e.range.getRow() < 2) return;
  if ([1, 4, 10].indexOf(e.range.getColumn()) === -1) return;
  updateGuestLinkRow_(sheet, e.range.getRow());
}

function refreshGuestLinks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.guests);
  if (!sheet || sheet.getLastRow() < 2) return;
  for (let row = 2; row <= sheet.getLastRow(); row++) updateGuestLinkRow_(sheet, row);
}

function updateGuestLinkRow_(sheet, row) {
  const id = String(sheet.getRange(row, 1).getDisplayValue() || '').trim();
  const active = String(sheet.getRange(row, 10).getDisplayValue() || 'Да').trim();
  const baseUrl = getSetting_('base_url') || 'https://step3dlab.github.io/XB/';
  const linkCell = sheet.getRange(row, 11);
  if (!id || !isYes_(active)) {
    linkCell.clearContent();
    return;
  }
  linkCell.setValue(baseUrl + (baseUrl.indexOf('?') === -1 ? '?' : '&') + 'guest=' + encodeURIComponent(id));
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = String(params.action || 'health').toLowerCase();
  let payload;

  if (action === 'guest') {
    const id = String(params.id || '').trim();
    const guest = getGuestById_(id);
    payload = guest
      ? { ok: true, guest: guest }
      : { ok: false, error: 'guest_not_found', id: id };
  } else {
    payload = {
      ok: true,
      service: 'XB village wedding',
      timestamp: new Date().toISOString()
    };
  }

  return output_(payload, params.callback);
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ensureSheet_(ss, SHEETS.responses, [
      'Дата и время', 'id', 'Сценарий', 'Обращение', 'Гости',
      '25 июля', 'Венчание 24 июля', 'Продолжение 26 июля',
      'Ночёвка', 'Комментарий', 'Источник'
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
        safe_(payload.afterparty),
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
    } catch (ignore) {
      // Ниже используются обычные параметры формы.
    }
  }
  return e.parameter || {};
}

function getGuestById_(id) {
  if (!id) return null;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const guestSheet = ss.getSheetByName(SHEETS.guests);
  if (!guestSheet || guestSheet.getLastRow() < 2) return null;

  const guests = sheetObjects_(guestSheet);
  const row = guests.find(item => String(item.id || '').trim() === id);
  if (!row || !isYes_(row['Активно'] || 'Да')) return null;

  const scenario = getScenarioByName_(row['Сценарий']);
  return {
    id: String(row.id || '').trim(),
    salutation: String(row['Обращение'] || 'Дорогие').trim(),
    name: String(row['Имя'] || 'гости').trim(),
    scenario: String(row['Сценарий'] || 'general-home').trim(),
    named: resolveOverride_(row['Именное (override)'], scenario.named),
    showChurch: resolveOverride_(row['Венчание (override)'], scenario.showChurch),
    showAfterparty: resolveOverride_(row['Продолжение (override)'], scenario.showAfterparty),
    showStay: resolveOverride_(row['Ночёвка (override)'], scenario.showStay),
    heroCopy: String(row['Персональный текст'] || DEFAULT_HERO_COPY).trim()
  };
}

function getScenarioByName_(name) {
  const defaults = { named: false, showChurch: true, showAfterparty: true, showStay: false };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.scenarios);
  if (!sheet || sheet.getLastRow() < 2) return defaults;
  const scenarios = sheetObjects_(sheet);
  const row = scenarios.find(item => String(item.scenario || '').trim() === String(name || '').trim());
  if (!row) return defaults;
  return {
    named: isYes_(row['Именное']),
    showChurch: isYes_(row['Показывать венчание']),
    showAfterparty: isYes_(row['Показывать продолжение']),
    showStay: isYes_(row['Показывать ночёвку'])
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
  return values.slice(1).filter(row => row.some(Boolean)).map(row => {
    const item = {};
    headers.forEach((header, index) => item[header] = row[index]);
    return item;
  });
}

function getSetting_(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.settings);
  if (!sheet || sheet.getLastRow() < 2) return '';
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues();
  const found = rows.find(row => String(row[0] || '').trim() === key);
  return found ? String(found[1] || '').trim() : '';
}

function isYes_(value) {
  return ['да', 'yes', 'true', '1', 'on'].indexOf(String(value || '').trim().toLowerCase()) !== -1;
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
