/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Play, 
  Pause,
  Download, 
  Volume2, 
  Type, 
  Music, 
  Loader2, 
  Mic2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FastForward,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Voice options based on Gemini TTS available voices (Restored)
const VOICE_OPTIONS: Record<string, any[]> = {
  vi: [
    { id: 'Kore-North', base: 'Kore', name: 'Nữ Miền Bắc', gender: 'female', region: 'Miền Bắc' },
    { id: 'Zephyr-North', base: 'Zephyr', name: 'Nam Miền Bắc', gender: 'male', region: 'Miền Bắc' },
    { id: 'Puck-North', base: 'Puck', name: 'Nữ Miền Bắc (Trầm)', gender: 'female', region: 'Miền Bắc' },
    { id: 'Kore-South', base: 'Kore', name: 'Nữ Miền Nam', gender: 'female', region: 'Miền Nam' },
    { id: 'Zephyr-South', base: 'Zephyr', name: 'Nam Miền Nam', gender: 'male', region: 'Miền Nam' },
  ],
  de: [
    { id: 'Puck-DE', base: 'Puck', name: 'Deutsche Stimme (Nữ)', gender: 'female', region: 'Germany' },
    { id: 'Charon-DE', base: 'Charon', name: 'Deutsche Stimme (Nam)', gender: 'male', region: 'Germany' },
  ],
  en: [
    { id: 'Kore-EN', base: 'Kore', name: 'English Female', gender: 'female', region: 'Global' },
    { id: 'Charon-EN', base: 'Charon', name: 'English Male', gender: 'male', region: 'Global' },
  ]
};

const LANGUAGES = [
  { id: 'vi', name: 'Tiếng Việt', flag: 'VN' },
  { id: 'de', name: 'Tiếng Đức', flag: 'DE' },
  { id: 'en', name: 'Tiếng Anh', flag: 'GB' }
];

