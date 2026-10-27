# -*- coding: utf-8 -*-
"""Tải danh sách quán/điểm bán đồ chay ở Việt Nam từ OpenStreetMap (Overpass API) -> data/quan.json.

Chạy:  python scripts/tai_du_lieu_osm.py
Chỉ lấy địa điểm gắn nhãn diet:vegetarian=only (chay hoàn toàn) hoặc cuisine có "vegetarian" (có món chay). KHÔNG tạo dữ liệu giả:
mọi thông tin đều do cộng đồng OpenStreetMap nhập (ODbL, © OpenStreetMap contributors). Thiếu địa chỉ / giờ mở cửa là bình thường.
"""
import json
import math
import os
import sys
from datetime import datetime, timezone

import requests

THU_MUC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RA = os.path.join(THU_MUC, "data", "quan.json")
TRUY_VAN = ('[out:json][timeout:120];area["ISO3166-1"="VN"]->.a;'
            '(nwr["diet:vegetarian"="only"](area.a);nwr["cuisine"~"vegetarian",i](area.a););out center tags;')
MAY_CHU = ("https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter")
# (tên, vĩ độ, kinh độ, bán kính km): quán gần tâm nào nhất trong bán kính thì xếp vào thành phố đó
THANH_PHO = [
    ("TP. Hồ Chí Minh", 10.7769, 106.7009, 38), ("Hà Nội", 21.0285, 105.8542, 32), ("Đà Nẵng", 16.0544, 108.2022, 22),
    ("Huế", 16.4637, 107.5909, 15), ("Cần Thơ", 10.0452, 105.7469, 20), ("Nha Trang", 12.2388, 109.1967, 20),
    ("Đà Lạt", 11.9404, 108.4583, 15), ("Hải Phòng", 20.8449, 106.6881, 22), ("Vũng Tàu", 10.3460, 107.0843, 16),
    ("Hội An", 15.8801, 108.3380, 9), ("Quy Nhơn", 13.7765, 109.2237, 14), ("Buôn Ma Thuột", 12.6667, 108.0383, 14),
    ("Biên Hòa", 10.9574, 106.8427, 12), ("Thủ Dầu Một", 10.9805, 106.6519, 10), ("Long Xuyên", 10.3759, 105.4185, 12),
    ("Mỹ Tho", 10.3600, 106.3600, 12), ("Vinh", 18.6796, 105.6813, 14), ("Thanh Hóa", 19.8067, 105.7852, 12),
]
LOAI = {"restaurant": "Nhà hàng", "fast_food": "Quán ăn nhanh", "cafe": "Quán cà phê", "food_court": "Khu ẩm thực", "bar": "Quán", "pub": "Quán",
        "ice_cream": "Kem / tráng miệng", "bakery": "Tiệm bánh", "shop": "Cửa hàng"}


def khoang_cach_km(a, b, c, d):
    p = math.pi / 180
    x = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(x))


def thanh_pho(lat, lon, tags):
    gan = min(THANH_PHO, key=lambda t: khoang_cach_km(lat, lon, t[1], t[2]))
    if khoang_cach_km(lat, lon, gan[1], gan[2]) <= gan[3]:
        return gan[0]
    return tags.get("addr:city") or tags.get("addr:province") or "Tỉnh thành khác"


def tai():
    loi = []
    for url in MAY_CHU:
        try:
            r = requests.post(url, data={"data": TRUY_VAN}, headers={"User-Agent": "an-chay-o-dau/1.0", "Accept": "application/json"}, timeout=180)
            r.raise_for_status()
            return r.json()["elements"]
        except Exception as e:  # noqa: BLE001
            loi.append(f"{url}: {e}")
    raise SystemExit("Không tải được dữ liệu OpenStreetMap:\n" + "\n".join(loi))


def dia_chi(t):
    phan = [t.get("addr:housenumber"), t.get("addr:street"), t.get("addr:subdistrict") or t.get("addr:suburb"), t.get("addr:district"),
            t.get("addr:city") or t.get("addr:province")]
    s = ", ".join(p for p in phan if p)
    return s or t.get("addr:full", "")


def main():
    el = tai()
    quan, thay = [], set()
    for e in el:
        t = e.get("tags", {})
        ten = (t.get("name") or t.get("name:vi") or "").strip()
        lat = e.get("lat") or (e.get("center") or {}).get("lat")
        lon = e.get("lon") or (e.get("center") or {}).get("lon")
        if not ten or lat is None or lon is None:
            continue
        khoa = (ten.lower(), round(lat, 4), round(lon, 4))
        if khoa in thay:
            continue
        thay.add(khoa)
        quan.append({
            "id": f"{e['type'][0]}{e['id']}", "ten": ten, "loai": LOAI.get(t.get("amenity") or t.get("shop"), "Quán ăn"),
            "chay_hoan_toan": t.get("diet:vegetarian") == "only", "thanh_pho": thanh_pho(lat, lon, t), "dia_chi": dia_chi(t),
            "lat": round(lat, 6), "lon": round(lon, 6), "dien_thoai": t.get("phone") or t.get("contact:phone") or "",
            "website": t.get("website") or t.get("contact:website") or "", "gio_mo_cua": t.get("opening_hours", ""),
        })
    quan.sort(key=lambda q: (q["thanh_pho"], q["ten"].lower()))
    gio = datetime.now(timezone.utc).astimezone().strftime("%d/%m/%Y")
    with open(RA, "w", encoding="utf-8") as f:
        json.dump({"cap_nhat": gio, "nguon": "OpenStreetMap contributors (ODbL)", "quan": quan}, f, ensure_ascii=False, separators=(",", ":"))
    from collections import Counter
    sys.stdout.reconfigure(encoding="utf-8")
    print(f"{len(quan)} quán (bỏ {len(el) - len(quan)} mục thiếu tên / trùng) -> {RA}")
    for k, v in Counter(q["thanh_pho"] for q in quan).most_common():
        print(f"  {v:4}  {k}")
    print("  chay hoàn toàn:", sum(q["chay_hoan_toan"] for q in quan), "| có địa chỉ:", sum(bool(q["dia_chi"]) for q in quan),
          "| có giờ mở cửa:", sum(bool(q["gio_mo_cua"]) for q in quan), "| có điện thoại:", sum(bool(q["dien_thoai"]) for q in quan))


if __name__ == "__main__":
    main()
