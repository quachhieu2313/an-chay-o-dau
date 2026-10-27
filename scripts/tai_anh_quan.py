# -*- coding: utf-8 -*-
"""Lấy ảnh đại diện của quán từ NGUỒN CHÍNH CỦA QUÁN -> data/anh_quan.json.

Nguồn (theo thứ tự): thẻ `image` trong OpenStreetMap (nếu là https) rồi ảnh xem trước (og:image / twitter:image) trên website riêng của quán -
chính là ảnh quán chọn để hiện khi chia sẻ link. Ảnh KHÔNG được tải về repo: trang chỉ liên kết tới ảnh gốc và ghi nguồn "website của quán".
Không lấy ảnh từ Google Maps / Facebook (bản quyền của người chụp, điều khoản dịch vụ cấm lấy tự động).
Chạy:  python scripts/tai_anh_quan.py   (sau scripts/tai_du_lieu_osm.py)
"""
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin, urlparse

import requests

THU_MUC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = {"User-Agent": "Mozilla/5.0 (compatible; an-chay-o-dau/1.0; +https://github.com/quachhieu2313/an-chay-o-dau)", "Accept-Language": "vi,en;q=0.8"}
BO_QUA = re.compile(r"(logo|favicon|icon|sprite|placeholder|default[-_]image|avatar|blank)", re.I)


def meta_anh(html):
    for m in re.finditer(r"<meta\b[^>]*>", html, re.I):
        th = m.group(0)
        if re.search(r'(property|name)\s*=\s*["\'](og:image(:secure_url)?|twitter:image(:src)?)["\']', th, re.I):
            c = re.search(r'content\s*=\s*["\']([^"\']+)["\']', th, re.I)
            if c:
                return c.group(1).replace("&amp;", "&").strip()
    return ""


def kiem_anh(url):
    """https, đúng là ảnh, dung lượng hợp lý. Trả (ok, lý do)."""
    try:
        r = requests.get(url, headers=H, timeout=15, stream=True)
        ct = r.headers.get("content-type", "").lower()
        n = int(r.headers.get("content-length") or 0)
        r.close()
        if not r.ok or not ct.startswith("image/") or "svg" in ct:
            return False, f"không phải ảnh ({r.status_code} {ct})"
        if 0 < n < 8000:
            return False, "ảnh quá nhỏ (nhiều khả năng là logo/biểu tượng)"
        return True, ""
    except requests.RequestException as e:
        return False, str(e)[:60]


def xu_ly(q):
    out = {"id": q["id"], "ten": q["ten"]}
    if q.get("anh_osm", "").startswith("https://"):
        ok, ly = kiem_anh(q["anh_osm"])
        if ok:
            return {**out, "url": q["anh_osm"], "nguon": "OpenStreetMap", "trang": "https://www.openstreetmap.org/" + {"n": "node", "w": "way", "r": "relation"}[q["id"][0]] + "/" + q["id"][1:]}
    web = q.get("website", "")
    if not web.startswith("http"):
        return {**out, "loi": "không có website"}
    try:
        r = requests.get(web, headers=H, timeout=15)
        r.encoding = r.apparent_encoding if r.encoding in (None, "ISO-8859-1") else r.encoding
        a = meta_anh(r.text[:200000])
    except requests.RequestException as e:
        return {**out, "loi": "không mở được website: " + str(e)[:50]}
    if not a:
        return {**out, "loi": "website không có ảnh xem trước"}
    a = urljoin(r.url, a)
    if a.startswith("http://"):
        a = "https://" + a[7:]
    if not a.startswith("https://") or BO_QUA.search(urlparse(a).path):
        return {**out, "loi": "ảnh có vẻ là logo / không phải https: " + a[:80]}
    ok, ly = kiem_anh(a)
    return {**out, "url": a, "nguon": urlparse(r.url).netloc.replace("www.", ""), "trang": r.url} if ok else {**out, "loi": ly}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    dl = json.load(open(os.path.join(THU_MUC, "data", "quan.json"), encoding="utf-8"))
    ds = [q for q in dl["quan"] if q.get("website") or q.get("anh_osm")]
    print(f"{len(ds)} quán có website / ảnh OSM, đang kiểm tra...")
    with ThreadPoolExecutor(8) as ex:
        kq = list(ex.map(xu_ly, ds))
    anh = {x["id"]: {k: x[k] for k in ("url", "nguon", "trang")} for x in kq if "url" in x}
    # data/anh_thu_cong.json: {"<id quán>": null} để LOẠI ảnh sai (logo...), hoặc {"<id>": {"url","nguon","trang"}} để thêm ảnh có sự cho phép của quán
    tay = os.path.join(THU_MUC, "data", "anh_thu_cong.json")
    if os.path.exists(tay):
        for k, v in json.load(open(tay, encoding="utf-8")).items():
            if k.startswith("_"):
                continue
            if v is None:
                anh.pop(k, None)
            else:
                anh[k] = v
    with open(os.path.join(THU_MUC, "data", "anh_quan.json"), "w", encoding="utf-8") as f:
        json.dump({"ghi_chu": "Ảnh đại diện lấy từ website riêng của quán (ảnh xem trước khi chia sẻ link). Bản quyền thuộc quán.", "anh": anh}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Có ảnh: {len(anh)}/{len(ds)}")
    for x in kq:
        print(("  OK  " if "url" in x else "  --  ") + x["ten"][:34].ljust(34), (x.get("nguon") or x.get("loi")))


if __name__ == "__main__":
    main()
