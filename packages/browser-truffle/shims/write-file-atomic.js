import fs from "fs";

// We're using the browser file system. We have no need for fancy filesystem stuff
// that's not fully supported. Instead, let's just write the file and be done.
module.exports = {
  sync: function(filePath, data) {
    // Options are ignored.
    // Should we ignore them? Defaulting to utf-8 here.
    fs.writeFileSync(filePath, data, "utf-8");
  }
};
