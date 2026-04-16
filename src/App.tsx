/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
// import { GoogleGenAI, Modality } from "@google/genai"; // Moved to backend
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

// Voice options based on Gemini TTS available voices
const VOICE_OPTIONS: Record<string, any[]> = {
  vi: [
    // Miền Bắc
    { id: 'Kore-North', base: 'Kore', name: 'Nữ Miền Bắc', gender: 'female', region: 'Miền Bắc' },
    { id: 'Zephyr-North', base: 'Zephyr', name: 'Nam Miền Bắc', gender: 'male', region: 'Miền Bắc' },
    // Miền Trung
    { id: 'Kore-Central', base: 'Kore', name: 'Nữ Miền Trung (Huế/Đà Nẵng)', gender: 'female', region: 'Miền Trung' },
    { id: 'Charon-Central', base: 'Charon', name: 'Nam Miền Trung (Huế/Đà Nẵng)', gender: 'male', region: 'Miền Trung' },
    // Giọng Huế đặc biệt
    { id: 'Kore-Hue-Poetry', base: 'Kore', name: 'Nữ Huế (Đọc thơ)', gender: 'female', region: 'Huế' },
    { id: 'Charon-Hue-Poetry', base: 'Charon', name: 'Nam Huế (Đọc thơ)', gender: 'male', region: 'Huế' },
    // Miền Nam / Miền Tây
    { id: 'Kore-South', base: 'Kore', name: 'Nữ Miền Tây', gender: 'female', region: 'Miền Tây' },
    { id: 'Kore-South-Poetry', base: 'Kore', name: 'Nữ Miền Tây (Đọc thơ)', gender: 'female', region: 'Miền Tây' },
    { id: 'Puck-South', base: 'Puck', name: 'Nam Miền Nam', gender: 'male', region: 'Miền Nam' },
    // Các giọng khác
    { id: 'Fenrir-Strong', base: 'Fenrir', name: 'Nam Mạnh Mẽ', gender: 'male', region: 'Đặc biệt' },
    { id: 'Charon-Deep', base: 'Charon', name: 'Nam Trầm Ấm', gender: 'male', region: 'Đặc biệt' },
    { id: 'Zephyr-Soft', base: 'Zephyr', name: 'Nam Nhẹ Nhàng', gender: 'male', region: 'Đặc biệt' },
    { id: 'Puck-Fast', base: 'Puck', name: 'Nam Nhanh', gender: 'male', region: 'Đặc biệt' },
    // 5 Giọng Nữ phong cách khác nhau
    { id: 'Kore-Emotional', base: 'Kore', name: 'Nữ Truyền Cảm', gender: 'female', region: 'Phong cách' },
    { id: 'Kore-Young', base: 'Kore', name: 'Nữ Trẻ Trung', gender: 'female', region: 'Phong cách' },
    { id: 'Kore-Luxury', base: 'Kore', name: 'Nữ Sang Trọng', gender: 'female', region: 'Phong cách' },
    { id: 'Kore-Story', base: 'Kore', name: 'Nữ Kể Chuyện', gender: 'female', region: 'Phong cách' },
    { id: 'Kore-Gentle', base: 'Kore', name: 'Nữ Dịu Dàng', gender: 'female', region: 'Phong cách' },
  ],
  en: [
    { id: 'Zephyr-Girl', base: 'Zephyr', name: 'Bé Gái (English)', gender: 'female', region: 'Trẻ em' },
    { id: 'Puck-Boy', base: 'Puck', name: 'Bé Trai (English)', gender: 'male', region: 'Trẻ em' },
    { id: 'Charon-Male', base: 'Charon', name: 'Giọng Nam (English)', gender: 'male', region: 'Người lớn' },
    { id: 'Kore-Female-1', base: 'Kore', name: 'Nữ Trầm (English)', gender: 'female', region: 'Người lớn' },
    { id: 'Fenrir-Female-2', base: 'Fenrir', name: 'Nữ Cao (English)', gender: 'female', region: 'Người lớn' },
    { id: 'Kore-Female-3', base: 'Kore', name: 'Nữ Nhẹ Nhàng (English)', gender: 'female', region: 'Người lớn' },
  ],
  de: [
    { id: 'Zephyr-Girl-DE', base: 'Zephyr', name: 'Bé Gái (Deutsch)', gender: 'female', region: 'Trẻ em' },
    { id: 'Puck-Boy-DE', base: 'Puck', name: 'Bé Trai (Deutsch)', gender: 'male', region: 'Trẻ em' },
    { id: 'Charon-Male-DE', base: 'Charon', name: 'Giọng Nam (Deutsch)', gender: 'male', region: 'Người lớn' },
    { id: 'Kore-Female-1-DE', base: 'Kore', name: 'Nữ Trầm (Deutsch)', gender: 'female', region: 'Người lớn' },
    { id: 'Fenrir-Female-2-DE', base: 'Fenrir', name: 'Nữ Cao (Deutsch)', gender: 'female', region: 'Người lớn' },
    { id: 'Kore-Female-3-DE', base: 'Kore', name: 'Nữ Nhẹ Nhàng (Deutsch)', gender: 'female', region: 'Người lớn' },
  ]
};

