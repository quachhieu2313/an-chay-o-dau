# Ăn Chay Ở Đâu

Trang tĩnh (HTML + CSS + JS, không cần build) giúp tìm quán ăn chay ở Việt Nam, xem món chay phổ biến và đọc review của khách.

- **Quán chay**: 400+ địa điểm lấy từ OpenStreetMap (`data/quan.json`), lọc theo khu vực / loại hình, có bản đồ.
- **Món chay**: ~20 món phổ biến kèm nguyên liệu và lưu ý (`data/mon_chay.json`, tự sửa được).
- **Review**: khách viết bằng biểu mẫu GitHub Issue; chỉ review được chủ trang gắn nhãn `da-duyet` mới hiện trên trang. **Trang không có review giả nào.**

## Xuất bản bằng GitHub Pages (làm một lần)

1. Tạo repo trống tên `an-chay-o-dau` (public) trên tài khoản `quachhieu2313`. Đổi tên repo / tài khoản thì sửa `assets/config.js`.
2. Đẩy mã lên nhánh `main` (xem lệnh bên dưới).
3. Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, thư mục `/ (root)` → Save. Vài phút sau trang chạy tại `https://quachhieu2313.github.io/an-chay-o-dau/`.
4. Repo → **Issues → Labels → New label**, tạo hai nhãn: `review` và `da-duyet`.
5. Thử viết một review ở trang bất kỳ quán, rồi vào Issues, gắn nhãn `da-duyet` để nó hiện lên trang.

```
git init -b main
git add .
git commit -m "Ăn Chay Ở Đâu: trang quán chay, món chay, review"
git remote add origin https://github.com/quachhieu2313/an-chay-o-dau.git
git push -u origin main
```

## Duyệt review

Mỗi review là một Issue có nhãn `review`. Đọc nội dung; thấy ổn thì gắn thêm nhãn `da-duyet` (trang cập nhật sau tối đa ~10 phút do cache). Không ổn thì đóng Issue hoặc để nguyên không gắn nhãn. Gỡ review đã duyệt: bỏ nhãn `da-duyet` hoặc đóng Issue.

## Cập nhật dữ liệu quán

```
python scripts/tai_du_lieu_osm.py
git add data/quan.json && git commit -m "Cập nhật dữ liệu quán" && git push
```

Cần Python 3 và thư viện `requests`. Dữ liệu do cộng đồng OpenStreetMap nhập, © OpenStreetMap contributors (ODbL) - phải giữ dòng ghi nguồn trên trang.

## Hình ảnh

Chỉ dùng nguồn hợp lệ, **không cào ảnh từ Google Maps hay Facebook** (bản quyền của người chụp, điều khoản dịch vụ cấm lấy tự động):

- **Món chay** (`assets/mon/`): ảnh từ Wikimedia Commons (giấy phép mở), tác giả và giấy phép hiện ngay dưới ảnh. Món chưa có ảnh chay đúng loại thì hiện biểu tượng, không dùng ảnh món mặn. Thêm ảnh: tải ảnh về `assets/mon/`, điền trường `anh` (tep, tac_gia, giay_phep, giay_phep_url, trang) cho món trong `data/mon_chay.json`.
- **Quán** (`data/anh_quan.json`): ảnh đại diện lấy từ chính website của quán (ảnh xem trước khi chia sẻ link, bản quyền thuộc quán, trang ghi rõ nguồn) hoặc thẻ `image` của OpenStreetMap. Không tải ảnh về repo. Chạy `python scripts/tai_anh_quan.py`, hoặc chạy workflow **Cập nhật dữ liệu quán và ảnh** (Actions → Run workflow; máy chủ GitHub mở được nhiều website hơn mạng công ty). Sai ảnh (logo...) thì thêm `"<id quán>": null` vào `data/anh_thu_cong.json`; muốn thêm ảnh có sự cho phép của quán thì thêm `{"url","nguon","trang"}` vào cùng file.
- **Ảnh của khách**: biểu mẫu review có ô "Ảnh" (kéo thả ảnh). Ảnh hiện trên trang quán sau khi review được duyệt; chỉ nhận ảnh do chính GitHub lưu (tối đa 4 ảnh mỗi review). Đây là nguồn ảnh quán bền vững nhất.
- Trang quán còn có nút **Website / Fanpage Facebook / Instagram** (chỉ liên kết ra ngoài, không sao chép ảnh).

Luôn xem lại ảnh tự động bằng mắt: từng có ảnh OpenStreetMap gắn nhầm logo của một cửa hàng thịt cho một quán chay.

## Giới hạn cần biết

- Trang tĩnh nên không tự lưu review; dùng GitHub Issues làm nơi lưu, người viết cần tài khoản GitHub.
- API GitHub cho phép 60 lượt/giờ cho mỗi địa chỉ IP khi chưa đăng nhập; trang gọi 1 lần rồi lưu tạm 10 phút nên đủ dùng. Nếu quá giới hạn, trang vẫn hiện quán nhưng báo chưa tải được review.
- Tối đa 100 review được tải (một trang API). Khi nhiều hơn, thêm phân trang vào `taiReview()` trong `assets/app.js`.
