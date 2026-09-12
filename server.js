const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000; 

// --- ВСТАВЬ СЮДА СВОИ ДАННЫЕ ИЗ SUPABASE ---
const SUPABASE_URL = 'https://supabase.com'; 
const SUPABASE_KEY = 'sb_publishable_ItpFo0ZgFsthxkrVpD79dg_0TK0hkvn';
// -------------------------------------------

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Вспомогательная функция для запросов к Supabase API через встроенный fetch
async function supabaseFetch(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': options.prefer || 'return=representation',
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Supabase Error: ${response.status} - ${errText}`);
    }
    return await response.json();
}

// --- API ЭНДПОИНТЫ ---

// 1. Получить все новости
app.get('/api/news', async (req, res) => {
    try {
        // Запрашиваем данные из таблицы articles со сортировкой поcreatedAt по убыванию
        const data = await supabaseFetch('articles?order=createdAt.desc');
        
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(JSON.stringify(data));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});

// 2. Добавить новость
app.post('/api/news', async (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'Заголовок и текст обязательны' });
    }
    try {
        const result = await supabaseFetch('articles', {
            method: 'POST',
            body: JSON.stringify({ title, content, likes: 0 })
        });
        
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(JSON.stringify({ success: true, id: result[0].id }));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});

// 3. Обработка лайков
app.post('/api/news/:id/like', async (req, res) => {
    const articleId = parseInt(req.params.id);
    const { action } = req.body;

    try {
        // 1. Получаем текущее количество лайков статьи
        const articleData = await supabaseFetch(`articles?id=eq.${articleId}`);
        if (!articleData || articleData.length === 0) {
            return res.status(404).json({ error: 'Новость не найдена' });
        }
        
        let currentLikes = articleData[0].likes || 0;
        if (action === 'like') currentLikes += 1;
        if (action === 'unlike') currentLikes = Math.max(0, currentLikes - 1);

        // 2. Обновляем значение в базе
        const updated = await supabaseFetch(`articles?id=eq.${articleId}`, {
            method: 'PATCH',
            body: JSON.stringify({ likes: currentLikes })
        });

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(JSON.stringify({ success: true, likes: updated[0].likes }));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});

// 4. Удалить новость
app.delete('/api/news/:id', async (req, res) => {
    const articleId = parseInt(req.params.id);
    try {
        await supabaseFetch(`articles?id=eq.${articleId}`, {
            method: 'DELETE'
        });
        
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(JSON.stringify({ success: true, message: 'Новость успешно удалена' }));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});

// Статика
app.use(express.static(__dirname));

app.listen(PORT, () => console.log(`Сервер работает на порту ${PORT}`));
