const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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

async function createPrimaryContact(email, phoneNumber) {
  return prisma.contact.create({
    data: { 
        email,
        phoneNumber,
        linkPrecedence: "primary" 
    }
  });
}

async function createSecondaryContact(email, phoneNumber, primaryId) {
  return prisma.contact.create({
    data: { 
        email,
        phoneNumber, 
        linkPrecedence: "secondary", 
        linkedId: primaryId 
        }
  });
}

async function updateToSecondary(contactId, primaryId) {
  return prisma.contact.update({
    where: { id: contactId },
    data: { 
        linkPrecedence: "secondary", 
        linkedId: primaryId 
        }
  });
}

module.exports = {
  getCluster,
  createPrimaryContact,
  createSecondaryContact,
  updateToSecondary
};
