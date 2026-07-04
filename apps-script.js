// Apps Script для записи анкеты гостей в Google Sheets.
// 1. Откройте таблицу: https://docs.google.com/spreadsheets/d/19jAF-t281LpO0XlkYnX6t0p5CqJCTGJ1Ub7ZRLqR9IM/edit
// 2. Расширения → Apps Script → вставьте этот код в Code.gs.
// 3. Развернуть → Новое развертывание → Веб-приложение.
// 4. Execute as: Me. Who has access: Anyone.
// 5. Скопируйте Web App URL и вставьте его в index.html в константу API_URL.
const SPREADSHEET_ID='19jAF-t281LpO0XlkYnX6t0p5CqJCTGJ1Ub7ZRLqR9IM';
const GUESTS_SHEET='Гости';
const RESPONSES_SHEET='Ответы';
function doPost(e){
  const data=JSON.parse((e.postData&&e.postData.contents)||'{}');
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet=ss.getSheetByName(RESPONSES_SHEET);
  if(!sheet)sheet=ss.insertSheet(RESPONSES_SHEET);
  if(sheet.getLastRow()===0)sheet.appendRow(['Дата и время','id','Обращение','Гость','Напитки','Пожелания','Источник']);
  sheet.appendRow([new Date(),data.id||'',data.salutation||'',data.guestName||'',Array.isArray(data.drinks)?data.drinks.join(', '):(data.drinks||''),data.wishes||'',data.source||'']);
  return json_({ok:true});
}
function doGet(e){return json_({ok:true,guest:findGuestById_((e.parameter.id||'').trim())});}
function findGuestById_(id){
  const sheet=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(GUESTS_SHEET);
  const values=sheet.getDataRange().getValues();
  const headers=values.shift().map(String);
  const sal=headers.indexOf('Обращение'),name=headers.indexOf('Гость'),guestId=headers.indexOf('id');
  for(const row of values){if(String(row[guestId]).trim()===id)return{salutation:String(row[sal]||''),name:String(row[name]||''),id:id};}
  return null;
}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
