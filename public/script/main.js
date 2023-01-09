const socket = io();
let crypt, id;

socket.on("properties", (properties) => {
  crypt = properties.bcrypt;
  const salt = crypt.genSalt(properties.round);
  console.log(salt);
});

socket.on("message", (message) => {
  console.log(`${message}`);
});
