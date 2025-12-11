import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { AssignmentWithRelations, Slot } from '@/types/db'

interface ExportOptions {
  assignments: AssignmentWithRelations[]
  slots: Slot[]
  viewType: 'section' | 'teacher'
  viewId: string
  entityName: string
}

export function generateTimetablePDF({
  assignments,
  slots,
  viewType,
  viewId,
  entityName
}: ExportOptions) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })

  // Add title
  doc.setFontSize(18)
  doc.text(`Timetable - ${entityName}`, 14, 15)
  
  doc.setFontSize(10)
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22)

  // Filter assignments for the view
  const filteredAssignments = viewId 
    ? assignments.filter(a => {
        if (viewType === 'section') {
          return a.offering?.section?.id === viewId
        } else {
          return a.offering?.teacher?.id === viewId
        }
      })
    : assignments // If no viewId (showing all), use all assignments

  // Get unique days and times
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
  const times = [...new Set(slots.map(s => s.start_time))].sort()

  // Create slot grid
  const slotGrid = slots.reduce((acc, slot) => {
    const key = `${slot.day}-${slot.start_time}`
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {} as Record<string, Slot[]>)

  // Prepare table data
  const tableData: any[][] = []
  
  times.forEach(time => {
    const row = [formatTime(time)]
    
    days.forEach(day => {
      const slotsAtTime = slotGrid[`${day}-${time}`] || []
      const cellContent: string[] = []
      
      slotsAtTime.forEach(slot => {
        const slotAssignments = filteredAssignments.filter(a => a.slot_id === slot.id)
        
        slotAssignments.forEach(assignment => {
          const course = assignment.offering?.course?.code || 'Unknown'
          const room = assignment.room?.code || 'TBA'
          const kind = assignment.kind
          
          let content = `${course} (${kind})\n${room}`
          
          // Show both section and teacher when viewing all
          if (!viewId) {
            if (assignment.offering?.section) {
              content += `\n${assignment.offering.section.name}`
            }
            if (assignment.offering?.teacher) {
              content += `\n${assignment.offering.teacher.name}`
            }
          } else if (viewType === 'teacher' && assignment.offering?.section) {
            content += `\n${assignment.offering.section.name}`
          } else if (viewType === 'section' && assignment.offering?.teacher) {
            content += `\n${assignment.offering.teacher.name}`
          }
          
          cellContent.push(content)
        })
      })
      
      row.push(cellContent.join('\n\n') || '')
    })
    
    tableData.push(row)
  })

  // Generate table
  autoTable(doc, {
    head: [['Time', ...days]],
    body: tableData,
    startY: 28,
    theme: 'grid',
    styles: {
      fontSize: viewId ? 8 : 7, // Smaller font when showing all
      cellPadding: viewId ? 3 : 2, // Less padding when showing all
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      fillColor: [255, 255, 255]
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      1: { cellWidth: viewId ? 50 : 46 }, // Smaller cells when showing all
      2: { cellWidth: viewId ? 50 : 46 },
      3: { cellWidth: viewId ? 50 : 46 },
      4: { cellWidth: viewId ? 50 : 46 },
      5: { cellWidth: viewId ? 50 : 46 }
    },
    didParseCell: function(data) {
      // Color lab cells differently
      if (data.cell.raw && typeof data.cell.raw === 'string' && data.cell.raw.includes('(P)')) {
        data.cell.styles.fillColor = [240, 240, 240]
      }
    }
  })

  // Add footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }

  return doc
}

function formatTime(time: string): string {
  if (time.includes(':')) {
    return time.substring(0, 5)
  }
  return time
}