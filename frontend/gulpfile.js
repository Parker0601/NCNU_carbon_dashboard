'use strict';

const gulp = require('gulp');
const { series, parallel } = require('gulp');
const requireDir = require('require-dir');
const plumber = require('gulp-plumber');
const hb = require('gulp-hb');
const rename = require('gulp-rename');
const prettify = require('gulp-prettify');
const path = require('path');
const del = require('del');
const newer = require('gulp-newer');

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
// 資產拷貝：把 src/img、src/custom 同步到 dist
// ------------------------------------------------------------
const ASSET_SOURCES = [
  'src/img/**/*',
  'src/custom/**/*',
  '!src/**/.DS_Store',
  '!src/**/Thumbs.db'
];

function assetsCopy() {
  return gulp
    .src(ASSET_SOURCES, { base: 'src', allowEmpty: true })
    .pipe(newer('dist'))            // 只把較新的檔案拷到 dist
    .pipe(gulp.dest('dist'));
}
gulp.task('assets:copy', assetsCopy);

gulp.task('watch:assets', gulp.series('assets:copy', function watchAssets() {
  const watcher = gulp.watch(ASSET_SOURCES, { ignoreInitial: true });

  watcher.on('add', (filePath) => {
    // 新增單檔增量拷貝
    return gulp.src(filePath, { base: 'src' }).pipe(gulp.dest('dist'));
  });

  watcher.on('change', (filePath) => {
    // 變更單檔增量拷貝
    return gulp.src(filePath, { base: 'src' }).pipe(gulp.dest('dist'));
  });

  watcher.on('unlink', async (filePath) => {
    // 刪除單檔，同步刪除 dist 對應檔
    const rel = path.relative(path.resolve('src'), path.resolve(filePath));
    const target = path.resolve('dist', rel);
    await del(target);
    console.log(`[assets] removed file: ${rel}`);
  });

  watcher.on('addDir', () => { /* 目錄新增，不需特別處理 */ });

  watcher.on('unlinkDir', async (dirPath) => {
    // 刪除整個目錄，同步刪除 dist 對應目錄
    const rel = path.relative(path.resolve('src'), path.resolve(dirPath));
    const targetDir = path.resolve('dist', rel);
    await del(targetDir, { force: true });
    console.log(`[assets] removed dir: ${rel}/`);
  });

  return watcher;
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
  const assetsCopyExists = hasTask('assets:copy');
  const watchAssetsExists = hasTask('watch:assets');

  if (['serve', 'dev', 'watch', 'start'].includes(chosen)) {
    // 開發流程：serve/dev/watch/start + scripts:copy + styles:copy + build-html + watch
    const tasks = [chosen];
    if (watchApiExists) tasks.push('watch:api');
    if (gulp.registry().get('scripts:copy')) tasks.push('scripts:copy');
    if (stylesCopyExists) tasks.push('styles:copy');
    if (assetsCopyExists) tasks.push('assets:copy');
    if (gulp.registry().get('build-html')) tasks.push('build-html');
    if (watchHbsExists) tasks.push('watch:hbs');
    if (watchCssExists) tasks.push('watch:css');
    if (watchAssetsExists) tasks.push('watch:assets');

    gulp.task('default', parallel(...tasks));

    console.log(
      `[gulp] Default task set to "${chosen}" + scripts:copy` +
      `${stylesCopyExists ? ' + styles:copy' : ''}` +
      `${assetsCopyExists ? ' + assets:copy' : ''}` +
      ` + build-html` +
      `${watchApiExists ? ' + watch:api' : ''}` +
      `${watchHbsExists ? ' + watch:hbs' : ''}` +
      `${watchCssExists ? ' + watch:css' : ''}` +
      `${watchAssetsExists ? ' + watch:assets' : ''}`
    );
  } else {
    // 建置流程：bundle:all + styles:copy + build-html + build
    const tasks = [];
    if (bundleAllExists) tasks.push('bundle:all');
    if (stylesCopyExists) tasks.push('styles:copy');
    if (assetsCopyExists) tasks.push('assets:copy');
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
