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
          email ? { email } : {},
          phoneNumber ? { phoneNumber } : {}
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
      primaryContact = existingContacts.find(c => c.linkPrecedence === "primary");
      if (!primaryContact) {
        primaryContact = existingContacts[0];
      }

      for (const contact of existingContacts) {
        if (contact.id !== primaryContact.id && contact.linkPrecedence !== "secondary") {
          await prisma.contact.update({
            where: { id: contact.id },
            data: {
              linkPrecedence: "secondary",
              linkedId: primaryContact.id
            }
          });
        }
      }

      const hasEmail = existingContacts.some(c => c.email === email);
      const hasPhone = existingContacts.some(c => c.phoneNumber === phoneNumber);

      if ((email && !hasEmail) || (phoneNumber && !hasPhone)) {
        await prisma.contact.create({
          data: {
            email,
            phoneNumber,
            linkPrecedence: "secondary",
            linkedId: primaryContact.id
          }
        });
      }
    }

    const allContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: primaryContact.id },
          { linkedId: primaryContact.id }
        ]
      }
    });
    const emails = [...new Set(allContacts.map(c => c.email).filter(Boolean))];
    const phoneNumbers = [...new Set(allContacts.map(c => c.phoneNumber).filter(Boolean))];
    const secondaryContactIds = allContacts
      .filter(c => c.id !== primaryContact.id)
      .map(c => c.id);
    
    const response = {
      contact: {
        primaryContactId: primaryContact.id,
        emails: emails,
        phoneNumbers: phoneNumbers,
        secondaryContactIds: secondaryContactIds
      }
    };

    res.json(response);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
