/* match-replay branding adapter. Common is the only live source; legacy colors are offline fallbacks. */
(function (global) {
  'use strict';
  const COMMON_SCRIPT = 'https://jbsbackgammon.github.io/common/brand.js';
  // Used only if common cannot be fetched (the eight original choices, plus three Opens).
  const FALLBACK = [
    ['japan-championship','日本選手権','#3C3C3C','title'],
    ['bansei','盤聖戦','#6B0D2F','title'],
    ['meijin','名人戦','#6B670D','title'],
    ['oui','王位戦','#0D6B2F','title'],
    ['saiou','賽王戦','#0D236B','title'],
    ['kisei','棋聖戦','#6B230D','exchange'],
    ['queen','女王戦','#6B0D5B','exchange'],
    ['shin-ei','新鋭戦','#0D676B','exchange'],
    ['tokyo-open','東京オープン','#009F40','open'],
    ['osaka-open','大阪オープン','#F8B62B','open'],
    ['nagoya-open','名古屋オープン','#0C284D','open']
  ].map(([id,name,color,category]) => ({id,name,color,category}));
  const HEX = /^#[0-9A-F]{6}$/i;
  let loaded = false;
  let loading = null;
  function normalized(value, fallback = null) {
    const text = String(value || '').trim();
    return HEX.test(text) ? text.toUpperCase() : fallback;
  }
  function fallbackSubColor(main) {
    const hex = normalized(main);
    if (!hex) return null;
    return '#' + [1,3,5].map(i => Math.round(parseInt(hex.slice(i,i+2),16)*.68 + 255*.32).toString(16).padStart(2,'0').toUpperCase()).join('');
  }
  function getTournaments() {
    if (loaded) return global.JBSBrand.getTournaments();
    return FALLBACK.map(item => ({...item,subColor:fallbackSubColor(item.color)}));
  }
  function getTournament(query) {
    if (!query) return null;
    if (loaded) return global.JBSBrand.getTournament(query);
    const key=String(query).trim().toLocaleLowerCase();
    return getTournaments().find(item => item.id===key || item.name.toLocaleLowerCase()===key) || null;
  }
  function matchTournament(text) {
    const source=String(text||'').replace(/#U([0-9a-fA-F]{4})/g, (_,hex)=>String.fromCharCode(parseInt(hex,16)));
    // Prefer exact event names and long distinctive fragments to generic words.
    const tournaments=getTournaments();
    for (const item of tournaments) {
      if (source.includes(item.name)) return item;
    }
    for (const item of tournaments) {
      if (item.name.endsWith('戦') && source.includes(item.name.slice(0,-1))) return item;
    }
    // Former UI accepted the abbreviation 日本 for 日本選手権; use it last.
    if (source.includes('日本')) return getTournament('japan-championship');
    return null;
  }
  function resolveTheme(meta) {
    const given = normalized(meta?.themeColor, '#000000');
    let item = getTournament(meta?.themeBrandId);
    // v101 metadata has no brand ID. Safely migrate only a known title whose
    // saved color still equals its legacy preset; custom colors are untouched.
    if (!item && !meta?.themeBrandId) {
      const inferred = matchTournament(meta?.matchFile || meta?.tournamentTitleLine1);
      const original = FALLBACK.find(entry => entry.id === inferred?.id);
      if (inferred && original && (given === original.color || given === normalized(inferred.color))) item = inferred;
    }
    // When common is down, preserve the color saved with the match.
    const color = item && loaded ? normalized(item.color, given) : given;
    const subColor = item && loaded ? normalized(item.subColor, fallbackSubColor(color)) : fallbackSubColor(color);
    return {color,subColor,id:item?.id || ''};
  }
  function getTextColor(background, fallback='#FFFFFF') {
    const hex=normalized(background);
    if (!hex) return fallback;
    if (loaded) return global.JBSBrand.getTextColor(hex, fallback);
    // Same relative-luminance calculation and defaults as common for offline mode.
    const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
    const linear=channels.map(v=>v<=0.04045?v/12.92:((v+.055)/1.055)**2.4);
    const lum=.2126*linear[0]+.7152*linear[1]+.0722*linear[2];
    return lum>0.26?'#000000':'#FFFFFF';
  }
  function ensureLibrary() {
    if (global.JBSBrand) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=COMMON_SCRIPT;
      script.async=true;
      script.onload=()=>resolve();
      script.onerror=()=>reject(new Error('common/brand.js を取得できません'));
      document.head.appendChild(script);
    });
  }
  function load() {
    if (loaded) return Promise.resolve(true);
    if (loading) return loading;
    loading=(async()=>{
      try {
        await ensureLibrary();
        if (!global.JBSBrand) throw new Error('common ブランドAPIが利用できません');
        await global.JBSBrand.load();
        loaded=true;
      } catch (error) {
        console.warn('JBS common を読み込めませんでした。従来のテーマ色を使用します。',error);
      }
      return loaded;
    })();
    return loading;
  }
  global.JBSReplayBrand=Object.freeze({load,getTournaments,getTournament,matchTournament,resolveTheme,getTextColor,normalized});
})(window);
