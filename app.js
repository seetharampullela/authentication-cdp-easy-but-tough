const express = require("express");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dataBasePath = path.join(__dirname, "userData.db");
let db = null;

const startServer = async () => {
  try {
    db = await open({
      filename: dataBasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("The server working at http://localhost:3000");
    });
  } catch (error) {
    console.log(`DBError:${error.message}`);
    process.exit(1);
  }
};
startServer();

const validatePwd = (pwd) => {
  return pwd.length > 4;
};

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUser = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUser);

  if (dbUser === undefined) {
    const createUser = `
            INSERT INTO user (username,name,password,gender,location)
            VALUES(
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
                );`;
    if (validatePwd(password)) {
      await db.run(createUser);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//LOGIN API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUser = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUser);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPwdSame = await bcrypt.compare(password, dbUser.password);
    if (isPwdSame === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//Change Password API
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;

  const selectUser = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUser);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPwdSame = await bcrypt.compare(oldPassword, dbUser.password);
    if (isPwdSame === true) {
      if (validatePwd(newPassword)) {
        const newHashPwd = await bcrypt.hash(newPassword, 10);
        const changePwd = `
                UPDATE 
                    user
                SET 
                    password = '${newHashPwd}' 
                    WHERE username = '${username}';`;
        const user = await db.run(changePwd);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
