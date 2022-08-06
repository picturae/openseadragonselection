'use strict';

var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

gulp.task('uglify', function() {
    return gulp.src([
            './src/*.js',
        ])
        .pipe(plugins.plumber({
            errorHandler: handleError
        }))
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('jshint-stylish'))
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.concat('openseadragonselection.js'))
        .pipe(plugins.uglify())
        .pipe(plugins.sourcemaps.write('./'))
        .pipe(gulp.dest('./dist'));
});

gulp.task('watch', gulp.series('uglify', function () {
    gulp.watch('./src/*.js', gulp.series('uglify'));
}));

gulp.task('serve', plugins.serve({
        root: ['dist', 'images'],
        port: 4040,
}));

gulp.task('default', gulp.series('watch', 'serve'));

/**
 * Displays error message in the console
 * @param error
 */
function handleError(error) {
    plugins.util.beep();
    plugins.util.log(plugins.util.colors.red(error));
}
