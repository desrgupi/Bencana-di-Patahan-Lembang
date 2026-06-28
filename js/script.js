// Inisialisasi peta 
const map = L.map('map').setView([-6.805533, 107.616856], 12); 

// =========================================================================
// CUSTOM PANES (PENGATURAN STRUKTUR URUTAN VERTIKAL LAYER)
// =========================================================================
// Membuat panggung khusus untuk poligon agar berada di paling bawah
map.createPane('poligonPane');
map.getPane('poligonPane').style.zIndex = 400;

// Membuat panggung khusus untuk label nama kecamatan (Di atas jalan, di bawah marker)
map.createPane('labelPane');
map.getPane('labelPane').style.zIndex = 500; // Berada di antara jalan (450) dan marker (600)

// Membuat panggung khusus untuk jalan agar berada di atas poligon, tapi di bawah titik marker
map.createPane('jalurPane');
map.getPane('jalurPane').style.zIndex = 450;

// *Catatan: Marker bawaan Leaflet otomatis berada di zIndex 600 (paling atas)


// =========================================================================
// DEFINISI IKON KUSTOM UNTUK TEMPAT EVAKUASI / SHELTER (5 JENIS BANGUNAN)
// =========================================================================
const ikonSekolah = L.icon({
    iconUrl: 'assets/sekolah.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30]
});

const ikonFaskes = L.icon({
    iconUrl: 'assets/faskes.png', // RS, Puskesmas, Klinik
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30]
});

const ikonIbadah = L.icon({
    iconUrl: 'assets/ibadah.png', // Masjid, Gereja, Pura, dll
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30]
});

const ikonLapangan = L.icon({
    iconUrl: 'assets/lapangan.png', // Lapang terbuka, alun-alun
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30]
});

const ikonPemerintah = L.icon({
    iconUrl: 'assets/kantor.png', // Kantor Desa, Kecamatan, dsb
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30]
});

const ikonDefaultShelter = L.icon({
    iconUrl: 'assets/icons/default-pin.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30]
});


// =========================================================================
// DATA BASEMAP
// =========================================================================
// Basemap OSM 
const basemapOSM = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { 
    maxZoom: 19, 
    attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>' 
}); 

// Basemap Google Maps 
const baseMapGoogle = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { 
    maxZoom: 20, 
    attribution: 'Map by <a href="https://maps.google.com/">Google</a>', 
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] 
}); 

// Basemap Google Satellite 
const baseMapSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { 
    maxZoom: 20, 
    attribution: 'Satellite by <a href="https://maps.google.com/">Google</a>', 
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] 
}); 

// Tambahkan salah satu basemap secara default 
basemapOSM.addTo(map); 

// Daftar semua pilihan basemap 
const baseMaps = { 
    "OpenStreetMap": basemapOSM, 
    "Google Maps": baseMapGoogle, 
    "Google Satellite": baseMapSatellite 
};


// =========================================================================
// KONTROL FITUR TAMBAHAN (HOME, MY LOCATION, FULLSCREEN)
// =========================================================================
// Koordinat home 
const home = { 
    lat: -6.802921427230038, 
    lng: 107.58011552638172, 
    zoom: 12 
}; 
 
// Tombol home custom 
const homeControl = L.Control.extend({ 
    options: { position: 'topleft' }, 
    onAdd: function (map) { 
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet control leaflet-control-custom'); 
        container.innerHTML = '<span style="font-size: 20px; margin: 2px;">🏠</span>'; 
        container.style.backgroundColor = 'white'; 
        container.style.cursor = 'pointer'; 
        container.style.alignItems = 'center'; 
        container.style.justifyContent = 'center'; 
        container.style.width = '30px';   
        container.style.height = '30px';  
        container.title = 'Kembali ke Home'; 
        container.onclick = function () { 
            map.setView([home.lat, home.lng], home.zoom); 
        }; 
        return container; 
    } 
}); 
map.addControl(new homeControl()); 
     
