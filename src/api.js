const express = require("express");
const serverless = require("serverless-http");

const app = express();
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    hello: "hi!"
  });
});
require("dotenv").config();
// const express = require('express')
const jwt = require("jsonwebtoken");
// const serverless = require('serverless-http');
// const router = express.Router();
// const app = express();
const port = 8000;

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
});


var mysql = require('mysql');

var con = mysql.createConnection({
  host: "sql6.freemysqlhosting.net",
  user: "sql6433814",
  password: "IuBCvY9U3l",
  database: "sql6433814"
});

con.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
});


router.get("/creatDb", (req, res) => {
  con.query("CREATE DATABASE testdb", function (err, result) {
    if (err) res.send('Error while creating testdb, Please check if mysql is running on the system');
    res.send('testdb Database created');
  });
})

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "testdb"
});


router.get('/createTables', function (req, res) {
  var sql = "CREATE TABLE users (name VARCHAR(255),mobile_number BIGINT(11), address VARCHAR(255), gender VARCHAR(255),country VARCHAR(255))";
  con.query(sql, function (err, result) {
    if (err) res.send('Error while creating tables, Please check if mysql is running on the system', err);
    var primaryKeySql = "ALTER TABLE users CHANGE COLUMN'mobile_number' 'mobile_number' BIGINT(11) NOT NULL,ADD PRIMARY KEY('mobile_number')";
    con.query(primaryKeySql, function (err, result) {
      if (err) res.send('Error while creating tables, Please check if mysql is running on the system', err);
      res.send("Table created");
    });
  });
})


//API to register a user {name,contact,address,gender,country}
router.post('/registerUser', function (req, res) {
  var name = req.param("name"); // required field
  var mobile_number = req.param("mobile_number"); //Primay key, required field
  var address = req.param("address"); //  required field
  var gender = req.param("gender"); //  required field
  var country = req.param("country");// required field
  var password = req.param("password");// required field
  if (name == "" || mobile_number == "" || address == "" || gender == "" || country == "" || name == undefined || mobile_number == undefined || address == undefined || gender == undefined || country == undefined || password == "" || password == undefined) {
    res.status(401).send("Please enter all fields");
    return false;
  }

  //check If User already Exists
  checkOldUserExist(mobile_number, name, address, country, gender).then(response => {
    console.log("response", response.length);
    var length = response.length;
    if (length === 1) {
      return res.status(401).send("User Already Exist. Please Login");
    } else {
      createNewUser(mobile_number, name, address, country, gender, password).then(data => {
        var length = data.length;
        if (length == 1) {
          res.status(200).send("user Created")
        } else {
          res.status(401).send('Error while connecting to database, Please check if mysql is running on the system');
        }
      });
    }
  });

})

checkUser = (mobile_number) => {
  return new Promise((resolve, reject) => {
    var query = "SELECT * FROM users WHERE mobile_number = '" + mobile_number + "'";
    con.query(query, (error, results) => {
      if (error) {
        return reject(error);
      }
      return resolve(results);
    });
  });
};


checkUserForLogin = (mobile_number, password) => {
  return new Promise((resolve, reject) => {
    var query = "SELECT * FROM users WHERE mobile_number = '" + mobile_number + "' and password =  '" + password + "' ";
    con.query(query, (error, results) => {
      if (error) {
        return reject(error);
      }
      return resolve(results);
    });
  });
};


createUser = (mobile_number, name, address, country, gender, password) => {
  return new Promise((resolve, reject) => {
    var sql = "INSERT INTO users (name, mobile_number,address,gender,country,password) VALUES ('" + name + "','" + mobile_number + "','" + address + "','" + gender + "','" + country + "','" + password + "')";
    con.query(sql, (error, results) => {
      if (error) {
        return reject(error);
      }
      return resolve(results);
    });
  });
};




async function checkOldUserExist(mobile_number, name, address, country, gender) {

  const oldUser = checkUser(mobile_number);
  const promises = [oldUser];

  try {
    const result = await Promise.all(promises);

    // you can do something with the result
    return oldUser;

  } catch (error) {
    console.log(error)
  }
}


async function createNewUser(mobile_number, name, address, country, gender, password) {

  const newUser = createUser(mobile_number, name, address, country, gender, password);
  const promises = [newUser];

  try {
    const result = await Promise.all(promises);

    // you can do something with the result
    return result;

  } catch (error) {
    console.log(error)
  }
}


async function checkUserExist(mobile_number, password) {

  const oldUser = checkUserForLogin(mobile_number, password);
  const promises = [oldUser];

  try {
    const result = await Promise.all(promises);

    // you can do something with the result
    return oldUser;

  } catch (error) {
    console.log(error)
  }
}


