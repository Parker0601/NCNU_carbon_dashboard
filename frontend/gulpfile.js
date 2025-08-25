'use strict';

const gulp = require('gulp');
const { series } = require('gulp');
const requireDir = require('require-dir');

// 1) 載入 build/ 目錄下所有任務檔（如 build/serve.js、build/dev.js 等）
requireDir('./build', { recurse: true });

// 2) 自動挑選 default 任務（依序嘗試這些名稱）
const candidates = ['serve', 'dev', 'watch', 'start', 'build'];
const hasTask = (name) => {
  try {
    return !!gulp.registry().get(name);
  } catch {
    return false;
  }
};
const chosen = candidates.find(hasTask);

// 3) 設定 default；若沒有任何候選任務，顯示提示訊息
if (chosen) {
  gulp.task('default', series(chosen));
  console.log(`[gulp] Default task set to "${chosen}"`);
} else {
  gulp.task('default', function noDefault(cb) {
    console.log('[gulp] No serve/dev/watch/start/build task found under ./build');
    console.log('[gulp] Please create one (e.g. build/serve.js registers a "serve" task).');
    cb();
  });
}

module.exports = gulp;
