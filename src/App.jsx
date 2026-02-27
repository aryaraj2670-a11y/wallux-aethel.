import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  Search, Download, Heart, X, Compass, Aperture, Wind, Sparkles,
  Loader2, CheckCircle2, Maximize2, Info, Cloud, ChevronLeft,
  ChevronDown, Layers
} from 'lucide-react';

// --- 1. Firebase Configuration ---
// Yahan apna asli Firebase config paste karein agar aapke paas hai
const firebaseConfig = {
  apiKey: "AIzaSyBuzUBJtv0fkVi",
  authDomain: "wallux-pro.firebaseapp.com",
  projectId: "wallux-pro",
  storageBucket: "wallux-pro.firebasestorage.app",
  messagingSenderId: "293283428372",
  appId: "1:293283428372:web:040483813c6b23d2218f01"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'wallux-aethel';

// --- 2. Static Data (Categories & Titles) ---
const CATEGORIES = [
  { name: "Curated", icon: <Sparkles size={16} /> },
  { name: "Atmospheric", icon: <Wind size={16} /> },
  { name: "Vantage", icon: <Compass size={16} /> },
  { name: "Abstract", icon: <Aperture size={16} /> },
  { name: "Favorites", icon: <Heart size={16} /> }
];

const TITLES = [
  "Ethereal Drift", "Silent Summit", "Obsidian Flow", "Neon Pulse", "Arctic Stillness", 
  "Void Walker", "Solar Flare", "Urban Decay", "Crimson Tide", "Golden Hour", 
  "Marble Mist", "Deep Azure", "Static Rain", "Lunar Path", "Verdant Veil", 
  "Cyber Echo", "Sand Storm", "Liquid Chrome", "Prism Break", "Velvet Night",
  "Fractal Bloom", "Glacier Peak", "Saffron Dust", "Cobalt Dream", "Indigo Rise"
];

// Wallpaper data generation logic
const WALLPAPERS = Array.from({ length: 120 }, (_, i) => {
  const seed = 4000 + i;
  const titleBase = TITLES[i % TITLES.length];
  const catIndex = i % (CATEGORIES.length - 1);
  return {
    id: `wall-v2-${i}`,
    title: `${titleBase} ${String(Math.floor(i / TITLES.length) + 1).padStart(2, '0')}`,
    category: CATEGORIES[catIndex].name,
    url: `https://picsum.photos/seed/${seed}/800/1000`,
    hdUrl: `https://picsum.photos/seed/${seed}/3840/2160`,
    resolution: "3840 x 2160",
    fileSize: `${(Math.random() * (8 - 4) + 4).toFixed(1)} MB`
  };
});

// --- 3. Main Component Function ---
const App = () => {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [activeCategory, setActiveCategory] = useState("Curated");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(16);
  
  const touchStart = useRef(null);
  const touchEnd = useRef(null);

  // Auth Effect
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) { console.error("Auth error:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Firestore Sync Effect
  useEffect(() => {
    if (!user) return;
    const favsDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'favorites');
    const unsubscribe = onSnapshot(favsDocRef, 
      (docSnap) => setFavorites(docSnap.exists() ? docSnap.data().ids || [] : []),
      (error) => console.error("Firestore sync error:", error)
    );
    return () => unsubscribe();
  }, [user]);

  // Modal Popstate Logic
  useEffect(() => {
    if (selectedImage) {
      window.history.pushState({ modalOpen: true }, '');
      const handlePopState = () => setSelectedImage(null);
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [selectedImage]);

  const closeModal = () => {
    if (window.history.state?.modalOpen) window.history.back();
    else setSelectedImage(null);
  };

  const toggleFavorite = async (id) => {
    if (!user) return;
    const newFavorites = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(newFavorites);
    try {
      const favsDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'favorites');
      await setDoc(favsDocRef, { ids: newFavorites }, { merge: true });
    } catch (error) { console.error("Error updating favorites:", error); }
  };

  const handleDownload = async (img) => {
    if (downloadingId) return;
    setDownloadingId(img.id);
    try {
      const res = await fetch(img.hdUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `WALLUX_${img.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setTimeout(() => setDownloadingId(null), 1500);
    } catch (e) { setDownloadingId(null); }
  };

  const onTouchStart = (e) => { touchEnd.current = null; touchStart.current = e.targetTouches[0].clientY; }
  const onTouchMove = (e) => { touchEnd.current = e.targetTouches[0].clientY; }
  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    if (touchStart.current - touchEnd.current < -80) closeModal();
  }

  const filtered = useMemo(() => {
    return WALLPAPERS.filter(w => {
      const matchesCategory = activeCategory === "Favorites" 
        ? favorites.includes(w.id) 
        : (activeCategory === "Curated" || w.category === activeCategory);
      const matchesSearch = w.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery, favorites]);

  useEffect(() => { setVisibleCount(16); }, [activeCategory, searchQuery]);

  // --- 4. JSX Layout ---
  return (
    <div className="min-h-screen bg-[#030304] text-zinc-200 font-sans selection:bg-white selection:text-black">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 bottom-0 w-16 md:w-20 border-r border-white/5 flex flex-col items-center py-8 z-50 bg-[#030304]">
        <div className="mb-12 group cursor-pointer" onClick={() => { setActiveCategory("Curated"); setSearchQuery(""); }}>
          <div className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center group-hover:border-white/40 transition-colors">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        </div>
        <nav className="flex flex-col gap-8 md:gap-12 flex-1 items-center">
          {CATEGORIES.map(cat => (
            <button 
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`p-3 rounded-full transition-all duration-300 relative group ${activeCategory === cat.name ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              {cat.icon}
              {activeCategory === cat.name && (
                <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-full blur-[1px]" />
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Page Content */}
      <main className="pl-16 md:pl-20 min-h-screen flex flex-col relative z-0">
        <header className="px-6 md:px-12 pt-10 pb-6 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 bg-[#030304]/90 backdrop-blur-sm sticky top-0 z-40">
          <div>
            <h1 className="text-3xl md:text-5xl font-extralight tracking-tighter text-white">
              Wallux <span className="italic font-serif opacity-80">Aethel</span>
            </h1>
          </div>
          <div className="relative group w-full md:w-80">
            <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input 
              type="text"
              placeholder="FILTER COLLECTION..."
              className="bg-transparent border-b border-white/5 w-full py-3 pl-8 text-[11px] tracking-[0.2em] focus:border-white transition-all focus:outline-none placeholder:text-zinc-700 uppercase"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        {/* Wallpaper Grid */}
        <section className="p-6 md:p-12 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
          {filtered.slice(0, visibleCount).map((img, idx) => (
            <div key={img.id} className="group relative flex flex-col gap-3">
              <div className="aspect-[4/5] overflow-hidden bg-zinc-900 rounded-sm relative cursor-pointer ring-1 ring-white/5" onClick={() => setSelectedImage(img)}>
                <img src={img.url} alt={img.title} className="w-full h-full object-cover grayscale-[0.2] transition-all duration-1000 group-hover:scale-110" loading="lazy" />
                <div className="absolute top-2 right-2">
                   <button onClick={(e) => { e.stopPropagation(); toggleFavorite(img.id); }} className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md ${favorites.includes(img.id) ? 'bg-white text-black' : 'bg-black/40 text-white'}`}>
                     <Heart size={14} fill={favorites.includes(img.id) ? "currentColor" : "none"} />
                   </button>
                </div>
              </div>
              <h3 className="text-[10px] tracking-[0.1em] font-medium text-white/90 truncate">{img.title}</h3>
            </div>
          ))}
        </section>

        {/* Load More Button */}
        {visibleCount < filtered.length && (
          <div className="pb-24 pt-4 flex justify-center">
            <button 
              onClick={() => setVisibleCount(prev => prev + 16)}
              className="px-12 py-4 border border-white/10 rounded-full text-[10px] tracking-[0.4em] font-bold uppercase hover:bg-white hover:text-black transition-all"
            >
              Expand Collection
            </button>
          </div>
        )}
      </main>

      {/* Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex flex-col lg:flex-row overflow-hidden">
          <div className="absolute inset-0 bg-[#030304]/95 backdrop-blur-xl" onClick={closeModal} />
          <div className="relative z-10 w-full h-full flex flex-col lg:flex-row">
            <div className="flex-1 relative flex items-center justify-center" onClick={closeModal} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
               <img src={selectedImage.hdUrl} className="max-w-full max-h-[80vh] object-contain" alt="preview" onClick={(e) => e.stopPropagation()} />
               <button onClick={closeModal} className="absolute top-4 right-4 text-white"><X size={24} /></button>
            </div>
            <div className="bg-[#0a0a0c] lg:w-[420px] p-8 flex flex-col justify-center" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-3xl italic mb-8 text-white">{selectedImage.title}</h2>
                <button onClick={() => handleDownload(selectedImage)} className="w-full py-4 bg-white text-black text-[10px] font-bold tracking-[0.3em] uppercase">
                  {downloadingId === selectedImage.id ? "Downloading..." : "Download Asset"}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
    
