import gulp from 'gulp';
import babel from 'gulp-babel';
import uglify from 'gulp-uglify';
import rename from 'gulp-rename';

gulp.task('default', done => {
    gulp.src(['hermes.js', 'hermes-worker.js'])
        .pipe(babel())
        .pipe(uglify())
        .pipe(rename(path => (path.extname = '.min.js')))
        .pipe(gulp.dest('dist'));
    done();
});
