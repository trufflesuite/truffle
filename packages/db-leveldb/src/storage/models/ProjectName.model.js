const Model = require("../Model");

class ProjectName extends Model {
  project;
  key;
  nameRecord;

  async beforeSave() {
    const newId = this.generateID();

    // Key exists in db, but data fields have changed so remove old key
    // This could also become a batch operation and would then be atomic
    if (this.id && this.id !== newId) {
      await ProjectName.delete(this.id);
    }
    this.id = newId;
  }

  generateID() {
    return this.sha3(JSON.stringify(this.project) + JSON.stringify(this.key));
  }
}

module.exports = ProjectName;
