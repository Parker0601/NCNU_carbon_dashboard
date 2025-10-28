'use strict';

const gulp = require('gulp');
const { series, parallel } = require('gulp');
const requireDir = require('require-dir');
const plumber = require('gulp-plumber');
const hb = require('gulp-hb');
const rename = require('gulp-rename');
const prettify = require('gulp-prettify');
const path = require('path');
const del = require('del');                 // ← 這裡保留 require，下面改用 del.deleteAsync(...)
const newer = require('gulp-newer');

// ------------------------------------------------------------
// 0) 全域設定
// ------------------------------------------------------------
const USE_POLLING = process.env.ASSETS_POLL === '1';
const WRITE_STABLE_MS = 200;

const IMG_SOURCES = [
  'src/img/**/*.{png,jpg,jpeg,gif,svg,webp,avif,ico}',
  '!src/**/.DS_Store',
  '!src/**/Thumbs.db',
  '!src/**/~$*',
  '!src/**/*.tmp'
];

const CUSTOM_SOURCES = [
  'src/custom/**/*.{json,csv,txt}',
  '!src/**/.DS_Store',
  '!src/**/Thumbs.db',
  '!src/**/~$*',
  '!src/**/*.tmp'
];

const ASSET_SOURCES = [
  ...IMG_SOURCES,
  ...CUSTOM_SOURCES
];

// ------------------------------------------------------------
// 1) Scripts copy
// ------------------------------------------------------------
const JS_SOURCES = [
  'src/js/**/*.js',
  'src/api/**/*.js'
];

function scriptsCopy() {
  return gulp.src(JS_SOURCES, { base: 'src' }).pipe(gulp.dest('dist'));
}
gulp.task('scripts:copy', scriptsCopy);

gulp.task('watch:api', gulp.series('scripts:copy', function watchApi() {
  return gulp.watch(JS_SOURCES, scriptsCopy);
}));

gulp.task('bundle:all', gulp.series('scripts:copy'));

// ------------------------------------------------------------
// 1.5) Styles copy
// ------------------------------------------------------------
const CSS_SOURCES = ['src/css/**/*.css'];

function stylesCopy() {
  return gulp.src(CSS_SOURCES, { base: 'src' }).pipe(gulp.dest('dist'));
}
gulp.task('styles:copy', stylesCopy);

gulp.task('watch:css', gulp.series('styles:copy', function watchCss() {
  return gulp.watch(CSS_SOURCES, stylesCopy);
}));

// ------------------------------------------------------------
// 1.6) Assets 全量拷貝（僅在手動或 build:once 時使用）
// ------------------------------------------------------------
function assetsCopy() {
  return gulp
    .src(ASSET_SOURCES, { base: 'src', allowEmpty: true })
    .pipe(newer('dist'))
    .pipe(gulp.dest('dist'));
}
gulp.task('assets:copy', assetsCopy);

// ------------------------------------------------------------
// 1.7) 專用 watcher（img/custom）
// ------------------------------------------------------------
gulp.task('watch:img', function () {
  const watcher = gulp.watch(IMG_SOURCES, {
    ignoreInitial: true,
    usePolling: USE_POLLING,
    interval: 200,
    awaitWriteFinish: { stabilityThreshold: WRITE_STABLE_MS, pollInterval: 50 },
    events: ['add', 'change', 'unlink', 'addDir', 'unlinkDir']
  });

  function copyOne(filePath) {
    return gulp.src(filePath, { base: 'src' }).pipe(gulp.dest('dist'));
  }

  watcher.on('add', copyOne);
  watcher.on('change', copyOne);

  watcher.on('unlink', async (filePath) => {
    const rel = path.relative(path.resolve('src'), path.resolve(filePath));
    const target = path.resolve('dist', rel);
    await del.deleteAsync(target);                        // ← 修正
    console.log(`[img] removed: ${rel}`);
  });

  watcher.on('unlinkDir', async (dirPath) => {
    const rel = path.relative(path.resolve('src'), path.resolve(dirPath));
    const targetDir = path.resolve('dist', rel);
    await del.deleteAsync(targetDir, { force: true });   // ← 修正
    console.log(`[img] removed dir: ${rel}/`);
  });

  return watcher;
});

