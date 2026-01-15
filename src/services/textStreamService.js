/**
 * Utilities for sentence streaming and extraction.
 */

const SENTENCE_END_PATTERN = /[.!?…](?:\s+|$)/g;

const normalizeSentence = (text) => text.replace(/\s+/g, ' ').trim();

const isLikelyAbbreviation = (token) => {
  if (!token) return false;
  const cleaned = token.replace(/[^A-Za-zА-Яа-я]/g, '');
  return cleaned.length > 0 && cleaned.length <= 2;
};

export const extractCompleteSentences = (buffer) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'textStreamService.js:15',message:'extractCompleteSentences entry',data:{buffer,bufferLength:buffer?.length||0,bufferType:typeof buffer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  if (!buffer || typeof buffer !== 'string') {
    return { sentences: [], remainder: '' };
  }

  const text = buffer.trim();
  if (!text) {
    return { sentences: [], remainder: '' };
  }

  const sentences = [];
  let lastIndex = 0;
  let match;

  while ((match = SENTENCE_END_PATTERN.exec(text)) !== null) {
    const endIndex = match.index + 1;
    const candidate = text.slice(lastIndex, endIndex).trim();
    const tokens = candidate.split(/\s+/);
    const lastToken = tokens[tokens.length - 1] || '';

    if (match[0].startsWith('.') && isLikelyAbbreviation(lastToken)) {
      continue;
    }

    if (candidate) {
      sentences.push(normalizeSentence(candidate));
      lastIndex = endIndex;
    }
  }

  const remainder = text.slice(lastIndex).trimStart();
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'textStreamService.js:46',message:'extractCompleteSentences exit',data:{sentencesCount:sentences.length,sentences,remainder,remainderLength:remainder.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  return { sentences, remainder };
};

export const dedupeSentences = (sentences, recentRef, maxRecent = 5) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'textStreamService.js:49',message:'dedupeSentences entry',data:{sentencesCount:sentences?.length||0,sentences,recentSentences:recentRef?.current||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  if (!Array.isArray(sentences) || !recentRef) {
    return [];
  }

  const unique = [];

  sentences.forEach((sentence) => {
    const normalized = normalizeSentence(sentence);
    if (!normalized) return;
    if (!recentRef.current) {
      recentRef.current = [];
    }
    const isDuplicate = recentRef.current.includes(normalized);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'textStreamService.js:62',message:'dedupeSentences check',data:{sentence,normalized,isDuplicate,recentSentences:recentRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (isDuplicate) {
      return;
    }
    unique.push(normalized);
    recentRef.current.push(normalized);
    if (recentRef.current.length > maxRecent) {
      recentRef.current.shift();
    }
  });

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b16a615c-184f-44c1-8c63-1218a7f5cabc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'textStreamService.js:72',message:'dedupeSentences exit',data:{uniqueCount:unique.length,unique},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  return unique;
};