export default function App() {
  const [text, setText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [selectedLang, setSelectedLang] = useState('vi');
  const [voiceCount, setVoiceCount] = useState(1);
  const [selectedVoiceIds, setSelectedVoiceIds] = useState<string[]>([VOICE_OPTIONS.vi[0].id, VOICE_OPTIONS.vi[1].id, VOICE_OPTIONS.vi[2].id]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
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
    setDebugInfo(prev => `${new Date().toLocaleTimeString()}: ${info}\n${prev || ''}`);
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setError(null);
    logDebug('Đang kiểm tra kết nối tới Backend API...');
    try {
      const response = await fetch('/api/chat');
      const data = await response.json();
      
      if (data.status === 'ok') {
        logDebug('Kết nối tới Backend: THÀNH CÔNG');
        if (data.apiConnected) {
          alert('Backend đã sẵn sàng và đã cấu hình Gemini API Key!');
        } else {
          alert('Backend hoạt động nhưng CHƯA cấu hình Gemini API Key.');
        }
      } else {
        throw new Error('Backend trả về trạng thái không xác định.');
      }
    } catch (err: any) {
      logDebug(`Lỗi kết nối: ${err.message}`);
      setError(`Lỗi kết nối tới Backend: ${err.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Update playback rate when speed or audio changes
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, audioUrl]);

  // Reset voice when language changes
  React.useEffect(() => {
    const voices = VOICE_OPTIONS[selectedLang] || VOICE_OPTIONS.vi;
    setSelectedVoiceIds([
      voices[0].id, 
      voices[1]?.id || voices[0].id,
      voices[2]?.id || voices[0].id
    ]);
  }, [selectedLang]);

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Vui lòng nhập văn bản hoặc thơ cần đọc.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    setDebugInfo(null);
    setTranslatedText('');

    const currentVoices = VOICE_OPTIONS[selectedLang] || VOICE_OPTIONS.vi;
    const selectedConfigs = selectedVoiceIds.slice(0, voiceCount).map(id => currentVoices.find(v => v.id === id)).filter(Boolean);
    
    if (selectedConfigs.length === 0) return;

    try {
      setIsTranslating(true);
      logDebug(`Đang gửi yêu cầu dịch thuật tới máy chủ (GEMINI_API_KEY)...`);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          selectedLang,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Lỗi máy chủ: ${response.status}`);
      }

      const data = await response.json();
      
      setTranslatedText(data.text);
      setIsTranslating(false);
      logDebug('Đã nhận bản dịch từ máy chủ.');

      // --- Web Speech API Implementation ---
      if ('speechSynthesis' in window) {
        logDebug('Đang chuẩn bị phát âm thanh qua trình duyệt (Web Speech API)...');
        
        // Dừng các âm thanh đang phát (nếu có)
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(data.text);
        
        // Thiết lập ngôn ngữ
        utterance.lang = selectedLang === 'vi' ? 'vi-VN' : (selectedLang === 'de' ? 'de-DE' : 'en-US');
        utterance.rate = playbackSpeed;

        // Tìm giọng đọc phù hợp
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith(utterance.lang) && (v.name.includes('Google') || v.name.includes('Microsoft')));
        if (preferredVoice) {
          utterance.voice = preferredVoice;
          logDebug(`Đã chọn giọng đọc: ${preferredVoice.name}`);
        }

        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = (e) => {
          console.error('Speech Synthesis Error:', e);
          setIsPlaying(false);
        };

        window.speechSynthesis.speak(utterance);
        logDebug('--- Hoàn tất thành công (Phát âm thanh trực tiếp) ---');
      } else {
        logDebug('Trình duyệt không hỗ trợ Web Speech API.');
        throw new Error('Trình duyệt của bạn không hỗ trợ tính năng phát âm thanh trực tiếp.');
      }

    } catch (err: any) {
      logDebug(`Lỗi: ${err.message || err}`);
      setError(`Lỗi: ${err.message || 'Không thể kết nối tới máy chủ'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const createWavHeader = (pcmData: Uint8Array, sampleRate: number = 24000): Uint8Array => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF identifier
    view.setUint32(0, 0x52494646, false); // "RIFF"
    // file length
    view.setUint32(4, 36 + pcmData.length, true);
    // RIFF type
    view.setUint32(8, 0x57415645, false); // "WAVE"
    // format chunk identifier
    view.setUint32(12, 0x666d7420, false); // "fmt "
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (1 is PCM)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 1, true); // Mono
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sampleRate * channelCount * bitsPerSample / 8)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channelCount * bitsPerSample / 8)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    view.setUint32(36, 0x64617461, false); // "data"
    // data chunk length
    view.setUint32(40, pcmData.length, true);

    const wavData = new Uint8Array(44 + pcmData.length);
    wavData.set(new Uint8Array(header), 0);
    wavData.set(pcmData, 44);
    return wavData;
  };

  const base64ToBlob = (base64: string, type: string) => {
    try {
      // Clean up base64 string (remove whitespace/newlines)
      const cleanBase64 = base64.replace(/\s/g, '');
      const binStr = atob(cleanBase64);
      const len = binStr.length;
      let arr = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        arr[i] = binStr.charCodeAt(i);
      }

      // If it's raw PCM, wrap it in a WAV header
      // Gemini TTS often returns audio/pcm;rate=24000
      let finalType = type;
      if (type.toLowerCase().includes('pcm') || type.toLowerCase().includes('raw')) {
        logDebug('Phát hiện dữ liệu PCM raw, đang thêm tiêu đề WAV...');
        arr = createWavHeader(arr, 24000);
        finalType = 'audio/wav';
      }

      return new Blob([arr], { type: finalType });
    } catch (e) {
      logDebug(`Lỗi base64ToBlob: ${e}`);
      throw new Error('Không thể chuyển đổi dữ liệu âm thanh sang định dạng phát được.');
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      const extension = audioMimeType.includes('wav') ? 'wav' : 'mp3';
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `thi-ca-ngon-tu-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-serif selection:bg-[#5A5A40] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#1A1A1A]/10 py-8 px-6 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#5A5A40] flex items-center justify-center text-white">
              <Mic2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Thi Ca & Ngôn Từ</h1>
              <p className="text-sm text-[#1A1A1A]/60 italic">Chuyển văn bản thành giọng đọc truyền cảm</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-[#5A5A40]">
                <Type size={20} />
                <h2 className="text-lg font-semibold uppercase tracking-widest text-xs">Nội dung văn bản / Thơ</h2>
              </div>
              <div className="relative group">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Dán bài thơ hoặc đoạn văn của bạn vào đây..."
                  className="w-full h-80 p-6 bg-white border border-[#1A1A1A]/10 rounded-3xl shadow-sm focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] outline-none transition-all resize-none text-lg leading-relaxed placeholder:italic placeholder:text-[#1A1A1A]/30"
                />
                <div className="absolute bottom-4 right-4 text-xs text-[#1A1A1A]/40 font-mono">
                  {text.length} ký tự
                </div>
              </div>

              <AnimatePresence>
                {translatedText && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="p-4 bg-[#5A5A40]/5 border border-[#5A5A40]/20 rounded-2xl space-y-2"
                  >
                    <div className="flex items-center gap-2 text-[#5A5A40] text-[10px] font-bold uppercase tracking-wider">
                      <Languages size={14} />
                      Bản dịch ({selectedLang.toUpperCase()})
                    </div>
                    <p className="text-sm text-[#1A1A1A]/80 italic leading-relaxed">
                      {translatedText}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-[#5A5A40]">
                <Volume2 size={20} />
                <h2 className="text-lg font-semibold uppercase tracking-widest text-xs">Cấu hình giọng đọc</h2>
              </div>

              {/* Language Selection */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[#1A1A1A]/40 ml-1">Ngôn ngữ</label>
                <div className="flex gap-2">
                  {[
                    { id: 'vi', name: 'Việt', flag: '🇻🇳' },
                    { id: 'de', name: 'Đức', flag: '🇩🇪' },
                    { id: 'en', name: 'Anh', flag: '🇬🇧' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setSelectedLang(lang.id)}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-center ${
                        selectedLang === lang.id
                          ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-md'
                          : 'bg-white text-[#1A1A1A]/60 border-[#1A1A1A]/10 hover:border-[#5A5A40]/30'
                      }`}
                    >
                      <span className="mr-2 text-base">{lang.flag}</span>
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Count Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#1A1A1A]/40 ml-1">Số lượng giọng đọc</label>
                  <span className="text-[10px] text-[#5A5A40] font-medium italic">
                    {voiceCount === 3 ? '* Chế độ 3 giọng đang thử nghiệm' : ''}
                  </span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map((count) => (
                    <button
                      key={count}
                      onClick={() => setVoiceCount(count)}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-center ${
                        voiceCount === count
                          ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-md'
                          : 'bg-white text-[#1A1A1A]/60 border-[#1A1A1A]/10 hover:border-[#5A5A40]/30'
                      }`}
                    >
                      {count} Giọng
                    </button>
                  ))}
                </div>
                {voiceCount > 1 && (
                  <p className="text-[10px] text-[#5A5A40] italic ml-1">
                    {voiceCount === 2 
                      ? '* Hệ thống sẽ tạo cuộc hội thoại giữa 2 người.' 
                      : '* Lưu ý: Gemini TTS hiện tại ổn định nhất với 2 giọng đọc.'}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Voice Dropdowns */}
                {Array.from({ length: voiceCount }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#1A1A1A]/40 ml-1">
                      Giọng đọc {voiceCount > 1 ? index + 1 : ''}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedVoiceIds[index]}
                        onChange={(e) => {
                          const newIds = [...selectedVoiceIds];
                          newIds[index] = e.target.value;
                          setSelectedVoiceIds(newIds);
                        }}
                        className="w-full p-4 bg-white border border-[#1A1A1A]/10 rounded-2xl appearance-none outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] transition-all text-sm font-medium pr-10"
                      >
                        {(VOICE_OPTIONS[selectedLang] || VOICE_OPTIONS.vi).map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.name} ({voice.gender === 'male' ? 'Nam' : 'Nữ'} • {voice.region})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1A1A1A]/30 pointer-events-none" size={18} />
                    </div>
                  </div>
                ))}

                {/* Speed Dropdown */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#1A1A1A]/40 ml-1">Tốc độ phát</label>
                  <div className="relative">
                    <select
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                      className="w-full p-4 bg-white border border-[#1A1A1A]/10 rounded-2xl appearance-none outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] transition-all text-sm font-medium pr-10"
                    >
                      <option value={0.75}>0.75x (Chậm)</option>
                      <option value={1.0}>1.0x (Bình thường)</option>
                      <option value={1.25}>1.25x (Nhanh)</option>
                      <option value={1.5}>1.5x (Rất nhanh)</option>
                    </select>
                    <FastForward className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1A1A1A]/30 pointer-events-none" size={18} />
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-[#1A1A1A]/40 italic mt-2">
                * Lưu ý: Các giọng đọc hiện tại được cung cấp bởi Gemini AI. Các vùng miền (Bắc/Trung/Nam) sẽ được cập nhật sớm nhất.
              </p>
            </section>
          </div>

          {/* Action & Result Section */}
          <div className="space-y-6">
            <div className="sticky top-32 space-y-6">
              <div className="flex gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !text.trim()}
                  className={`flex-[4] py-6 rounded-full flex items-center justify-center gap-3 font-bold text-lg transition-all shadow-xl ${
                    isGenerating || !text.trim()
                      ? 'bg-[#1A1A1A]/10 text-[#1A1A1A]/30 cursor-not-allowed'
                      : 'bg-[#5A5A40] text-white hover:bg-[#4A4A30] active:scale-95'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={24} />
                      <span>{isTranslating ? 'Đang dịch...' : 'Đang tạo...'}</span>
                    </>
                  ) : (
                    <>
                      <Play size={24} fill="currentColor" />
                      <span>Tạo giọng đọc</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={testConnection}
                  disabled={isTestingConnection}
                  title="Kiểm tra kết nối API"
                  className="flex-1 rounded-full border border-[#1A1A1A]/10 flex items-center justify-center hover:bg-white transition-all text-[#1A1A1A]/40 hover:text-[#5A5A40]"
                >
                  {isTestingConnection ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Mic2 size={20} />
                  )}
                </button>
              </div>

              {!text.trim() && !isGenerating && (
                <p className="text-center text-[10px] text-[#5A5A40]/50 font-medium animate-pulse">
                  * Nhập văn bản ở trên để kích hoạt nút tạo
                </p>
              )}

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-sm"
                  >
                    <AlertCircle className="shrink-0" size={18} />
                    <span>{error}</span>
                  </motion.div>
                )}

                {audioUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border-2 border-[#5A5A40] rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#5A5A40]/10">
                      <motion.div 
                        className="h-full bg-[#5A5A40]"
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[#5A5A40]">
                        <div className="w-8 h-8 rounded-full bg-[#5A5A40]/10 flex items-center justify-center">
                          <CheckCircle2 size={18} />
                        </div>
                        <span className="font-black text-sm uppercase tracking-widest">Sẵn sàng</span>
                      </div>
                      <div className="text-[10px] font-bold text-[#1A1A1A]/30 uppercase tracking-tighter">
                        {audioMimeType.split('/')[1]?.toUpperCase() || 'MP3'} • 24kHz
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex flex-col items-center gap-4">
                        <button
                          onClick={togglePlay}
                          className="w-20 h-20 rounded-full bg-[#5A5A40] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all group"
                        >
                          {isPlaying ? (
                            <Pause size={32} fill="currentColor" />
                          ) : (
                            <Play size={32} fill="currentColor" className="ml-1" />
                          )}
                        </button>
                        <span className="text-xs font-bold text-[#5A5A40] uppercase tracking-widest">
                          {isPlaying ? 'Đang phát' : 'Nghe thử ngay'}
                        </span>
                      </div>

                      <audio
                        key={audioUrl}
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        onPause={() => setIsPlaying(false)}
                        onPlay={() => setIsPlaying(true)}
                        className="hidden"
                      />
                      
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={handleDownload}
                          className="flex-1 py-5 bg-[#1A1A1A] text-white rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-black transition-all shadow-lg active:scale-[0.98]"
                        >
                          <Download size={20} />
                          Tải về máy
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#1A1A1A]/5 flex items-center justify-center gap-2 text-[10px] text-[#1A1A1A]/30 font-medium italic">
                      <span>* Bạn có thể dùng file này để lồng tiếng trong CapCut</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-6 bg-[#5A5A40]/5 rounded-3xl border border-[#5A5A40]/10">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#5A5A40] mb-3">Hướng dẫn</h3>
                <ul className="text-xs space-y-2 text-[#1A1A1A]/70 leading-relaxed">
                  <li>1. Dán văn bản hoặc thơ vào ô nhập liệu.</li>
                  <li>2. Chọn một trong các giọng đọc có sẵn.</li>
                  <li>3. Nhấn "Tạo giọng đọc" và chờ trong giây lát.</li>
                  <li>4. Nghe thử và tải về để sử dụng cho video CapCut của bạn.</li>
                </ul>
              </div>

              {debugInfo && (
                <div className="p-4 bg-black/5 rounded-2xl border border-black/5">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/40 mb-2">Nhật ký hệ thống</h3>
                  <pre className="text-[9px] font-mono text-[#1A1A1A]/60 whitespace-pre-wrap max-h-40 overflow-y-auto leading-tight">
                    {debugInfo}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Deployment Version Marker */}
        <div className="max-w-4xl mx-auto px-4 mt-8 pb-8 text-center">
            <p className="text-gray-500 text-sm font-mono">
                System Interface v13.0 | Engine: Web Speech API (FREE) | Key: GEMINI_API_KEY
            </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-[#1A1A1A]/10 text-center">
        <p className="text-xs text-[#1A1A1A]/40 uppercase tracking-[0.2em]">
          Powered by Gemini AI • 2026
        </p>
      </footer>
    </div>
  );
}
