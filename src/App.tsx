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
  Loader2, 
  Mic2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FastForward,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const VOICE_OPTIONS: Record<string, any[]> = {
  vi: [{ id: 'Kore', name: 'Giọng Nữ Ngâm Thơ', gender: 'female', region: 'Miền Bắc' }],
  en: [{ id: 'Charon', name: 'English Voice', gender: 'male', region: 'Global' }],
  de: [{ id: 'Puck', name: 'Deutsche Stimme', gender: 'male', region: 'Global' }]
};

export default function App() {
  const [text, setText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [selectedLang, setSelectedLang] = useState('vi');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/mpeg');
  const [error, setError] = useState<string | null>(null);
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

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;

    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    setTranslatedText('');

    try {
      setIsTranslating(true);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, selectedLang }),
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
        
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.load();
            audioRef.current.playbackRate = playbackSpeed;
            audioRef.current.play().catch(() => {});
          }
        }, 150);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối tới máy chủ');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `ngam-tho-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4 md:p-8 font-serif">
      <main className="max-w-4xl mx-auto space-y-12">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-5xl md:text-7xl font-black mb-4">DọcThơ AI</h1>
          <p className="text-xl text-white/60 italic">Ngâm thơ từng âm - Chuyên dụng cho CapCut</p>
        </motion.div>

        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl space-y-8">
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-bold text-white/50 uppercase tracking-widest">
              <Type size={18} /> Nội dung bài thơ
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập đoạn thơ bạn muốn ngâm..."
              className="w-full h-48 bg-white/5 border border-white/10 rounded-2xl p-6 text-xl focus:ring-2 focus:ring-pink-500 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Dịch sang</label>
              <select 
                value={selectedLang} 
                onChange={(e) => setSelectedLang(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none"
              >
                <option value="vi" className="bg-indigo-900">Tiếng Việt</option>
                <option value="de" className="bg-indigo-900">Tiếng Đức</option>
                <option value="en" className="bg-indigo-900">Tiếng Anh</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Tốc độ: {playbackSpeed}x</label>
              <input 
                type="range" min="0.5" max="2.0" step="0.1" 
                value={playbackSpeed} 
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none accent-pink-500 mt-4"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGenerate}
                disabled={!text || isGenerating}
                className="w-full h-12 bg-linear-to-r from-pink-500 to-rose-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="animate-spin" /> : <Volume2 />}
                Tạo giọng đọc
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center gap-3 text-red-200">
              <AlertCircle size={20} /> {error}
            </div>
          )}

          <AnimatePresence>
            {translatedText && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-6 border-t border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-pink-500 uppercase tracking-widest">Bản Ngâm Thơ</h3>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-xl leading-relaxed italic">
                  {translatedText}
                </div>

                {audioUrl && (
                  <div className="flex flex-col md:flex-row items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/10">
                    <button 
                      onClick={togglePlay}
                      className="w-16 h-16 rounded-full bg-pink-500 flex items-center justify-center shadow-lg hover:bg-pink-600 transition-all"
                    >
                      {isPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="ml-1" />}
                    </button>
                    
                    <div className="flex-1 text-center md:text-left">
                      <p className="font-bold text-lg">Âm thanh đã sẵn sàng</p>
                      <p className="text-sm text-white/40">Chuẩn MP3 • Poetic Rhythm Engine</p>
                    </div>

                    <button 
                      onClick={handleDownload}
                      className="w-full md:w-auto px-8 py-4 bg-white text-indigo-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
                    >
                      <Download size={20} /> Tải về cho CapCut
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="text-center space-y-2 opacity-40">
          <p className="font-mono text-xs tracking-widest">
            v16.0 (Poetic CapCut Engine) | GEMINI_API_KEY Standard
          </p>
          <p className="text-[10px] italic">* Tự động ngắt nghỉ từng âm để tạo nhịp điệu đọc thơ.</p>
        </div>
      </main>

      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
    </div>
  );
}
