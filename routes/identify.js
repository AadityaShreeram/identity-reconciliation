const express = require("express");
const router = express.Router();
const {
  getCluster,
  createPrimaryContact,
  createSecondaryContact,
  updateToSecondary
} = require("../services/contactService");
const { validateIdentifyInput } = require("../utils/validation");

router.post("/", async (req, res) => {
  try {
    const validation = validateIdentifyInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    const { email, phoneNumber } = req.body;

    let cluster = await getCluster(email, phoneNumber);

    let primaryContact;
    if (cluster.length === 0) {
      primaryContact = await createPrimaryContact(email, phoneNumber);
      cluster = [primaryContact];
    } else {
      const primaries = cluster.filter(c => c.linkPrecedence === "primary");
      if (primaries.length > 0) {
        primaryContact = primaries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
      } else {
        primaryContact = cluster.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
      }

      for (const contact of cluster) {
        if (contact.id !== primaryContact.id) {
          await updateToSecondary(contact.id, primaryContact.id);
        }
      }

      const allEmails = cluster.map(c => c.email).filter(Boolean);
      const allPhones = cluster.map(c => c.phoneNumber).filter(Boolean);

      if ((email && !allEmails.includes(email)) || (phoneNumber && !allPhones.includes(phoneNumber))) {
        const newContact = await createSecondaryContact(email, phoneNumber, primaryContact.id);
        cluster.push(newContact);
      }
    }

    const updatedCluster = await getCluster(primaryContact.email, primaryContact.phoneNumber);

    const uniqueEmails = [...new Set(updatedCluster.map(c => c.email).filter(Boolean))];
    const uniquePhoneNumbers = [...new Set(updatedCluster.map(c => c.phoneNumber).filter(Boolean))];
    const secondaryContactIds = updatedCluster.filter(c => c.id !== primaryContact.id).map(c => c.id);

    res.json({
      contact: {
        primaryContactId: primaryContact.id,
        emails: uniqueEmails,
        phoneNumbers: uniquePhoneNumbers,
        secondaryContactIds
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
