module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON('package.json')
    clean: 
      build: ["build/"]
    coffee:
      build:
        options: 
          join: true
        files:
          "build/<%= pkg.name %>.js": ['src/**/*.coffee']
    uglify:
      options: banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      build: 
        files: 
          'build/<%= pkg.name %>.min.js': [
            "build/<%= pkg.name %>.js"
          ]

  grunt.loadNpmTasks 'grunt-contrib-clean'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.registerTask 'default', [
    'coffee'
    'uglify'
  ]
  return