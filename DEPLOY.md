# Пошаговый деплой на GitHub Pages

## Что понадобится
- Аккаунт на GitHub (github.com)
- Node.js 18+ (проверить: `node -v`)
- Git (проверить: `git --version`)

---

## Шаг 1 — Создать репозиторий на GitHub

1. Открыть https://github.com/new
2. Repository name: `ucell-calculator`
3. Visibility: **Public** (для бесплатного GitHub Pages)
4. **Не** ставить галочки "Add README" и т.д. — репо должно быть пустым
5. Нажать **Create repository**
6. Скопировать URL вида `https://github.com/ВАШ_ЮЗЕР/ucell-calculator.git`

---

## Шаг 2 — Прописать homepage в package.json

Открыть файл `package.json` и добавить строку `"homepage"` в самый верх:

```json
{
  "name": "ucell-bnpl-calculator",
  "homepage": "https://ВАШ_ЮЗЕР.github.io/ucell-calculator",
  ...
}
```

Заменить `ВАШ_ЮЗЕР` на ваш логин GitHub.

---

## Шаг 3 — Инициализировать git и сделать первый коммит

Открыть терминал в папке проекта:

```bash
# Перейти в папку проекта
cd ucell-calculator

# Инициализировать git
git init

# Добавить все файлы
git add .

# Первый коммит
git commit -m "initial: ucell bnpl calculator"

# Переименовать ветку в main
git branch -M main

# Подключить удалённый репозиторий (вставить свой URL)
git remote add origin https://github.com/ВАШ_ЮЗЕР/ucell-calculator.git

# Запушить
git push -u origin main
```

---

## Шаг 4 — Включить GitHub Pages

1. Открыть репозиторий на GitHub
2. Перейти в **Settings** → **Pages** (левое меню)
3. В разделе **Build and deployment**:
   - Source: выбрать **GitHub Actions**
4. Сохранить

---

## Шаг 5 — Дождаться деплоя

После пуша GitHub Actions автоматически:
- Установит зависимости
- Соберёт проект
- Опубликует на Pages

Следить за процессом: вкладка **Actions** в репозитории.
Обычно занимает 1–3 минуты.

Сайт будет доступен по адресу:
```
https://ВАШ_ЮЗЕР.github.io/ucell-calculator
```

---

## Обновление (любые изменения)

```bash
git add .
git commit -m "update: описание изменений"
git push
```

GitHub Actions пересоберёт и обновит сайт автоматически.

---

## Альтернатива: Vercel (ещё проще, 2 минуты)

1. Открыть https://vercel.com
2. Sign in with GitHub
3. New Project → Import → выбрать `ucell-calculator`
4. Framework Preset: **Create React App**
5. Deploy

Сайт сразу на `https://ucell-calculator-ВАШ_ЮЗЕР.vercel.app`
И каждый пуш в main — автообновление.

---

## Если что-то пошло не так

| Проблема | Решение |
|---|---|
| `gh-pages` не деплоит | Убедитесь что Source: GitHub Actions (не Branch) |
| Белый экран на Pages | Проверьте `homepage` в package.json — должен совпадать с URL |
| `npm run build` падает | Запустите `npm install` ещё раз |
| Actions падает с ошибкой | Вкладка Actions → кликнуть на упавший run → посмотреть лог |
