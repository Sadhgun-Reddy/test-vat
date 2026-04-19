// src/pages/dashboard/TelanganaMap.jsx
import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

// ── DATA ─────────────────────────────────────────────────────────────────────

const DISTRICT_INFO = {
  "Adilabad":    { pop:"2.7M", area:"16,128 km²", hq:"Adilabad",    desc:"Tribal heartland with dense forests, waterfalls and Gond culture",           industries:"Coal, Forest produce, Tourism" },
  "Nizamabad":   { pop:"2.5M", area:"7,956 km²",  hq:"Nizamabad",   desc:"Turmeric capital of India, major agricultural and industrial hub",           industries:"Agriculture, Fertilizers" },
  "Karimnagar":  { pop:"3.8M", area:"11,823 km²", hq:"Karimnagar",  desc:"Famous for silver filigree jewelry crafts and growing industrial belt",     industries:"Silver crafts, Cement, IT" },
  "Medak":       { pop:"3.0M", area:"9,699 km²",  hq:"Sangareddy",  desc:"Home to one of Asia's largest churches and a 1,000-year-old fort",         industries:"Agriculture, Pharma" },
  "Hyderabad":   { pop:"4.0M", area:"217 km²",    hq:"Hyderabad",   desc:"Capital city and India's IT hub, the historic Pearl City",                  industries:"IT, Pharma, Tourism, Finance" },
  "Rangareddy":  { pop:"5.3M", area:"7,493 km²",  hq:"Hyderabad",   desc:"Suburbs of Hyderabad, home to Golconda Fort and HITEC City",               industries:"IT, Real Estate, Mining" },
  "Nalgonda":    { pop:"3.5M", area:"14,240 km²", hq:"Nalgonda",    desc:"Nagarjunasagar reservoir, historic sites and fluoride-affected region",     industries:"Mining, Agriculture" },
  "Mahbubnagar": { pop:"4.0M", area:"18,432 km²", hq:"Mahbubnagar", desc:"Largest district by area, Srisailam Dam, tribal and agrarian land",         industries:"Agriculture, Quarrying" },
  "Warangal":    { pop:"3.5M", area:"12,846 km²", hq:"Warangal",    desc:"Kakatiya dynasty heritage — iconic forts, temples and gateways",            industries:"Textiles, Tourism, Agriculture" },
  "Khammam":     { pop:"2.8M", area:"16,029 km²", hq:"Khammam",     desc:"Coal mining, dense forests, Bhadrachalam sacred temple on Godavari",       industries:"Coal, Forest produce, Tourism" },
};

const CITIES = [
  { name:"Hyderabad",   lat:17.3850, lng:78.4867, type:"capital", pop:"10.5M", desc:"Capital of Telangana & joint capital with Andhra Pradesh. India's premier IT hub.",   est:"1591",    elev:"542 m", district:"Hyderabad" },
  { name:"Warangal",    lat:17.9689, lng:79.5941, type:"city",    pop:"811K",  desc:"Historic city and former Kakatiya dynasty capital. Rich heritage including ancient forts.", est:"1200s",   elev:"295 m", district:"Warangal" },
  { name:"Nizamabad",   lat:18.6726, lng:78.0941, type:"city",    pop:"541K",  desc:"Major agricultural and commercial center famously known as the Turmeric Capital of India.", est:"~1800",   elev:"380 m", district:"Nizamabad" },
  { name:"Karimnagar",  lat:18.4386, lng:79.1288, type:"city",    pop:"261K",  desc:"Industrial city renowned for intricate silver filigree jewelry.",                        est:"~1905",   elev:"253 m", district:"Karimnagar" },
  { name:"Khammam",     lat:17.2473, lng:80.1514, type:"city",    pop:"263K",  desc:"Industrial town near Andhra Pradesh border.",                                            est:"~900 AD", elev:"126 m", district:"Khammam" },
  { name:"Ramagundam",  lat:18.7573, lng:79.4734, type:"city",    pop:"241K",  desc:"Second largest city in Telangana, major coal mining and thermal power hub.",             est:"1940s",   elev:"161 m", district:"Karimnagar" },
  { name:"Mahbubnagar", lat:16.7488, lng:77.9870, type:"city",    pop:"168K",  desc:"Headquarters of the largest Telangana district by area.",                               est:"~1890",   elev:"580 m", district:"Mahbubnagar" },
  { name:"Nalgonda",    lat:17.0579, lng:79.2676, type:"city",    pop:"155K",  desc:"Historic town near the Nagarjunasagar Dam reservoir.",                                  est:"~1000 AD",elev:"362 m", district:"Nalgonda" },
  { name:"Adilabad",    lat:19.6640, lng:78.5319, type:"city",    pop:"117K",  desc:"Gateway to northern Telangana's tribal forest regions.",                               est:"~1750",   elev:"252 m", district:"Adilabad" },
  { name:"Suryapet",    lat:17.1416, lng:79.6219, type:"city",    pop:"105K",  desc:"Central Telangana city known for agriculture.",                                         est:"~1950",   elev:"98 m",  district:"Nalgonda" },
  { name:"Siddipet",    lat:18.1016, lng:78.8516, type:"city",    pop:"85K",   desc:"Rapidly growing urban center being developed as a modern model city.",                  est:"~1930",   elev:"420 m", district:"Medak" },
  { name:"Sangareddy",  lat:17.6260, lng:78.0869, type:"city",    pop:"130K",  desc:"Growing industrial satellite town west of Hyderabad.",                                 est:"~1860",   elev:"471 m", district:"Medak" },
];

