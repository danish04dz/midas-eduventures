const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const { getRealTimeWeekInfo } = require('./dateHelper');

/**
 * House Color Palette Definitions
 */
const houseColors = {
  'Gryffindor': { primary: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', badgeText: '#991b1b' },
  'Slytherin':  { primary: '#15803d', bg: '#f0fdf4', border: '#86efac', badgeText: '#166534' },
  'Hufflepuff': { primary: '#b45309', bg: '#fffbeb', border: '#fde68a', badgeText: '#92400e' },
  'Ravenclaw':  { primary: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd', badgeText: '#1e40af' }
};

/**
 * Generates a Weekly Curriculum Tracking PDF Report matching Midas Concept School layout.
 */
function generateWeeklyReportPDF(reportData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', err => reject(err));

    const realTimeInfo = getRealTimeWeekInfo();
    const {
      schoolName = 'MIDAS CONCEPT SCHOOL',
      tagline = 'Where every mind learns to lead and shine',
      weekTitle = `Weekly Report (${realTimeInfo.monthName})`,
      weekRange = realTimeInfo.weekTitle,
      subject = 'Evening House Activity & Extra-Curricular Weekly Report',
      facultyName = 'All Teachers (Combined)',
      dailyReports = []
    } = reportData;

    const logoFileToUse = path.join(__dirname, '../../client/src/assets/midas_logo-removebg-preview.png');

    drawHeader(doc, schoolName, tagline, weekTitle, weekRange, subject, facultyName, logoFileToUse);

    let y = 140;

    if (!dailyReports || dailyReports.length === 0) {
      doc.fontSize(11).font('Helvetica-Oblique').fillColor('#64748b').text('No daily reports logged for this week.', 40, y);
    } else {
      dailyReports.forEach((report, index) => {
        if (y > 670) {
          doc.addPage();
          y = 40;
        }

        y = drawDailyEntry(doc, report, y);
        y += 15;
      });
    }

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#94a3b8').text(
        `Midas Eduventures © 2026 | Generated on ${new Date().toLocaleDateString()} | Page ${i + 1} of ${range.count}`,
        40,
        doc.page.height - 30,
        { align: 'center', width: doc.page.width - 80 }
      );
    }

    doc.end();
  });
}

/**
 * Generates a Master Activity Timetable PDF with House Names & Distinct House Colors.
 */