gulp.task('watch:custom', function () {
  const watcher = gulp.watch(CUSTOM_SOURCES, {
    ignoreInitial: true,
    usePolling: USE_POLLING,
    interval: 200,
    awaitWriteFinish: { stabilityThreshold: WRITE_STABLE_MS, pollInterval: 50 },
    events: ['add', 'change', 'unlink', 'addDir', 'unlinkDir']
  });

  function copyOne(filePath) {
    return gulp.src(filePath, { base: 'src' }).pipe(gulp.dest('dist'));
  }

  watcher.on('add', copyOne);
  watcher.on('change', copyOne);

  watcher.on('unlink', async (filePath) => {
    const rel = path.relative(path.resolve('src'), path.resolve(filePath));
    const target = path.resolve('dist', rel);
    await del.deleteAsync(target);                        // ← 修正
    console.log(`[custom] removed: ${rel}`);
  });

  watcher.on('unlinkDir', async (dirPath) => {
    const rel = path.relative(path.resolve('src'), path.resolve(dirPath));
    const targetDir = path.resolve('dist', rel);
    await del.deleteAsync(targetDir, { force: true });   // ← 修正
    console.log(`[custom] removed dir: ${rel}/`);
  });

  return watcher;
});

// ------------------------------------------------------------
// 2) build-html：編譯 HBS → HTML
// ------------------------------------------------------------
function buildHtmlTask() {
  const PAGES = [
    'src/content/**/*.hbs',
    '!src/content/do_not_include/**/*.hbs'
  ];

  return gulp.src(PAGES, { base: 'src/content', allowEmpty: true })
    .pipe(plumber(function (err) {
      console.error('[build-html] ERROR:', err.message);
      this.emit('end');
    }))
    .pipe(
      hb({ debug: false })
        .partials('src/content/**/*.hbs')
        .data(['src/**/*.json', '!src/custom/**/*.json'])
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
// 3) watch:hbs
// ------------------------------------------------------------
gulp.task('watch:hbs', function () {
  return gulp.watch(
    [
      'src/content/**/*.hbs',
      'src/**/*.json',
      '!src/custom/**/*.json',
      'src/helpers/**/*.js'
    ],
    gulp.series('build-html')
  );
});

// ------------------------------------------------------------
// 4) 載入 build/ 目錄下所有任務檔
// ------------------------------------------------------------
requireDir('./build', { recurse: true });

// ------------------------------------------------------------
// 5) 清空 dist 與一次性建置
// ------------------------------------------------------------
gulp.task('clean', () => del.deleteAsync(['dist/**', '!dist'])); // ← 修正

gulp.task('build:once', series(
  'clean',
  'scripts:copy',
  'styles:copy',
  'assets:copy',
  'build-html'
));

// ------------------------------------------------------------
// 6) 設定 default 任務
// ------------------------------------------------------------
const candidates = ['serve', 'dev', 'watch', 'start', 'build'];
const hasTask = (name) => {
  try { return !!gulp.registry().get(name); } catch { return false; }
};
const chosen = candidates.find(hasTask);

if (chosen) {
  const watchApiExists     = hasTask('watch:api');
  const bundleAllExists    = hasTask('bundle:all');
  const watchHbsExists     = hasTask('watch:hbs');
  const stylesCopyExists   = hasTask('styles:copy');
  const watchCssExists     = hasTask('watch:css');
  const assetsCopyExists   = hasTask('assets:copy');
  const watchImgExists     = hasTask('watch:img');
  const watchCustomExists  = hasTask('watch:custom');

  if (['serve', 'dev', 'watch', 'start'].includes(chosen)) {
    const tasks = [chosen];
    if (gulp.registry().get('scripts:copy')) tasks.push('scripts:copy');
    if (stylesCopyExists) tasks.push('styles:copy');
    if (assetsCopyExists) tasks.push('assets:copy');
    if (gulp.registry().get('build-html')) tasks.push('build-html');
    if (watchApiExists)    tasks.push('watch:api');
    if (watchCssExists)    tasks.push('watch:css');
    if (watchHbsExists)    tasks.push('watch:hbs');
    if (watchImgExists)    tasks.push('watch:img');
    if (watchCustomExists) tasks.push('watch:custom');

    gulp.task('default', parallel(...tasks));

    console.log(
      `[gulp] Default task set to "${chosen}" + scripts:copy` +
      `${stylesCopyExists ? ' + styles:copy' : ''}` +
      `${assetsCopyExists ? ' + assets:copy' : ''}` +
      ` + build-html` +
      `${watchApiExists ? ' + watch:api' : ''}` +
      `${watchCssExists ? ' + watch:css' : ''}` +
      `${watchHbsExists ? ' + watch:hbs' : ''}` +
      `${watchImgExists ? ' + watch:img' : ''}` +
      `${watchCustomExists ? ' + watch:custom' : ''}`
    );
  } else {
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
