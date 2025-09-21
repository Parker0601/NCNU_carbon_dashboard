var gulp = require('gulp');
var path = require('path');
var build = require('./build');

/**
 * run and watch file changes
 */
gulp.task('watch', function (done) {
  console.log('==================> Watching file changes...');

  // ✅ 精準監看 HBS 與其依賴（content / template / helpers / data）
  gulp.watch([
      build.config.path.src + '/content/**/*.hbs',
      build.config.path.src + '/template/**/*.hbs',
      build.config.path.src + '/helpers/**/*.js',
      build.config.path.src + '/**/*.json'
    ],
    gulp.series('build-html') // ← 改 HBS 就重編頁面
  ).on('all', function (event, filePath) {
    var file = path.parse(filePath);
    console.log(`==================> HBS ${event}: ${file.name}${file.ext}`);
  });

  // 保留：JS、SCSS 變動就跑 bundle（你原本就有）
  gulp.watch([
      build.config.path.src + '/**/*.js',
      build.config.path.src + '/**/*.scss'
    ],
    gulp.series('build-bundle')
  ).on('all', function (event, filePath) {
    var file = path.parse(filePath);
    console.log(`==================> ASSET ${event}: ${file.name}${file.ext}`);
  });

  // 如需 nav.json 也可打開
  /*
  gulp.watch(['nav.json'], gulp.series('build-nav'))
    .on('all', function (event, filePath) {
      var file = path.parse(filePath);
      console.log(`==================> NAV ${event}: ${file.name}${file.ext}`);
    });
  */

  done();
});