function generateTimetablePDF(ttData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', err => reject(err));

    const realTimeInfo = getRealTimeWeekInfo();
    let displayWeekTitle = ttData.weekTitle;
    if (!displayWeekTitle || displayWeekTitle.includes('24 Aug - 29 Aug 2026')) {
      displayWeekTitle = realTimeInfo.weekTitle;
    }

    const {
      selectedDay = 'ALL',
      slots = [],
      morningTimeSlots = [],
      batch = 'evening'
    } = ttData;

    const isMorning = batch === 'morning';
    const logoFileToUse = path.join(__dirname, '../../client/src/assets/midas_logo-removebg-preview.png');

    // Header Container
    doc.rect(40, 25, 760, 65).fillAndStroke('#f8fafc', '#cbd5e1');

    if (fs.existsSync(logoFileToUse)) {
      try {
        doc.image(logoFileToUse, 48, 30, { fit: [50, 50] });
      } catch (e) {
        drawFallbackLogo(doc);
      }
    } else {
      drawFallbackLogo(doc);
    }

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a').text('MIDAS CONCEPT SCHOOL', 110, 34);
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('#4338ca').text(
      isMorning ? 'Morning Main School Academic Timetable' : 'Master Evening House Activity Timetable', 
      110, 54
    );

    const scopeTitle = selectedDay === 'ALL' 
      ? (isMorning ? 'Complete Week Morning Academic Timetable' : 'Complete Week Evening Master Timetable') 
      : `Selected Day Timetable: ${selectedDay}`;

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(scopeTitle, 0, 34, { align: 'right', width: 780 });
    doc.font('Helvetica').fontSize(9).fillColor('#475569').text(`${displayWeekTitle} | ${realTimeInfo.monthName}`, 0, 52, { align: 'right', width: 780 });

    let y = 100;
    const daysToRender = selectedDay === 'ALL' ? ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] : [selectedDay];

    if (isMorning) {
      // MORNING ACADEMIC TIMETABLE PDF LAYOUT
      const timeSlotsToUse = (morningTimeSlots && morningTimeSlots.length > 0)
        ? morningTimeSlots
        : [
            { slotNumber: 1, label: 'Period 1', timeRange: '09:30 AM - 10:15 AM' },
            { slotNumber: 2, label: 'Period 2', timeRange: '10:15 AM - 11:00 AM' },
            { slotNumber: 3, label: 'Period 3', timeRange: '11:00 AM - 11:45 AM' },
            { slotNumber: 4, label: 'Period 4', timeRange: '11:45 AM - 12:30 PM' },
            { slotNumber: 5, label: 'Lunch Break', timeRange: '12:30 PM - 01:15 PM' },
            { slotNumber: 6, label: 'Period 5', timeRange: '01:15 PM - 02:00 PM' }
          ];

      daysToRender.forEach(day => {
        if (y > 450) {
          doc.addPage();
          y = 35;
        }

        const dInfo = realTimeInfo.dayDates[day];
        const dayLabel = dInfo 
          ? `DAY: ${day} (${dInfo.fullDateStr})${dInfo.isToday ? ' [TODAY]' : ''}`
          : `DAY: ${day}`;

        // Day Title Banner
        doc.rect(40, y, 760, 22).fill('#312e81');
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff').text(dayLabel, 50, y + 6);
        y += 22;

        const maxSlotsPerRow = Math.min(timeSlotsToUse.length, 6);
        const colWidth = Math.floor(760 / maxSlotsPerRow);

        // Header Row for Period Columns
        doc.rect(40, y, 760, 20).fill('#e0e7ff');
        let xOffset = 40;
        timeSlotsToUse.slice(0, maxSlotsPerRow).forEach(ts => {
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e1b4b').text(`${ts.label.toUpperCase()} (${ts.timeRange})`, xOffset + 4, y + 5, { width: colWidth - 8, align: 'center' });
          xOffset += colWidth;
        });
        y += 20;

        // Content Row for Periods
        const cellHeight = 44;
        xOffset = 40;

        timeSlotsToUse.slice(0, maxSlotsPerRow).forEach(ts => {
          doc.rect(xOffset, y, colWidth, cellHeight).fillAndStroke('#ffffff', '#c7d2fe');

          const slotItem = slots.find(s => s.day === day && s.slotNumber === ts.slotNumber);
          if (slotItem) {
            if (slotItem.isSplit && slotItem.subSlots && slotItem.subSlots.length > 0) {
              const sub1 = slotItem.subSlots[0] || {};
              const sub2 = slotItem.subSlots[1] || {};
              doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e1b4b').text(`1. ${sub1.subject || 'Period'} (${sub1.grade || 'Grp 1'})`, xOffset + 4, y + 4, { width: colWidth - 8 });
              doc.font('Helvetica').fontSize(7).fillColor('#4338ca').text(`T: ${sub1.facultyName || 'TBA'}`, xOffset + 4, y + 14);
              doc.moveTo(xOffset + 4, y + 22).lineTo(xOffset + colWidth - 4, y + 22).dash(2, { space: 2 }).stroke('#c7d2fe').undash();
              doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e1b4b').text(`2. ${sub2.subject || 'Period'} (${sub2.grade || 'Grp 2'})`, xOffset + 4, y + 24, { width: colWidth - 8 });
              doc.font('Helvetica').fontSize(7).fillColor('#4338ca').text(`T: ${sub2.facultyName || 'TBA'}`, xOffset + 4, y + 34);
            } else {
              doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text(slotItem.subject || 'Class Period', xOffset + 6, y + 5, { width: colWidth - 12 });
              doc.font('Helvetica-Bold').fontSize(8).fillColor('#4338ca').text(slotItem.facultyName || 'TBA', xOffset + 6, y + 18);
              doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(`Class: ${slotItem.grade || 'General'}`, xOffset + 6, y + 30);
            }
          } else {
            doc.font('Helvetica-Oblique').fontSize(8).fillColor('#94a3b8').text('Unassigned', xOffset + colWidth / 2 - 25, y + 16);
          }

          xOffset += colWidth;
        });

        y += cellHeight + 12;
      });
    } else {
      // EVENING HOUSE ACTIVITY TIMETABLE PDF LAYOUT
      const houses = ['Gryffindor', 'Slytherin', 'Hufflepuff', 'Ravenclaw'];

      daysToRender.forEach(day => {
        if (y > 450) {
          doc.addPage();
          y = 35;
        }

        const dInfo = realTimeInfo.dayDates[day];
        const dayLabel = dInfo 
          ? `DAY: ${day} (${dInfo.fullDateStr})${dInfo.isToday ? ' [TODAY]' : ''}`
          : `DAY: ${day}`;

        // Day Title Banner
        doc.rect(40, y, 760, 22).fill('#0f172a');
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff').text(dayLabel, 50, y + 6);
        y += 22;

        // Table House Columns Header Banner
        doc.rect(40, y, 160, 22).fillAndStroke('#e2e8f0', '#cbd5e1');
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text('TIME / HOUSE', 48, y + 6);

        let xH = 200;
        houses.forEach(hName => {
          const hColor = houseColors[hName] || { primary: '#475569' };
          doc.rect(xH, y, 150, 22).fill(hColor.primary);
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff').text(`${hName.toUpperCase()} HOUSE`, xH, y + 6, { align: 'center', width: 150 });
          xH += 150;
        });
        y += 22;

        // Dynamic Slot Rows for Evening Batch
        const availableSlots = Array.from(new Set(slots.filter(s => s.day === day).map(s => s.slotNumber)));
        const slotNumbersToRender = availableSlots.length > 0 ? availableSlots.sort((a,b)=>a-b) : [1, 2];

        slotNumbersToRender.forEach(slotNum => {
          const matchingAnySlot = slots.find(s => s.day === day && s.slotNumber === slotNum);
          const timeRangeStr = matchingAnySlot?.timeRange || (slotNum === 1 ? '5:30 PM - 6:30 PM' : '6:30 PM - 7:30 PM');
          const cellHeight = 48;
          
          doc.rect(40, y, 160, cellHeight).fillAndStroke('#f8fafc', '#cbd5e1');
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155').text(`${timeRangeStr}\n(Slot ${slotNum})`, 45, y + 14);

          let xOffset = 200;
          houses.forEach(house => {
            const cellWidth = 150;
            const hTheme = houseColors[house] || { bg: '#ffffff', border: '#cbd5e1', primary: '#475569', badgeText: '#0f172a' };

            doc.rect(xOffset, y, cellWidth, cellHeight).fillAndStroke(hTheme.bg, hTheme.border);
            doc.rect(xOffset, y, 4, cellHeight).fill(hTheme.primary);

            const slotItem = slots.find(s => s.day === day && s.slotNumber === slotNum && (s.house === house || s.house === 'All Houses'));
            if (slotItem) {
              if (slotItem.isSuspended) {
                doc.rect(xOffset, y, cellWidth, cellHeight).fillAndStroke('#fef2f2', '#fca5a5');
                doc.rect(xOffset, y, 4, cellHeight).fill('#dc2626');
                doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#991b1b').text('CLASS SUSPENDED', xOffset + 10, y + 6, { width: cellWidth - 14 });
                doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#b91c1c').text(`Reason: ${slotItem.suspendReason || 'Suspended'}`, xOffset + 10, y + 19, { width: cellWidth - 14 });
                if (slotItem.facultyName) {
                  doc.font('Helvetica').fontSize(7).fillColor('#7f1d1d').text(`Faculty: ${slotItem.facultyName}`, xOffset + 10, y + 33, { width: cellWidth - 14 });
                }
              } else if (slotItem.isSplit && slotItem.subSlots && slotItem.subSlots.length > 0) {
                const sub1 = slotItem.subSlots[0] || {};
                const sub2 = slotItem.subSlots[1] || {};
                doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0f172a').text(`1. ${sub1.subject || 'Activity'}`, xOffset + 8, y + 3, { width: cellWidth - 12 });
                doc.font('Helvetica').fontSize(7).fillColor(hTheme.primary).text(`${sub1.facultyName || 'TBA'} (${sub1.groupInfo || sub1.grade || 'Grp 1'})`, xOffset + 8, y + 13);
                doc.moveTo(xOffset + 6, y + 24).lineTo(xOffset + cellWidth - 6, y + 24).dash(2, { space: 2 }).stroke('#cbd5e1').undash();
                doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0f172a').text(`2. ${sub2.subject || 'Activity'}`, xOffset + 8, y + 27, { width: cellWidth - 12 });
                doc.font('Helvetica').fontSize(7).fillColor(hTheme.primary).text(`${sub2.facultyName || 'TBA'} (${sub2.groupInfo || sub2.grade || 'Grp 2'})`, xOffset + 8, y + 37);
              } else {
                doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text(slotItem.subject || 'Activity', xOffset + 10, y + 5, { width: cellWidth - 14 });
                doc.font('Helvetica-Bold').fontSize(8).fillColor(hTheme.primary).text(slotItem.facultyName || 'TBA', xOffset + 10, y + 18);
                doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(`House: ${house}`, xOffset + 10, y + 29);
                doc.font('Helvetica').fontSize(7).fillColor('#64748b').text(`(${slotItem.groupInfo || slotItem.grade || 'All Groups'})`, xOffset + 10, y + 37);
              }
            } else {
              doc.font('Helvetica-Oblique').fontSize(8).fillColor('#94a3b8').text('Unassigned Slot', xOffset + 10, y + 20);
            }

            xOffset += cellWidth;
          });

          y += cellHeight;
        });

        y += 12;
      });
    }

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#94a3b8').text(
        `Midas Eduventures © 2026 | ${isMorning ? 'Morning Main School Academic' : 'Master Activity'} Timetable PDF | Page ${i + 1} of ${range.count}`,
        40,
        doc.page.height - 25,
        { align: 'center', width: doc.page.width - 80 }
      );
    }

    doc.end();
  });
}

