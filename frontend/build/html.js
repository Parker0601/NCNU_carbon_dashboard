'use strict';

const { src, dest } = require('gulp');
const hb = require('gulp-hb');
const rename = require('gulp-rename');
const plumber = require('gulp-plumber');

const PATHS = {
  // 依你的專案實際調整其中一條：pages / views / templates
  pages: [
    'src/pages/**/*.hbs',
    'src/views/**/*.hbs',
    'src/templates/**/*.hbs'
  ],
  partials: [
    'src/partials/**/*.hbs',
    'src/views/partials/**/*.hbs'
  ],
  layouts: [
    'src/layouts/**/*.hbs',
    'src/views/layouts/**/*.hbs'
  ],
  data: 'src/data/**/*.{json,js}',
  helpers: 'src/helpers/**/*.js',
  dist: 'dist'
};

function html() {
  return src(PATHS.pages, { allowEmpty: true })
    .pipe(plumber())
    .pipe(
      hb()
        .partials(PATHS.partials)
        .partials(PATHS.layouts)
        .data(PATHS.data)
        .helpers(PATHS.helpers)
    )
    .pipe(rename({ extname: '.html' }))
    .pipe(dest(PATHS.dist));
}

exports.html = html;
