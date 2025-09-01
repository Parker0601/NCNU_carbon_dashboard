'use strict';

const gulp = require('gulp');

const JS_SOURCES = [
  'src/js/**/*.js',
  'src/api/**/*.js',
];

function scriptsCopy() {
  return gulp
    .src(JS_SOURCES, { base: 'src' })
    .pipe(gulp.dest('dist')); // 如果你的 dev server 公開目錄不是專案根，這裡要改（見下方）
}

// ✅ 關鍵：先跑一次 scriptsCopy，再開始 watch
gulp.task('watch:api', gulp.series(scriptsCopy, function watchApi() {
  return gulp.watch(JS_SOURCES, scriptsCopy);
}));

gulp.task('scripts:copy', scriptsCopy);
gulp.task('bundle:all', gulp.series('scripts:copy'));
