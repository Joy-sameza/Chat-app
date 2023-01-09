const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const contactsSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  userContact: {
    type: String,
    required: true,
  },
  contacts: {
    type: Array,
    required: false,
  },
});

const personContacts = mongoose.model("personContacts", contactsSchema);
module.exports = personContacts;