function drawHeader(doc, schoolName, tagline, weekTitle, weekRange, subject, facultyName, logoFileToUse) {
  doc.rect(40, 35, 515, 85).fillAndStroke('#f8fafc', '#cbd5e1');

  if (logoFileToUse && fs.existsSync(logoFileToUse)) {
    try {
      doc.image(logoFileToUse, 48, 42, { fit: [42, 42] });
    } catch (e) {
      drawFallbackLogo(doc);
    }
  } else {
    drawFallbackLogo(doc);
  }

  doc.font('Helvetica-Bold').fontSize(15).fillColor('#0f172a').text(schoolName, 96, 42);
  doc.font('Helvetica-Oblique').fontSize(8).fillColor('#64748b').text(tagline, 96, 60);

  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(weekTitle, 0, 42, { align: 'right', width: 540 });
  doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(weekRange, 0, 58, { align: 'right', width: 540 });

  doc.moveTo(45, 82).lineTo(545, 82).strokeColor('#cbd5e1').stroke();

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#334155').text(`Report Scope: `, 50, 88);
  doc.font('Helvetica').fillColor('#0f172a').text(subject, 120, 88);

  doc.font('Helvetica-Bold').fillColor('#334155').text(`Faculty: `, 360, 88);
  doc.font('Helvetica').fillColor('#0f172a').text(facultyName, 405, 88);
}

