# Violet Reading List

## English

Violet Reading List is a cross-browser reading-list extension focused on structured organization instead of one flat backlog. It keeps readable metadata for saved links and gives you folders, tags, quick views, and a compact popup workspace.

### Core Features

- Save the current tab from the popup.
- Save the current page or a specific link from the browser context menu.
- Store links with readable title, description, domain, and favicon instead of showing a raw URL only.
- Open any saved entry from the main list in a new browser tab.
- Edit a saved entry after capture: title, URL, description, folder, tags, favorite, pinned, and read state.
- Show `Inbox` by default every time the popup opens.

### Organization

- Left sidebar with quick views and folders.
- Folder counters in the sidebar, so each folder shows how many links it currently contains.
- Create, rename, and delete folders.
- Prevent duplicate folder names.
- Move entries between folders by drag and drop from the main list into the sidebar.
- Animated folder highlighting during drag and drop to make the drop target obvious.
- Deleting a folder moves its entries back to `Inbox` instead of deleting them.

### Tags and Filtering

- Dedicated tag manager for creating, renaming, and deleting tags.
- Prevent duplicate tag names.
- Add existing tags from the entry editor or create a new tag inline while editing.
- Favorites, pinned, and unread quick views.
- Optional search panel in the toolbar for searching across title, description, and URL.

### UI and UX

- English and Russian interface switcher.
- Inline confirmation modal for destructive actions instead of browser `confirm(...)` popups.
- Hover highlight for saved entries so the main click target is clearer.
- Compact popup layout designed to keep several saved links visible at once.
- Independent scrolling for the left sidebar and the right content pane.

### Storage and Backup

- Uses browser-managed extension storage.
- Prefers sync storage when available and falls back to local storage when needed.
- Import and export the full library as JSON from the options page.
- Options page also shows which storage area is currently active.

### Browser Support

- Built as a WebExtension for Chromium-based browsers and Firefox.
- Release packages are generated for both Chromium and Firefox.

## Русский

Violet Reading List это кроссбраузерное расширение для сохранения ссылок, в котором упор сделан не на одну длинную ленту, а на удобную структуру. Расширение сохраняет понятные метаданные ссылок и даёт папки, теги, быстрые разделы и компактное рабочее окно.

### Основные возможности

- Сохранение текущей вкладки из popup-окна.
- Сохранение текущей страницы или конкретной ссылки через контекстное меню браузера.
- Сохранение ссылки с нормальными данными: заголовок, описание, домен и favicon, а не только сырой URL.
- Открытие любой сохранённой записи из главного списка в новой вкладке браузера.
- Редактирование сохранённой записи после добавления: заголовок, URL, описание, папка, теги, избранное, закрепление и статус прочтения.
- При каждом открытии расширения по умолчанию открывается папка `Inbox`.

### Организация

- Левая боковая панель с быстрыми разделами и папками.
- У папок показывается счётчик ссылок, которые сейчас в них находятся.
- Создание, переименование и удаление папок.
- Запрет на создание одинаковых папок.
- Перемещение ссылок между папками через drag and drop из правого списка в левую панель.
- Анимированная подсветка папки во время перетаскивания, чтобы было понятно, куда именно переносится ссылка.
- При удалении папки её ссылки не пропадают, а автоматически переносятся в `Inbox`.

### Теги и фильтрация

- Отдельный менеджер тегов для создания, переименования и удаления тегов.
- Запрет на создание одинаковых тегов.
- В редакторе записи можно выбрать уже существующий тег или создать новый прямо на месте.
- Быстрые разделы для `Favorites`, `Pinned` и `Unread`.
- Дополнительная панель поиска в тулбаре для поиска по заголовку, описанию и URL.

### Интерфейс и UX

- Переключение интерфейса между английским и русским языком.
- Встроенное окно подтверждения удаления вместо системных browser popup вроде `confirm(...)`.
- Подсветка карточки при наведении, чтобы основной клик по ссылке был заметнее.
- Компактная раскладка popup-окна, в которой сразу видно несколько сохранённых ссылок.
- Независимый скролл у левой боковой панели и правой области со списком ссылок.

### Хранение и резервные копии

- Используется встроенное хранилище данных самого браузера для расширений.
- Приоритетно используется sync-хранилище, а при необходимости есть fallback на local.
- На странице настроек можно экспортировать и импортировать всю библиотеку в JSON.
- Там же показывается, какая область хранилища используется сейчас.

### Поддержка браузеров

- Расширение сделано как WebExtension для Chromium-браузеров и Firefox.
- Для Chromium и Firefox собираются отдельные релизные пакеты.

## Project Layout / Структура проекта

- `manifest.json`: base extension manifest.
- `popup.html`: main popup UI.
- `options.html`: import/export and storage status page.
- `scripts/`: popup logic, background logic, storage helpers, metadata capture, localization.
- `styles/`: popup and options styles.
- `assets/icons/`: extension icons.
- `dist/`: generated Chromium and Firefox build artifacts.

## Load In Browser / Как загрузить в браузер

### Chromium

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select this repository root, or `dist/chromium` after a build

### Firefox

1. Open `about:debugging`
2. Choose `This Firefox`
3. Click `Load Temporary Add-on`
4. Select `manifest.json` from `dist/firefox` after running a build

## Build Release Packages / Сборка релизных пакетов

```bash
npm run build
```

This creates / Команда создаёт:

- `dist/chromium/`
- `dist/firefox/`
- `dist/violet-reading-list-chromium.zip`
- `dist/violet-reading-list-firefox.zip`

## Verification / Проверка

```bash
npm run test:all
```

This runs unit tests, rebuilds the release packages, and executes the end-to-end Chromium verification flow with temporary screenshots that are removed after the run.

Эта команда запускает unit-тесты, пересобирает релизные пакеты и выполняет end-to-end проверку Chromium-версии. Временные скриншоты создаются только на время прогона и после тестов удаляются.

## Notes / Примечания

- The original Chrome extension that inspired this project stores links in extension storage through `chrome.storage.sync`.
- This project uses its own implementation and data model, while still relying on browser-managed extension storage with sync-first behavior.
- Исходное расширение из Chrome Web Store, которое послужило образцом по идее, хранит ссылки в хранилище расширения через `chrome.storage.sync`.
- В этом проекте используется собственная реализация и собственная модель данных, но сами данные тоже хранятся во встроенном хранилище браузера для расширений, с приоритетом на sync.
