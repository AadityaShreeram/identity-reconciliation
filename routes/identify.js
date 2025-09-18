const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
  res.json({
    contact: {
      primaryContactId: null,
      emails: req.body.email ? [req.body.email] : [],
      phoneNumbers: req.body.phoneNumber ? [req.body.phoneNumber] : [],
      secondaryContactIds: []
    }
  });
});

module.exports = router;
