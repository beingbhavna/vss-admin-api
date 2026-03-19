const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const ADMIN = {
  email: "admin@vss.com",
  password: bcrypt.hashSync("123456", 8)
};

app.post("/api/login", (req, res) => {

  if (req.body.email !== ADMIN.email) {
    return res.status(401).send("Invalid Email");
  }

  const valid = bcrypt.compareSync(req.body.password, ADMIN.password);

  if (!valid) return res.status(401).send("Wrong Password");

  const token = jwt.sign({ email: ADMIN.email }, "SECRET", {
    expiresIn: "1d"
  });

  res.json({ token });

});