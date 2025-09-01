'use strict';

const gulp = require('gulp');
const rollup = require('gulp-better-rollup');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const replace = require('@rollup/plugin-replace');
const { terser } = require('@rollup/plugin-terser');
const rename = require('gulp-rename');

const OUT_DIR = 'dist/js';

// 你要打包的頁面入口（src/api/*.js，不含副檔名）
const entries = ['register']; // 之後要加 login、forget-password 就在這裡擴充

function bundleOne(name, isProd = false) {
  const plugins = [
    replace({
      preventAssignment: true,
      'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL || 'http://localhost:3000/api/v1'),
    }),
    nodeResolve({ browser: true }),
    commonjs(),
  ];
  if (isProd) plugins.push(terser());

  return gulp.src(`src/api/${name}.js`)
    .pipe(rollup({ plugins }, { format: 'iife', name: `${name}Bundle`, sourcemap: !isProd }))
    .pipe(rename(`${name}.bundle.js`))
    .pipe(gulp.dest(OUT_DIR));
}

// 個別任務
entries.forEach(n => {
  gulp.task(`bundle:${n}`, () => bundleOne(n, false));
  gulp.task(`bundle:${n}:prod`, () => bundleOne(n, true));
});

// 全部
gulp.task('bundle:api', gulp.series(entries.map(n => `bundle:${n}`)));
gulp.task('bundle:api:prod', gulp.series(entries.map(n => `bundle:${n}:prod`)));

// 監看
gulp.task('watch:api', function () {
  gulp.watch('src/api/**/*.js', gulp.series('bundle:api'));
});
