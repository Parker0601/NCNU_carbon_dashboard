// frontend/build/serve.js
const gulp = require('gulp');
const browserSync = require('browser-sync').create();
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// 讀取根目錄與 frontend 目錄的 .env（若存在）
const repoRoot = path.resolve(__dirname, '..', '..');     // 專案根目錄
const feRoot   = path.resolve(__dirname, '..');           // frontend/
[ path.join(repoRoot, '.env.local'),
  path.join(repoRoot, '.env'),
  path.join(feRoot, '.env.local'),
  path.join(feRoot, '.env'),
].forEach(p => { if (fs.existsSync(p)) dotenv.config({ path: p }); });

// 取得埠號（優先 FRONTEND_PORT，其次 8080）
const PORT = parseInt(process.env.FRONTEND_PORT || '8080', 10);

// 動態決定要當靜態根目錄的資料夾（依序找 dist → public → frontend 根）
const candidates = ['dist', 'public', '.'];
const baseDir = candidates
  .map(dir => path.resolve(feRoot, dir))
  .find(p => fs.existsSync(p) && fs.statSync(p).isDirectory()) || feRoot;

// 監看靜態檔案變動就 reload（若你的輸出在 dist，這樣即可；若另有 build 任務可再整合）
function serve(cb) {
  browserSync.init({
    server: { baseDir, index: 'page_login.html' },
    port: PORT,
    open: false,     // 若想自動開啟瀏覽器可改 true
    notify: false,
    ui: false,
    ghostMode: false,
  });

  // 監看常見靜態資源；需要再加副檔名可自行補
  gulp.watch([
    path.join(baseDir, '**/*'),
  ]).on('change', browserSync.reload);

  console.log('\n[serve] Static server running at:');
  console.log(`        → http://localhost:${PORT}`);
  console.log(`        baseDir: ${baseDir}\n`);
  cb();
}

gulp.task('serve', serve);
