module.exports = {
  initialization: function () {},
  handlers: {
    "test:migration:skipped": [
      function () {
        this.logger.log(
          `> Migration skipped because --migrate-none option was passed.`
        );
      }
    ]
  }
};
