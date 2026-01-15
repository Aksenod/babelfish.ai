/**
 * Session Manager - утилита для работы с сессиями в localStorage
 */

const STORAGE_KEY = 'babelfish_sessions';

/**
 * Генерация UUID для сессии
 */
function generateSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback для старых браузеров
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Получить данные из localStorage с обработкой ошибок
 */
function getStorageData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return { sessions: [], currentSessionId: null };
    }
    const parsed = JSON.parse(data);
    // Валидация структуры
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.sessions)) {
      console.warn('Invalid session data structure, resetting...');
      return { sessions: [], currentSessionId: null };
    }
    return parsed;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return { sessions: [], currentSessionId: null };
  }
}

/**
 * Сохранить данные в localStorage с обработкой ошибок
 */
function saveStorageData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded');
      alert('Недостаточно места для сохранения. Очистите localStorage.');
    } else {
      console.error('Error saving to localStorage:', error);
    }
    return false;
  }
}

/**
 * Получить все сессии
 */
export function getSessions() {
  const data = getStorageData();
  const sessions = data.sessions || [];
  
  // Обеспечиваем обратную совместимость: добавляем поля status и summary для старых сессий
  return sessions.map(session => ({
    ...session,
    status: session.status || 'idle',
    summary: session.summary !== undefined ? session.summary : null
  }));
}

/**
 * Получить сессию по ID
 */
export function getSession(sessionId) {
  const sessions = getSessions();
  const session = sessions.find(s => s.id === sessionId) || null;
  
  // Обеспечиваем обратную совместимость: добавляем поля status и summary, если их нет
  if (session) {
    if (session.status === undefined) {
      session.status = 'idle';
    }
    if (session.summary === undefined) {
      session.summary = null;
    }
  }
  
  return session;
}

/**
 * Создать новую сессию
 */
export function createSession(name) {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Session name is required');
  }

  const trimmedName = name.trim();
  if (trimmedName.length > 100) {
    throw new Error('Session name is too long (max 100 characters)');
  }

  const data = getStorageData();
  const newSession = {
    id: generateSessionId(),
    name: trimmedName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    status: 'idle', // 'idle' | 'active' | 'stopped'
    summary: null // Саммари сессии, сгенерированное через GPT
  };

  data.sessions.push(newSession);
  data.currentSessionId = newSession.id;

  if (saveStorageData(data)) {
    return newSession;
  }
  throw new Error('Failed to save session');
}

/**
 * Обновить сессию
 */
export function updateSession(sessionId, updates) {
  const data = getStorageData();
  const sessionIndex = data.sessions.findIndex(s => s.id === sessionId);

  if (sessionIndex === -1) {
    throw new Error('Session not found');
  }

  const session = data.sessions[sessionIndex];
  
  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim();
    if (trimmedName.length === 0) {
      throw new Error('Session name cannot be empty');
    }
    if (trimmedName.length > 100) {
      throw new Error('Session name is too long (max 100 characters)');
    }
    session.name = trimmedName;
  }

  // Обновление статуса сессии
  if (updates.status !== undefined) {
    if (['idle', 'active', 'stopped'].includes(updates.status)) {
      session.status = updates.status;
    } else {
      throw new Error('Invalid session status');
    }
  }

  // Обновление саммари сессии
  if (updates.summary !== undefined) {
    session.summary = updates.summary;
  }

  session.updatedAt = Date.now();
  data.sessions[sessionIndex] = session;

  if (saveStorageData(data)) {
    return session;
  }
  throw new Error('Failed to update session');
}

/**
 * Удалить сессию
 */
export function deleteSession(sessionId) {
  const data = getStorageData();
  const initialLength = data.sessions.length;
  data.sessions = data.sessions.filter(s => s.id !== sessionId);

  if (data.sessions.length === initialLength) {
    throw new Error('Session not found');
  }

  // Если удаляемая сессия была текущей, очистить currentSessionId
  if (data.currentSessionId === sessionId) {
    data.currentSessionId = null;
  }

  if (saveStorageData(data)) {
    return true;
  }
  throw new Error('Failed to delete session');
}