const LANDMARKS = [
  { name:"Charminar",              lat:17.3616, lng:78.4747, type:"monument",   col:"#e05555", emoji:"🏛", desc:"Iconic 16th-century mosque and monument, the defining symbol of Hyderabad.",    built:"1591",        by:"Qutb Shahi dynasty",      district:"Hyderabad",  status:"UNESCO Tentative" },
  { name:"Golconda Fort",          lat:17.3833, lng:78.4011, type:"fort",        col:"#e05555", emoji:"🏰", desc:"Magnificent medieval fortification, former Qutb Shahi capital.",                built:"16th century", by:"Qutb Shahi kings",        district:"Rangareddy", status:"Archaeological site" },
  { name:"Hussain Sagar",          lat:17.4239, lng:78.4738, type:"lake",        col:"#4ec97b", emoji:"💧", desc:"Heart-shaped lake with the world's largest monolithic Buddha statue.",          built:"1562",         by:"Ibrahim Quli Qutb Shah",  district:"Hyderabad",  status:"City landmark" },
  { name:"Ramoji Film City",       lat:17.2543, lng:78.6806, type:"attraction",  col:"#a47cf0", emoji:"🎬", desc:"World's largest integrated film studio complex per Guinness World Records.",    built:"1996",         by:"Ramoji Rao",              district:"Rangareddy", status:"Guinness Record" },
  { name:"Warangal Fort",          lat:17.9611, lng:79.5667, type:"fort",        col:"#e05555", emoji:"🏯", desc:"Iconic Kakatiya Kala Thoranam, the official symbol of Telangana state.",        built:"1199–1261 AD", by:"Kakatiya dynasty",        district:"Warangal",   status:"State symbol" },
  { name:"Nagarjunasagar Dam",     lat:16.5800, lng:79.3167, type:"dam",         col:"#a47cf0", emoji:"🌊", desc:"One of India's largest masonry dams, built on the Krishna River.",             built:"1967",         by:"Govt of India",           district:"Nalgonda",   status:"National Project" },
  { name:"Thousand Pillar Temple", lat:17.9714, lng:79.5950, type:"temple",      col:"#5b9cf6", emoji:"🛕", desc:"11th-century Kakatiya Trikuta temple with exquisite star-shaped platform.",    built:"1163 AD",      by:"Rudra Deva (Kakatiya)",   district:"Warangal",   status:"Protected monument" },
  { name:"Bhadrachalam Temple",    lat:17.6700, lng:80.8916, type:"temple",      col:"#5b9cf6", emoji:"🛕", desc:"Sacred Vaishnava shrine of Lord Rama on the banks of Godavari River.",         built:"17th century", by:"Kancherla Gopanna",       district:"Khammam",    status:"Major pilgrimage" },
  { name:"Kuntala Waterfall",      lat:19.3333, lng:78.5167, type:"nature",      col:"#4ec97b", emoji:"🌿", desc:"Tallest waterfall in Telangana at 147 ft, located on the Kadam River.",       height:"147 ft",      river:"Kadam River",          district:"Adilabad",   status:"Eco-tourism" },
  { name:"Medak Cathedral",        lat:17.9133, lng:78.2686, type:"church",      col:"#5b9cf6", emoji:"⛪", desc:"One of the largest churches in Asia with exquisite Gothic architecture.",      built:"1924",         by:"British Methodist Mission",district:"Medak",      status:"Heritage church" },
  { name:"Pochampally Village",    lat:17.3667, lng:79.0000, type:"heritage",    col:"#f0914a", emoji:"🧵", desc:"UNESCO Creative Cities recognition. World-famous for Ikkat silk weaving.",    craft:"Ikkat silk weaving",                           district:"Nalgonda",   status:"UNESCO recognized" },
  { name:"Birla Mandir",           lat:17.4062, lng:78.4691, type:"temple",      col:"#5b9cf6", emoji:"🏛", desc:"Stunning white marble Venkateswara temple overlooking Hussain Sagar Lake.",   built:"1976",         by:"Birla Foundation",        district:"Hyderabad",  status:"Landmark temple" },
  { name:"Pakhal Lake",            lat:17.9833, lng:79.9000, type:"nature",      col:"#4ec97b", emoji:"🌿", desc:"Ancient reservoir surrounded by Pakhal Wildlife Sanctuary.",                  built:"1213 AD",      by:"Kakatiya dynasty",        district:"Warangal",   status:"Wildlife sanctuary" },
  { name:"Vemulawada Temple",      lat:18.4600, lng:79.3700, type:"temple",      col:"#5b9cf6", emoji:"🛕", desc:"Most important Shiva pilgrimage site in Telangana.",                          period:"Ancient",                                     district:"Karimnagar", status:"Major pilgrimage" },
];

