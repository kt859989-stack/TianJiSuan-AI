
import React, { useState, useRef } from 'react';
import { TabType, UserInfo } from './types';
import { getDailyFortune, getCompatibility, speakProphecy } from './services/geminiService';
import html2canvas from 'html2canvas';

const playAudio = async (base64Data: string) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
  } catch (e) {
    console.error("音频播放失败", e);
  }
};

const CustomAlert = ({ message, onClose }: { message: string, onClose: () => void }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="chinese-card p-8 max-w-sm w-full border-double border-8 border-[#a61b1f]/30 text-center animate-in zoom-in duration-300">
      <div className="text-[#a61b1f] text-4xl mb-2"><i className="fa-solid fa-bell"></i></div>
      <h3 className="title-font text-2xl text-[#5d2e0a] mb-2">天机提醒</h3>
      <p className="text-sm opacity-90 leading-relaxed font-bold text-[#5d2e0a]">{message}</p>
      <button onClick={onClose} className="action-btn px-8 py-2 mt-6 text-lg tracking-widest active:scale-95 transition-all">收到了</button>
    </div>
  </div>
);

const BaguaLoading = () => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#e3c08d]/95 backdrop-blur-md">
    <div className="w-56 h-56 border-8 border-[#5d2e0a] rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite] shadow-2xl bg-white/10">
      <i className="fa-solid fa-yin-yang text-8xl text-[#5d2e0a]"></i>
      <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-[#5d2e0a]">
          <span className="absolute -top-8">乾</span><span className="absolute -bottom-8">坤</span>
          <span className="absolute -left-8">离</span><span className="absolute -right-8">坎</span>
      </div>
    </div>
    <p className="mt-12 cursive-font text-3xl text-[#5d2e0a] animate-pulse">正在沟通寰宇，请稍候...</p>
  </div>
);

