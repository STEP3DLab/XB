# Свадебный сайт Христины и Владимира

Статический сайт-приглашение для GitHub Pages. Архив подготовлен так, чтобы проект можно было распаковать, загрузить в репозиторий и дальше править через GitHub.

## Как загрузить на GitHub

1. Распакуйте архив.
2. Загрузите содержимое папки в корень нового репозитория. Важно: загружать не сам ZIP, а файлы `index.html`, `assets`, `preview` и остальные файлы.
3. Включите GitHub Pages: `Settings` → `Pages` → `Deploy from a branch` → `main` → `/root`.
4. После публикации используйте персональные ссылки вида:

```text
https://USERNAME.github.io/REPOSITORY/?guest=viktor_yuliya
https://USERNAME.github.io/REPOSITORY/?guest=mama_i_papa
https://USERNAME.github.io/REPOSITORY/?guest=banquet_demo
https://USERNAME.github.io/REPOSITORY/?guest=child_demo
```

## Что внутри

- `index.html` — основной сайт.
- `assets/css/styles.css` — визуальный стиль, палитра, адаптив.
- `assets/js/main.js` — персонализация гостей, таймер, меню, анкета.
- `assets/img/monogram-hv.svg` — монограмма ХВ без нижней линии и без кропа.
- `assets/img/rings-line.svg` — иконка свадебных колец для декоративной полоски.
- `preview/*.html` — быстрые preview-файлы для проверки разных типов приглашений.
- `PROJECT_BRIEF.md` — краткий бриф для продолжения работы.
- `QA_CHECK.md` — что уже проверено в этой сборке.

## Где редактировать гостей

Гости находятся в `assets/js/main.js` в блоке `WEDDING_CONFIG.guests`.

Пример:

```js
viktor_yuliya: {
  displayName: 'Виктор и Юлия',
  inviteType: 'full_day',
  showAlcoholForm: true
}
```

Типы приглашений:

- `full_day` — полный день.
- `banquet_only` — только банкетная часть.
- `child` — детская версия без анкеты.

## Анкета и Google Sheets

Сейчас анкета сохраняет ответ локально в браузере, если не указан endpoint. Для боевой версии нужно подключить Google Apps Script Web App и вставить ссылку в `assets/js/main.js`:

```js
formEndpoint: 'https://script.google.com/macros/s/.../exec'
```

После этого форма будет отправлять JSON с `guest_id`, именем гостя, типом приглашения, выбранными напитками и временем обновления.

## Приватность

В `index.html` добавлен `noindex`, а в `robots.txt` стоит запрет индексации. Это не заменяет приватный репозиторий. Для личного приглашения лучше использовать private repository или не размещать ссылку публично.
