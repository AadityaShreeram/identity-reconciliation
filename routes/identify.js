const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

router.post("/", async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({ error: "Email or phoneNumber required" });
    }

    const existingContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { email: email || undefined },
          { phoneNumber: phoneNumber || undefined }
        ]
      }
    });

    let primaryContact;
    if (existingContacts.length === 0) {
      primaryContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "primary"
        }
      });
    } else {
      primaryContact = existingContacts[0];
    }

    res.json({
      contact: {
        primaryContactId: primaryContact.id,
        emails: [primaryContact.email].filter(Boolean),
        phoneNumbers: [primaryContact.phoneNumber].filter(Boolean),
        secondaryContactIds: []
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
