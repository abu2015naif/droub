import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  Copy, 
  Check, 
  ShieldCheck, 
  Tag, 
  BookOpen, 
  ArrowRight,
  ChevronLeft,
  Flame,
  Truck,
  Building2,
  Lock,
  Compass,
  Download
} from "lucide-react";
import { SEO_CATEGORIES, ALL_SEO_KEYWORDS_LIST, SEOCategory, SEOTerm } from "../seo-data";

interface SEODirectoryProps {
  onBack: () => void;
  onSelectCategory: (catId: number) => void;
}

export default function SEODirectory({ onBack, onSelectCategory }: SEODirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Filter categories and keywords
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return SEO_CATEGORIES;
    const query = searchQuery.toLowerCase();
    
    return SEO_CATEGORIES.map(cat => ({
      ...cat,
      terms: cat.terms.filter(
        t => 
          t.term.toLowerCase().includes(query) || 
          t.description.toLowerCase().includes(query)
      )
    })).filter(cat => cat.terms.length > 0 || cat.title.toLowerCase().includes(query));
  }, [searchQuery]);

  // Handle single keyword copy
  const handleCopyKeyword = (keyword: string) => {
    navigator.clipboard.writeText(keyword);
    setCopiedKeyword(keyword);
    setTimeout(() => setCopiedKeyword(null), 1500);
  };

  // Handle copy all keywords for ads
  const handleCopyAll = () => {
    const allKeywordsText = ALL_SEO_KEYWORDS_LIST.join(", ");
    navigator.clipboard.writeText(allKeywordsText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Maps SEO Categories to actual database category IDs for links
  const mapSlugToDbId = (slug: string): number => {
    switch (slug) {
      case "safety-gloves": return 1; // ID mapped to WC categories or sample
      case "safety-shoes": return 1;
      case "safety-helmets": return 1;
      case "safety-vests": return 1;
      case "safety-suits": return 1;
      case "eye-and-face-protection": return 1;
      case "general-safety": return 1;
      default: return 1;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-all font-bold text-sm mb-3"
            >
              <ArrowRight size={18} /> العودة للرئيسية
            </button>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <ShieldCheck className="text-red-600" size={36} />
              دليل الكلمات ومعدات السلامة المهنية
            </h1>
            <p className="mt-2 text-lg text-gray-500">
              دليل فهرس الكلمات الدلالية ومواصفات الأمن الصناعي وحماية الأفراد لتأهيل منشآت الدفاع المدني.
            </p>
          </div>

          <button
            onClick={handleCopyAll}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-red-100 transition-all scale-100 hover:scale-[1.02]"
          >
            {copiedAll ? <Check size={18} /> : <Copy size={18} />}
            نسخ جميع كلمات جوجل الإعلانية (600+ كلمة)
          </button>
        </div>

        {/* Quick Info Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">مفهرس محركات البحث</h3>
              <p className="text-sm text-gray-500 mt-1">
                تصفح مصطلحات وتجهيزات السلامة ومطابقة شروط الدفاع المدني السعودي وكود البناء SBC.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
              <Tag size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">أكثر من 600 كلمة مفتاحية</h3>
              <p className="text-sm text-gray-500 mt-1">
                قاعدة بيانات متكاملة تهدف لمساعدة المهندسين لتقديم العروض، والمسوقين لإعلانات Google Ads.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">معايير السلامة المهنية</h3>
              <p className="text-sm text-gray-500 mt-1">
                توافق تام مع معايير OSHA و SASO و شهادات UL FM المطلوبة للمصانع والشركات الكبرى.
              </p>
            </div>
          </div>
        </div>

        {/* Live Search and Filters */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">البحث المباشر في دليل الكلمات المفتاحية ومصطلحات الأمن الصناعي</h2>
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="ابحث عن: سيفتي شوز، خوذة سلامة، حزام أمان، طفايات حريق، قفازات عمل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-5 pr-12 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-100 transition-all font-medium text-gray-800 outline-none"
            />
          </div>
          
          {/* Quick Stats */}
          {searchQuery.trim() && (
            <div className="mt-4 text-sm text-gray-500">
              تم العثور على <span className="text-red-600 font-bold">{filteredCategories.reduce((acc, c) => acc + c.terms.length, 0)}</span> كلمة ومصطلح مطابق لبحثك.
            </div>
          )}
        </div>

        {/* Master Catalog Display */}
        <div className="space-y-12">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((cat, idx) => (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Category Header Banner */}
                <div className="bg-gradient-to-r from-red-600 to-red-800 text-white p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div>
                    <span className="text-red-100 text-xs font-black tracking-widest uppercase bg-red-500/30 px-3 py-1.5 rounded-full block w-fit mb-2">تصنيف سلامة معتمد</span>
                    <h2 className="text-2xl font-bold flex items-center gap-2">{cat.title}</h2>
                    <p className="text-red-100 text-sm mt-1">{cat.description}</p>
                  </div>
                  
                  <button
                    onClick={() => onSelectCategory(mapSlugToDbId(cat.slug))}
                    className="flex items-center gap-2 bg-white text-red-700 hover:bg-red-50 font-bold px-5 py-3 rounded-xl shadow-md text-sm transition-all"
                  >
                    عرض منتجات التصنيف بالمتجر
                    <ChevronLeft size={16} />
                  </button>
                </div>

                {/* Grid of Keywords */}
                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cat.terms.map((t, tIdx) => (
                      <div 
                        key={`${cat.slug}-${tIdx}`}
                        className="p-5 rounded-2xl border border-gray-50 hover:border-red-200 bg-gray-50/50 hover:bg-white shadow-sm hover:shadow-md transition-all group relative"
                      >
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <h4 className="font-bold text-gray-900 group-hover:text-red-600 transition-colors text-base select-all">
                            {t.term}
                          </h4>
                          
                          <button
                            onClick={() => handleCopyKeyword(t.term)}
                            title="نسخ الكلمة المفتاحية"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                          >
                            {copiedKeyword === t.term ? (
                              <Check size={16} className="text-green-600" />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {t.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 p-20 text-center text-gray-500 shadow-sm">
              <Compass size={48} className="mx-auto mb-4 text-gray-300 animate-pulse" />
              <p className="text-lg font-bold text-gray-700">عذراً، لم نجد أي مصطلحات تطابق بحثك</p>
              <p className="text-sm text-gray-400 mt-1">حاول البحث باستخدام كلمات أبسط مثل "قفازات" أو "حذاء"</p>
              <button 
                onClick={() => setSearchQuery("")}
                className="mt-6 font-bold bg-red-600 text-white px-6 py-2 rounded-xl text-sm"
              >
                إعادة ضبط البحث
              </button>
            </div>
          )}
        </div>

        {/* Global Ads Keyword Tool Box */}
        <div className="mt-16 bg-gradient-to-r from-gray-950 to-gray-900 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 w-96 h-96 bg-red-600 opacity-10 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-3xl">
              <span className="text-red-500 font-extrabold tracking-widest text-xs uppercase bg-red-500/15 px-3 py-1.5 rounded-full inline-block mb-3 border border-red-500/30">خاص بالحملات الإعلانية ومحركات البحث SEO</span>
              <h2 className="text-2xl sm:text-3xl font-black mb-4">أداة توليد الكلمات المفتاحية لحملات Google Ads والمحتوى بالكامل</h2>
              <p className="text-gray-400 leading-relaxed text-sm sm:text-base">
                هل تدير حملة إعلانية لمتجر أدوات سلامة مهنية؟ انسخ أكثر من 600 كلمة مفتاحية مستهدفة ومنسقة بفواصل مسبقاً جاهزة للصق المباشر في لوحة تحكّم إعلانات جوجل لرفع نسبة النقر للظهور CTR وتقوية المبيعات وخفض تكلفة المزايدة.
              </p>
            </div>
            
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-red-900/40 transition-all font-mono leading-none py-4 w-full lg:w-fit justify-center whitespace-nowrap text-base cursor-pointer transform duration-150 active:scale-95"
            >
              {copiedAll ? <Check size={20} /> : <Copy size={20} />}
              نسخ الكلمات الإعلانية بفواصل
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-800 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-red-500">600+</div>
              <div className="text-xs text-gray-500 mt-1">كلمة مفتاحية مستهدفة</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-red-500">11</div>
              <div className="text-xs text-gray-500 mt-1">قسم وتصنيف تخصصي</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-red-500">100%</div>
              <div className="text-xs text-gray-500 mt-1">تطابق مع شروط الدفاع المدني</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-red-500">SEO</div>
              <div className="text-xs text-gray-500 mt-1">صديق لعناكب وجوجل آدز</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