//API to login user
router.post("/login", async (req, res) => {

  // login logic starts here
  try {
    // Get user input
    var password = req.param("password"); // required field
    var mobile_number = req.param("mobile_number"); //required field

    // Validate user input
    if (!(mobile_number && password)) {
      res.status(400).send("All input is required");
    }
    // Validate if user exist in our database
    checkUserExist(mobile_number, password).then(response => {
      if (response) {
        // Create token
        const token = jwt.sign(
          { user_id: response[0].user_id, mobile_number },
          process.env.TOKEN_KEY,
          {
            expiresIn: "2h",
          }
        );
        response[0].jwt_token = token;
        const today = new Date();
        today.setHours(today.getHours() + 7);
        today.setMinutes(today.getMinutes() + 30);
        // today = new Date(today);
        console.log("today", today);
        // save user token
        if (response[0].jwt_token) {
          setTimeout(function () {
            var sql = "update users set jwt_token = '" + response[0].jwt_token + "' where user_id = " + response[0].user_id + "";
            con.query(sql, (error, results) => {
              if (error) {
                return error;
              }
              var sql1 = "update users set jwt_token_expiry = DATE_ADD(NOW(), INTERVAL 2 HOUR) where user_id = " + response[0].user_id + "";
              con.query(sql1, (error, results) => {
                if (error) {
                  return error;
                }
                console.log("results", results);
                response[0].jwt_token_expiry = today;
                res.status(200).json(response);
              });
            });
          }, 2000);
        } else {
          res.status(400).send("Invalid Credentials");
        }
      }
    });

  } catch (err) {
    console.log(err);
  }
});

//JWT based token authentication
router.post("/authenticate-user", async (req, res) => {
  var mobile_number = req.param("mobile_number"); //required field
  var jwt_token = req.param("jwt_token"); //required field
  // Validate user input
  if (!(mobile_number && jwt_token)) {
    res.status(400).send("All input is required");
  }
  // Validate if user exist in our database
  authenticatUserToken(mobile_number, jwt_token).then(response => {
    console.log("response", response);
    if (response.length === 1) {
      res.status(200).send("Valid tokens");
    } else {
      res.status(400).send("Invalid Tokens");
    }
  });

});


checkUserUsingToken = (mobile_number, jwt_token) => {
  return new Promise((resolve, reject) => {
    var query = "SELECT * FROM users WHERE mobile_number = '" + mobile_number + "' and jwt_token =  '" + jwt_token + "' and jwt_token_expiry >= DATE_ADD(NOW(), INTERVAL 0 HOUR) ";
    con.query(query, (error, results) => {
      if (error) {
        return reject(error);
      }
      return resolve(results);
    });
  });
};


async function authenticatUserToken(mobile_number, jwt_token) {

  const oldUser = checkUserUsingToken(mobile_number, jwt_token);
  const promises = [oldUser];

  try {
    const result = await Promise.all(promises);

    // you can do something with the result
    return oldUser;

  } catch (error) {
    console.log(error)
  }
}



//API to search other users in system based on their name | contact
router.get("/search-user", (req, res) => {
// app.post("/search-user", async (req, res) => {
  var search_input = req.param("search_input"); //required field
  // Validate user input
  if (!(search_input)) {
    res.status(400).send("All input is required");
  }
  // Validate if user exist in our database
  searchUserBasedOnInput(search_input).then(response1 => {
    if (response1.length >= 1) {
      res.json({
        status: "200",
        response: response1,
      });
    } else {
      res.json({
        status: "401",
        response: "Error",
      });
    }
  });

});


async function searchUserBasedOnInput(search_input) {

  const oldUser = searchUser(search_input);
  const promises = [oldUser];

  try {
    const result = await Promise.all(promises);

    // you can do something with the result
    return oldUser;

  } catch (error) {
    console.log(error)
  }
}


searchUser = (search_input) => {
  return new Promise((resolve, reject) => {
    var query = "SELECT * FROM users WHERE mobile_number like '" + search_input + "%'or name like '" + search_input + "%'";
    con.query(query, (error, results) => {
      if (error) {
        return reject(error);
      }
      return resolve(results);
    });
  });
};



//API to logout user
router.post("/logout", async (req, res) => {
  var mobile_number = req.param("mobile_number"); //required field
  var jwt_token = req.param("jwt_token"); //required field
  // Validate user input
  if (!(mobile_number && jwt_token)) {
    res.status(400).send("All input is required");
  }
  // Validate if user exist in our database
  authenticatUserToken(mobile_number, jwt_token).then(response => {
    console.log("response", response);
    if (response.length === 1) {
      setTimeout(function () {
        var sql = "update users set jwt_token_expiry = null where user_id = " + response[0].user_id + "";
        con.query(sql, (error, results) => {
          if (error) {
            return error;
          }
          console.log("results", results);
          res.status(400).send("User logged out successfully");
        });
      }, 2000);
    } else {
      res.status(400).send("User not found");
    }
  });
});

app.use(`/.netlify/functions/api`, router);

module.exports = app;
module.exports.handler = serverless(app);
