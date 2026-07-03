import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Reservation, Tenant } from '@/types'
import { fmtCurrency } from './utils'

type RGB = [number, number, number]
type AugDoc = jsPDF & { lastAutoTable: { finalY: number } }

const NAVY: RGB  = [12, 68, 124]
const TEAL: RGB  = [7, 190, 184]
const GRAY: RGB  = [107, 122, 133]
const BEIGE: RGB = [245, 240, 232]
const DARK: RGB  = [13, 31, 45]
const WHITE: RGB = [255, 255, 255]
const MUTED: RGB = [175, 195, 210]

const fc = (doc: jsPDF, c: RGB) => doc.setFillColor(c[0], c[1], c[2])
const tc = (doc: jsPDF, c: RGB) => doc.setTextColor(c[0], c[1], c[2])
const dc = (doc: jsPDF, c: RGB) => doc.setDrawColor(c[0], c[1], c[2])

function frDate(iso: string) {
  return format(parseISO(iso), 'dd MMMM yyyy', { locale: fr })
}

function drawHeader(doc: jsPDF, docType: string, docNumber: string, agencyName: string) {
  fc(doc, NAVY); doc.rect(0, 0, 210, 36, 'F')
  fc(doc, TEAL); doc.rect(0, 36, 210, 3, 'F')

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); tc(doc, WHITE)
  doc.text(agencyName, 14, 17)

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(doc, MUTED)
  doc.text(docType, 196, 11, { align: 'right' })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); tc(doc, WHITE)
  doc.text(docNumber, 196, 21, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(doc, MUTED)
  doc.text(`Émis le ${format(new Date(), 'dd/MM/yyyy')}`, 196, 29, { align: 'right' })
}

function drawInfoBoxes(doc: jsPDF, r: Reservation): number {
  const y = 47
  const nights = differenceInDays(parseISO(r.check_out), parseISO(r.check_in))

  // Client box
  fc(doc, BEIGE); doc.rect(14, y, 86, 33, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); tc(doc, TEAL)
  doc.text('CLIENT', 19, y + 8)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); tc(doc, DARK)
  doc.text(r.client?.full_name ?? '—', 19, y + 16)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(doc, GRAY)
  let cy = y + 22
  if (r.client?.email) { doc.text(r.client.email, 19, cy); cy += 5 }
  if (r.client?.phone) doc.text(r.client.phone, 19, cy)

  // Reservation box
  fc(doc, BEIGE); doc.rect(106, y, 90, 33, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); tc(doc, TEAL)
  doc.text('RÉSERVATION', 111, y + 8)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); tc(doc, DARK)
  doc.text(r.villa?.name ?? '—', 111, y + 16)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(doc, GRAY)
  doc.text(`${frDate(r.check_in)} → ${frDate(r.check_out)}`, 111, y + 22)
  doc.text(`${nights} nuit${nights > 1 ? 's' : ''}  ·  ${r.guests} pers.`, 111, y + 28)

  return y + 40
}

function drawFooter(doc: jsPDF, agencyName: string) {
  fc(doc, NAVY); doc.rect(0, 278, 210, 19, 'F')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(doc, MUTED)
  doc.text('Merci pour votre confiance !', 105, 286, { align: 'center' })
  doc.text(`${agencyName} · Propulsé par VillaHub`, 105, 292, { align: 'center' })
}

export function generateReceiptPDF(r: Reservation, tenant: Tenant, docNumber: string): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const fmt = (n: number) => fmtCurrency(n, tenant.currency ?? 'EUR')
  const deposit = r.deposit_amount ?? 0
  const remaining = r.total_amount - deposit

  drawHeader(doc, "REÇU D'ACOMPTE", docNumber, tenant.name)
  let y = drawInfoBoxes(doc, r) + 6

  // Section label
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); tc(doc, TEAL)
  doc.text('RÉCAPITULATIF DU PAIEMENT', 14, y)
  y += 5

  dc(doc, BEIGE); doc.line(14, y, 196, y); y += 7

  // Total row
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); tc(doc, GRAY)
  doc.text('Montant total du séjour', 14, y)
  doc.setFont('helvetica', 'bold'); tc(doc, DARK)
  doc.text(fmt(r.total_amount), 196, y, { align: 'right' })
  y += 8

  // Acompte row
  doc.setFont('helvetica', 'normal'); tc(doc, TEAL)
  doc.text("Acompte reçu", 14, y)
  doc.setFont('helvetica', 'bold')
  doc.text(`- ${fmt(deposit)}`, 196, y, { align: 'right' })
  y += 5

  // Bold separator
  dc(doc, NAVY); doc.setLineWidth(0.5); doc.line(14, y, 196, y); doc.setLineWidth(0.2); y += 6

  // Reste à payer
  fc(doc, NAVY); doc.rect(14, y, 182, 13, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); tc(doc, WHITE)
  doc.text('Reste à payer', 20, y + 9)
  doc.text(fmt(remaining), 192, y + 9, { align: 'right' })
  y += 22

  // Payment details
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); tc(doc, GRAY)
  if (r.deposit_date) {
    doc.text(`Date d'acompte : ${format(parseISO(r.deposit_date), 'dd/MM/yyyy')}`, 14, y)
    y += 5
  }
  if (r.deposit_method) doc.text(`Mode de règlement : ${r.deposit_method}`, 14, y)

  drawFooter(doc, tenant.name)
  return doc
}

export function generateInvoicePDF(r: Reservation, tenant: Tenant, docNumber: string): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const fmt = (n: number) => fmtCurrency(n, tenant.currency ?? 'EUR')
  const nights = differenceInDays(parseISO(r.check_out), parseISO(r.check_in))
  const deposit = r.deposit_amount ?? 0

  drawHeader(doc, 'FACTURE', docNumber, tenant.name)
  let y = drawInfoBoxes(doc, r) + 6

  // Section label
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); tc(doc, TEAL)
  doc.text('DÉTAIL DES PRESTATIONS', 14, y)
  y += 4

  // Calculate amounts
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
    theme: 'striped',
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 9, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BEIGE },
    bodyStyles: { fontSize: 9, textColor: DARK },
    columnStyles: {
      0: { cellWidth: 82 },
      1: { halign: 'right', cellWidth: 36 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 38, fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  })

  const fY = (doc as AugDoc).lastAutoTable.finalY + 5

  // Total
  fc(doc, NAVY); doc.rect(110, fY, 86, 13, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); tc(doc, WHITE)
  doc.text('TOTAL', 116, fY + 9)
  doc.text(fmt(r.total_amount), 192, fY + 9, { align: 'right' })

  // Deposit summary
  if (deposit > 0) {
    let iy = fY + 22
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); tc(doc, GRAY)
    doc.text(`Acompte versé : ${fmt(deposit)}`, 192, iy, { align: 'right' })
    const rem = r.total_amount - deposit
    if (rem > 0) {
      iy += 6
      doc.setFont('helvetica', 'bold'); tc(doc, DARK)
      doc.text(`Solde restant : ${fmt(rem)}`, 192, iy, { align: 'right' })
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
