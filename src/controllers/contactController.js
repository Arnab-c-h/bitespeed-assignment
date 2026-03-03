const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.identify = catchAsync(async (req, res, next) => {
	let { email, phoneNumber } = req.body;

	
	if (phoneNumber) phoneNumber = String(phoneNumber);

	
	if (!email && !phoneNumber) {
		return next(
			new AppError('Please provide an email or phoneNumber', 400),
		);
	}

	
	const orConditions = [];
	if (email) orConditions.push({ email });
	if (phoneNumber) orConditions.push({ phoneNumber });

	const matchedContacts = await prisma.contact.findMany({
		where: {
			OR: orConditions,
			deletedAt: null,
		},
	});

	
	if (matchedContacts.length === 0) {
		const newPrimary = await prisma.contact.create({
			data: {
				email: email || null,
				phoneNumber: phoneNumber || null,
				linkPrecedence: 'primary',
			},
		});

		return res.status(200).json({
			contact: {
				primaryContatctId: newPrimary.id,
				emails: newPrimary.email ? [newPrimary.email] : [],
				phoneNumbers: newPrimary.phoneNumber
					? [newPrimary.phoneNumber]
					: [],
				secondaryContactIds: [],
			},
		});
	}

	
	const primaryIdSet = new Set();
	for (const contact of matchedContacts) {
		if (contact.linkPrecedence === 'primary') {
			primaryIdSet.add(contact.id);
		} else {
			primaryIdSet.add(contact.linkedId);
		}
	}

	
	const primaryContacts = await prisma.contact.findMany({
		where: { id: { in: Array.from(primaryIdSet) } },
		orderBy: { createdAt: 'asc' }, 
	});

	
	const truePrimary = primaryContacts[0];

	
	if (primaryContacts.length > 1) {
		const otherPrimaries = primaryContacts.slice(1); 

		for (const otherPrimary of otherPrimaries) {
			
			await prisma.contact.update({
				where: { id: otherPrimary.id },
				data: {
					linkedId: truePrimary.id,
					linkPrecedence: 'secondary',
				},
			});

			
			await prisma.contact.updateMany({
				where: { linkedId: otherPrimary.id },
				data: { linkedId: truePrimary.id },
			});
		}
	}

	
	const allContacts = await prisma.contact.findMany({
		where: {
			OR: [{ id: truePrimary.id }, { linkedId: truePrimary.id }],
			deletedAt: null,
		},
		orderBy: { createdAt: 'asc' },
	});

	
	const existingEmails = allContacts.map((c) => c.email).filter(Boolean);
	const existingPhones = allContacts
		.map((c) => c.phoneNumber)
		.filter(Boolean);

	const isNewEmail = email && !existingEmails.includes(email);
	const isNewPhone = phoneNumber && !existingPhones.includes(phoneNumber);

	if (isNewEmail || isNewPhone) {
		
		const newSecondary = await prisma.contact.create({
			data: {
				email: email || null,
				phoneNumber: phoneNumber || null,
				linkedId: truePrimary.id,
				linkPrecedence: 'secondary',
			},
		});
		allContacts.push(newSecondary);
	}

	
	const secondaryContacts = allContacts.filter(
		(c) => c.linkPrecedence === 'secondary',
	);

	const emails = [
		truePrimary.email,
		...secondaryContacts.map((c) => c.email),
	].filter(Boolean);

	const phoneNumbers = [
		truePrimary.phoneNumber,
		...secondaryContacts.map((c) => c.phoneNumber),
	].filter(Boolean);

	
	const uniqueEmails = [...new Set(emails)];
	const uniquePhones = [...new Set(phoneNumbers)];

	const secondaryContactIds = secondaryContacts.map((c) => c.id);

	res.status(200).json({
		contact: {
			primaryContatctId: truePrimary.id,
			emails: uniqueEmails,
			phoneNumbers: uniquePhones,
			secondaryContactIds,
		},
	});
});