const D_COLORS = ['#4285f4','#34a853','#ea4335','#fbbc05','#1a73e8','#0f9d58',
                  '#db4437','#f4b400','#4285f4','#00bcd4','#9c27b0','#ff5722'];

const TYPE_LABEL = {
  monument:"Monument", fort:"Fort", lake:"Lake", attraction:"Film City",
  dam:"Dam", temple:"Temple", church:"Church", nature:"Nature Reserve",
  heritage:"Heritage Site", capital:"Capital City", city:"City",
};

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function TelanganaMap({ districtActivity = [] }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const groupsRef    = useRef({});
  const [layerOn, setLayerOn] = useState({ state:true, districts:true, cities:true, landmarks:true, labels:true });
  const [districtCount, setDistrictCount] = useState(33);

  // Toggle a layer on/off
  function toggleLayer(key) {
    setLayerOn(prev => {
      const next = !prev[key];
      const grp  = groupsRef.current[key];
      const map  = mapRef.current;
      if (grp && map) next ? map.addLayer(grp) : map.removeLayer(grp);
      return { ...prev, [key]: next };
    });
  }

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    // Dynamic import to avoid SSR issues
    const L = require('leaflet');

    // Fix default icon path broken by Webpack
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
      iconUrl:       require('leaflet/dist/images/marker-icon.png'),
      shadowUrl:     require('leaflet/dist/images/marker-shadow.png'),
    });

    const map = L.map(containerRef.current, {
      center: [17.8, 79.2], zoom: 7,
      zoomControl: false, attributionControl: true,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      attribution: '© <a href="https://maps.google.com">Google Maps</a>',
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;

    // ── Helper: circle marker icon ──
    function circleIcon(color, size) {
      return L.divIcon({
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.85);box-shadow:0 0 0 3px ${color}45,0 2px 8px rgba(0,0,0,0.45);"></div>`,
        className:'', iconSize:[size,size], iconAnchor:[size/2,size/2], popupAnchor:[0,-size/2-4],
      });
    }

    // ── Helper: pin marker icon ──
    function pinIcon(color, emoji) {
      return L.divIcon({
        html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid rgba(255,255,255,0.85);box-shadow:0 3px 8px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:12px;display:block;text-align:center;line-height:1;">${emoji}</span></div>`,
        className:'', iconSize:[28,28], iconAnchor:[14,28], popupAnchor:[0,-32],
      });
    }

    // ── State boundary ──
    fetch('https://raw.githubusercontent.com/gpavanb1/Telangana-Visualisation/master/data/Telangana.geojson')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const grp = L.geoJSON(data, {
          style: { color:'#1a73e8', weight:3, fillColor:'transparent', fillOpacity:0 },
        }).addTo(map);
        groupsRef.current.state = grp;
        map.fitBounds(grp.getBounds(), { padding:[20,20] });
      })
      .catch(() => {});

    // ── Districts ──
    let colorIdx = 0;
    fetch('https://raw.githubusercontent.com/datameet/maps/master/Districts/telangana.geojson')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const grp = L.geoJSON(data, {
          style: () => {
            const c = D_COLORS[colorIdx++ % D_COLORS.length];
            return { color:'rgba(0,0,0,0.2)', weight:1, fillColor:c, fillOpacity:0.12 };
          },
          onEachFeature: (feat, layer) => {
            const dname = feat.properties.DISTRICT || feat.properties.name || feat.properties.Name || 'District';
            const info  = DISTRICT_INFO[dname] || {};
            layer.bindTooltip(`<b style="font-size:11px">${dname}</b>`, { sticky:true, direction:'top' });
            layer.on('mouseover', () => layer.setStyle({ fillOpacity:0.28, weight:1.5 }));
            layer.on('mouseout',  () => layer.setStyle({ fillOpacity:0.12, weight:1 }));
            layer.bindPopup(`
              <div style="font-family:system-ui,sans-serif;min-width:160px">
                <div style="font-weight:700;font-size:13px;margin-bottom:4px">${dname} District</div>
                <div style="font-size:11px;color:#555;margin-bottom:6px">${info.desc || 'Telangana district'}</div>
                ${info.pop ? `<div style="font-size:11px"><b>Population:</b> ${info.pop}</div>` : ''}
                ${info.area ? `<div style="font-size:11px"><b>Area:</b> ${info.area}</div>` : ''}
                ${info.industries ? `<div style="font-size:11px"><b>Industries:</b> ${info.industries}</div>` : ''}
              </div>
            `, { maxWidth:220 });
          },
        }).addTo(map);
        groupsRef.current.districts = grp;
        setDistrictCount(data.features.length);
      })
      .catch(() => {});

    // ── Cities ──
    const cityGroup  = L.layerGroup().addTo(map);
    const labelGroup = L.layerGroup().addTo(map);

    CITIES.forEach(city => {
      const isCap = city.type === 'capital';
      const color = isCap ? '#ea4335' : '#e8710a';
      const size  = isCap ? 16 : 11;

      const m = L.marker([city.lat, city.lng], { icon: circleIcon(color, size) });
      m.bindPopup(`
        <div style="font-family:system-ui,sans-serif;min-width:160px">
          <div style="font-weight:700;font-size:13px">${city.name}</div>
          <div style="font-size:10px;font-weight:600;color:${color};text-transform:uppercase;margin:2px 0 5px">${isCap ? '★ Capital' : '● City'}</div>
          <div style="font-size:11px;color:#555">${city.desc.substring(0,90)}…</div>
          <div style="font-size:11px;margin-top:5px"><b>Pop:</b> ${city.pop} · <b>Elev:</b> ${city.elev}</div>
        </div>
      `, { maxWidth:220 });
      cityGroup.addLayer(m);

      const lbl = L.marker([city.lat, city.lng], {
        icon: L.divIcon({
          html: `<div style="font-size:${isCap?11:9.5}px;font-weight:${isCap?700:600};color:${isCap?'#1a1a1a':'#333'};white-space:nowrap;text-shadow:0 1px 2px rgba(255,255,255,1);padding-left:4px;">${city.name}</div>`,
          className:'', iconSize:[110,18], iconAnchor:[-4,5],
        }),
        interactive: false, zIndexOffset: -100,
      });
      labelGroup.addLayer(lbl);
    });

    groupsRef.current.cities = cityGroup;
    groupsRef.current.labels = labelGroup;

    // ── Landmarks ──
    const landmarkGroup = L.layerGroup().addTo(map);

    LANDMARKS.forEach(lm => {
      const m = L.marker([lm.lat, lm.lng], { icon: pinIcon(lm.col, lm.emoji) });
      m.bindPopup(`
        <div style="font-family:system-ui,sans-serif;min-width:160px">
          <div style="font-weight:700;font-size:13px">${lm.emoji} ${lm.name}</div>
          <div style="font-size:10px;font-weight:600;color:${lm.col};text-transform:uppercase;margin:2px 0 5px">${TYPE_LABEL[lm.type]} · ${lm.district}</div>
          <div style="font-size:11px;color:#555">${lm.desc.substring(0,95)}…</div>
          ${lm.status ? `<div style="font-size:10px;margin-top:4px;color:#888">${lm.status}</div>` : ''}
        </div>
      `, { maxWidth:230 });
      landmarkGroup.addLayer(m);
    });

    groupsRef.current.landmarks = landmarkGroup;

    return () => {
      map.remove();
      mapRef.current = null;
      groupsRef.current = {};
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  const LAYER_CONFIG = [
    { key:'state',     label:'State Boundary', color:'#1a73e8',  count: null },
    { key:'districts', label:'Districts',       color:'#3abfa0',  count: districtCount },
    { key:'cities',    label:'Major Cities',    color:'#e8710a',  count: 12 },
    { key:'landmarks', label:'Landmarks',       color:'#e05555',  count: 14 },
    { key:'labels',    label:'City Labels',     color:'#6b7280',  count: null },
  ];

  return (
    <div style={{ position:'relative', borderRadius:10, overflow:'hidden', border:'1px solid var(--bdr)', background:'#f0f4f8', height: 520 }}>
      {/* Leaflet map container */}
      <div ref={containerRef} style={{ position:'absolute', inset:0 }} />

      {/* Layer panel — top-right, matches screenshot */}
      <div style={{
        position:'absolute', right:14, top:14, zIndex:500,
        background:'rgba(255,255,255,0.97)',
        border:'1px solid rgba(0,0,0,0.1)',
        borderRadius:10,
        boxShadow:'0 4px 20px rgba(0,0,0,0.15)',
        minWidth:200,
        overflow:'hidden',
      }}>
        <div style={{
          padding:'8px 12px 7px',
          borderBottom:'1px solid rgba(0,0,0,0.08)',
          fontSize:10,
          fontWeight:700,
          letterSpacing:'0.1em',
          textTransform:'uppercase',
          color:'var(--txt3)',
          fontFamily:'var(--fb)',
        }}>
          Map Layers
        </div>
        {LAYER_CONFIG.map(({ key, label, color, count }) => (
          <div
            key={key}
            onClick={() => toggleLayer(key)}
            style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'7px 12px',
              borderBottom:'1px solid rgba(0,0,0,0.05)',
              cursor:'pointer',
              userSelect:'none',
              fontSize:12,
              fontFamily:'var(--fb)',
            }}
          >
            <div style={{ width:9, height:9, borderRadius:'50%', background:color, flexShrink:0 }} />
            <span style={{ flex:1, color:'var(--txt)', fontWeight:500 }}>{label}</span>
            {count != null && (
              <span style={{ fontSize:10, color:'var(--txt3)', background:'rgba(0,0,0,0.05)', borderRadius:999, padding:'1px 6px' }}>{count}</span>
            )}
            {/* Toggle switch */}
            <div style={{
              width:30, height:16, borderRadius:999,
              background: layerOn[key] ? '#1a73e8' : 'rgba(0,0,0,0.15)',
              position:'relative', flexShrink:0,
              transition:'background 0.2s',
            }}>
              <div style={{
                position:'absolute', top:2,
                left: layerOn[key] ? 14 : 2,
                width:12, height:12, borderRadius:'50%',
                background:'#fff',
                boxShadow:'0 1px 3px rgba(0,0,0,0.3)',
                transition:'left 0.18s',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
