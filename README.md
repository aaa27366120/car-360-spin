# 360° 互動賞車

中古車 360 度旋轉展示頁，左右拖曳即可旋轉觀看車輛。純前端靜態網頁，無後端、無資料庫，可直接用 GitHub Pages 發布。

網址：https://aaa27366120.github.io/car-360-spin/

## 檔案說明

```
car-360-spin/
├── index.html    賞車頁（標題、提示與播放器）
├── spin360.js    Spin360 播放器（原作者版本，未修改）
├── LICENSE       Spin360 的 MIT 授權，請保留
├── README.md     本說明
└── images/       車輛照片 00.jpg ~ 47.jpg（共 48 張）
```

## 更換成另一台車

1. 準備繞車一圈的照片，尺寸一致，建議寬度約 1600px、每張約 200～300KB。
2. 檔名從 `00.jpg` 開始依序編號（Spin360 的編號從 0 開始），副檔名使用小寫 `.jpg`。
3. 替換 `images` 資料夾內的照片。
4. 若張數不是 48，修改 `index.html` 中 `<spin-360>` 的 `frames="48"`。

## 注意事項

- 直接雙擊 `index.html` 在電腦上會打不開（瀏覽器限制模組腳本），請在 GitHub Pages 上測試。
- GitHub 區分檔名大小寫，`.JPG` 與 `.jpg` 不同。

## 授權

播放器 [Spin360](https://github.com/ahmettasdemirusa/spin360) 採 MIT 授權，© Ahmet Tasdemir。
