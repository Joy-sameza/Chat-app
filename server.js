require("dotenv").config();

//Port for connection
const port = process.env.PORT || 8080;
const sessionSecret = process.env.SESSION_SECRET;

const express = require("express");
const app = express();
const path = require("path");
const server = require("http").createServer(app);
const { ServerApiVersion } = require('mongodb');
const io = require("socket.io")(server);
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("./models/users");
const personContacts = require("./models/contacts");
const flash = require("connect-flash");
const session = require("express-session");
const passport = require("passport");

//Passport config
require("./config/log")(passport);

//Auth check config
const { ensureAuthenticated } = require("./config/auth");
const { use } = require("passport");

//connect to mongoDB
// const dbURI = "mongodb://localhost:27017/chatApp";
const dbURI = process.env.MONGODB_URI;
mongoose
  .connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })
  .then(() => {
    server.listen(port, () =>
      console.log(`\nListening for request on port ${port}`)
    );
  })
  .catch((err) => {
    console.log(err);
  });
app.set("view engine", "ejs");

//Body parser
app.use(express.urlencoded({ extended: false }));

//Express-session middleware
app.use(
  session({
    secret: sessionSecret,
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
  })
);

//Passport middleware
app.use(passport.initialize());
app.use(passport.session());

//Connect-flash
app.use(flash());

//Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  next();
});

//Set static folder
app.use(express.static(path.join(__dirname, "public")));

//Use JSON for response
app.use(express.json());

//Socket.io functions
io.on("connection", (socket) => {
  const id = socket.handshake.query.tel;
  const mail = socket.handshake.query.email;
  console.log("A new connection established with id", socket.id);

  //Get user id from users db and store user's contacts in personContacts db
  User.findOne({ telephone: id, email: mail })
    .then((user) => {
      if (user) {
        personContacts
          .findOne({ userId: user._id })
          .then((person) => {
            if (!person) {
              let contacts = new personContacts({
                userId: user._id,
                userContact: id,
                contacts: [],
              });
              contacts.save().catch((err) => console.log(err));
            }
          })
          .catch((err) => console.log(err));
      }
    })
    .catch((err) => console.log(err));
  socket.on("join", ({contactPrivateRoom, roomPrivate}) => {
    socket.join(contactPrivateRoom).then(console.log(`Joined ${contactPrivateRoom}`));
    socket.join(roomPrivate).then(console.log(`Joined ${roomPrivate}`));
  });
  //Save new contacts to db
  socket.on("new-contact", (newContactArray, tel) => {
    const { contactName, contactTel } = newContactArray;
    User.findOne({ email: mail, telephone: tel }).then((user) => {
      personContacts
        .findOne({ userId: user._id, userContact: tel })
        .then((person) => {
          if (person) {
            person.contacts.push({ contactName, contactTel });
            person
              .save()
              .then((prs) => {
                socket.emit("saved-contacts", prs.contacts);
              })
              .catch((err) => console.log(err));
          }
        })
        .catch((err) => console.log(err));
    });
  });
  socket.on("send-message", ({ recipients, message }) => {
    User.findOne({ email: mail, telephone: id }).then((user) => {
      socket.broadcast.to(recipients).emit("receive-message", {
        name: user.userName,
        message: message,
      });
    });
  });
});

//Routes
app.get("/", (req, res) => res.render("index", { title: "Welcome" }));
app.get("/register", (req, res) =>
  res.render("register", { title: "Register" })
);
app.get("/login", (req, res) => res.render("login", { title: "Login" }));
app.get("/dasboard", ensureAuthenticated, (req, res) => {
  User.findOne({
    email: req.user.email,
    telephone: req.user.telephone,
  }).then((user) => {
    personContacts
      .findOne({ userId: user._id, userContact: req.user.telephone })
      .then((contact) => {
        res.render("dashboard", {
          title: "Dashboard",
          name: req.user.userName,
          tel: req.user.telephone,
          email: req.user.email,
          contacts: contact.contacts,
        });
      });
  });
});
app.get("/logout", (req, res) => {
  req.logout((err) => console.log(err));
  res.redirect("/login");
});
app.post("/register", (req, res) => {
  let { userName, email, telephone, password, password2 } = req.body;
  let errors = [];

  //Check required fields
  if (!userName || !email || !telephone || !password || !password2) {
    errors.push({ msg: "Please fill in all fields" });
  }

  //Check password match
  if (password2 !== password) {
    errors.push({ msg: "Password do not match" });
  }

  //Check password length
  if (password.length < 6) {
    errors.push({ msg: "Password should be atleast 6 characters" });
  }

  if (errors.length > 0) {
    res.status(405).render("register", {
      errors,
      userName,
      email,
      telephone,
      password,
      password2,
      title: "Register",
    });
  } else {
    let user = new User({
      userName,
      email,
      telephone,
      password,
    });
    User.find({ email: email })
      .then((exist) => {
        if (exist) {
          errors.push({ msg: "Email already registered" });
          res.status(405).render("register", {
            errors,
            userName,
            email,
            telephone,
            password,
            password2,
            title: "Register",
          });
        } else {
          //Hashing password
          bcrypt.genSalt(parseInt(process.env.SALTROUND), (err, salt) => {
            if (err) console.log(err);
            bcrypt.hash(user.password, salt, (errs, hash) => {
              if (err) console.log(errs);
              //Set password to hashed
              user.password = hash;

              //Save user to DB
              user
                .save()
                .then(() => {
                  req.flash("success_msg", "You are now registered");
                  res.status(201).redirect("/login");
                })
                .catch(() => {
                  req.flash(
                    "error_msg",
                    "Problem creating your account. Please retry"
                  );
                  res.status(500).render("register", {
                    userName,
                    email,
                    telephone,
                    password,
                    password2,
                    title: "Register",
                  });
                });
            });
          });
        }
      })
      .catch((err) => console.log(err));
  }
});
app.post("/login", (req, res, next) => {
  let errors = [];
  const { email, password } = req.body;

  if (!email || !password) {
    errors.push({ msg: "Please fill in all fields" });
  }

  if (errors.length > 0) {
    res.render("login", {
      errors,
      email,
      password,
      title: "Login",
    });
  } else {
    passport.authenticate("local", {
      successRedirect: "/dasboard",
      failureRedirect: "/login",
      failureFlash: true,
    })(req, res, next);
  }
});
app.use((req, res) => res.status(404).render("404", { title: "Not Found" }));