function drawFallbackLogo(doc) {
  doc.save();
  doc.path('M 55 45 Q 65 45 65 55 L 65 65 L 55 65 Z').fill('#ea580c');
  doc.path('M 67 45 L 77 45 Q 77 55 77 65 L 67 65 Z').fill('#16a34a');
  doc.path('M 55 67 L 65 67 L 65 87 Q 55 87 55 77 Z').fill('#2563eb');
  doc.path('M 67 67 L 77 67 Q 77 77 77 87 L 67 87 Z').fill('#eab308');
  doc.restore();
}

function drawDailyEntry(doc, report, startY) {
  let y = startY;

  const boxHeight = 36;
  doc.rect(40, y, 515, boxHeight).fillAndStroke('#ffffff', '#94a3b8');

  doc.moveTo(270, y).lineTo(270, y + boxHeight).strokeColor('#cbd5e1').stroke();
  doc.moveTo(40, y + 18).lineTo(555, y + 18).strokeColor('#cbd5e1').stroke();

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text('Date', 48, y + 4);
  doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(report.formattedDateStr || report.date || 'N/A', 130, y + 4);

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text('Day & Teacher', 48, y + 22);
  doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(`${report.day || 'N/A'} (${report.facultyName})`, 130, y + 22);

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text('No. of Sessions Allocated', 278, y + 4);
  doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(String(report.allocatedSessions ?? 1), 490, y + 4);

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text('No. of Sessions Taken', 278, y + 22);
  doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(String(report.takenSessions ?? 1), 490, y + 22);

  y += boxHeight + 8;

  if (report.isHoliday) {
    doc.font('Helvetica-BoldOblique').fontSize(13).fillColor('#dc2626').text('Holiday', 40, y, { align: 'center', width: 515 });
    return y + 25;
  }

  const sessions = report.sessions && report.sessions.length > 0 ? report.sessions : [{
    grade: report.grade || '9 - 10',
    house: report.house || 'Gryffindor House',
    timeRange: report.timeRange || '5:30 PM - 6:30 PM',
    presentStudents: report.presentStudents || '___ / ___',
    topic: report.topic || 'General Session',
    summaryPoints: report.summaryPoints || []
  }];

  sessions.forEach(sess => {
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text(`Grade: `, 40, y);
    doc.font('Helvetica').fontSize(9.5).fillColor('#334155').text(sess.grade || '9 - 10', 80, y);
    y += 14;

    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text(`House: `, 40, y);
    doc.font('Helvetica').fontSize(9.5).fillColor('#334155').text(`${sess.house || 'Gryffindor'} (${sess.timeRange || '5:30 PM - 6:30 PM'})`, 85, y);
    y += 14;

    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text(`Number of Student Present: `, 40, y);
    doc.font('Helvetica').fontSize(9.5).fillColor('#334155').text(sess.presentStudents || '___ / ___', 190, y);
    y += 16;

    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text('Summary of the session conducted:', 40, y);
    y += 14;

    if (sess.topic) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(`Topic: ${sess.topic}`, 40, y);
      y += 14;
    }

    if (sess.summaryPoints && sess.summaryPoints.length > 0) {
      doc.font('Helvetica').fontSize(8.5).fillColor('#334155');
      sess.summaryPoints.forEach(pt => {
        if (pt && pt.trim()) {
          doc.text(`•  ${pt.trim()}`, 52, y, { width: 490 });
          y += doc.heightOfString(`•  ${pt.trim()}`, { width: 490 }) + 3;
        }
      });
    }

    y += 6;
  });

  if (report.principalRemark) {
    doc.font('Helvetica-BoldOblique').fontSize(8.5).fillColor('#6b21a8').text(`Principal Remark (${report.remarkBy || 'Principal'}): "${report.principalRemark}"`, 40, y, { width: 515 });
    y += 16;
  }

  return y;
}

module.exports = { generateWeeklyReportPDF, generateTimetablePDF };