// Fitur "My Location" 
L.control.locate({ 
    position: 'topleft', 
    flyTo: true, 
    strings: { title: "Temukan lokasiku" }, 
    locateOptions: { enableHighAccuracy: true } 
}).addTo(map); 
 
// Fitur "Full Screen"
L.control.fullscreen({
    position: 'topleft',
    flyTo: true,
    strings: { title: "Layar Penuh" },
    forceSeparateButton: true
}).addTo(map); 


// =========================================================================
// 1. DEKLARASI GRUP UTAMA (KOLEKTIF) PER JENIS BENCANA
// =========================================================================
const Grup_Gempa_Bumi = new L.LayerGroup();
const Grup_Longsor = new L.LayerGroup();
const Batas_Admin_Group = new L.LayerGroup();
const Sesar_Lembang = new L.LayerGroup(); 


// FUNGSI LOGIKA WARNA JALUR EVAKUASI (Skala Viridis)
function dapatkanWarnaJalur(teks) {
    let t = teks || "";
    
    if (t.includes('<')) return "#E41A1C"; // Kelas 1 (< 130)
    if (t.includes('>')) return "#984EA3"; // Kelas 5 (> 500)
    
    let angka = t.match(/\d+/g);
    if (angka && angka.length > 0) {
        let nilai = parseInt(angka[0]);
        
        if (nilai <= 135) return "#FF7F00";             // Kelas 2
        if (nilai > 135 && nilai <= 255) return "#4DAF4A"; // Kelas 3
        if (nilai > 255 && nilai <= 500) return "#377EB8"; // Kelas 4
    }
    
    return "#3B528C"; 
}

 // === Bagian 4: Jalur Evakuasi ===
    '<p style="font-size: 13px; font-weight: bold; margin-bottom: 5px; margin-top: 15px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">Jalur Evakuasi (Estimasi)</p>' +
    '<hr style="border: none; border-top: 4px solid #E41A1C; width: 20px; display: inline-block; margin-right: 8px; margin-bottom: 4px; vertical-align: middle;">&lt; 130 menit<br>' +
    '<hr style="border: none; border-top: 4px solid #FF7F00; width: 20px; display: inline-block; margin-right: 8px; margin-bottom: 4px; vertical-align: middle;">130 - 250 menit<br>' +
    '<hr style="border: none; border-top: 4px solid #4DAF4A; width: 20px; display: inline-block; margin-right: 8px; margin-bottom: 4px; vertical-align: middle;">250 - 375 menit<br>' +
    '<hr style="border: none; border-top: 4px solid #377EB8; width: 20px; display: inline-block; margin-right: 8px; margin-bottom: 4px; vertical-align: middle;">375 - 500 menit<br>' +
    '<hr style="border: none; border-top: 4px solid #984EA3; width: 20px; display: inline-block; margin-right: 8px; margin-bottom: 4px; vertical-align: middle;">&gt; 500 menit<br>'+


// =========================================================================
// 2. PROSES KOLEKTIF DATA: MITIGASI GEMPA BUMI
// =========================================================================

// A. Poligon Tingkat Bahaya Gempa Bumi (Ditempatkan di poligonPane)
$.getJSON("assets/data-spasial/Gempa_Bumi.geojson", function (Bahaya) {
    L.geoJson(Bahaya, {
        style: function(feature) {
            let colorMap = {
                'Sangat Rendah': "#5db45a",
                'Rendah': "#98d3a7",
                'Sedang': "#f1cd8b",
                'Tinggi': "#eb6868",
                'Sangat Tinggi': "#c64c4c"
            };
            let warna = colorMap[feature.properties.Bahaya] || "#ffffff";
            return { 
                fillColor: warna, 
                fillOpacity: 1, 
                weight: 1, 
                color: warna,
                pane: 'poligonPane' 
            };
        },
        onEachFeature: function (feature, layer) {
            layer.bindPopup('<b>Tingkat Bahaya Gempa:</b> ' + feature.properties.Bahaya);
        }
    }).addTo(Grup_Gempa_Bumi);
});

