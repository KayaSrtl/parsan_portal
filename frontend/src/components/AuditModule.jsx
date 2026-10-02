import React, { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, Save, Activity, CheckCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PortalBackButton from './ui/PortalBackButton';

const QUESTIONS = {
  seiri: [
    { id: 'seiri_1', text: 'Çalışma alanındaki kullanılacak/kullanılmayacak malzemeler ayıklanmış mı? (Gereksiz malzeme var mı?)' },
    { id: 'seiri_2', text: 'Çalışma alanında güncel olmayan, yıpranmış veya tarihi geçmiş evraklar/dokümanlar var mı?' },
    { id: 'seiri_3', text: 'Gerekli olmayan malzemelerin alana girmemesi için önleyici faaliyetler yürütülüyor mu?' },
    { id: 'seiri_4', text: 'Son 2 ay içerisinde açılan hata kartı var mı? Hata kartlarının durumu ve farkındalığı sağlanmış mı?' }
  ],
  seiton: [
    { id: 'seiton_1', text: 'Hareketli, hareketsiz tüm makine, ekipman vb. yerleri belirlenmiş ve tanımlamaları yapılmış mı?' },
    { id: 'seiton_2', text: 'Raflarda, çekmecelerde vb. etiket standardına ve Min-Max miktarlarına uyulmuş mu?' },
    { id: 'seiton_3', text: 'Güncel yerleşim planı mevcut mu? Koridor, acil çıkış yolları işaretlenmiş mi?' },
    { id: 'seiton_4', text: 'Atıklar tanımlı ayrı haznelerde toplanıyor mu?' },
    { id: 'seiton_5', text: 'Alandaki forklift vb. kontrol listeleri tanımlanmış mı?' }
  ],
  seiso: [
    { id: 'seiso_1', text: 'Alanda kullanılan makine, ekipmanların alt ve üstleri temiz mi? TKY planına göre yapılıyor mu?' },
    { id: 'seiso_2', text: 'Temizlikte kullanılması gereken malzemeler için ayrılmış alan var mı?' },
    { id: 'seiso_3', text: 'Çalışma alanında temizlik-tertip düzen sorumluları tanımlanmış ve çizelgelerle sağlanıyor mu?' }
  ],
  seiketsu: [
    { id: 'seiketsu_1', text: 'TKY kontrol listesi var mı? Listede yer alan maddeyle ilgili Tek Nokta Dersi vb. var mı?' },
    { id: 'seiketsu_2', text: 'Her bir çalışan için TKY listesi var mı? Yeni başlayanların sorumluluk bölgeleri tanımlanmış mı?' },
    { id: 'seiketsu_3', text: 'TKY süresinde başlangıca göre %90 iyileştirme yapılmış mı?' }
  ],
  shitsuke: [
    { id: 'shitsuke_1', text: 'Tüm çalışanlar belirlenmiş bir prosedüre göre eğitim alıyor mu?' },
    { id: 'shitsuke_2', text: '5S i sağlamak için rutin denetim yapılıyor mu? Aksiyonlar panoda sergileniyor mu?' },
    { id: 'shitsuke_3', text: '5S Denetiminde bir önceki denetimde açılan uygunsuzluklar kontrol ediliyor mu?' },
    { id: 'shitsuke_4', text: '5S başlama vuruşundan bu yana hata kartları kırmızıdan sarıya %80 dönmüş mü?' }
  ]
};

const TEZGAHLAR = [
  "Dövme", "Isıl İşlem", "Sevkiyat", "Tamamlama", "Kalıp", "Kalite Kontrol",
  "MP2000", "MPM3150", "MPM6300", "MPM6302", "LMZ1000", "MP2500", "EK32", "MP4000", "DG25H", "SMP1250"
];

export default function AuditModule({ onBack }) {
  const { user } = useAuth();
  const [selectedTezgah, setSelectedTezgah] = useState('');
  const [answers, setAnswers] = useState({});
  const [audits, setAudits] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('new'); // 'new', 'history'
  const [expandedSections, setExpandedSections] = useState({
    seiri: true, seiton: true, seiso: true, seiketsu: true, shitsuke: true
  });

  const fetchAudits = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/audits`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAudits(data);
      }
    } catch (error) {
      console.error('Denetimler getirilemedi', error);
    }
  };

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- dış sistemle (sunucu) senkronizasyon
    fetchAudits();
  }, []);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: parseInt(value) }));
  };

  const calculateScore = (category) => {
    const questions = QUESTIONS[category];
    let total = 0;
    let answered = 0;
    questions.forEach(q => {
      if (answers[q.id] !== undefined) {
        total += answers[q.id];
        answered++;
      }
    });
    // Her soru max 2 puan. Kategori yuzdesi: (Total / (Answered * 2)) * 100
    if (answered === 0) return 0;
    return Math.round((total / (questions.length * 2)) * 100);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu denetimi silmek istediğinize emin misiniz?")) return;
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/audits/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        setAudits(audits.filter(a => a.id !== id));
      } else {
        alert("Silme işlemi başarısız veya yetkiniz yok.");
      }
    } catch {
      alert("Bir hata oluştu.");
    }
  };

  const handleSubmit = async () => {
    if (!selectedTezgah) {
      alert("Lütfen denetlenen alanı seçin!");
      return;
    }

    const totalQuestions = Object.values(QUESTIONS).flat().length;
    const answeredCount = Object.keys(answers).length;
    
    if (answeredCount < totalQuestions) {
      if(!window.confirm(`Sadece ${answeredCount}/${totalQuestions} soru cevaplandı. Yine de kaydetmek istiyor musunuz?`)) {
        return;
      }
    }

    const seiri_score = calculateScore('seiri');
    const seiton_score = calculateScore('seiton');
    const seiso_score = calculateScore('seiso');
    const seiketsu_score = calculateScore('seiketsu');
    const shitsuke_score = calculateScore('shitsuke');
    const total_score = Math.round((seiri_score + seiton_score + seiso_score + seiketsu_score + shitsuke_score) / 5);

    setIsSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/audits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tezgah_no: selectedTezgah,
          auditor_name: user?.name,
          seiri_score,
          seiton_score,
          seiso_score,
          seiketsu_score,
          shitsuke_score,
          total_score,
          answers
        })
      });
      
      if (res.ok) {
        alert("Denetim başarıyla kaydedildi!");
        setAnswers({});
        setSelectedTezgah('');
        fetchAudits();
        setActiveTab('history');
      } else {
        alert("Kaydetme başarısız.");
      }
    } catch {
      alert("Hata oluştu.");
    }
    setIsSubmitting(false);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getRadarData = (audit) => [
    { subject: '1S Ayıklama', A: audit.seiri_score, fullMark: 100 },
    { subject: '2S Düzenleme', A: audit.seiton_score, fullMark: 100 },
    { subject: '3S Temizlik', A: audit.seiso_score, fullMark: 100 },
    { subject: '4S Standart.', A: audit.seiketsu_score, fullMark: 100 },
    { subject: '5S Disiplin', A: audit.shitsuke_score, fullMark: 100 },
  ];

  const getLiveRadarData = () => [
    { subject: '1S Ayıklama', A: calculateScore('seiri'), fullMark: 100 },
    { subject: '2S Düzenleme', A: calculateScore('seiton'), fullMark: 100 },
    { subject: '3S Temizlik', A: calculateScore('seiso'), fullMark: 100 },
    { subject: '4S Standart.', A: calculateScore('seiketsu'), fullMark: 100 },
    { subject: '5S Disiplin', A: calculateScore('shitsuke'), fullMark: 100 },
  ];

  const renderQuestions = (category, title, colorClass) => {
    return (
      <div className={`mb-6 border rounded-lg overflow-hidden bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm`}>
        <div 
          className={`flex justify-between items-center p-4 cursor-pointer text-white font-bold ${colorClass}`}
          onClick={() => toggleSection(category)}
        >
          <div className="flex items-center gap-2">
            <span>{title}</span>
            <span className="bg-white/20 px-2 py-1 rounded text-xs">
              {calculateScore(category)}%
            </span>
          </div>
          {expandedSections[category] ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
        </div>
        
        {expandedSections[category] && (
          <div className="p-4 space-y-4">
            {QUESTIONS[category].map((q, idx) => (
              <div key={q.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-700 last:border-0 last:pb-0">
                <div className="text-sm text-gray-700 dark:text-gray-300 flex-1 pr-4">
                  <span className="font-bold mr-2 text-gray-500">{idx + 1}.</span>
                  {q.text}
                </div>
                <div className="flex gap-2">
                  <label className={`flex flex-col items-center justify-center p-2 rounded cursor-pointer border transition-colors ${answers[q.id] === 0 ? 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/40' : 'bg-gray-50 border-gray-200 dark:bg-slate-700 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600'}`}>
                    <input type="radio" name={q.id} value="0" className="hidden" onChange={(e) => handleAnswerChange(q.id, e.target.value)} checked={answers[q.id] === 0} />
                    <span className="font-bold text-lg leading-none">0</span>
                    <span className="text-[10px] uppercase">Kötü</span>
                  </label>
                  <label className={`flex flex-col items-center justify-center p-2 rounded cursor-pointer border transition-colors ${answers[q.id] === 1 ? 'bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900/40' : 'bg-gray-50 border-gray-200 dark:bg-slate-700 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600'}`}>
                    <input type="radio" name={q.id} value="1" className="hidden" onChange={(e) => handleAnswerChange(q.id, e.target.value)} checked={answers[q.id] === 1} />
                    <span className="font-bold text-lg leading-none">1</span>
                    <span className="text-[10px] uppercase">Orta</span>
                  </label>
                  <label className={`flex flex-col items-center justify-center p-2 rounded cursor-pointer border transition-colors ${answers[q.id] === 2 ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/40' : 'bg-gray-50 border-gray-200 dark:bg-slate-700 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600'}`}>
                    <input type="radio" name={q.id} value="2" className="hidden" onChange={(e) => handleAnswerChange(q.id, e.target.value)} checked={answers[q.id] === 2} />
                    <span className="font-bold text-lg leading-none">2</span>
                    <span className="text-[10px] uppercase">İyi</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <PortalBackButton onBack={onBack} className="mb-3" />
          <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <ShieldAlert className="text-blue-600" size={28} />
            5S Denetim Yönetimi
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Saha denetim formları ve raporları</p>
        </div>
        
        <div className="flex bg-gray-200 dark:bg-slate-700 rounded-lg p-1 w-full sm:w-auto">
          <button 
            className={`flex-1 sm:flex-none px-6 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'new' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
            onClick={() => setActiveTab('new')}
          >
            Yeni Denetim
          </button>
          <button 
            className={`flex-1 sm:flex-none px-6 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
            onClick={() => setActiveTab('history')}
          >
            Geçmiş Raporlar
          </button>
        </div>
      </div>

      {activeTab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border dark:border-slate-700 mb-6 flex flex-col sm:flex-row gap-4 items-center">
              <label className="font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Denetlenen Alan (Tezgah):</label>
              <select 
                className="w-full sm:w-64 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded p-2 focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                value={selectedTezgah}
                onChange={(e) => setSelectedTezgah(e.target.value)}
              >
                <option value="" disabled>Seçiniz...</option>
                {TEZGAHLAR.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {renderQuestions('seiri', '1S - Ayıklama (Seiri)', 'bg-red-500')}
            {renderQuestions('seiton', '2S - Düzenleme (Seiton)', 'bg-orange-500')}
            {renderQuestions('seiso', '3S - Temizlik (Seiso)', 'bg-blue-500')}
            {renderQuestions('seiketsu', '4S - Standartlaştırma (Seiketsu)', 'bg-indigo-500')}
            {renderQuestions('shitsuke', '5S - Disiplin (Shitsuke)', 'bg-emerald-500')}

            <div className="flex justify-end mt-6">
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={20} />
                {isSubmitting ? 'Kaydediliyor...' : 'Denetimi Kaydet'}
              </button>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 p-6 sticky top-6">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Activity size={20} className="text-blue-500"/>
                Canlı Denetim Skoru
              </h3>
              
              <div className="flex items-center justify-center text-4xl font-black text-gray-900 dark:text-white mb-6">
                {Math.round((calculateScore('seiri') + calculateScore('seiton') + calculateScore('seiso') + calculateScore('seiketsu') + calculateScore('shitsuke')) / 5)}<span className="text-xl text-gray-400">/100</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getLiveRadarData()}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                    <Radar name="Skor" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-center text-gray-400 mt-2">Doldurduğunuz yanıtlara göre anlık hesaplanır.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          {audits.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700">
              <CheckCircle className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
              <p className="text-gray-500 dark:text-gray-400">Henüz kaydedilmiş denetim bulunmuyor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {audits.map(audit => (
                <div key={audit.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-black text-lg text-gray-800 dark:text-gray-100">{audit.tezgah_no}</h4>
                      <p className="text-xs text-gray-500">{new Date(audit.date).toLocaleString('tr-TR')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold px-3 py-1 rounded-full">
                        {audit.total_score}%
                      </div>
                      {user?.role === 'super_admin' && (
                        <button 
                          onClick={() => handleDelete(audit.id)}
                          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 p-1.5 rounded-md transition-colors"
                          title="Denetimi Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex items-center gap-1">
                     <span className="font-semibold text-gray-700 dark:text-gray-300">Denetçi:</span> {audit.auditor_name}
                  </div>

                  <div className="h-48 w-full border-t dark:border-slate-700 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="60%" data={getRadarData(audit)}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 9 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                        <Radar name="Skor" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                        <RechartsTooltip contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', fontSize: '12px'}}/>
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
