import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Reservation, Tenant } from '@/types'
import { fmtCurrency } from './utils'

type RGB = [number, number, number]
type AugDoc = jsPDF & { lastAutoTable: { finalY: number } }

const DARK: RGB = [13, 31, 45]
const GRAY: RGB = [120, 130, 140]
const RULE: RGB = [185, 185, 185]

const tc = (doc: jsPDF, c: RGB) => doc.setTextColor(c[0], c[1], c[2])
const dc = (doc: jsPDF, c: RGB) => doc.setDrawColor(c[0], c[1], c[2])

function frDate(iso: string) {
  return format(parseISO(iso), 'dd MMMM yyyy', { locale: fr })
}

// toLocaleString('fr-TN') uses U+00A0 as thousands separator — jsPDF can't render it
function pdfSafe(s: string): string {
  return s.replace(/ /g, ' ').replace(/ /g, ' ')
}

function hRule(doc: jsPDF, y: number, x1 = 14, x2 = 196) {
  dc(doc, RULE)
  doc.setLineWidth(0.3)
  doc.line(x1, y, x2, y)
  doc.setLineWidth(0.2)
}

function drawHeader(doc: jsPDF, docType: string, docNumber: string, agencyName: string): number {
  // Agency name — serif, large, editorial
  doc.setFont('times', 'bold')
  doc.setFontSize(22)
  tc(doc, DARK)
  doc.text(agencyName, 14, 21)

  // Doc type / number / date — right, discreet
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  tc(doc, GRAY)
  doc.text(docType, 196, 12, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  tc(doc, DARK)
  doc.text(docNumber, 196, 20, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  tc(doc, GRAY)
  doc.text(`Émis le ${format(new Date(), 'dd/MM/yyyy')}`, 196, 27, { align: 'right' })

  hRule(doc, 33)
  return 33
}

function drawInfoSection(doc: jsPDF, r: Reservation, startY: number): number {
  const nights = differenceInDays(parseISO(r.check_out), parseISO(r.check_in))
  let y = startY + 11

  // Column labels
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  tc(doc, GRAY)
  doc.text('CLIENT', 14, y)
  doc.text('RÉSERVATION', 110, y)
  y += 7

  // Names
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  tc(doc, DARK)
  doc.text(r.client?.full_name ?? '—', 14, y)
  doc.text(r.villa?.name ?? '—', 110, y)
  y += 6

  // Details
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  tc(doc, GRAY)

  let clientBottomY = y
  if (r.client?.email) { doc.text(r.client.email, 14, clientBottomY); clientBottomY += 5 }
  if (r.client?.phone) { doc.text(r.client.phone, 14, clientBottomY); clientBottomY += 5 }

  const dateStr = `${frDate(r.check_in)} au ${frDate(r.check_out)}`
  doc.text(dateStr, 110, y)
  doc.text(`${nights} nuit${nights > 1 ? 's' : ''}  ·  ${r.guests} pers.`, 110, y + 5)

  const bottom = Math.max(clientBottomY, y + 11)
  hRule(doc, bottom + 5)
  return bottom + 5
}

function drawFooter(doc: jsPDF, agencyName: string) {
  hRule(doc, 274)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  tc(doc, GRAY)
  doc.text(
    `${agencyName}  ·  Document non contractuel  ·  Établi le ${format(new Date(), 'dd/MM/yyyy')}`,
    105, 280, { align: 'center' }
  )
}

function makeFmt(r: Reservation, tenant: Tenant) {
  const tenantCurrency = tenant.currency ?? 'EUR'
  if (r.client_currency && r.client_currency_rate && r.client_currency !== tenantCurrency) {
    const cr = r.client_currency
    const rate = r.client_currency_rate
    return (n: number) => pdfSafe(fmtCurrency(Math.round(n * rate * 100) / 100, cr))
  }
  return (n: number) => pdfSafe(fmtCurrency(n, tenantCurrency))
}

export function generateReceiptPDF(r: Reservation, tenant: Tenant, docNumber: string): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const fmt = makeFmt(r, tenant)
  const deposit = r.deposit_amount ?? 0
  const remaining = r.total_amount - deposit

  let y = drawHeader(doc, "REÇU D'ACOMPTE", docNumber, tenant.name)
  y = drawInfoSection(doc, r, y)
  y += 13

  // Amounts — right-aligned block
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  tc(doc, GRAY)
  doc.text('Montant total du séjour', 100, y)
  doc.setFont('helvetica', 'bold')
  tc(doc, DARK)
  doc.text(fmt(r.total_amount), 196, y, { align: 'right' })
  y += 8

  doc.setFont('helvetica', 'normal')
  tc(doc, GRAY)
  doc.text('Acompte reçu', 100, y)
  doc.setFont('helvetica', 'bold')
  doc.text(`– ${fmt(deposit)}`, 196, y, { align: 'right' })
  y += 7

  // Thin partial rule
  hRule(doc, y, 100, 196)
  y += 9

  // Reste à payer — serif, large, no box
  doc.setFont('times', 'bold')
  doc.setFontSize(15)
  tc(doc, DARK)
  doc.text('Reste à payer', 100, y)
  doc.text(fmt(remaining), 196, y, { align: 'right' })
  y += 15

  // Payment meta
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  tc(doc, GRAY)
  if (r.deposit_date) {
    doc.text(`Acompte versé le ${format(parseISO(r.deposit_date), 'dd/MM/yyyy')}`, 14, y)
    y += 5
  }
  if (r.deposit_method) {
    doc.text(`Mode de règlement : ${r.deposit_method}`, 14, y)
  }

  drawFooter(doc, tenant.name)
  return doc
}

export function generateInvoicePDF(r: Reservation, tenant: Tenant, docNumber: string): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const fmt = makeFmt(r, tenant)
  const nights = differenceInDays(parseISO(r.check_out), parseISO(r.check_in))
  const deposit = r.deposit_amount ?? 0

  let y = drawHeader(doc, 'FACTURE', docNumber, tenant.name)
  y = drawInfoSection(doc, r, y)
  y += 8

  const extrasTotal = (r.extras ?? []).reduce((s, e) => s + e.price * (e.quantity ?? 1), 0)
  const baseAmount = r.total_amount - extrasTotal
  const perNight = nights > 0 ? baseAmount / nights : baseAmount

  const rows: string[][] = [
    [
      `Séjour – ${r.villa?.name ?? '—'}`,
      `${fmt(Math.round(perNight))} / nuit`,
      `${nights}`,
      fmt(baseAmount),
    ],
    ...(r.extras ?? []).map(e => [
      e.name,
      fmt(e.price),
      String(e.quantity ?? 1),
      fmt(e.price * (e.quantity ?? 1)),
    ]),
  ]

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Prix / nuit', 'Nuits', 'Total']],
    body: rows,
    theme: 'plain',
    headStyles: {
      textColor: DARK,
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: { top: 2, bottom: 5, left: 2, right: 2 },
    },
    bodyStyles: {
      textColor: DARK,
      fontSize: 9,
      cellPadding: { top: 3.5, bottom: 3.5, left: 2, right: 2 },
    },
    columnStyles: {
      0: { cellWidth: 82 },
      1: { halign: 'right', cellWidth: 36 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 38, fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    // Draw a thin rule under header row only
    didDrawCell: (data) => {
      if (data.row.section === 'head') {
        const { x, y: cy, width, height } = data.cell
        doc.setDrawColor(RULE[0], RULE[1], RULE[2])
        doc.setLineWidth(0.4)
        doc.line(x, cy + height, x + width, cy + height)
        doc.setLineWidth(0.2)
      }
    },
  })

  const fY = (doc as AugDoc).lastAutoTable.finalY + 8

  // Thin rule before total (right side)
  hRule(doc, fY - 1, 120, 196)

  // Total — serif, large, no box
  doc.setFont('times', 'bold')
  doc.setFontSize(16)
  tc(doc, DARK)
  doc.text('Total', 140, fY + 8)
  doc.text(fmt(r.total_amount), 196, fY + 8, { align: 'right' })

  // Deposit summary
  if (deposit > 0) {
    let iy = fY + 19
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    tc(doc, GRAY)
    doc.text(`Acompte versé    ${fmt(deposit)}`, 196, iy, { align: 'right' })
    const rem = r.total_amount - deposit
    if (rem > 0) {
      iy += 6
      doc.setFont('helvetica', 'bold')
      tc(doc, DARK)
      doc.text(`Solde restant    ${fmt(rem)}`, 196, iy, { align: 'right' })
    }
  }

  drawFooter(doc, tenant.name)
  return doc
}

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename)
}

export function pdfToBase64(doc: jsPDF): string {
  return doc.output('datauristring').split(',')[1]
}
