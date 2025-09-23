'use strict';

const gulp = require('gulp');
const { series, parallel } = require('gulp');
const requireDir = require('require-dir');
const plumber = require('gulp-plumber');
const hb = require('gulp-hb');
const rename = require('gulp-rename');
const prettify = require('gulp-prettify');

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
// 1.5) Styles copy 任務：把 src/css 複製到 dist（新增）
// ------------------------------------------------------------
const CSS_SOURCES = [
  'src/css/**/*.css',
];

function stylesCopy() {
  return gulp
    .src(CSS_SOURCES, { base: 'src' })
    .pipe(gulp.dest('dist'));
}
gulp.task('styles:copy', stylesCopy);

gulp.task('watch:css', gulp.series('styles:copy', function watchCss() {
  return gulp.watch(CSS_SOURCES, stylesCopy);
}));

// ------------------------------------------------------------
// 2) build-html：編譯 HBS → HTML
// ------------------------------------------------------------
function buildHtmlTask() {
  const PAGES = [
    'src/content/**/*.hbs',
    '!src/content/do_not_include/**/*.hbs',
  ];

  return gulp.src(PAGES, { base: 'src/content', allowEmpty: true })
    .pipe(plumber(function (err) {
      console.error('[build-html] ERROR:', err.message);
      this.emit('end');
    }))
    .pipe(
      hb({ debug: false })
        // 把 src/content 下所有 hbs 當成 partials (含 layouts/main.hbs)
        .partials('src/content/**/*.hbs')
        .data('src/**/*.json')
        .helpers('src/helpers/**/*.js')
    )
    .pipe(rename({ extname: '.html' }))
    .pipe(rename({ dirname: '' }))
    .pipe(prettify({
      indent_handlebars: true,
      indent_inner_html: true,
      preserve_newlines: true,
      end_with_newline: true,
      brace_style: 'expand',
      indent_char: '  ',
      indent_size: 2
    }))
    .pipe(gulp.dest('dist'));
}
gulp.task('build-html', buildHtmlTask);

// ------------------------------------------------------------
// 3) watch:hbs：監控 HBS/JSON/Helpers，有改動就重跑 build-html
// ------------------------------------------------------------
gulp.task('watch:hbs', function () {
  return gulp.watch(
    ['src/content/**/*.hbs', 'src/**/*.json', 'src/helpers/**/*.js'],
    gulp.series('build-html')
  );
});

// ------------------------------------------------------------
// 4) 載入 build/ 目錄下所有任務檔 (serve.js, watch.js …)
// ------------------------------------------------------------
requireDir('./build', { recurse: true });

// ------------------------------------------------------------
// 5) 設定 default 任務
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
  const watchHbsExists = hasTask('watch:hbs');
  const stylesCopyExists = hasTask('styles:copy');
  const watchCssExists = hasTask('watch:css');

  if (['serve', 'dev', 'watch', 'start'].includes(chosen)) {
    // 開發流程：serve/dev/watch/start + scripts:copy + styles:copy + build-html + watch
    const tasks = [chosen];
    if (watchApiExists) tasks.push('watch:api');
    if (gulp.registry().get('scripts:copy')) tasks.push('scripts:copy');
    if (stylesCopyExists) tasks.push('styles:copy');
    if (gulp.registry().get('build-html')) tasks.push('build-html');
    if (watchHbsExists) tasks.push('watch:hbs');
    if (watchCssExists) tasks.push('watch:css');

    gulp.task('default', parallel(...tasks));

    console.log(`[gulp] Default task set to "${chosen}" + scripts:copy${stylesCopyExists ? ' + styles:copy' : ''} + build-html${watchApiExists ? ' + watch:api' : ''}${watchHbsExists ? ' + watch:hbs' : ''}${watchCssExists ? ' + watch:css' : ''}`);
  } else {
    // 建置流程：bundle:all + styles:copy + build-html + build
    const tasks = [];
    if (bundleAllExists) tasks.push('bundle:all');
    if (stylesCopyExists) tasks.push('styles:copy');
    if (gulp.registry().get('build-html')) tasks.push('build-html');
    tasks.push(chosen);

    gulp.task('default', series(...tasks));

    console.log(`[gulp] Default task set to "${chosen}" (pre: ${tasks.join(', ')})`);
  }
} else {
  gulp.task('default', function noDefault(cb) {
    console.log('[gulp] No serve/dev/watch/start/build task found under ./build');
    console.log('[gulp] Please create one (e.g. build/serve.js registers a "serve" task).');
    cb();
  });
}

module.exports = gulp;