export default function App() {
  const [text, setText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [selectedLang, setSelectedLang] = useState('vi');
  const [voiceCount, setVoiceCount] = useState(1);
  const [selectedVoiceIds, setSelectedVoiceIds] = useState<string[]>(['Kore-North']);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/mpeg');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const logDebug = (info: string) => {
    console.log(info);
    setDebugInfo(prev => (prev ? prev + '\n' : '') + `[${new Date().toLocaleTimeString()}] ${info}`);
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: mimeType });
    } catch (e) {
      logDebug(`Lỗi base64ToBlob: ${e}`);
      throw new Error('Không thể chuyển đổi dữ liệu âm thanh.');
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;

    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    setTranslatedText('');
    setDebugInfo('');
    logDebug('Bắt đầu quá trình tạo giọng đọc...');

    try {
      setIsTranslating(true);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          selectedLang, 
          voiceCount,
          voiceId: selectedVoiceIds[0] 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Lỗi: ${response.status}`);
      }

      const data = await response.json();
      setTranslatedText(data.text);
      setIsTranslating(false);

      if (data.audioData) {
        const blob = base64ToBlob(data.audioData, data.mimeType || 'audio/mpeg');
        setAudioMimeType(blob.type);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        logDebug('Âm thanh đã được tạo thành công.');
        
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.load();
            audioRef.current.playbackRate = playbackSpeed;
            audioRef.current.play().catch(() => logDebug('Trình duyệt chặn tự động phát.'));
          }
        }, 150);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối tới máy chủ');
      logDebug(`LỖI: ${err.message}`);
    } finally {
      setIsGenerating(false);
      setIsTranslating(false);
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `am-thanh-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const currentVoices = VOICE_OPTIONS[selectedLang] || [];

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#1A1A1A] font-serif p-4 md:p-8">
      <main className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center gap-3 border-b border-[#1A1A1A]/10 pb-6 mb-8">
            <Volume2 className="text-[#5A5A40]" size={32} />
            <h1 className="text-2xl font-bold uppercase tracking-widest text-[#1A1A1A]">Cấu hình giọng đọc</h1>
        </header>

        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#1A1A1A]/5 shadow-sm space-y-8">
          <section className="space-y-4">
            <label className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A]/40 uppercase tracking-widest">
              <Languages size={14} /> Ngôn ngữ
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.id}
                  onClick={() => {
                    setSelectedLang(lang.id);
                    setSelectedVoiceIds([VOICE_OPTIONS[lang.id][0].id]);
                  }}
                  className={`px-6 py-3 rounded-xl font-bold transition-all border flex items-center gap-2 ${
                    selectedLang === lang.id 
                    ? 'bg-[#5A5A40] text-white border-[#5A5A40]' 
                    : 'bg-white text-[#1A1A1A]/60 border-[#1A1A1A]/10 hover:border-[#1A1A1A]/20'
                  }`}
                >
                  <span className="opacity-60">{lang.flag}</span> {lang.name}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <label className="text-xs font-bold text-[#1A1A1A]/40 uppercase tracking-widest">Số lượng giọng đọc</label>
            <div className="flex gap-2">
              {[1, 2, 3].map(count => (
                <button
                  key={count}
                  onClick={() => setVoiceCount(count)}
                  className={`px-8 py-3 rounded-xl font-bold transition-all border ${
                    voiceCount === count 
                    ? 'bg-[#5A5A40] text-white border-[#5A5A40]' 
                    : 'bg-white text-[#1A1A1A]/60 border-[#1A1A1A]/10'
                  }`}
                >
                  {count} Giọng
                </button>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-4">
              <label className="text-xs font-bold text-[#1A1A1A]/40 uppercase tracking-widest">Giọng đọc</label>
              <select 
                value={selectedVoiceIds[0]}
                onChange={(e) => setSelectedVoiceIds([e.target.value])}
                className="w-full bg-white border border-[#1A1A1A]/10 rounded-xl p-4 text-lg focus:ring-2 focus:ring-[#5A5A40] outline-none"
              >
                {currentVoices.map(voice => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} ({voice.gender === 'female' ? 'Nữ' : 'Nam'} • {voice.region})
                  </option>
                ))}
              </select>
            </section>

            <section className="space-y-4">
              <label className="text-xs font-bold text-[#1A1A1A]/40 uppercase tracking-widest flex justify-between">
                Tốc độ phát <span>{playbackSpeed.toFixed(1)}x ({playbackSpeed === 1 ? 'Bình thường' : playbackSpeed < 1 ? 'Chậm' : 'Nhanh'})</span>
              </label>
              <div className="flex items-center gap-4 py-2">
                <input 
                  type="range" min="0.5" max="2.0" step="0.1" 
                  value={playbackSpeed} 
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#1A1A1A]/10 rounded-lg appearance-none accent-[#5A5A40]"
                />
                <FastForward size={20} className="text-[#1A1A1A]/20" />
              </div>
            </section>
          </div>

          <section className="pt-6 border-t border-[#1A1A1A]/5">
            <label className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A]/40 uppercase tracking-widest mb-4">
              <Type size={14} /> Nội dung văn bản
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập nội dung bạn muốn chuyển thành giọng đọc..."
              className="w-full h-40 bg-white border border-[#1A1A1A]/10 rounded-2xl p-6 text-xl focus:ring-2 focus:ring-[#5A5A40] outline-none resize-none placeholder-[#1A1A1A]/20 leading-relaxed"
            />
          </section>

          <button
            onClick={handleGenerate}
            disabled={!text || isGenerating}
            className="w-full py-5 bg-[#5A5A40] text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#4A4A30] transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" size={18} />}
            Tạo giọng đọc
          </button>

          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
              <AlertCircle size={18} /> {error}
            </motion.div>
          )}

          <AnimatePresence>
            {audioUrl && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-8 border-t border-[#1A1A1A]/5 space-y-6">
                <div className="bg-[#FDFCF8] p-6 rounded-2xl border border-[#1A1A1A]/5 flex flex-col md:flex-row items-center gap-6">
                  <button 
                    onClick={togglePlay}
                    className="w-16 h-16 rounded-full bg-[#5A5A40] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all"
                  >
                    {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                  </button>
                  
                  <div className="flex-1 text-center md:text-left">
                    <p className="font-bold text-[#1A1A1A] text-lg mb-1">Âm thanh đã sẵn sàng</p>
                    <p className="text-sm text-[#1A1A1A]/40 italic">Được tạo tự động bởi Gemini AI</p>
                  </div>

                  <button 
                    onClick={handleDownload}
                    className="w-full md:w-auto px-8 py-4 bg-white border border-[#1A1A1A]/10 text-[#1A1A1A] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#FDFCF8] transition-all shadow-sm"
                  >
                    <Download size={18} /> Tải về
                  </button>
                </div>

                {translatedText && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#1A1A1A]/30 uppercase tracking-[0.2em]">Bản dịch / Nội dung đọc</label>
                    <div className="p-6 bg-white border border-[#1A1A1A]/5 rounded-2xl text-[#1A1A1A]/80 italic leading-relaxed text-lg">
                      {translatedText}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="pt-12 pb-8 text-center space-y-4">
            <p className="text-[10px] text-[#1A1A1A]/30 italic">
                * Lưu ý: Các giọng đọc hiện tại được cung cấp bởi Gemini AI. Các vùng miền (Bắc/Trung/Nam) sẽ được cập nhật sớm nhất.
            </p>
            <div className="flex items-center justify-center gap-4 opacity-20">
                <span className="h-px w-8 bg-[#1A1A1A]" />
                <p className="text-[10px] font-mono uppercase tracking-[0.3em]">Powered by Gemini AI • 2026</p>
                <span className="h-px w-8 bg-[#1A1A1A]" />
            </div>
        </footer>
      </main>

      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
    </div>
  );
}