const UserInputForm = ({ info, setInfo, title }: { info: UserInfo, setInfo: (v: UserInfo) => void, title: string }) => (
  <div className="space-y-4 p-5 border border-dashed border-[#5d2e0a]/30 rounded-md bg-white/10">
    <h3 className="text-center cursive-font text-xl text-[#5d2e0a] font-bold border-b border-[#5d2e0a]/10 pb-2">{title}</h3>
    <div className="grid grid-cols-2 gap-3">
      <input type="text" placeholder="姓名" value={info.name} onChange={e => setInfo({...info, name: e.target.value})} className="p-2 text-sm focus:ring-1 focus:ring-[#5d2e0a]" />
      <select value={info.gender} onChange={e => setInfo({...info, gender: e.target.value})} className="p-2 text-sm">
        <option value="男">乾(男)</option><option value="女">坤(女)</option>
      </select>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="relative">
        <label className="text-[10px] text-[#5d2e0a]/60 absolute -top-4 left-0">出生日期</label>
        <input type="date" value={info.birthDate} onChange={e => setInfo({...info, birthDate: e.target.value})} className="w-full p-2 text-sm" />
      </div>
      <div className="relative">
        <label className="text-[10px] text-[#5d2e0a]/60 absolute -top-4 left-0">出生时间</label>
        <input type="time" value={info.birthTime} onChange={e => setInfo({...info, birthTime: e.target.value})} className="w-full p-2 text-sm" />
      </div>
    </div>
    <input type="text" placeholder="出生地点" value={info.birthPlace} onChange={e => setInfo({...info, birthPlace: e.target.value})} className="w-full p-2 text-sm" />
  </div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('fortune');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const cardRef = useRef<HTMLDivElement>(null);

  const [u1, setU1] = useState<UserInfo>({ name: '', birthDate: '', birthTime: '', birthPlace: '', gender: '男' });
  const [u2, setU2] = useState<UserInfo>({ name: '', birthDate: '', birthTime: '', birthPlace: '', gender: '女' });

  const handleAction = async (type: TabType) => {
    if (!u1.name || !u1.birthDate) {
      setAlertMsg("请补全您的姓名与生辰。");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = type === 'fortune' ? await getDailyFortune(u1, targetDate) : await getCompatibility(u1, u2);
      setResult({ type, data });
    } catch (err: any) {
      setAlertMsg(err.message || "起卦失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (!result || speaking) return;
    setSpeaking(true);
    try {
      const audioData = await speakProphecy(result.type === 'fortune' ? result.data.insight : result.data.matchAnalysis);
      if (audioData) await playAudio(audioData);
    } catch (err) {
      setAlertMsg("大师今日静修，无法言传。");
    } finally {
      setSpeaking(false);
    }
  };

  const downloadImage = () => {
    if (!cardRef.current) return;
    html2canvas(cardRef.current, { backgroundColor: '#fdf5e6', useCORS: true, scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      link.download = `天机鉴-${new Date().getTime()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col items-center relative min-h-screen">
      {loading && <BaguaLoading />}
      {alertMsg && <CustomAlert message={alertMsg} onClose={() => setAlertMsg(null)} />}

      <header className="text-center mb-10">
        <h1 className="title-font text-6xl text-[#5d2e0a] mb-2">天机·神算</h1>
        <p className="cursive-font text-2xl opacity-60">AI 命理导航系统 3.5</p>
      </header>

      <div className="flex w-full max-w-sm mb-8 chinese-card p-1">
        <button onClick={() => setActiveTab('fortune')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'fortune' ? 'action-btn shadow-md' : 'text-[#5d2e0a]/50'}`}>个人日运</button>
        <button onClick={() => setActiveTab('compatibility')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'compatibility' ? 'action-btn shadow-md' : 'text-[#5d2e0a]/50'}`}>缘分合婚</button>
      </div>

      <div className="w-full chinese-card p-6 md:p-8 mb-10 shadow-xl">
        <div className="space-y-6">
          {activeTab === 'fortune' ? (
            <>
              <div className="relative">
                <label className="text-[10px] gold-text mb-1 block uppercase tracking-widest">测算日期</label>
                <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="w-full p-2 font-bold" />
              </div>
              <UserInputForm title="命主信息" info={u1} setInfo={setU1} />
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UserInputForm title="男/乾方" info={u1} setInfo={setU1} />
              <UserInputForm title="女/坤方" info={u2} setInfo={setU2} />
            </div>
          )}
          <button onClick={() => handleAction(activeTab)} disabled={loading} className="w-full action-btn py-5 text-2xl tracking-[0.6em] transition-all active:scale-[0.98]">
            {loading ? "正在演卦..." : "恭请天机"}
          </button>
        </div>
      </div>

      {result && (
        <div className="w-full space-y-8 animate-in slide-in-from-bottom duration-700">
          <div ref={cardRef} className="chinese-card p-6 md:p-12 space-y-10 border-double border-8 border-[#5d2e0a]/30 shadow-2xl bg-[#fdf5e6]">
            <div className="text-center border-b-2 border-[#5d2e0a]/10 pb-8">
              <h2 className="title-font text-5xl text-[#a61b1f] mb-4">{activeTab === 'fortune' ? '天 机 鉴' : '鸾 凤 合 鉴'}</h2>
              <p className="text-[10px] opacity-40 tracking-[0.5em] uppercase">AI Powered Destiny Analysis</p>
            </div>

            {result.data.imageUrl && (
              <div className="flex justify-center">
                <div className="p-3 bg-white border-2 border-[#5d2e0a] shadow-lg">
                  <img src={result.data.imageUrl} alt="Concept" className="w-72 h-72 object-cover grayscale-[0.3]" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="p-5 bg-white/50 border border-[#5d2e0a]/20 rounded shadow-inner">
                  <p className="text-[10px] gold-text mb-2 border-b border-[#5d2e0a]/10">生辰八字 · BAZI</p>
                  <p className="text-2xl font-black text-[#5d2e0a] tracking-widest leading-relaxed">
                    {activeTab === 'fortune' ? result.data.bazi : `${result.data.baziA} & ${result.data.baziB}`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#a61b1f]/5 border border-[#a61b1f]/20 text-center rounded">
                    <p className="text-[10px] gold-text mb-1">运势评分</p>
                    <p className="text-5xl font-black text-[#a61b1f]">{result.data.score || '--'}</p>
                  </div>
                  <div className="p-4 bg-white/50 border border-[#5d2e0a]/20 text-center rounded flex flex-col justify-center">
                    <p className="text-[10px] gold-text mb-1">判词</p>
                    <p className="text-xl font-bold text-[#5d2e0a]">{activeTab === 'fortune' ? result.data.summary : result.data.dynamic}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-[#5d2e0a]/5 border-l-4 border-[#a61b1f] relative min-h-[250px] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-[#a61b1f]/10 pb-2">
                  <span className="text-sm font-bold text-[#a61b1f] tracking-widest">大师详批</span>
                  <button onClick={handleSpeak} disabled={speaking} className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-[#a61b1f] transition-all ${speaking ? 'bg-[#a61b1f] text-white animate-pulse' : 'text-[#a61b1f] hover:bg-[#a61b1f]/10'}`}>
                    <i className={`fa-solid ${speaking ? 'fa-waveform' : 'fa-volume-high'}`}></i>
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[300px] text-sm leading-relaxed text-[#5d2e0a] text-justify indent-8 italic font-medium">
                  {activeTab === 'fortune' ? result.data.insight : result.data.matchAnalysis}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-green-900/5 border border-green-800/10 rounded">
                <h5 className="text-xs font-bold text-green-800 mb-4 border-b border-green-800/20 pb-1 flex items-center gap-2">
                  <i className="fa-solid fa-circle-check"></i> 宜 · Auspicious
                </h5>
                <ul className="text-xs space-y-4 text-green-900/90 font-bold">{result.data.todo?.map((t: string, i: number) => <li key={i} className="flex gap-2">· {t}</li>)}</ul>
              </div>
              <div className="p-5 bg-red-900/5 border border-red-800/10 rounded">
                <h5 className="text-xs font-bold text-red-800 mb-4 border-b border-red-800/20 pb-1 flex items-center gap-2">
                  <i className="fa-solid fa-circle-xmark"></i> 忌 · Taboo
                </h5>
                <ul className="text-xs space-y-4 text-red-900/90 font-bold">{result.data.notodo?.map((t: string, i: number) => <li key={i} className="flex gap-2">· {t}</li>)}</ul>
              </div>
            </div>

            <div className="pt-8 border-t border-[#5d2e0a]/10 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="cursive-font text-2xl text-[#5d2e0a]/70">“ {result.data.advice || result.data.summary} ”</p>
              <div className="text-right">
                <p className="text-[10px] opacity-30 uppercase tracking-tighter italic">Official AI Destiny Analysis Report</p>
                <p className="text-[10px] font-bold text-[#5d2e0a]/40">此批注由 AI 生成，仅供参考，请保持平常心</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 w-full">
             <button onClick={downloadImage} className="flex-1 py-5 action-btn flex items-center justify-center gap-3 text-xl shadow-lg active:scale-95 transition-all">
               <i className="fa-solid fa-file-image"></i> 收藏天机图
             </button>
             <button onClick={() => setResult(null)} className="px-10 py-5 border-2 border-[#5d2e0a] text-[#5d2e0a] font-bold hover:bg-[#5d2e0a]/5 transition-all active:scale-95">
               重起一卦
             </button>
          </div>
        </div>
      )}

      <footer className="mt-20 text-center opacity-40 text-[10px] tracking-[0.5em] uppercase pb-12">
        天机算 3.5 · Built with Google Gemini AI &copy; 2025
      </footer>
    </div>
  );
};

export default App;