// B. Titik Bahaya Gempa Bumi (Tanda Silang Hitam ArcGIS)
$.getJSON("assets/data-spasial/Titik_Bahaya_GempaBumi.geojson", function (Kode) {
    L.geoJson(Kode, {
        pointToLayer: function(feature, latlng) {
            const crossIcon = L.divIcon({
                className: 'custom-cross-icon',
                html: '<span style="font-size: 24px; font-weight: bold; color: black; line-height: 1;">×</span>', 
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            return L.marker(latlng, { icon: crossIcon }); 
        },
        onEachFeature: function(feature, layer) {
            layer.bindPopup("<b>Kode Titik Bahaya Gempa:</b> " + feature.properties.Kode);
        }
    }).addTo(Grup_Gempa_Bumi);
});

// C. Titik Shelter Gempa Bumi (IKON BERUBAH SEBARAN 5 JENIS BANGUNAN + POPUP DETAIL)
$.getJSON("assets/data-spasial/Shelter_GempaBumi.geojson", function (DataShelter) {
    L.geoJson(DataShelter, {
        pointToLayer: function(feature, latlng) {
            let jenis = feature.properties.titik_aman_Gempa || feature.properties.REMARK || feature.properties.Kategori || "";
            let jenisLower = jenis.toLowerCase();
            
            if (jenisLower.includes('sekolah') || jenisLower.includes('sd') || jenisLower.includes('smp') || jenisLower.includes('sma') || jenisLower.includes('smk')) {
                return L.marker(latlng, { icon: ikonSekolah });
            } else if (jenisLower.includes('rumah sakit') || jenisLower.includes('rs') || jenisLower.includes('puskesmas') || jenisLower.includes('klinik') || jenisLower.includes('faskes')) {
                return L.marker(latlng, { icon: ikonFaskes });
            } else if (jenisLower.includes('masjid') || jenisLower.includes('ibadah') || jenisLower.includes('gereja') || jenisLower.includes('vihara')) {
                return L.marker(latlng, { icon: ikonIbadah });
            } else if (jenisLower.includes('lapang') || jenisLower.includes('lapangan') || jenisLower.includes('terbuka') || jenisLower.includes('alun')) {
                return L.marker(latlng, { icon: ikonLapangan });
            } else if (jenisLower.includes('kantor') || jenisLower.includes('pemerintah') || jenisLower.includes('desa') || jenisLower.includes('kecamatan')) {
                return L.marker(latlng, { icon: ikonPemerintah });
            } else {
                return L.marker(latlng, { icon: ikonDefaultShelter });
            }
        },
        onEachFeature: function(feature, layer) {
            let namaBangunan = feature.properties.Nama || feature.properties.NAMOBJ || feature.properties.Nama_Objek || "Tempat Evakuasi Akhir";
            let jenisBangunan = feature.properties.titik_aman_Gempa || "Fasilitas Umum";
            let kodeShelter = feature.properties.Kode || "-";

            // 1. Ekstrak koordinat secara aman dari layer Leaflet
            let koordinat = layer.getLatLng();
            let lat = koordinat.lat;
            let lng = koordinat.lng;

            // 2. Susun URL pencarian Google Maps berbasis koordinat
            let googleMapsUrl = "https://www.google.com/maps/search/?api=1&query=" + lat + "," + lng;

            // 3. Bind Popup dengan tombol penunjuk arah
            layer.bindPopup(`
                <div style="font-family: 'Montserrat', sans-serif; min-width: 200px;">
                    <h4 style="margin: 0 0 4px 0; color: #678d99; font-size: 14px;">${namaBangunan}</h4>
                    <span style="background-color: #d62828; color: white; padding: 2px 6px; font-size: 10px; font-weight: bold; border-radius: 3px; display: inline-block; margin-bottom: 8px;">Shelter Gempa</span>
                    <p style="margin: 0; font-size: 12px; color: #555;"><b>Jenis Bangunan:</b> ${jenisBangunan}</p>
                    <p style="margin: 3px 0 10px 0; font-size: 11px; color: #888;"><b>Kode Titik:</b> ${kodeShelter}</p>
                    
                    <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; background-color: #e76f51; color: white; text-decoration: none; font-size: 11px; font-weight: bold; padding: 6px 10px; border-radius: 4px; margin-top: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
                        📍 Petunjuk Arah (Google Maps)
                    </a>
                </div>
            `);
        }
    }).addTo(Grup_Gempa_Bumi);
});

// D. Jalur Evakuasi Gempa Bumi (Ditempatkan di jalurPane)
$.getJSON("assets/data-spasial/Jalur_Evakuasi_GempaBumi.geojson", function (Estimasi) {
    L.geoJson(Estimasi, {
        style: function(feature) {
            return {
                color: dapatkanWarnaJalur(feature.properties.Estimasi),
                weight: 5, 
                opacity: 1.0, 
                lineCap: 'round',
                lineJoin: 'round',
                pane: 'jalurPane'
            };
        },
        onEachFeature: function (feature, layer) {
            layer.bindPopup('<b>Jalur Evakuasi Gempa</b><br>Estimasi Waktu: ' + (feature.properties.Estimasi || '-'));
        }
    }).addTo(Grup_Gempa_Bumi);
});


// =========================================================================
// 3. PROSES KOLEKTIF DATA: MITIGASI LONGSOR
// =========================================================================

// A. Poligon Tingkat Bahaya Longsor (Ditempatkan di poligonPane)
$.getJSON("assets/data-spasial/Longsor.geojson", function (Bahaya) {
    L.geoJson(Bahaya, {
        style: function(feature) {
            let colorMap = {
                'Sangat Rendah': "#5db45a",
                'Rendah': "#98d3a7",
                'Sedang': "#f1cd8b",
                'Tinggi': "#eb6868",
                'Sangat Tinggi': "#c64c4c"
            };
            let warna = colorMap[feature.properties.Bahaya] || "#ffffff";
            return { 
                fillColor: warna, 
                fillOpacity: 1, 
                weight: 1, 
                color: warna,
                pane: 'poligonPane' 
            };
        },
        onEachFeature: function (feature, layer) {
            layer.bindPopup('<b>Tingkat Bahaya Longsor:</b> ' + feature.properties.Bahaya);
        }
    }).addTo(Grup_Longsor);
});

// B. Titik Bahaya Longsor (Tanda Silang Hitam ArcGIS)
$.getJSON("assets/data-spasial/Titik_Bahaya_Longsor.geojson", function (Kode) {
    L.geoJson(Kode, {
        pointToLayer: function(feature, latlng) {
            const crossIcon = L.divIcon({
                className: 'custom-cross-icon',
                html: '<span style="font-size: 24px; font-weight: bold; color: black; line-height: 1;">×</span>', 
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            return L.marker(latlng, { icon: crossIcon });
        },
        onEachFeature: function(feature, layer) {
            layer.bindPopup("<b>Kode Titik Bahaya Longsor:</b> " + feature.properties.Kode);
        }
    }).addTo(Grup_Longsor);
});

// C. Titik Shelter Longsor (IKON BERUBAH SEBARAN 5 JENIS BANGUNAN + POPUP DETAIL)
$.getJSON("assets/data-spasial/Titik_Shelter_Longsor.geojson", function (DataShelter) {
    L.geoJson(DataShelter, {
        pointToLayer: function(feature, latlng) {
            let jenis = feature.properties.Titik_Shelter_Longsor || feature.properties.REMARK || feature.properties.Kategori || "";
            let jenisLower = jenis.toLowerCase();
            
            if (jenisLower.includes('sekolah') || jenisLower.includes('sd') || jenisLower.includes('smp') || jenisLower.includes('sma') || jenisLower.includes('smk')) {
                return L.marker(latlng, { icon: ikonSekolah });
            } else if (jenisLower.includes('rumah sakit') || jenisLower.includes('rs') || jenisLower.includes('puskesmas') || jenisLower.includes('klinik') || jenisLower.includes('faskes')) {
                return L.marker(latlng, { icon: ikonFaskes });
            } else if (jenisLower.includes('masjid') || jenisLower.includes('ibadah') || jenisLower.includes('gereja') || jenisLower.includes('vihara')) {
                return L.marker(latlng, { icon: ikonIbadah });
            } else if (jenisLower.includes('lapang') || jenisLower.includes('lapangan') || jenisLower.includes('terbuka') || jenisLower.includes('alun')) {
                return L.marker(latlng, { icon: ikonLapangan });
            } else if (jenisLower.includes('kantor') || jenisLower.includes('pemerintah') || jenisLower.includes('desa') || jenisLower.includes('kecamatan')) {
                return L.marker(latlng, { icon: ikonPemerintah });
            } else {
                return L.marker(latlng, { icon: ikonDefaultShelter });
            }
        },
onEachFeature: function(feature, layer) {
            let namaBangunan = feature.properties.Nama || feature.properties.NAMOBJ || feature.properties.Nama_Objek || "Tempat Evakuasi Akhir";
            let jenisBangunan = feature.properties.Titik_Shelter_Longsor || "Fasilitas Umum";
            let kodeShelter = feature.properties.Kode || "-";

            // 1. Ambil koordinat Lat dan Lng dengan aman
            let koordinat = layer.getLatLng();
            let lat = koordinat.lat;
            let lng = koordinat.lng;

            // 2. Format URL Google Maps resmi tanpa ada karakter tambahan yang mengganggu
            let googleMapsUrl = "https://www.google.com/maps/search/?api=1&query=" + lat + "," + lng;

            // 3. Masukkan ke dalam popup
            layer.bindPopup(`
                <div style="font-family: 'Montserrat', sans-serif; min-width: 200px;">
                    <h4 style="margin: 0 0 4px 0; color: #678d99; font-size: 14px;">${namaBangunan}</h4>
                    <span style="background-color: #2a9d8f; color: white; padding: 2px 6px; font-size: 10px; font-weight: bold; border-radius: 3px; display: inline-block; margin-bottom: 8px;">Shelter Longsor</span>
                    <p style="margin: 0; font-size: 12px; color: #555;"><b>Jenis Bangunan:</b> ${jenisBangunan}</p>
                    <p style="margin: 3px 0 10px 0; font-size: 11px; color: #888;"><b>Kode Titik:</b> ${kodeShelter}</p>
                    
                    <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; background-color: #e76f51; color: white; text-decoration: none; font-size: 11px; font-weight: bold; padding: 6px 10px; border-radius: 4px; margin-top: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
                        📍 Petunjuk Arah (Google Maps)
                    </a>
                </div>
            `);
        }
    }).addTo(Grup_Longsor);
});

// D. Jalur Evakuasi Longsor (Ditempatkan di jalurPane)
$.getJSON("assets/data-spasial/Jalur_Evakuasi_Longsor.geojson", function (Estimasi) {
    L.geoJson(Estimasi, {
        style: function(feature) {
            return {
                color: dapatkanWarnaJalur(feature.properties.Estimasi),
                weight: 5, 
                opacity: 1.0, 
                lineCap: 'round',
                lineJoin: 'round',
                pane: 'jalurPane' 
            };
        },
        onEachFeature: function (feature, layer) {
            layer.bindPopup('<b>Jalur Evakuasi Longsor</b><br>Estimasi Waktu: ' + (feature.properties.Estimasi || '-'));
        }
    }).addTo(Grup_Longsor);
});


// =========================================================================
// DATA PERBUNGKUS LAIN: BATAS WILAYAH & STRUKTUR GEOLOGI
// =========================================================================

// Load data poligon Batas Administrasi (Di labelPane dengan Nama Kolom "NAMOBJ")
$.getJSON("assets/data-spasial/Area_Kecamatan.geojson", function (AdminData) {
    L.geoJson(AdminData, {
        style: function(feature) {
            return {
                fillColor: "#none",       
                fillOpacity: 0,
                color: "#000000",         
                weight: 2,                
                dashArray: "6, 6",        
                pane: 'labelPane'         
            };
        },
        onEachFeature: function (feature, layer) {
            let properti = feature.properties;
            let namaKecamatan = properti["NAMOBJ"] || "Kecamatan"; 
            
            layer.bindTooltip(namaKecamatan, {
                permanent: true,          
                direction: 'center',       
                className: 'label-kecamatan', 
                pane: 'labelPane'         
            }).openTooltip();
            
            layer.bindPopup('<b>Wilayah Administrasi:</b> ' + namaKecamatan);
        }
    }).addTo(Batas_Admin_Group); 
});

// Load data garis Sesar Lembang (Putus-putus Hitam Tebal di Lapisan Teratas markerPane)
$.getJSON("assets/data-spasial/Sesar_Lembang.geojson", function (SesarData) {
    L.geoJson(SesarData, {
        style: function(feature) {
            return {
                color: "#523718",         
                weight: 5,                
                opacity: 0.9,             
                dashArray: "10, 15",      
                lineCap: 'round',         
                pane: 'markerPane'        
            };
        },
        onEachFeature: function (feature, layer) {
            let namaSesar = feature.properties["Nama Objek"] || feature.properties["Nama"] || "Jalur Patahan Lembang";
            layer.bindPopup('<b>Struktur Geologi:</b> ' + namaSesar + '<br><span style="color:red; font-weight:bold;">Zona Bahaya Patahan Aktif</span>');
        }
    }).addTo(Sesar_Lembang); 
});


// =========================================================================
// 4. MANAJEMEN TAMPILAN DEFAULT & LAYER CONTROL (MENU LAYERS)
// =========================================================================
Batas_Admin_Group.addTo(map);
Sesar_Lembang.addTo(map);

const Component = { 
    "Mitigasi Gempa Bumi": Grup_Gempa_Bumi, 
    "Mitigasi Longsor": Grup_Longsor,
    "Batas Administrasi": Batas_Admin_Group,
    "Patahan Lembang": Sesar_Lembang
}; 

L.control.layers(baseMaps, Component).addTo(map);


// =========================================================================
// 5. LEGENDA INTEGRASI TOTAL
// =========================================================================
let legend = L.control({ position: "topright" });

legend.onAdd = function () { 
    let div = L.DomUtil.create("div", "legend"); 
    div.innerHTML = 
    // === Bagian 1: Judul Utama ===
    '<p style="font-size: 18px; font-weight: bold; margin-bottom: 8px; margin-top: 5px;">Legenda Peta</p>' + 
    
    // === Bagian 2: Batas Administrasi ===
    '<p style="font-size: 13px; font-weight: bold; margin-bottom: 5px; margin-top: 10px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">Wilayah Administrasi</p>' +
    '<div style="border: 2px dashed #000000; background-color: transparent; height: 12px; width: 20px; display: inline-block; margin-right: 8px; vertical-align: middle;"></div> Batas Kecamatan<br>' +

    // === SEKARANG DI SINI: Titik Evakuasi / Shelter ===
    '<p style="font-size: 13px; font-weight: bold; margin-bottom: 5px; margin-top: 15px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">Titik Evakuasi (Shelter)</p>' +
    '<img src="assets/sekolah.png" style="height: 16px; width: 16px; margin-right: 12px; vertical-align: middle;">Fasilitas Pendidikan<br>' +
    '<img src="assets/faskes.png" style="height: 16px; width: 16px; margin-right: 12px; vertical-align: middle;">Fasilitas Kesehatan<br>' +
    '<img src="assets/ibadah.png" style="height: 16px; width: 16px; margin-right: 12px; vertical-align: middle;">Tempat Peribadatan<br>' +
    '<img src="assets/lapangan.png" style="height: 16px; width: 16px; margin-right: 12px; vertical-align: middle;">Lapangan / Ruang Terbuka<br>' +
    '<img src="assets/kantor.png" style="height: 16px; width: 16px; margin-right: 12px; vertical-align: middle;">Kantor Pemerintahan<br>' +

    // === SEKARANG DI SINI: Titik Bahaya ===
    '<p style="font-size: 13px; font-weight: bold; margin-bottom: 5px; margin-top: 15px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">Titik Bahaya</p>' +
    '<img src="assets/Titik-Bahaya.png" style="height: 16px; width: 16px; margin-right: 12px; vertical-align: middle;">Titik Bahaya<br>' +

    // === Bagian 3: Struktur Geologi ===
    '<p style="font-size: 13px; font-weight: bold; margin-bottom: 5px; margin-top: 15px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">Struktur Geologi</p>' +
    '<span style="letter-spacing: -2px; font-weight: bold; color: #523718; font-size: 16px; margin-right: 8px; vertical-align: middle;">- - - -</span> Jalur Patahan Lembang<br>' +

    // === Bagian 4: Jalur Evakuasi ===
    '<p style="font-size: 13px; font-weight: bold; margin-bottom: 5px; margin-top: 15px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">Jalur Evakuasi (Estimasi)</p>' +
    '<hr style="border: none; border-top: 4px solid #E41A1C; width: 20px; display: inline-block; margin-right: 8px; margin-bottom: 4px; vertical-align: middle;">&lt; 130 menit<br>' +
    '<hr style="border: none; border-top: 4px solid #FF7F00; width: 20px; display: inline-block; margin-right: 8px; margin-bottom: 4px; vertical-align: middle;">130 - 250 menit<br>' +
    '<hr style="border: none; border-top: 4px solid #4DAF4A; width: 20px; display: inline-block; margin-right: 8px; margin-bottom: 4px; vertical-align: middle;">250 - 375 menit<br>' +
    '<hr style="border: none; border-top: 4px solid #377EB8; width: 20px; display: inline-block; margin-right: 8px; margin-bottom: 4px; vertical-align: middle;">375 - 500 menit<br>' +
    '<hr style="border: none; border-top: 4px solid #984EA3; width: 20px; display: inline-block; margin-right: 8px; margin-bottom: 4px; vertical-align: middle;">&gt; 500 menit<br>'+

    // === Bagian 5: Poligon Tingkat Bahaya ===
    '<p style="font-size: 13px; font-weight: bold; margin-bottom: 5px; margin-top: 15px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">Tingkat Bahaya</p>' +
    '<div style="background-color: #5db45a; height: 12px; width: 20px; display: inline-block; margin-right: 8px; vertical-align: middle; border: 1px solid #444;"></div>Sangat Rendah<br>' +
    '<div style="background-color: #98d3a7; height: 12px; width: 20px; display: inline-block; margin-right: 8px; vertical-align: middle; border: 1px solid #444;"></div>Rendah<br>' +
    '<div style="background-color: #f1cd8b; height: 12px; width: 20px; display: inline-block; margin-right: 8px; vertical-align: middle; border: 1px solid #444;"></div>Sedang<br>' +
    '<div style="background-color: #eb6868; height: 12px; width: 20px; display: inline-block; margin-right: 8px; vertical-align: middle; border: 1px solid #444;"></div>Tinggi<br>' +
    '<div style="background-color: #c64c4c; height: 12px; width: 20px; display: inline-block; margin-right: 8px; vertical-align: middle; border: 1px solid #444;"></div>Sangat Tinggi<br>';
    
    return div; 
};
legend.addTo(map);

// Tambahkan kode ini setelah perintah legend.addTo(map);
let legendElement = document.querySelector('.legend');

// Cegah peta ikut bergeser/zooming saat boks legenda di-scroll atau disentuh
L.DomEvent.disableScrollPropagation(legendElement);
L.DomEvent.disableClickPropagation(legendElement);

// Fungsi perantara untuk memilih jenis panduan bencana
function pilihPanduan(jenis) {
    // 1. Tutup pop-up menu pilihan terlebih dahulu
    closePopup('popup-pilihan');
    
    // 2. Alihkan ke pop-up teks materi yang sesuai
    if (jenis === 'longsor') {
        openPopup('popup3'); // Membuka pop-up panduan longsor yang kita rapikan tadi
    } else if (jenis === 'gempa') {
        openPopup('popupGempa'); // Ganti 'popupGempa' dengan ID pop-up teks gempa milikmu jika ada
    }
}