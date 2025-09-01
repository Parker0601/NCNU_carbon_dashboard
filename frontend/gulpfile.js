'use strict';

const gulp = require('gulp');
const { series, parallel } = require('gulp');
const requireDir = require('require-dir');

// ------------------------------------------------------------
// 1) Scripts copy 任務：把 src/js、src/api 複製到 dist
// ------------------------------------------------------------
const JS_SOURCES = [
  'src/js/**/*.js',
  'src/api/**/*.js',
];

function scriptsCopy() {
  return gulp
    .src(JS_SOURCES, { base: 'src' })
    .pipe(gulp.dest('dist'));
}
gulp.task('scripts:copy', scriptsCopy);

gulp.task('watch:api', gulp.series('scripts:copy', function watchApi() {
  return gulp.watch(JS_SOURCES, scriptsCopy);
}));

gulp.task('bundle:all', gulp.series('scripts:copy'));

// ------------------------------------------------------------
// 2) 載入 build/ 目錄下所有任務檔 (serve.js, dev.js, …)
// ------------------------------------------------------------
requireDir('./build', { recurse: true });

// ------------------------------------------------------------
// 3) 設定 default 任務
// ------------------------------------------------------------
const candidates = ['serve', 'dev', 'watch', 'start', 'build'];
const hasTask = (name) => {
  try {
    return !!gulp.registry().get(name);
  } catch {
    return false;
  }
};
const chosen = candidates.find(hasTask);

if (chosen) {
  const watchApiExists = hasTask('watch:api');
  const bundleAllExists = hasTask('bundle:all');

  if (['serve', 'dev', 'watch', 'start'].includes(chosen)) {
    // 開發流程：serve + watch + scripts:copy
    const tasks = [chosen];
    if (watchApiExists) tasks.push('watch:api');
    if (gulp.registry().get('scripts:copy')) tasks.push('scripts:copy');

    gulp.task('default', parallel(...tasks));

    console.log(`[gulp] Default task set to "${chosen}" + scripts:copy${watchApiExists ? ' + watch:api' : ''}`);
  } else {
    // 建置流程：bundle:all + build
    gulp.task(
      'default',
      bundleAllExists ? series('bundle:all', chosen) : series(chosen)
    );
    console.log(`[gulp] Default task set to "${chosen}"${bundleAllExists ? ' (pre: bundle:all)' : ''}`);
  }
} else {
  gulp.task('default', function noDefault(cb) {
    console.log('[gulp] No serve/dev/watch/start/build task found under ./build');
    console.log('[gulp] Please create one (e.g. build/serve.js registers a "serve" task).');
    cb();
  });
}

module.exports = gulp;