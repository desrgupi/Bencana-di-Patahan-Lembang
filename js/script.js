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
const Sesar_Lembang = new L.LayerGroup(); // <-- TAMBAHKAN BARIS INI


// PERBAIKAN LOGIKA WARNA: Menggunakan sistem rentang angka toleransi agar tidak hitam
function dapatkanWarnaJalur(teks) {
    let t = teks || "";
    
    if (t.includes('<')) return "#FEE825"; // Kelas 1 (< 130)
    if (t.includes('>')) return "#440154"; // Kelas 5 (> 500)
    
    let angka = t.match(/\d+/g);
    if (angka && angka.length > 0) {
        let nilai = parseInt(angka[0]);
        
        if (nilai <= 135) return "#5DC963";             // Kelas 2 (Rentang batas bawah ~130)
        if (nilai > 135 && nilai <= 255) return "#21918D"; // Kelas 3 (Rentang batas bawah ~250)
        if (nilai > 255 && nilai <= 500) return "#3B528C"; // Kelas 4 (Rentang batas bawah ~375)
    }
    
    return "#3B528C"; // Jika data string null/kosong, otomatis gunakan rumpun warna Viridis Kelas 4 (Mencegah Hitam)
}

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
                fillOpacity: 1, // Diubah menjadi 0.6 agar transparan dan jalan di bawahnya tembus pandang
                weight: 0.5, 
                color: warna,
                pane: 'poligonPane' 
            };
        },
        onEachFeature: function (feature, layer) {
            layer.bindPopup('<b>Tingkat Bahaya Gempa:</b> ' + feature.properties.Bahaya);
        }
    }).addTo(Grup_Gempa_Bumi);
});

