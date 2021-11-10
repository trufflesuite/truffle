module.exports = {
  initialization: function () {
    this.logger = console;
  },
  handlers: {
    "test:migration:skipped": [
      function () {
        if (this.quiet) return;
        this.logger.log(
          `> Migration skipped because --migrate-none option was passed.`
        );
      }
    ]
  }
};
