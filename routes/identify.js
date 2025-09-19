const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

//Recursively fetch all contacts connected (directly/indirectly)
async function getCluster(email, phoneNumber) {
  let seenIds = new Set();
  let cluster = [];

  let toVisit = await prisma.contact.findMany({
    where: {
      OR: [
        email ? { email } : {},
        phoneNumber ? { phoneNumber } : {}
      ]
    }
  });

  while (toVisit.length > 0) {
    const current = toVisit.pop();
    if (seenIds.has(current.id)) continue;

    seenIds.add(current.id);
    cluster.push(current);

    const related = await prisma.contact.findMany({
      where: {
        OR: [
          current.linkedId ? { id: current.linkedId } : {},
          { linkedId: current.id }
        ]
      }
    });

    for (const rel of related) {
      if (!seenIds.has(rel.id)) {
        toVisit.push(rel);
      }
    }
  }

  return cluster;
}

router.post("/", async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({ error: "Email or phoneNumber required" });
    }

    let cluster = await getCluster(email, phoneNumber);

    let primaryContact;
    if (cluster.length === 0) {
      primaryContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "primary"
        }
      });
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
          await prisma.contact.update({
            where: { id: contact.id },
            data: {
              linkPrecedence: "secondary",
              linkedId: primaryContact.id
            }
          });
        }
      }

      const allEmails = cluster.map(c => c.email).filter(Boolean);
      const allPhones = cluster.map(c => c.phoneNumber).filter(Boolean);

      if ((email && !allEmails.includes(email)) || (phoneNumber && !allPhones.includes(phoneNumber))) {
        const newContact = await prisma.contact.create({
          data: {
            email,
            phoneNumber,
            linkPrecedence: "secondary",
            linkedId: primaryContact.id
          }
        });
        cluster.push(newContact);
      }
    }

    const updatedCluster = await getCluster(primaryContact.email, primaryContact.phoneNumber);

    const uniqueEmails = [...new Set(updatedCluster.map(c => c.email).filter(Boolean))];
    const uniquePhoneNumbers = [...new Set(updatedCluster.map(c => c.phoneNumber).filter(Boolean))];
    const secondaryContactIds = updatedCluster.filter(c => c.id !== primaryContact.id).map(c => c.id);
    const response = {
      contact: {
        primaryContactId: primaryContact.id,
        emails: uniqueEmails,
        phoneNumbers: uniquePhoneNumbers,
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
