var gulp = require('gulp');
var connect = require('gulp-connect');

gulp.task('connect', function (done) {
	connect.server({
		root: 'dist/',
		livereload: false,
		port: 4000,
		fallback: 'dist/page_login.html'   ///這裡控制開啟server後首先會看到的網頁
	});
	done();
})