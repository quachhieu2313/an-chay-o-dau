/* Ăn Chay Ở Đâu - trang tĩnh. Dữ liệu quán: data/quan.json (OpenStreetMap). Review: GitHub Issues đã duyệt (nhãn da-duyet).
   Mọi chuỗi do người dùng nhập đều đi qua textContent (h()) - không dùng innerHTML với nội dung không tin cậy. */
(function () {
  'use strict';
  const CFG = window.CHAY_CONFIG;
  const $ = (s, g) => (g || document).querySelector(s);
  const fold = t => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    }
    return el;
  }
  const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  const vn = n => Number(n).toLocaleString('vi-VN');
  const sao = n => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
  const loaiOsm = id => ({n: 'node', w: 'way', r: 'relation'}[id[0]] + '/' + id.slice(1));

  async function taiJson(duongDan) {
    const r = await fetch(duongDan, {cache: 'no-cache'});
    if (!r.ok) throw new Error(duongDan + ' ' + r.status);
    return r.json();
  }

  const taiAnhQuan = () => taiJson('data/anh_quan.json').then(d => d.anh || {}).catch(() => ({}));
  const EMOJI_QUAN = {'Nhà hàng': '🍽️', 'Quán ăn nhanh': '🍜', 'Quán cà phê': '☕', 'Khu ẩm thực': '🥢', 'Kem / tráng miệng': '🍨', 'Tiệm bánh': '🥐', 'Cửa hàng': '🛍️'};
  const EMOJI_MON = {'Món nước': '🍜', 'Món cơm': '🍚', 'Món cuốn - gỏi': '🥬', 'Món chiên - xào': '🥘', 'Món mặn': '🍲', 'Món canh': '🥣', 'Món lẩu - nướng': '🍢',
    'Món ăn vặt': '🥟', 'Món ăn sáng': '🍙', 'Tráng miệng': '🍮', 'Món ăn nhanh': '🥖', 'Món ăn kèm': '🥢', 'Món khô': '🍝'};
  // chỉ nhận ảnh do chính GitHub lưu (ảnh kéo thả vào Issue), tránh ảnh từ máy chủ lạ
  const HOST_ANH_OK = /^https:\/\/(github\.com\/user-attachments\/|user-images\.githubusercontent\.com\/|private-user-images\.githubusercontent\.com\/|raw\.githubusercontent\.com\/)/;
  const httpUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
  // khung ảnh có dự phòng: không có ảnh hoặc ảnh lỗi thì hiện biểu tượng
  function khungAnh(src, bieuTuong) {
    const box = h('div', {class: 'thumb ph'}, bieuTuong);
    if (!src) return box;
    const img = h('img', {src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', decoding: 'async'});
    img.addEventListener('error', () => { box.className = 'thumb ph'; clear(box).appendChild(document.createTextNode(bieuTuong)); });
    box.className = 'thumb';
    clear(box).appendChild(img);
    return box;
  }
  const linkMxh = (v, goc) => { v = (v || '').trim().replace(/^@/, ''); return !v ? '' : /^https?:\/\//i.test(v) ? v : goc + v; };

  // ---------- review từ GitHub Issues đã duyệt (1 lần gọi API, cache 10 phút trong sessionStorage)
  function phanTichBody(body) {
    const kq = {};
    String(body || '').split(/^### /m).slice(1).forEach(khoi => {
      const i = khoi.indexOf('\n');
      kq[khoi.slice(0, i).trim()] = khoi.slice(i + 1).trim().replace(/^_No response_$/, '');
    });
    return kq;
  }
  async function taiReview() {
    const khoa = 'chay-review-v2';
    try {
      const c = JSON.parse(sessionStorage.getItem(khoa) || 'null');
      if (c && Date.now() - c.t < 600000) return c.d;
    } catch (e) { /* bỏ qua */ }
    const url = `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/issues?state=open&labels=review,${CFG.nhanDaDuyet}&per_page=100`;
    const r = await fetch(url, {headers: {Accept: 'application/vnd.github+json'}});
    if (!r.ok) throw new Error('GitHub ' + r.status);
    const theoQuan = {};
    (await r.json()).filter(i => !i.pull_request).forEach(i => {
      const f = phanTichBody(i.body);
      const id = (f['Mã quán'] || '').trim();
      const diem = parseInt((f['Điểm'] || '').trim()[0], 10);
      if (!id || !(diem >= 1 && diem <= 5)) return;
      const anh = [];
      String(f['Ảnh'] || '').replace(/!\[[^\]]*\]\((https:\/\/[^)\s]+)\)|src="(https:\/\/[^"\s]+)"/g, (m, a, b) => { const u = a || b; if (HOST_ANH_OK.test(u) && anh.length < 4) anh.push(u); return m; });
      (theoQuan[id] = theoQuan[id] || []).push({
        anh, diem, mon: f['Món đã ăn'] || '', noiDung: f['Nhận xét'] || '', ten: f['Tên hiển thị'] || 'Khách ẩn danh',
        ngay: new Date(i.created_at).toLocaleDateString('vi-VN'), link: i.html_url
      });
    });
    try { sessionStorage.setItem(khoa, JSON.stringify({t: Date.now(), d: theoQuan})); } catch (e) { /* bỏ qua */ }
    return theoQuan;
  }
  const trungBinh = ds => ds && ds.length ? ds.reduce((a, r) => a + r.diem, 0) / ds.length : 0;
  const linkViet = q => `https://github.com/${CFG.owner}/${CFG.repo}/issues/new?template=review.yml&title=${encodeURIComponent('[Review] ' + q.ten)}&quan_id=${encodeURIComponent(q.id)}&ten_quan=${encodeURIComponent(q.ten)}`;

  // ---------- trang chủ: danh sách + lọc
  async function trangChu() {
    const [dl, rv, anhQ] = await Promise.all([taiJson('data/quan.json'), taiReview().catch(() => null), taiAnhQuan()]);
    const quan = dl.quan;
    const tp = [...new Set(quan.map(q => q.thanh_pho))].sort((a, b) => quan.filter(q => q.thanh_pho === b).length - quan.filter(q => q.thanh_pho === a).length);
    const loai = [...new Set(quan.map(q => q.loai))].sort();
    const selTp = $('#f-tp'), selLoai = $('#f-loai');
    tp.forEach(t => selTp.appendChild(h('option', {value: t, text: `${t} (${vn(quan.filter(q => q.thanh_pho === t).length)})`})));
    loai.forEach(t => selLoai.appendChild(h('option', {value: t, text: t})));
    const tham = new URLSearchParams(location.search);
    $('#f-q').value = tham.get('q') || '';
    const S = {page: 1, size: 24};
    $('#stat-quan').textContent = `${vn(quan.length)} địa điểm`;
    $('#stat-tp').textContent = `${vn(tp.length)} khu vực`;
    $('#stat-rv').textContent = rv ? `${vn(Object.values(rv).reduce((a, d) => a + d.length, 0))} review` : 'review: đang cập nhật';
    $('#nguon').textContent = `Dữ liệu: ${dl.nguon}, cập nhật ${dl.cap_nhat}.`;

    function loc() {
      const q = fold($('#f-q').value.trim()), t = selTp.value, l = selLoai.value, chay = $('#f-chay').checked, sdt = $('#f-sdt').checked, rvOnly = $('#f-rv').checked;
      const kq = quan.filter(x => (!q || fold(x.ten + ' ' + x.dia_chi + ' ' + x.thanh_pho).includes(q)) && (!t || x.thanh_pho === t) && (!l || x.loai === l)
        && (!chay || x.chay_hoan_toan) && (!sdt || x.dien_thoai) && (!rvOnly || (rv && rv[x.id])));
      kq.sort((a, b) => (trungBinh(rv && rv[b.id]) - trungBinh(rv && rv[a.id])) || ((rv && rv[b.id] || []).length - (rv && rv[a.id] || []).length) || a.ten.localeCompare(b.ten, 'vi'));
      return kq;
    }
    function ve() {
      const kq = loc(), trang = Math.max(1, Math.ceil(kq.length / S.size));
      S.page = Math.min(S.page, trang);
      const dau = (S.page - 1) * S.size;
      $('#dem').textContent = kq.length ? `Có ${vn(kq.length)} địa điểm phù hợp` : 'Không có địa điểm phù hợp - thử bỏ bớt bộ lọc.';
      const luoi = clear($('#luoi'));
      kq.slice(dau, dau + S.size).forEach(x => {
        const ds = rv && rv[x.id];
        const anhRv = (ds || []).flatMap(r => r.anh || [])[0];
        luoi.appendChild(h('article', {class: 'card'},
          h('a', {href: 'quan.html?id=' + encodeURIComponent(x.id), 'aria-label': 'Xem ' + x.ten, tabindex: '-1'}, khungAnh((anhQ[x.id] && anhQ[x.id].url) || anhRv, EMOJI_QUAN[x.loai] || '🥗')),
          h('h3', {}, h('a', {href: 'quan.html?id=' + encodeURIComponent(x.id), text: x.ten})),
          h('div', {class: 'badges'}, h('span', {class: 'badge', text: x.loai}), x.chay_hoan_toan ? h('span', {class: 'badge', text: 'Chay hoàn toàn'}) : h('span', {class: 'badge warm', text: 'Có món chay'}),
            h('span', {class: 'badge gray', text: x.thanh_pho})),
          h('div', {class: 'addr', text: x.dia_chi || 'Chưa có địa chỉ chi tiết'}),
          h('div', {class: 'rate'}, ds ? [h('b', {text: sao(trungBinh(ds))}), ` ${trungBinh(ds).toFixed(1)} (${ds.length} review)`] : 'Chưa có review'),
          h('div', {class: 'go'}, h('a', {class: 'btn small', href: 'quan.html?id=' + encodeURIComponent(x.id), text: 'Xem & viết review'}))));
      });
      const p = clear($('#pager'));
      if (trang > 1) {
        const nut = (t, pg, on) => p.appendChild(h('button', {type: 'button', class: on ? 'on' : '', disabled: pg < 1 || pg > trang, onclick: () => { S.page = pg; ve(); window.scrollTo({top: 0}); }, text: t}));
        nut('‹', S.page - 1);
        for (let i = Math.max(1, S.page - 3); i <= Math.min(trang, S.page + 3); i++) nut(String(i), i, i === S.page);
        nut('›', S.page + 1);
      }
    }
    ['#f-q', '#f-tp', '#f-loai', '#f-chay', '#f-sdt', '#f-rv'].forEach(id => $(id).addEventListener('input', () => { S.page = 1; ve(); }));
    ve();
  }

  // ---------- trang chi tiết quán
  async function trangQuan() {
    const id = new URLSearchParams(location.search).get('id');
    const [dl, rv, anhQ] = await Promise.all([taiJson('data/quan.json'), taiReview().catch(() => null), taiAnhQuan()]);
    const q = dl.quan.find(x => x.id === id);
    const goc = clear($('#noi-dung'));
    if (!q) { goc.appendChild(h('div', {class: 'note', text: 'Không tìm thấy quán này. Quay lại trang chủ để tìm lại.'})); return; }
    document.title = `${q.ten} - ${CFG.tenTrang}`;
    const d = 0.004, bbox = [q.lon - d, q.lat - d, q.lon + d, q.lat + d].join(',');
    const ds = rv && rv[q.id];
    const hang = (k, v) => v ? [h('dt', {text: k}), h('dd', {}, v)] : [];
    goc.appendChild(h('h1', {text: q.ten}));
    goc.appendChild(h('div', {class: 'badges'}, h('span', {class: 'badge', text: q.loai}), q.chay_hoan_toan ? h('span', {class: 'badge', text: 'Chay hoàn toàn'}) : h('span', {class: 'badge warm', text: 'Có món chay'}), h('span', {class: 'badge gray', text: q.thanh_pho})));
    const aq = anhQ[q.id];
    if (aq && /^https:\/\//.test(aq.url)) {
      goc.appendChild(h('figure', {class: 'anh', style: 'margin-top:14px'},
        h('img', {src: aq.url, alt: 'Ảnh quán ' + q.ten, loading: 'lazy', referrerpolicy: 'no-referrer', onerror: e => e.target.closest('figure').remove()}),
        h('figcaption', {}, 'Ảnh: ', httpUrl(aq.trang) ? h('a', {href: aq.trang, target: '_blank', rel: 'noopener nofollow', text: aq.nguon}) : aq.nguon, ' · bản quyền thuộc quán')));
    }
    const mxh = [['Website', httpUrl(q.website)], ['Fanpage Facebook', linkMxh(q.facebook, 'https://www.facebook.com/')], ['Instagram', linkMxh(q.instagram, 'https://www.instagram.com/')]].filter(x => httpUrl(x[1]));
    goc.appendChild(h('div', {class: 'panel info', style: 'margin-top:14px'},
      h('div', {}, h('dl', {class: 'kv'},
        hang('Địa chỉ', q.dia_chi || 'Chưa có địa chỉ chi tiết'),
        hang('Điện thoại', q.dien_thoai ? h('a', {href: 'tel:' + q.dien_thoai.replace(/[^+\d]/g, ''), text: q.dien_thoai}) : ''),
        hang('Giờ mở cửa', q.gio_mo_cua),
        hang('Website', q.website && /^https?:\/\//i.test(q.website) ? h('a', {href: q.website, rel: 'noopener nofollow', target: '_blank', text: q.website}) : ''),
        hang('Đánh giá', ds ? `${sao(trungBinh(ds))} ${trungBinh(ds).toFixed(1)}/5 (${ds.length} review)` : 'Chưa có review')),
        h('p', {style: 'margin-top:14px;display:flex;gap:8px;flex-wrap:wrap'},
          h('a', {class: 'btn small', target: '_blank', rel: 'noopener', href: `https://www.google.com/maps/dir/?api=1&destination=${q.lat},${q.lon}`, text: 'Chỉ đường'}),
          h('a', {class: 'btn small sec', target: '_blank', rel: 'noopener', href: 'https://www.openstreetmap.org/' + loaiOsm(q.id), text: 'Xem / sửa thông tin trên OpenStreetMap'})),
        mxh.length ? h('div', {class: 'links', style: 'margin-top:10px'}, mxh.map(x => h('a', {class: 'btn small sec', target: '_blank', rel: 'noopener nofollow', href: x[1], text: x[0]}))) : null),
      h('iframe', {class: 'map', title: 'Bản đồ ' + q.ten, loading: 'lazy', src: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${q.lat},${q.lon}`})));

    goc.appendChild(h('h2', {text: 'Review của khách'}));
    const rvBox = h('div', {class: 'panel'});
    if (rv === null) rvBox.appendChild(h('div', {class: 'note', text: 'Chưa tải được review (GitHub tạm giới hạn truy cập hoặc trang chưa được xuất bản). Thử lại sau ít phút.'}));
    else if (!ds) rvBox.appendChild(h('p', {class: 'muted', text: 'Chưa có review nào được duyệt cho quán này. Hãy là người đầu tiên chia sẻ trải nghiệm của bạn!'}));
    else ds.forEach(r => rvBox.appendChild(h('div', {class: 'review'},
      h('div', {}, h('span', {class: 'who', text: r.ten}), ' ', h('span', {class: 'stars', text: sao(r.diem)}), h('span', {class: 'muted', text: ` · ${r.ngay}`})),
      r.mon ? h('div', {class: 'muted', text: 'Món đã ăn: ' + r.mon}) : null, h('p', {text: r.noiDung}),
      r.anh.length ? h('div', {class: 'gallery'}, r.anh.map(u => h('a', {href: u, target: '_blank', rel: 'noopener'}, h('img', {src: u, alt: 'Ảnh của ' + r.ten, loading: 'lazy', referrerpolicy: 'no-referrer'})))) : null)));
    goc.appendChild(rvBox);
    goc.appendChild(h('p', {style: 'margin-top:14px'}, h('a', {class: 'btn', target: '_blank', rel: 'noopener', href: linkViet(q), text: 'Viết review cho quán này'}),
      h('span', {class: 'muted', style: 'margin-left:10px;font-size:14px', text: 'Cần tài khoản GitHub (miễn phí). Review hiện trên trang sau khi được duyệt.'})));
  }

  // ---------- trang món chay
  async function trangMon() {
    const dl = await taiJson('data/mon_chay.json');
    const mon = dl.mon;
    const vungs = [...new Set(mon.map(m => m.vung))], loais = [...new Set(mon.map(m => m.loai))];
    vungs.forEach(v => $('#m-vung').appendChild(h('option', {value: v, text: v})));
    loais.forEach(v => $('#m-loai').appendChild(h('option', {value: v, text: v})));
    function ve() {
      const q = fold($('#m-q').value.trim()), v = $('#m-vung').value, l = $('#m-loai').value;
      const kq = mon.filter(m => (!q || fold(m.ten + ' ' + m.mo_ta + ' ' + m.nguyen_lieu.join(' ')).includes(q)) && (!v || m.vung === v) && (!l || m.loai === l));
      $('#m-dem').textContent = `${vn(kq.length)} món`;
      const g = clear($('#m-luoi'));
      kq.forEach(m => g.appendChild(h('article', {class: 'card dish'},
        khungAnh(m.anh && m.anh.tep, EMOJI_MON[m.loai] || '🥗'),
        m.anh ? h('div', {class: 'meta', style: 'margin-top:-2px'}, (m.anh.chu_thich ? m.anh.chu_thich + ' · ' : '') + 'Ảnh: ', httpUrl(m.anh.trang) ? h('a', {href: m.anh.trang, target: '_blank', rel: 'noopener', text: m.anh.tac_gia || 'Wikimedia Commons'}) : (m.anh.tac_gia || ''),
          ' · ', httpUrl(m.anh.giay_phep_url) ? h('a', {href: m.anh.giay_phep_url, target: '_blank', rel: 'noopener', text: m.anh.giay_phep}) : (m.anh.giay_phep || ''), ' · Wikimedia Commons') : null,
        h('h3', {text: m.ten}), h('div', {class: 'meta', text: `${m.loai} · ${m.vung}`}), h('p', {style: 'margin:0', text: m.mo_ta}),
        h('ul', {}, m.nguyen_lieu.map(n => h('li', {text: n}))),
        m.luu_y ? h('div', {class: 'note info-note', text: m.luu_y}) : null,
        h('div', {class: 'go'}, h('a', {class: 'btn small sec', href: 'index.html?q=' + encodeURIComponent(m.tu_khoa_tim_quan || m.ten), text: 'Tìm quán bán món này'})))));
    }
    ['#m-q', '#m-vung', '#m-loai'].forEach(id => $(id).addEventListener('input', ve));
    ve();
  }

  // ---------- bản đồ (Leaflet tải từ CDN)
  async function trangBanDo() {
    const dl = await taiJson('data/quan.json');
    const map = L.map('map-lon', {preferCanvas: true}).setView([14.6, 108.2], 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '© OpenStreetMap contributors'}).addTo(map);
    const lop = L.layerGroup().addTo(map);
    const selTp = $('#b-tp');
    [...new Set(dl.quan.map(q => q.thanh_pho))].sort().forEach(t => selTp.appendChild(h('option', {value: t, text: t})));
    function ve() {
      lop.clearLayers();
      const t = selTp.value, ds = dl.quan.filter(q => (!t || q.thanh_pho === t) && (!$('#b-chay').checked || q.chay_hoan_toan));
      ds.forEach(q => {
        const nd = h('div', {}, h('b', {text: q.ten}), h('br'), h('span', {text: q.dia_chi || q.thanh_pho}), h('br'), h('a', {href: 'quan.html?id=' + encodeURIComponent(q.id), text: 'Xem & viết review'}));
        L.circleMarker([q.lat, q.lon], {radius: 6, color: '#1f4d28', weight: 1, fillColor: q.chay_hoan_toan ? '#4f9a5b' : '#e8a33d', fillOpacity: .85}).bindPopup(nd).addTo(lop);
      });
      $('#b-dem').textContent = `${vn(ds.length)} địa điểm`;
      if (ds.length) map.fitBounds(L.latLngBounds(ds.map(q => [q.lat, q.lon])).pad(.1), {maxZoom: 15});
    }
    selTp.addEventListener('input', ve); $('#b-chay').addEventListener('input', ve);
    ve();
  }

  const trang = document.body.dataset.trang;
  const chay = {chu: trangChu, quan: trangQuan, mon: trangMon, bando: trangBanDo}[trang];
  if (chay) chay().catch(e => {
    const o = $('#loi');
    if (o) { o.classList.remove('hide'); o.textContent = 'Có lỗi khi tải dữ liệu: ' + e.message; }
    console.error(e);
  });
})();
