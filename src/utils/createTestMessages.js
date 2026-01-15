/**
 * Утилита для создания тестовых сообщений в сессии
 * Можно использовать в консоли браузера: createTestMessages(sessionId, count)
 */

import { addMessageToSession, getSessions, getCurrentSessionId } from './sessionManager';
import { generateMessageId } from './messageIdGenerator';

// Тестовые сообщения (английский оригинал и русский перевод)
const testMessages = [
  {
    original: "Hello, how are you today?",
    translated: "Привет, как у тебя дела сегодня?"
  },
  {
    original: "I'm working on a new project for my company.",
    translated: "Я работаю над новым проектом для моей компании."
  },
  {
    original: "The weather is really nice outside today.",
    translated: "Погода сегодня действительно хорошая на улице."
  },
  {
    original: "Can you help me with this translation task?",
    translated: "Можешь помочь мне с этой задачей по переводу?"
  },
  {
    original: "I've been learning Russian for about two years now.",
    translated: "Я изучаю русский язык уже около двух лет."
  },
  {
    original: "This application is really useful for real-time translation.",
    translated: "Это приложение действительно полезно для перевода в реальном времени."
  },
  {
    original: "Let's meet tomorrow at the coffee shop downtown.",
    translated: "Давай встретимся завтра в кофейне в центре города."
  },
  {
    original: "I need to finish this report before the deadline.",
    translated: "Мне нужно закончить этот отчёт до дедлайна."
  },
  {
    original: "The conference will start at nine o'clock in the morning.",
    translated: "Конференция начнётся в девять часов утра."
  },
  {
    original: "Thank you for your help with this project!",
    translated: "Спасибо за помощь с этим проектом!"
  }
];

/**
 * Создать тестовые сообщения в сессии
 * @param {string|null} sessionId - ID сессии. Если null, используется текущая сессия или первая доступная
 * @param {number} count - Количество сообщений для создания (по умолчанию 10, максимум 10)
 * @returns {Promise<void>}
 */
export async function createTestMessages(sessionId = null, count = 10) {
  try {
    // Определяем сессию
    let targetSessionId = sessionId;
    
    if (!targetSessionId) {
      // Пытаемся получить текущую сессию
      targetSessionId = getCurrentSessionId();
      
      // Если нет текущей, берем первую доступную
      if (!targetSessionId) {
        const sessions = getSessions();
        if (sessions.length === 0) {
          throw new Error('Нет доступных сессий. Создайте сессию сначала.');
        }
        targetSessionId = sessions[0].id;
        console.log(`[TEST] Используется первая доступная сессия: ${sessions[0].name}`);
      } else {
        const session = getSessions().find(s => s.id === targetSessionId);
        console.log(`[TEST] Используется текущая сессия: ${session?.name || targetSessionId}`);
      }
    }
    
    // Ограничиваем количество
    const messageCount = Math.min(count, testMessages.length);
    const messagesToCreate = testMessages.slice(0, messageCount);
    
    console.log(`[TEST] Создание ${messageCount} тестовых сообщений в сессии ${targetSessionId}...`);
    
    // Создаём сообщения с небольшими задержками между ними для реалистичных timestamp
    const baseTime = Date.now();
    
    for (let i = 0; i < messagesToCreate.length; i++) {
      const testMsg = messagesToCreate[i];
      const messageId = generateMessageId();
      
      // Создаём timestamp с небольшим смещением для каждого сообщения
      const timestamp = baseTime - (messagesToCreate.length - i) * 60000; // 1 минута между сообщениями
      
      const message = {
        id: messageId,
        original: testMsg.original,
        translated: testMsg.translated,
        timestamp: timestamp
      };
      
      addMessageToSession(targetSessionId, message);
      console.log(`[TEST] Сообщение ${i + 1}/${messageCount} создано: "${testMsg.original.substring(0, 30)}..."`);
    }
    
    console.log(`[TEST] ✅ Успешно создано ${messageCount} тестовых сообщений!`);
    console.log(`[TEST] Обновите страницу, чтобы увидеть сообщения.`);
    
    return {
      success: true,
      sessionId: targetSessionId,
      count: messageCount
    };
  } catch (error) {
    console.error('[TEST] Ошибка при создании тестовых сообщений:', error);
    throw error;
  }
}

// Экспортируем для использования в консоли браузера (если нужно)
if (typeof window !== 'undefined') {
  window.createTestMessages = createTestMessages;
  console.log('💡 Функция createTestMessages() доступна в консоли. Используйте: createTestMessages(sessionId, count)');
}
