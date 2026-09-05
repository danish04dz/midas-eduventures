const express = require('express');
const router = express.Router();
const Timetable = require('../models/Timetable');
const { generateTimetablePDF } = require('../utils/pdfGenerator');
const { sendWeeklyReportEmail } = require('../utils/emailService');
const { getRealTimeWeekInfo } = require('../utils/dateHelper');

// GET current Master Weekly Timetable
router.get('/', async (req, res) => {
  try {
    const { batch = 'evening', facultyName } = req.query;
    let timetable = await Timetable.findOne({ batch }).sort({ updatedAt: -1 });
    const realTimeInfo = getRealTimeWeekInfo();

    if (!timetable) {
      timetable = new Timetable({
        batch,
        weekTitle: realTimeInfo.weekTitle,
        startDate: realTimeInfo.startDate,
        endDate: realTimeInfo.endDate,
        slots: []
      });
      await timetable.save();
    } else if (!timetable.weekTitle || timetable.weekTitle.includes('24 Aug - 29 Aug 2026')) {
      timetable.weekTitle = realTimeInfo.weekTitle;
      timetable.startDate = realTimeInfo.startDate;
      timetable.endDate = realTimeInfo.endDate;
      await timetable.save();
    }

    let resultSlots = timetable.slots || [];
    if (facultyName) {
      const lower = facultyName.toLowerCase().trim();
      resultSlots = resultSlots.filter(s => {
        if (s.isSplit && s.subSlots && s.subSlots.length > 0) {
          return s.subSlots.some(sub => sub.facultyName && sub.facultyName.toLowerCase().includes(lower));
        }
        return s.facultyName && s.facultyName.toLowerCase().includes(lower);
      }).map(s => {
        if (s.isSplit && s.subSlots && s.subSlots.length > 0) {
          const subMatch = s.subSlots.find(sub => sub.facultyName && sub.facultyName.toLowerCase().includes(lower));
          if (subMatch) {
            return {
              ...s.toObject(),
              facultyName: subMatch.facultyName,
              subject: subMatch.subject || s.subject,
              groupInfo: subMatch.groupInfo || s.groupInfo
            };
          }
        }
        return s;
      });
    }

    res.json({
      ...timetable.toObject(),
      slots: resultSlots
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET Download Timetable PDF (Single Day OR Complete Week)
router.get('/download-pdf', async (req, res) => {
  try {
    const { day = 'ALL', batch = 'evening' } = req.query; // 'ALL', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'
    let timetable = await Timetable.findOne({ batch }).sort({ updatedAt: -1 });
    const realTimeInfo = getRealTimeWeekInfo();

    const displayWeekTitle = (timetable && timetable.weekTitle && !timetable.weekTitle.includes('24 Aug - 29 Aug 2026'))
      ? timetable.weekTitle 
      : realTimeInfo.weekTitle;

    const pdfBuffer = await generateTimetablePDF({
      weekTitle: displayWeekTitle,
      selectedDay: day,
      slots: timetable?.slots || [],
      morningTimeSlots: timetable?.morningTimeSlots || [],
      batch
    });

    const isMorning = batch === 'morning';
    const dayNameStr = day === 'ALL' ? 'Complete_Week' : `Day_${day}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Midas_${isMorning ? 'Morning' : 'Evening'}_Timetable_${dayNameStr}_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST Send Timetable PDF via Email
router.post('/send-email', async (req, res) => {
  try {
    const { day = 'ALL', recipientEmail, batch = 'evening' } = req.body;
    let timetable = await Timetable.findOne({ batch }).sort({ updatedAt: -1 });
    const realTimeInfo = getRealTimeWeekInfo();

    const displayWeekTitle = (timetable && timetable.weekTitle && !timetable.weekTitle.includes('24 Aug - 29 Aug 2026'))
      ? timetable.weekTitle 
      : realTimeInfo.weekTitle;

    const pdfBuffer = await generateTimetablePDF({
      weekTitle: displayWeekTitle,
      selectedDay: day,
      slots: timetable?.slots || [],
      morningTimeSlots: timetable?.morningTimeSlots || [],
      batch
    });

    const isMorning = batch === 'morning';
    const scopeTitle = isMorning ? 'Morning Main School Academic Timetable' : 'Evening House Activity Timetable';
    const scopeStr = day === 'ALL' ? `Complete Week ${scopeTitle}` : `Selected Day Timetable (${day})`;
    const emailSubject = `[Midas Eduventures] ${scopeStr} - ${displayWeekTitle}`;
    const emailBody = `Dear Principal & Coordinator,\n\nPlease find attached the official ${scopeTitle} PDF (${scopeStr}).\n\n` +
      `📅 Period: ${displayWeekTitle}\n` +
      `📌 Branch: ${isMorning ? 'MORNING MAIN SCHOOL BATCH' : 'EVENING EXTRA-CURRICULAR ACTIVITY'}\n\n` +
      `Best regards,\nMidas Eduventures Academic System`;

    const result = await sendWeeklyReportEmail({
      recipientEmail: recipientEmail || process.env.PRINCIPAL_EMAIL || 'mohd.692003@gmail.com',
      subject: emailSubject,
      text: emailBody,
      pdfBuffer,
      filename: `Midas_${isMorning ? 'Morning' : 'Evening'}_Timetable_${day}_${Date.now()}.pdf`
    });

    res.json({
      message: `${scopeTitle} PDF successfully sent via email (${result.recipient})!`,
      subject: emailSubject,
      previewUrl: result.previewUrl
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET Timetable assigned to a specific faculty (Searches Morning & Evening Batches)
router.get('/faculty/:facultyName', async (req, res) => {
  try {
    const { facultyName } = req.params;
    const { batch } = req.query;
    const filter = batch ? { batch } : {};
    const timetables = await Timetable.find(filter).sort({ updatedAt: -1 });
    if (!timetables || timetables.length === 0) return res.json([]);

    const assignedSlots = [];
    const lowerSearch = facultyName.toLowerCase();

    timetables.forEach(timetable => {
      const batchLabel = timetable.batch === 'morning' ? 'Morning Academic' : 'Evening Activity';
      (timetable.slots || []).forEach(s => {
        if (s.isSplit && s.subSlots && s.subSlots.length > 0) {
          const matchingSub = s.subSlots.find(sub => 
            sub.facultyName && sub.facultyName.toLowerCase().includes(lowerSearch)
          );
          if (matchingSub) {
            assignedSlots.push({
              ...s.toObject(),
              batch: timetable.batch,
              batchLabel,
              subject: matchingSub.subject || s.subject,
              facultyName: matchingSub.facultyName,
              groupInfo: matchingSub.groupInfo || matchingSub.grade || s.groupInfo,
              timeRange: (matchingSub.timeRange && matchingSub.timeRange !== s.timeRange) 
                ? matchingSub.timeRange 
                : (matchingSub.timeRange || s.timeRange),
              subSlotDetails: matchingSub
            });
          }
        } else if (s.isSuspended || (s.facultyName && s.facultyName.toLowerCase().includes(lowerSearch))) {
          assignedSlots.push({
            ...s.toObject(),
            batch: timetable.batch,
            batchLabel
          });
        }
      });
    });

    res.json(assignedSlots);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST / PUT update Timetable (Admin / Main Coordinator / Morning Admin)
router.post('/', async (req, res) => {
  try {
    const { weekTitle, weekNumber, academicYear, startDate, endDate, slots, morningTimeSlots, batch = 'evening' } = req.body;
    
    let timetable = await Timetable.findOne({ batch });
    if (timetable) {
      timetable.weekTitle = weekTitle || getRealTimeWeekInfo().weekTitle;
      timetable.weekNumber = weekNumber || timetable.weekNumber;
      timetable.academicYear = academicYear || timetable.academicYear;
      timetable.startDate = startDate || getRealTimeWeekInfo().startDate;
      timetable.endDate = endDate || getRealTimeWeekInfo().endDate;
      timetable.slots = slots || timetable.slots;
      if (morningTimeSlots) timetable.morningTimeSlots = morningTimeSlots;
      timetable.batch = batch;
      timetable.updatedAt = Date.now();
      await timetable.save();
    } else {
      const realTimeInfo = getRealTimeWeekInfo();
      timetable = new Timetable({
        batch,
        weekTitle: weekTitle || realTimeInfo.weekTitle,
        weekNumber: weekNumber || realTimeInfo.weekNumber,
        academicYear: academicYear || realTimeInfo.academicYear,
        startDate: startDate || realTimeInfo.startDate,
        endDate: endDate || realTimeInfo.endDate,
        slots: slots || [],
        morningTimeSlots: morningTimeSlots || []
      });
      await timetable.save();
    }

    // Create automatic push notification for assigned faculties
    if (slots && slots.length > 0) {
      const Notification = require('../models/Notification');
      for (const slot of slots) {
        if (slot.isSuspended) {
          await Notification.create({
            title: `🚫 Class Suspended: ${slot.day} (${slot.timeRange})`,
            body: `Class at ${slot.house} is suspended. Reason: ${slot.suspendReason || 'Suspended by Admin'}.`,
            targetFacultyName: slot.facultyName || 'ALL',
            type: 'timetable',
            senderName: 'Main Coordinator (Admin)'
          }).catch(e => console.error('[Notif Creation Error]', e.message));
        } else if (slot.facultyName && slot.subject) {
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

// POST Copy or Move Day Timetable slots to target day(s)
router.post('/copy-day', async (req, res) => {
  try {
    const { sourceDay, targetDays, isMove = false } = req.body;
    if (!sourceDay || !targetDays || !Array.isArray(targetDays) || targetDays.length === 0) {
      return res.status(400).json({ message: 'Source day and target days array are required' });
    }

    let timetable = await Timetable.findOne();
    if (!timetable) return res.status(404).json({ message: 'Timetable grid not found' });

    const sourceSlots = timetable.slots.filter(s => s.day === sourceDay);
    if (sourceSlots.length === 0) {
      return res.status(400).json({ message: `No timetable slots configured for ${sourceDay} to copy` });
    }

    // For each target day, remove old slots for target day and copy source slots
    targetDays.forEach(targetDay => {
      if (targetDay === sourceDay && !isMove) return;

      // Remove existing slots for target day
      timetable.slots = timetable.slots.filter(s => s.day !== targetDay);

      // Clone source slots for target day
      sourceSlots.forEach(src => {
        const cloned = src.toObject();
        delete cloned._id;
        cloned.day = targetDay;
        timetable.slots.push(cloned);
      });
    });

    // If move option selected, remove source slots after copying
    if (isMove) {
      timetable.slots = timetable.slots.filter(s => s.day !== sourceDay);
    }

    timetable.updatedAt = Date.now();
    await timetable.save();

    const actionStr = isMove ? 'moved' : 'copied';
    res.json({
      message: `Timetable for ${sourceDay} successfully ${actionStr} to ${targetDays.join(', ')}!`,
      timetable
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

