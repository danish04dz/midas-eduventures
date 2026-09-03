const express = require('express');
const router = express.Router();
const Timetable = require('../models/Timetable');
const { generateTimetablePDF } = require('../utils/pdfGenerator');
const { sendWeeklyReportEmail } = require('../utils/emailService');

// GET current Master Weekly Timetable
router.get('/', async (req, res) => {
  try {
    let timetable = await Timetable.findOne().sort({ updatedAt: -1 });
    res.json(timetable);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET Download Timetable PDF (Single Day OR Complete Week)
router.get('/download-pdf', async (req, res) => {
  try {
    const { day = 'ALL' } = req.query; // 'ALL', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'
    const timetable = await Timetable.findOne().sort({ updatedAt: -1 });
    if (!timetable) return res.status(404).json({ message: 'Timetable grid not found' });

    const pdfBuffer = await generateTimetablePDF({
      weekTitle: timetable.weekTitle || 'WEEK: 24 Aug - 29 Aug 2026',
      selectedDay: day,
      slots: timetable.slots || []
    });

    const dayNameStr = day === 'ALL' ? 'Complete_Week' : `Day_${day}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Midas_Timetable_${dayNameStr}_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST Send Timetable PDF via Email
router.post('/send-email', async (req, res) => {
  try {
    const { day = 'ALL', recipientEmail } = req.body;
    const timetable = await Timetable.findOne().sort({ updatedAt: -1 });
    if (!timetable) return res.status(404).json({ message: 'Timetable grid not found' });

    const pdfBuffer = await generateTimetablePDF({
      weekTitle: timetable.weekTitle || 'WEEK: 24 Aug - 29 Aug 2026',
      selectedDay: day,
      slots: timetable.slots || []
    });

    const scopeStr = day === 'ALL' ? 'Complete Week Master Activity Timetable' : `Selected Day Timetable (${day})`;
    const emailSubject = `[Midas Eduventures] ${scopeStr} - ${timetable.weekTitle || 'August 2026'}`;
    const emailBody = `Dear Principal & Coordinator,\n\nPlease find attached the official Evening House Activity Timetable PDF (${scopeStr}).\n\n` +
      `📅 Period: ${timetable.weekTitle}\n` +
      `📌 Scope: ${scopeStr}\n\n` +
      `Best regards,\nMidas Eduventures Academic System`;

    const result = await sendWeeklyReportEmail({
      recipientEmail: recipientEmail || process.env.PRINCIPAL_EMAIL || 'mohd.692003@gmail.com',
      subject: emailSubject,
      text: emailBody,
      pdfBuffer,
      filename: `Midas_Timetable_${day}_${Date.now()}.pdf`
    });

    res.json({
      message: `Timetable PDF successfully sent via email (${result.recipient})!`,
      subject: emailSubject,
      previewUrl: result.previewUrl
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET Timetable assigned to a specific faculty
router.get('/faculty/:facultyName', async (req, res) => {
  try {
    const { facultyName } = req.params;
    const timetable = await Timetable.findOne().sort({ updatedAt: -1 });
    if (!timetable) return res.json([]);

    const assignedSlots = [];
    const lowerSearch = facultyName.toLowerCase();

    timetable.slots.forEach(s => {
      if (s.isSplit && s.subSlots && s.subSlots.length > 0) {
        const matchingSub = s.subSlots.find(sub => 
          sub.facultyName && sub.facultyName.toLowerCase().includes(lowerSearch)
        );
        if (matchingSub) {
          assignedSlots.push({
            ...s.toObject(),
            // Expose active subSlot details for faculty view
            subject: matchingSub.subject || s.subject,
            facultyName: matchingSub.facultyName,
            groupInfo: matchingSub.groupInfo || matchingSub.grade || s.groupInfo,
            timeRange: matchingSub.timeRange ? `${s.timeRange} (${matchingSub.timeRange})` : s.timeRange,
            subSlotDetails: matchingSub
          });
        }
      } else if (s.facultyName && s.facultyName.toLowerCase().includes(lowerSearch)) {
        assignedSlots.push(s);
      }
    });

    res.json(assignedSlots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST / PUT update Timetable (Admin / Main Coordinator)
router.post('/', async (req, res) => {
  try {
    const { weekTitle, weekNumber, academicYear, startDate, endDate, slots } = req.body;
    
    let timetable = await Timetable.findOne();
    if (timetable) {
      timetable.weekTitle = weekTitle || timetable.weekTitle;
      timetable.weekNumber = weekNumber || timetable.weekNumber;
      timetable.academicYear = academicYear || timetable.academicYear;
      timetable.startDate = startDate || timetable.startDate;
      timetable.endDate = endDate || timetable.endDate;
      timetable.slots = slots || timetable.slots;
      timetable.updatedAt = Date.now();
      await timetable.save();
    } else {
      timetable = new Timetable({
        weekTitle: weekTitle || 'WEEK: 24 Aug - 29 Aug 2026',
        weekNumber: weekNumber || 1,
        academicYear: academicYear || '2026-2027',
        startDate: startDate || '2026-08-24',
        endDate: endDate || '2026-08-29',
        slots: slots || []
      });
      await timetable.save();
    }

    // Create automatic push notification for assigned faculties
    if (slots && slots.length > 0) {
      const Notification = require('../models/Notification');
      for (const slot of slots) {
        if (slot.facultyName && slot.subject) {
          await Notification.create({
            title: `📅 Timetable Slot Assigned: ${slot.subject}`,
            body: `You are assigned to ${slot.house} (${slot.groupInfo || slot.grade}) on ${slot.day} (${slot.timeRange}).`,
            targetFacultyName: slot.facultyName,
            type: 'timetable',
            senderName: 'Main Coordinator (Admin)'
          }).catch(e => console.error('[Notif Creation Error]', e.message));
        }
      }
    }

    res.json({ message: 'Timetable updated & push notifications dispatched successfully!', timetable });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST Reset Timetable Slots for a specific day or entire week
router.post('/reset', async (req, res) => {
  try {
    const { day } = req.body; // e.g. 'MON', 'TUE', or 'ALL'
    let timetable = await Timetable.findOne();
    if (!timetable) return res.status(404).json({ message: 'Timetable not found' });

    if (day && day !== 'ALL') {
      timetable.slots = timetable.slots.filter(s => s.day !== day);
    } else {
      timetable.slots = [];
    }

    timetable.updatedAt = Date.now();
    await timetable.save();

    res.json({ message: `Timetable slots reset successfully for ${day || 'ALL'}`, timetable });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
