const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");
const mongo = require("mongodb");

process.env.DB_URI =
  "mongodb+srv://new-user_1:6cpgZJiKZTp4YYUP@url-short-sh73e.mongodb.net/test?retryWrites=true&w=majority";
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Schema = mongoose.Schema;
var userSchema = new Schema({
  username: String,
  count: Number,
  log: [
    {
      description: String,
      duration: Number,
      date: Date
    }
  ]
});
const User = mongoose.model("User", userSchema);

/*User.remove({}, (err, data) => {
  if (err){
    console.log(err)
  }
})*/

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Header", "*");
  console.log(req.method + " " + req.path + " - " + req.ip);
  next();
});

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

var findByUsername = (username, done) => {
  User.findOne({ username: username, count: 0, logs: [] }, (err, data) => {
    if (err) {
      return console.log(err);
    }
    done(null, data);
  });
};
var saveUsername = (username, done) => {
  var user = new User({ username: username });
  user.save((err, data) => {
    if (err) {
      return console.log(err);
    }
    done(null, data);
  });
};
app.post("/api/exercise/new-user", (req, res) => {
  findByUsername(req.body.username, (err, find) => {
    if (err) {
      console.log(err);
    }
    if (!find) {
      saveUsername(req.body.username, (err, data) => {
        if (err) {
          console.log(err);
        }
        res.json({ username: req.body.username, _id: data.id });
      });
    } else {
      res.send("Username already taken");
    }
  });
});

var findAll = done => {
  User.find({}, (err, data) => {
    if (err) {
      return console.log(err);
    }
    done(null, data);
  });
};
app.get("/api/exercise/users", (req, res) => {
  findAll((err, data) => {
    res.send(data);
  });
});

var findAndUpdate = (req, done) => {
  User.findById(req.userId, (err, data) => {
    if (err || !data) {
      console.log(err);
      return done(err, null);
    } else if (req.date == "" || !req.date) {
      data.log.push({
        description: req.description,
        duration: parseInt(req.duration),
        date: new Date()
      });
    } else {
      data.log.push({
        description: req.description,
        duration: parseInt(req.duration),
        date: new Date(req.date)
      });
    }
    data.count = data.log.length;
    data.save((err, data) => {
      if (err) {
        return console.log(err);
      }
      done(null, data);
    });
  });
};
app.post("/api/exercise/add", (req, res) => {
  findAndUpdate(req.body, (err, data) => {
    if (err || !data) {
      console.log(err);
      res.send("User ID not found");
    }
    if (req.body.date == "") {
      res.json({
        _id: req.body.userId,
        username: data.username,
        date: new Date().toDateString(),
        duration: parseInt(req.body.duration),
        description: req.body.description
      });
    } else {
      res.json({
        _id: req.body.userId,
        username: data.username,
        date: new Date(req.body.date).toDateString(),
        duration: parseInt(req.body.duration),
        description: req.body.description
      });
    }
  });
});

var findById = (id, done) => {
  User.findById(id, (err, data) => {
    if (err) {
      return console.log(err);
    }
    done(null, data);
  });
};
app.get("/api/exercise/log", (req, res) => {
  findById(req.query.userId, (err, data) => {
    if (req.query.limit) {
      var limit = req.query.limit;
    } else {
      var limit = 9999999;
    }
    if (req.query.to && req.query.from) {
      var array;
      var start = new Date(req.query.from).valueOf();
      var end = new Date(req.query.to).valueOf();
      array = data.log.filter(
        x => x.date.valueOf() > start && x.date.valueOf() < end
      );
      array = array.slice(0, limit);
      res.json({
        userId: data.id,
        username: data.username,
        count: data.count,
        from: new Date(req.query.from).toDateString(),
        to: new Date(req.query.to).toDateString(),
        log: array
      });
    } else if (req.query.to) {
      var array;
      var end = new Date(req.query.to).valueOf();
      array = data.log.filter(x => x.date.valueOf() < end);
      array = array.slice(0, limit);
      res.json({
        userId: data.id,
        username: data.username,
        count: data.count,
        to: new Date(req.query.to).toDateString(),
        log: array
      });
    } else if (req.query.from) {
      var array;
      var start = new Date(req.query.from).valueOf();
      array = data.log.filter(x => x.date.valueOf() > start);
      array = array.slice(0, limit);
      res.json({
        userId: data.id,
        username: data.username,
        count: data.count,
        from: new Date(req.query.from).toDateString(),
        log: array
      });
    } else {
      var array = data.log.slice(0, limit);
      res.json({
        userId: data.id,
        username: data.username,
        count: data.count,
        log: array
      });
    }
  });
});
// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

app.get("/api/hello", (req, res) => {
  res.json({ greeting: "hello API" });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