// B. Titik Bahaya Gempa Bumi (Tanda Silang Hitam ArcGIS - Lapisan Teratas)
$.getJSON("assets/data-spasial/Titik_Bahaya_GempaBumi.geojson", function (Kode) {
    L.geoJson(Kode, {
        pointToLayer: function(feature, latlng) {
            const crossIcon = L.divIcon({
                className: 'custom-cross-icon',
                html: '<span style="font-size: 24px; font-weight: bold; color: black; line-height: 1;">×</span>', 
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            return L.marker(latlng, { icon: crossIcon }); // Otomatis berada di markerPane bawaan
        },
        onEachFeature: function(feature, layer) {
            layer.bindPopup("<b>Kode Titik Bahaya Gempa:</b> " + feature.properties.Kode);
        }
    }).addTo(Grup_Gempa_Bumi);
});

// C. Titik Shelter Gempa Bumi (Tanda Plus Merah PMI Berlatar Putih - Lapisan Teratas)
$.getJSON("assets/data-spasial/Titik_Shelter_GempaBumi.geojson", function (Kode) {
    L.geoJson(Kode, {
        pointToLayer: function(feature, latlng) {
            const pmiIcon = L.divIcon({
                className: 'custom-pmi-icon',
                html: '<span style="font-size: 28px; font-weight: bold; color: #d62828; background-color: #ffffff; border: 2px solid #d62828; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; line-height: 1; border-radius: 4px;">+</span>', 
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            return L.marker(latlng, { icon: pmiIcon });
        },
        onEachFeature: function(feature, layer) {
            layer.bindPopup("<b>Kode Shelter Gempa:</b> " + feature.properties.Kode);
        }
    }).addTo(Grup_Gempa_Bumi);
});

// D. Jalur Evakuasi Gempa Bumi (Ditempatkan di jalurPane - Lapisan Tengah)
$.getJSON("assets/data-spasial/Jalur_Evakuasi_GempaBumi.geojson", function (Estimasi) {
    L.geoJson(Estimasi, {
        style: function(feature) {
            return {
                color: dapatkanWarnaJalur(feature.properties.Estimasi),
                weight: 5, // Tebal garis ditingkatkan sedikit agar makin terlihat kontras
                opacity: 1.0, // Dibuat solid penuh agar tidak kalah dengan warna dasar poligon
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

// A. Poligon Tingkat Bahaya Longsor (Ditempatkan di poligonPane - Lapisan Bawah)
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
                fillOpacity: 1, // Diubah menjadi 0.6 agar transparan
                weight: 0.5, 
                color: warna,
                pane: 'poligonPane' 
            };
        },
        onEachFeature: function (feature, layer) {
            layer.bindPopup('<b>Tingkat Bahaya Longsor:</b> ' + feature.properties.Bahaya);
        }
    }).addTo(Grup_Longsor);
});

// B. Titik Bahaya Longsor (Tanda Silang Hitam ArcGIS - Lapisan Teratas)
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

// C. Titik Shelter Longsor (Tanda Plus Merah PMI Berlatar Putih - Lapisan Teratas)
$.getJSON("assets/data-spasial/Titik_Shelter_Longsor.geojson", function (Kode) {
    L.geoJson(Kode, {
        pointToLayer: function(feature, latlng) {
            const pmiIcon = L.divIcon({
                className: 'custom-pmi-icon',
                html: '<span style="font-size: 28px; font-weight: bold; color: #d62828; background-color: #ffffff; border: 2px solid #d62828; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; line-height: 1; border-radius: 4px;">+</span>', 
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            return L.marker(latlng, { icon: pmiIcon });
        },
        onEachFeature: function(feature, layer) {
            layer.bindPopup("<b>Kode Shelter Longsor:</b> " + feature.properties.Kode);
        }
    }).addTo(Grup_Longsor);
});

// PERBAIKAN URUTAN LAYER: Jalur Evakuasi Longsor dipindahkan ke 'jalurPane' (Di bawah titik, di atas poligon)
$.getJSON("assets/data-spasial/Jalur_Evakuasi_Longsor.geojson", function (Estimasi) {
    L.geoJson(Estimasi, {
        style: function(feature) {
            return {
                color: dapatkanWarnaJalur(feature.properties.Estimasi),
                weight: 5, 
                opacity: 1.0, 
                lineCap: 'round',
                lineJoin: 'round',
                pane: 'jalurPane' // Mengunci posisi jalan tepat berada di atas poligon bahaya
            };
        },
        onEachFeature: function (feature, layer) {
            layer.bindPopup('<b>Jalur Evakuasi Longsor</b><br>Estimasi Waktu: ' + (feature.properties.Estimasi || '-'));
        }
    }).addTo(Grup_Longsor);
});


// Load data poligon Batas Administrasi
$.getJSON("assets/data-spasial/Area_Kecamatan.geojson", function (AdminData) {
    L.geoJson(AdminData, {
        style: function(feature) {
            return {
                fillColor: "#none",       // Gunakan "#none" atau transparan agar peta bencana di bawahnya tetap terlihat
                fillOpacity: 0,
                color: "#000000",         // Mengganti warna garis batas menjadi agak kontras (misal: Oranye/Cokelat) agar terlihat jelas di paling atas
                weight: 2,                // Sedikit ditebalkan agar garis batasnya tegas memotong seluruh layer di bawahnya
                dashArray: "6, 6",        // Garis putus-putus estetik
                pane: 'labelPane'         // PENTING: Dipindahkan ke 'labelPane' (zIndex 500) agar garis poligon naik ke lapisan paling atas melompati jalan dan poligon bencana
            };
        },
        onEachFeature: function (feature, layer) {
            // PINTAR: Memeriksa segala kemungkinan variasi penulisan field Nama Objek agar tidak memicu kata cadangan "Kecamatan"
            let properti = feature.properties;
            let namaKecamatan = properti["NAMOBJ"] || 
                                // mengantisipasi jika ada spasi tak sengaja di akhir field
                                "Kecamatan"; // Jika semua variasi di atas tetap tidak ketemu, baru gunakan fallback ini
            
            // Menempelkan teks nama kecamatan secara permanen
            layer.bindTooltip(namaKecamatan, {
                permanent: true,          
                direction: 'center',       
                className: 'label-kecamatan', 
                pane: 'labelPane'         // Teks otomatis ikut berada di lapisan teratas bersama garisnya
            }).openTooltip();
            
            // Pop-up saat batas wilayah diklik
            layer.bindPopup('<b>Wilayah Administrasi:</b> ' + namaKecamatan);
        }
    }).addTo(Batas_Admin_Group); 
});

// Load data garis Sesar Lembang (Dipaksa berada di lapisan paling atas)
$.getJSON("assets/data-spasial/Sesar_Lembang.geojson", function (SesarData) {
    L.geoJson(SesarData, {
        style: function(feature) {
            return {
                color: "#000000",         // Warna merah tegas untuk patahan/sesar aktif
                weight: 5,                // Membuat garis menjadi tebal
                opacity: 0.9,             // Tingkat transparansi garis
                dashArray: "10, 15",      // Efek putus-putus tebal (10px garis tunggal, 15px jarak spasi)
                lineCap: 'round',         // Ujung garis membulat agar rapi
                pane: 'markerPane'        // PENTING: Menggunakan 'markerPane' (zIndex 600) agar berada di PALING ATAS objek manapun
            };
        },
        onEachFeature: function (feature, layer) {
            // Mengambil nama objek jika ada field penanda (misal: "Sesar Lembang")
            let namaSesar = feature.properties["Nama Objek"] || feature.properties["Nama"] || "Jalur Sesar Lembang";
            
            // Pop-up saat garis sesar diklik
            layer.bindPopup('<b>Struktur Geologi:</b> ' + namaSesar + '<br><span style="color:red; font-weight:bold;">Zona Bahaya Patahan Aktif</span>');
        }
    }).addTo(Sesar_Lembang); 
});

// =========================================================================
// 4. MANAJEMEN TAMPILAN DEFAULT & LAYER CONTROL
// =========================================================================
Batas_Admin_Group.addTo(map);
Sesar_Lembang.addTo(map);

const Component = { 
    "Mitigasi Gempa Bumi": Grup_Gempa_Bumi, 
    "Mitigasi Longsor": Grup_Longsor,
    "Batas Administrasi": Batas_Admin_Group,
    "Sesar Lembang": Sesar_Lembang
}; 

L.control.layers(baseMaps, Component).addTo(map);



// =========================================================================
// 5. LEGENDA (UPDATE: TAMBAH BATAS ADMINISTRASI KOTAK PUTUS-PUTUS TRANSPARAN)
// =========================================================================
let legend = L.control({ position: "topright" });

legend.onAdd = function () { 
    let div = L.DomUtil.create("div", "legend"); 
    div.innerHTML = 
    // === Bagian 1: Judul Utama ===
    '<p style="font-size: 18px; font-weight: bold; margin-bottom: 8px; margin-top: 5px;">Legenda Peta</p>' + 
    
    // === Bagian 2: Batas Administrasi (Kustom Kotak Transparan Tepi Hitam Putus-putus) ===
    '<p style="font-size: 13px; font-weight: bold; margin-bottom: 5px; margin-top: 10px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">Wilayah Administrasi</p>' +
    '<div style="border: 2px dashed #000000; background-color: transparent; height: 12px; width: 20px; display: inline-block; margin-right: 8px; vertical-align: middle;"></div> Batas Kecamatan<br>' +

    // === Bagian 4: Struktur Geologi / Kebencanaan ===
    '<p style="font-size: 13px; font-weight: bold; margin-bottom: 5px; margin-top: 15px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">Struktur Geologi</p>' +
    '<span style="letter-spacing: -2px; font-weight: bold; color: #000000; font-size: 16px; margin-right: 8px; vertical-align: middle;">- - - -</span> Jalur Sesar Lembang<br>' +

    // === Bagian 5: Garis Jalur Evakuasi ===
    '<p style="font-size: 13px; font-weight: bold; margin-bottom: 5px; margin-top: 15px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">Jalur Evakuasi (Estimasi)</p>' +
    '<hr style="border: none; border-top: 4px solid #FEE825; width: 20px; display: inline-block; margin-right: 8px; margin-bottom: 4px; vertical-align: middle;">&lt; 130 menit<br>' +
    '<hr style="border: none; border-top: 4px solid #5DC963; width: 20px; display: inline-block; margin-right: 8px; margin-bottom: 4px; vertical-align: middle;">130 - 250 menit<br>' +
    '<hr style="border: none; border-top: 4px solid #21918D; width: 20px; display: inline-block; margin-right: 8px; margin-bottom: 4px; vertical-align: middle;">250 - 375 menit<br>' +
    '<hr style="border: none; border-top: 4px solid #3B528C; width: 20px; display: inline-block; margin-right: 8px; margin-bottom: 4px; vertical-align: middle;">375 - 500 menit<br>' +
    '<hr style="border: none; border-top: 4px solid #440154; width: 20px; display: inline-block; margin-right: 8px; margin-bottom: 4px; vertical-align: middle;">&gt; 500 menit<br>'+

    // === Bagian 3: Poligon Tingkat Bahaya ===
    '<p style="font-size: 13px; font-weight: bold; margin-bottom: 5px; margin-top: 15px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">Tingkat Bahaya</p>' +
    '<div style="background-color: #5db45a; height: 12px; width: 20px; display: inline-block; margin-right: 8px; vertical-align: middle; border: 1px solid #444;"></div>Sangat Rendah<br>' +
    '<div style="background-color: #98d3a7; height: 12px; width: 20px; display: inline-block; margin-right: 8px; vertical-align: middle; border: 1px solid #444;"></div>Rendah<br>' +
    '<div style="background-color: #f1cd8b; height: 12px; width: 20px; display: inline-block; margin-right: 8px; vertical-align: middle; border: 1px solid #444;"></div>Sedang<br>' +
    '<div style="background-color: #eb6868; height: 12px; width: 20px; display: inline-block; margin-right: 8px; vertical-align: middle; border: 1px solid #444;"></div>Tinggi<br>' +
    '<div style="background-color: #c64c4c; height: 12px; width: 20px; display: inline-block; margin-right: 8px; vertical-align: middle; border: 1px solid #444;"></div>Sangat Tinggi<br>' ;
    
    
    return div; 
};
legend.addTo(map);