/**
 * Добавить сообщение в сессию
 */
export function addMessageToSession(sessionId, message) {
  if (!message || typeof message !== 'object') {
    throw new Error('Message is required');
  }

  if (!message.id || !message.original || !message.timestamp) {
    throw new Error('Message must have id, original, and timestamp');
  }

  const data = getStorageData();
  const sessionIndex = data.sessions.findIndex(s => s.id === sessionId);

  if (sessionIndex === -1) {
    throw new Error('Session not found');
  }

  const session = data.sessions[sessionIndex];
  
  // Преобразуем timestamp в число, если это Date объект
  const messageToAdd = {
    ...message,
    timestamp: message.timestamp instanceof Date 
      ? message.timestamp.getTime() 
      : typeof message.timestamp === 'number' 
        ? message.timestamp 
        : Date.now()
  };

  session.messages.push(messageToAdd);
  session.updatedAt = Date.now();
  data.sessions[sessionIndex] = session;

  if (saveStorageData(data)) {
    return messageToAdd;
  }
  throw new Error('Failed to add message to session');
}

/**
 * Обновить сообщение в сессии (например, добавить перевод)
 * Если сообщение не найдено, создает новое
 */
export function updateMessageInSession(sessionId, messageId, updates) {
  const data = getStorageData();
  const sessionIndex = data.sessions.findIndex(s => s.id === sessionId);

  if (sessionIndex === -1) {
    throw new Error('Session not found');
  }

  const session = data.sessions[sessionIndex];
  const messageIndex = session.messages.findIndex(m => m.id === messageId);

  if (messageIndex === -1) {
    // Сообщение не найдено - создаем новое с обновлениями
    // Это может произойти, если сообщение было создано, но еще не сохранено
    const newMessage = {
      id: messageId,
      original: updates.original || '',
      translated: updates.translated || null,
      timestamp: updates.timestamp || Date.now()
    };
    session.messages.push(newMessage);
    session.updatedAt = Date.now();
    data.sessions[sessionIndex] = session;

    if (saveStorageData(data)) {
      return newMessage;
    }
    throw new Error('Failed to create message in session');
  }

  session.messages[messageIndex] = {
    ...session.messages[messageIndex],
    ...updates
  };
  session.updatedAt = Date.now();
  data.sessions[sessionIndex] = session;

  if (saveStorageData(data)) {
    return session.messages[messageIndex];
  }
  throw new Error('Failed to update message in session');
}

/**
 * Удалить сообщение из сессии
 */
export function deleteMessageFromSession(sessionId, messageId) {
  const data = getStorageData();
  const sessionIndex = data.sessions.findIndex(s => s.id === sessionId);

  if (sessionIndex === -1) {
    throw new Error('Session not found');
  }

  const session = data.sessions[sessionIndex];
  const initialLength = session.messages.length;
  
  // Удаляем сообщение по ID
  session.messages = session.messages.filter(m => m.id !== messageId);

  if (session.messages.length === initialLength) {
    throw new Error('Message not found in session');
  }

  session.updatedAt = Date.now();
  data.sessions[sessionIndex] = session;

  if (saveStorageData(data)) {
    return true;
  }
  throw new Error('Failed to delete message from session');
}

/**
 * Получить текущую активную сессию ID
 */
export function getCurrentSessionId() {
  const data = getStorageData();
  return data.currentSessionId || null;
}

/**
 * Установить текущую активную сессию
 */
export function setCurrentSessionId(sessionId) {
  const data = getStorageData();
  
  // Проверяем, что сессия существует
  if (sessionId && !data.sessions.find(s => s.id === sessionId)) {
    throw new Error('Session not found');
  }

  data.currentSessionId = sessionId;

  if (saveStorageData(data)) {
    return true;
  }
  throw new Error('Failed to set current session');
}
