# Slots — iGaming Slot (Backend + Frontend)

Реализация слота по спецификациям: backend (RNG, spin engine, API), frontend (React + PixiJS), дизайн-гайд.

## Структура

- **backend/** — Node.js + Express, API `/api/v1/game/init`, `/api/v1/spin`, RNG, paytable, in-memory store
- **frontend/** — Vite + React + TypeScript + PixiJS: ReelGrid 5×3, BetPanel, HUD, Win overlay
- **docs/** — архитектура, UI, безопасность, дизайн-спецификация
- **postman/** — коллекция и окружение для тестов API

## Запуск

### 1. Backend (API)

```bash
cd backend
npm install
npm run dev
```

Сервер: **http://localhost:3001**  
Эндпоинты: `POST /api/v1/game/init`, `POST /api/v1/spin`, `GET /api/v1/history`

### 2. Frontend (игра)

```bash
cd frontend
npm install
npm run dev
```

Откройте **http://localhost:5173**. Vite проксирует `/api` на backend.

### 3. Одновременный запуск (два терминала)

- Терминал 1: `cd backend && npm run dev`
- Терминал 2: `cd frontend && npm run dev`

## Аутентификация (демо)

Backend принимает любой заголовок `Authorization: Bearer <token>`. В качестве `userId` используется значение из payload JWT (`sub`) или сам токен. Для теста подойдёт токен `demo-user-1` (уже задан в store).

## Игровой цикл

1. При загрузке вызывается `POST /api/v1/game/init` → получаем `session_id`, конфиг, баланс.
2. Нажатие **SPIN** → `POST /api/v1/spin` с `session_id`, `bet`, опционально `Idempotency-Key`.
3. Сервер возвращает `outcome` (reel_matrix, win, bonus_triggered).
4. Клиент анимирует барабаны по `reel_matrix`, затем подсвечивает выигрыш и показывает Big Win при win ≥ 10× bet.
5. После остановки всех барабанов кнопка SPIN снова активна.

## Сборка

```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build
# Статика в frontend/dist, раздавать с проксированием /api на backend
```

## Тесты API (Postman / Newman)

```bash
cd postman
newman run slots-collection.json -e dev.env.json
```

Подробнее — в **postman/README.md**.
