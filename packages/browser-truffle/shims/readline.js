// readline fails building, because there is now a default node library by that name.
// The module has been renamed to linebyline. Here, we're just swapping the old for the new.
module.exports = require("linebyline");
