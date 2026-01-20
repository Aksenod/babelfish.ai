import { useState, useEffect, useRef } from 'react';

const TRANSLATION_MODELS = [
  { value: 'yandex', label: 'Yandex' },
  { value: 'google', label: 'Google' },
];

const TRANSCRIPTION_SOURCES = [
  { value: 'local_worker', label: 'Локально (браузер)' },
  { value: 'openai_whisper', label: 'OpenAI Whisper' },
];

// В продакшене скрываем локальную модель, чтобы избежать ошибок WASM в браузере.
const AVAILABLE_TRANSCRIPTION_SOURCES = import.meta.env.PROD
  ? TRANSCRIPTION_SOURCES.filter((source) => source.value !== 'local_worker')
  : TRANSCRIPTION_SOURCES;

// Icons
const SlidersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="21" y2="21"/><line x1="4" x2="20" y1="3" y2="3"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
);

const FileTextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
);

const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
);

export default function SettingsSidebar() {
  const [translationModel, setTranslationModel] = useState('yandex');
  const [transcriptionSource, setTranscriptionSource] = useState('local_worker');
  const [sentencesOnScreen, setSentencesOnScreen] = useState(2);
  const [showOriginal, setShowOriginal] = useState(true);
  
  // Voice Recognition
  const [voiceThreshold, setVoiceThreshold] = useState(30);
  const [silenceDuration, setSilenceDuration] = useState(3000);
  
  // Session Context
  const [sessionContext, setSessionContext] = useState('');
  
  // Advanced Filtering
  const [minRecordingDuration, setMinRecordingDuration] = useState(300);
  const [voiceFreqMin, setVoiceFreqMin] = useState(85);
  const [voiceFreqMax, setVoiceFreqMax] = useState(4000);
  const [stabilityCheckSamples, setStabilityCheckSamples] = useState(3);
  const [voiceEnergyRatio, setVoiceEnergyRatio] = useState(0.3);
  const [stabilityCoefficient, setStabilityCoefficient] = useState(0.8);
  const [filterMeaninglessText, setFilterMeaninglessText] = useState(true);
  const [minTextLength, setMinTextLength] = useState(3);
  const [filterArtifacts, setFilterArtifacts] = useState(true);
  const [filterInterjections, setFilterInterjections] = useState(true);
  const [filterShortPhrases, setFilterShortPhrases] = useState(true);
  const [minSingleWordLength, setMinSingleWordLength] = useState(2);


  useEffect(() => {
    setTranslationModel(localStorage.getItem('translation_model') || 'yandex');

    const storedTranscriptionSource = localStorage.getItem('transcription_source');
    if (import.meta.env.PROD) {
      // В проде принудительно переключаем local_worker → openai_whisper
      const effectiveSource =
        !storedTranscriptionSource || storedTranscriptionSource === 'local_worker'
          ? 'openai_whisper'
          : storedTranscriptionSource;
      setTranscriptionSource(effectiveSource);
      localStorage.setItem('transcription_source', effectiveSource);
    } else {
      setTranscriptionSource(storedTranscriptionSource || 'local_worker');
    }
    const savedSentences = parseInt(localStorage.getItem('sentences_on_screen') || '2', 10);
    setSentencesOnScreen([1, 2, 3].includes(savedSentences) ? savedSentences : 2);
    const savedShowOriginal = localStorage.getItem('show_original');
    setShowOriginal(savedShowOriginal === null ? true : savedShowOriginal === 'true');
    
    setVoiceThreshold(parseInt(localStorage.getItem('voice_threshold') || '30', 10));
    setSilenceDuration(parseInt(localStorage.getItem('silence_duration') || '3000', 10));
    
    setSessionContext(localStorage.getItem('session_context') || '');
    
    setMinRecordingDuration(parseInt(localStorage.getItem('min_recording_duration') || '300', 10));
    setVoiceFreqMin(parseInt(localStorage.getItem('voice_freq_min') || '85', 10));
    setVoiceFreqMax(parseInt(localStorage.getItem('voice_freq_max') || '4000', 10));
    setStabilityCheckSamples(parseInt(localStorage.getItem('stability_check_samples') || '3', 10));
    setVoiceEnergyRatio(parseFloat(localStorage.getItem('voice_energy_ratio') || '0.3'));
    setStabilityCoefficient(parseFloat(localStorage.getItem('stability_coefficient') || '0.8'));
    const savedFilterMeaninglessText = localStorage.getItem('filter_meaningless_text');
    setFilterMeaninglessText(savedFilterMeaninglessText === null ? true : savedFilterMeaninglessText === 'true');
    setMinTextLength(parseInt(localStorage.getItem('filter_min_text_length') || '3', 10));
    const savedFilterArtifacts = localStorage.getItem('filter_artifacts');
    setFilterArtifacts(savedFilterArtifacts === null ? true : savedFilterArtifacts === 'true');
    const savedFilterInterjections = localStorage.getItem('filter_interjections');
    setFilterInterjections(savedFilterInterjections === null ? true : savedFilterInterjections === 'true');
    const savedFilterShortPhrases = localStorage.getItem('filter_short_phrases');
    setFilterShortPhrases(savedFilterShortPhrases === null ? true : savedFilterShortPhrases === 'true');
    setMinSingleWordLength(parseInt(localStorage.getItem('filter_min_single_word_length') || '2', 10));
  }, []);

  const handleSave = (key, value) => {
    localStorage.setItem(key, value);
  };

  const Tooltip = ({ children, onMouseEnter, onMouseLeave }) => {
    return (
      <div 
        className="text-slate-400 hover:text-slate-500 cursor-help transition-colors inline-block"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </div>
    );
  };

  const renderSlider = (label, value, setValue, key, min, max, step = 1, unit = '', tooltip = '') => {
    const isDecimal = step < 1 || value % 1 !== 0;
    const displayValue = isDecimal ? Number(value).toFixed(step < 0.1 ? 2 : 1) : Math.round(value);
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
    const [arrowLeft, setArrowLeft] = useState('50%');
    const iconRef = useRef(null);
    const containerRef = useRef(null);
    
    const handleMouseEnter = () => {
      if (iconRef.current && containerRef.current) {
        const iconRect = iconRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const iconCenter = iconRect.left - containerRect.left + iconRect.width / 2;
        setArrowLeft(`${iconCenter}px`);
      }
      setIsTooltipVisible(true);
    };
    
    return (
      <div className="space-y-2 overflow-visible relative" key={key} ref={containerRef}>
        {tooltip && isTooltipVisible && (
          <div className="absolute bottom-full left-0 right-0 mb-2 z-[100]">
            <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg border border-slate-700 whitespace-normal w-full relative">
              {tooltip}
              <div 
                className="absolute top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"
                style={{ left: arrowLeft, transform: 'translateX(-50%)' }}
              ></div>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center overflow-visible">
          <div className="flex items-center gap-1.5 overflow-visible relative flex-1 min-w-0">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
            {tooltip && (
              <div ref={iconRef}>
                <Tooltip 
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={() => setIsTooltipVisible(false)}
                >
                  <InfoIcon />
                </Tooltip>
              </div>
            )}
          </div>
          <span className="text-xs text-slate-400 font-mono">{displayValue}{unit}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const val = step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
            setValue(val);
            handleSave(key, val.toString());
          }}
          className="w-full h-1.5 bg-slate-200/30 rounded-full appearance-none cursor-pointer accent-blue-500/60"
          style={{
            background: `linear-gradient(to right, rgb(59 130 246 / 0.6) 0%, rgb(59 130 246 / 0.6) ${(value - min) / (max - min) * 100}%, rgb(226 232 240 / 0.3) ${(value - min) / (max - min) * 100}%, rgb(226 232 240 / 0.3) 100%)`
          }}
        />
      </div>
    );
  };

  return (
    <div className="ui-glass-panel-thick flex-1 min-h-0 rounded-3xl flex flex-col gap-2 overflow-y-auto overflow-x-visible md:mt-[60px]">
      <div className="p-4 flex flex-col gap-2 overflow-visible">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Настройки</span>
          <SlidersIcon />
        </div>

        {/* Translation Model */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">Модель</label>
          <div className="relative">
            <select
              value={translationModel}
              onChange={(e) => {
                setTranslationModel(e.target.value);
                handleSave('translation_model', e.target.value);
              }}
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl ui-glass-panel-thin border border-white/40 text-sm font-medium text-slate-900 bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/35 transition-all duration-200 appearance-none cursor-pointer"
            >
              {TRANSLATION_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="text-slate-500"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </div>

        {/* Transcription Source */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">Распознавание</label>
          <div className="relative">
            <select
              value={transcriptionSource}
              onChange={(e) => {
                setTranscriptionSource(e.target.value);
                handleSave('transcription_source', e.target.value);
              }}
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl ui-glass-panel-thin border border-white/40 text-sm font-medium text-slate-900 bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/35 transition-all duration-200 appearance-none cursor-pointer"
            >
              {AVAILABLE_TRANSCRIPTION_SOURCES.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-500"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">Отображение</label>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => {
                  setSentencesOnScreen(count);
                  handleSave('sentences_on_screen', count.toString());
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${
                  sentencesOnScreen === count
                    ? 'bg-blue-500/20 text-blue-700 border-blue-500/40'
                    : 'bg-white/10 text-slate-600 border-white/30 hover:bg-white/20'
                }`}
                aria-pressed={sentencesOnScreen === count}
              >
                {count}
              </button>
            ))}
          </div>
          <div className="flex justify-between items-center pt-1">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Показывать оригинал</label>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showOriginal}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setShowOriginal(newValue);
                  handleSave('show_original', newValue.toString());
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300/50 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500/60"></div>
            </label>
          </div>
        </div>

        <div className="border-t border-white/20 my-3"></div>

        {/* Voice Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <SlidersIcon />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Голос</span>
          </div>

          <div className="space-y-3">
            {renderSlider('Порог', voiceThreshold, setVoiceThreshold, 'voice_threshold', 1, 100, 1, '', 'Минимальный уровень громкости для начала записи. Чем выше значение, тем тише звуки будут игнорироваться.')}
            {renderSlider('Тишина (мс)', silenceDuration, setSilenceDuration, 'silence_duration', 500, 10000, 100, '', 'Длительность тишины в миллисекундах, после которой запись будет завершена. Большее значение означает более длительное ожидание перед остановкой записи.')}
          </div>
        </div>

        <div className="border-t border-white/20 my-3"></div>

        {/* Advanced Filtering */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ActivityIcon />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Расширенные</span>
          </div>

          <div className="space-y-3 pl-0">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-2">
              <p className="text-xs text-yellow-700 leading-relaxed">
                Расширенные фильтры для шумов клавиатуры и стабильности.
              </p>
            </div>
            {renderSlider('Мин. длительность (мс)', minRecordingDuration, setMinRecordingDuration, 'min_recording_duration', 100, 2000, 50, '', 'Минимальная длительность записи в миллисекундах. Записи короче этого значения будут отфильтрованы как шум.')}
            {renderSlider('Частота мин (Гц)', voiceFreqMin, setVoiceFreqMin, 'voice_freq_min', 50, 500, 5, '', 'Минимальная частота голоса в герцах. Звуки ниже этой частоты будут отфильтрованы. Помогает убрать низкочастотные шумы.')}
            {renderSlider('Частота макс (Гц)', voiceFreqMax, setVoiceFreqMax, 'voice_freq_max', 2000, 8000, 100, '', 'Максимальная частота голоса в герцах. Звуки выше этой частоты будут отфильтрованы. Помогает убрать высокочастотные шумы и писки.')}
            {renderSlider('Образцы стабильности', stabilityCheckSamples, setStabilityCheckSamples, 'stability_check_samples', 2, 10, 1, '', 'Количество проверок стабильности сигнала. Больше образцов = более строгая проверка, но может пропустить быструю речь.')}
            {renderSlider('Коэфф. энергии', voiceEnergyRatio, setVoiceEnergyRatio, 'voice_energy_ratio', 0.1, 1.0, 0.05, '', 'Коэффициент энергии голоса относительно общего уровня звука. Помогает отличить голос от фонового шума.')}
            {renderSlider('Коэфф. стабильности', stabilityCoefficient, setStabilityCoefficient, 'stability_coefficient', 0.3, 2.0, 0.1, '', 'Коэффициент стабильности сигнала. Выше значение = более строгая проверка стабильности, помогает отфильтровать случайные звуки.')}
            
            {/* Filter Meaningless Text Toggle */}
            <div className="space-y-2 pt-2 border-t border-white/20">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Фильтр бессмысленного текста</label>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterMeaninglessText}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setFilterMeaninglessText(newValue);
                      handleSave('filter_meaningless_text', newValue.toString());
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300/50 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500/60"></div>
                </label>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Фильтровать текст, который может быть артефактом распознавания (междометия, повторения и т.д.)
              </p>
            </div>

            {filterMeaninglessText && (
              <div className="space-y-3 pt-2 border-t border-white/20">
                {/* Простой контрол без дополнительных хуков, чтобы не ломать порядок хуков */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Мин. длина текста (символы)
                      </label>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      step={1}
                      value={minTextLength}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 3;
                        setMinTextLength(val);
                        handleSave('filter_min_text_length', val.toString());
                      }}
                      className="w-16 px-2 py-1 rounded-md bg-slate-900/30 border border-white/10 text-xs text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pl-0">
                    Минимальная длина текста без знаков препинания. Более короткие тексты будут отфильтрованы.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Мин. длина слова (символы)
                      </label>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      step={1}
                      value={minSingleWordLength}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 2;
                        setMinSingleWordLength(val);
                        handleSave('filter_min_single_word_length', val.toString());
                      }}
                      className="w-16 px-2 py-1 rounded-md bg-slate-900/30 border border-white/10 text-xs text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pl-0">
                    Минимальная длина одиночного слова. Более короткие одиночные слова будут отфильтрованы.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Артефакты</label>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterArtifacts}
                        onChange={(e) => {
                          const newValue = e.target.checked;
                          setFilterArtifacts(newValue);
                          handleSave('filter_artifacts', newValue.toString());
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300/50 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500/60"></div>
                    </label>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pl-0">
                    Фильтровать повторяющиеся слова (bye bye bye, no no no)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Междометия</label>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterInterjections}
                        onChange={(e) => {
                          const newValue = e.target.checked;
                          setFilterInterjections(newValue);
                          handleSave('filter_interjections', newValue.toString());
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300/50 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500/60"></div>
                    </label>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pl-0">
                    Фильтровать междометия (uh, um, эм, хм)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Короткие фразы</label>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterShortPhrases}
                        onChange={(e) => {
                          const newValue = e.target.checked;
                          setFilterShortPhrases(newValue);
                          handleSave('filter_short_phrases', newValue.toString());
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300/50 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500/60"></div>
                    </label>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pl-0">
                    Фильтровать короткие фразы (hi, bye, привет, пока)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/20 my-3"></div>

        {/* Session Context */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
              <FileTextIcon />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Контекст</span>
          </div>
          <textarea
              value={sessionContext}
              onChange={(e) => {
                  setSessionContext(e.target.value);
                  handleSave('session_context', e.target.value);
              }}
              placeholder="Контекст для саммари сессии..."
              rows={4}
              className="w-full px-3 py-2 rounded-xl ui-glass-panel-thin border border-white/40 text-sm text-slate-800 bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none placeholder:text-slate-500"
          />
        </div>
      </div>
    </div>
  );
}
