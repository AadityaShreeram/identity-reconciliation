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

    const matchingContacts = await prisma.contact.findMany({
      where: {
        OR: [
          email ? { email } : {},
          phoneNumber ? { phoneNumber } : {}
        ]
      }
    });

    let primaryContact;

    if (matchingContacts.length === 0) {
      primaryContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "primary"
        }
      });
    } else {
      const primaries = matchingContacts.filter(c => c.linkPrecedence === "primary");
      if (primaries.length > 0) {
        primaryContact = primaries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
      } else {
        primaryContact = matchingContacts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
      }

      for (const contact of matchingContacts) {
        if (contact.id !== primaryContact.id && contact.linkPrecedence !== "secondary") {
          await prisma.contact.update({
            where: { id: contact.id },
            data: {
              linkPrecedence: "secondary",
              linkedId: primaryContact.id
            }
          });

          const secondaries = await prisma.contact.findMany({ where: { linkedId: contact.id } });
          for (const sec of secondaries) {
            await prisma.contact.update({
              where: { id: sec.id },
              data: { linkedId: primaryContact.id }
            });
          }
        }
      }

      const allExistingEmails = matchingContacts.map(c => c.email).filter(Boolean);
      const allExistingPhones = matchingContacts.map(c => c.phoneNumber).filter(Boolean);

      if ((email && !allExistingEmails.includes(email)) || (phoneNumber && !allExistingPhones.includes(phoneNumber))) {
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

    const emails = [
      primaryContact.email,
      ...new Set(
        allContacts
          .filter(c => c.id !== primaryContact.id && c.email)
          .map(c => c.email)
      )
    ].filter(Boolean);

    const phoneNumbers = [
      primaryContact.phoneNumber,
      ...new Set(
        allContacts
          .filter(c => c.id !== primaryContact.id && c.phoneNumber)
          .map(c => c.phoneNumber)
      )
    ].filter(Boolean);

    const secondaryContactIds = allContacts
      .filter(c => c.id !== primaryContact.id)
      .map(c => c.id);

    const response = {
      contact: {
        primaryContactId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds
      }
    };

    res.json(response);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
