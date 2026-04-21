/**
 * @file js/20-pdf-generator.js
 * @description PDF generation for invoice downloads via jsPDF
 */

/**
 * Fetch invoice and initiate PDF generation
 * @param {string} id - Invoice ID
 */
async function downloadInvoicePDF(id) {
  try {
    const { data, error } = await supabase.from('invoices')
      .select('*, invoice_items(*)').eq('id', id).single();
    if (error) { toast('Erreur: ' + error.message, 'error'); return; }
    const inv = {
      ...data,
      items: (data.invoice_items || []).sort((a, b) => a.position - b.position),
    };
    await logAction('invoice.pdf', 'invoice', id, inv.number);
    await buildInvoicePDF(inv);
  } catch (e) {
    console.error('downloadInvoicePDF', e);
    toast('Erreur inattendue', 'error');
  }
}

/**
 * Convert image URL to data URL for embedding in PDF
 * @param {string} url - Image URL
 * @returns {Promise<string|null>} Data URL or null if fetch fails
 */
async function imageToDataURL(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Build and download invoice PDF with jsPDF
 * Handles multi-page layout, totals, signature block, and workspace branding
 * @param {object} inv - Invoice object with items array
 */
async function buildInvoicePDF(inv) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 18, marginR = 18;
  const contentW = pageW - marginL - marginR;
  const w = state.workspace;

  // Pre-load logo and stamp
  let logoData = null, stampData = null;
  if (w.logo_url) logoData = await imageToDataURL(w.logo_url);
  if (w.stamp_url) stampData = await imageToDataURL(w.stamp_url);

  // ---------- HEADER ----------
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', marginL, 15, 38, 29);
    } catch {}
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 76, 138);
    doc.text(w.company_name || 'ALU SPACE', marginL, 25);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(w.company_tagline || 'Menuiserie Aluminium', marginL, 31);
  }

  // Date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text(`LE : ${fmtDate(inv.date)}`, pageW - marginR, 22, { align: 'right' });

  // FACTURE N° — centered
  doc.setFontSize(14);
  doc.setTextColor(227, 6, 19);
  doc.text(`FACTURE N°: ${inv.number}`, pageW / 2, 32, { align: 'center' });

  // Client block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 30, 30);
  let y = 52;
  const lbl = (label, val, yy) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label} :`, marginL, yy);
    doc.setFont('helvetica', 'normal');
    doc.text(String(val || ''), marginL + 22, yy);
  };
  lbl('Client', inv.client_name, y);
  y += 5.5;
  if (inv.client_cin) {
    lbl('CIN', inv.client_cin, y);
    y += 5.5;
  }
  if (inv.client_tel) {
    lbl('TEL', inv.client_tel, y);
    y += 5.5;
  }
  if (inv.client_adresse) {
    lbl('Adresse', inv.client_adresse, y);
    y += 5.5;
  }
  y += 3;

  // ---------- DESIGNATIONS TABLE ----------
  const head = [['Désignations', 'Qte', 'P.U HT', 'P.T HT']];
  const body = inv.items
    .filter(it => it.designation || (Number(it.qte) > 0 && Number(it.pu) > 0))
    .map(it => [
      it.designation || '',
      String(it.qte || ''),
      fmt3(Number(it.pu) || 0),
      fmt3((Number(it.qte) || 0) * (Number(it.pu) || 0)),
    ]);

  doc.autoTable({
    head,
    body,
    startY: y,
    margin: { left: marginL, right: marginR, bottom: 28 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9.8,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
      textColor: [20, 20, 20],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [20, 20, 20],
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: contentW * 0.52 },
      1: { cellWidth: contentW * 0.1, halign: 'center' },
      2: { cellWidth: contentW * 0.19, halign: 'right' },
      3: { cellWidth: contentW * 0.19, halign: 'right' },
    },
    didDrawPage: () => drawFooter(doc, pageW, pageH, w),
  });

  // ---------- TOTALS + SIGNATURE ----------
  let cy = doc.lastAutoTable.finalY + 6;

  const totalRows = [
    ['TOTAL HT', fmt3(inv.total_ht)],
    [`FODEC ${w.tax_fodec}%`, fmt3(inv.total_fodec)],
    ['TOTAL NET HT', fmt3(inv.total_net_ht)],
    [`TVA ${w.tax_tva}%`, fmt3(inv.total_tva)],
    ['TIMBRE', fmt3(inv.total_timbre)],
    ['TOTAL TTC', fmt3(inv.total_ttc)],
  ];

  const neededMM = 90;
  if (cy + neededMM > pageH - 28) {
    doc.addPage();
    drawFooter(doc, pageW, pageH, w);
    cy = 20;
  }

  const totalsX = pageW - marginR - 85;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  totalRows.forEach((row, idx) => {
    const yy = cy + idx * 6;
    doc.setFont('helvetica', idx === 5 ? 'bold' : 'normal');
    doc.setFontSize(idx === 5 ? 11 : 10.5);
    doc.text(row[0], totalsX, yy, { align: 'left' });
    doc.text(row[1], pageW - marginR, yy, { align: 'right' });
    if (idx === 4) {
      doc.setLineWidth(0.5);
      doc.setDrawColor(0, 0, 0);
      doc.line(totalsX - 2, yy + 2.5, pageW - marginR, yy + 2.5);
    }
  });
  cy += totalRows.length * 6 + 4;

  // Montant en lettres
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('MONTANT EN LETTRE :', marginL, cy);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const melTxt = num2wordsFR(inv.total_ttc);
  const melLines = doc.splitTextToSize(melTxt, contentW - 55);
  doc.text(melLines, marginL + 52, cy);
  cy += Math.max(6, melLines.length * 5);

  // Règlement
  if (inv.reglement) {
    cy += 3;
    doc.setFont('helvetica', 'bold');
    doc.text('RÈGLEMENT :', marginL, cy);
    doc.setFont('helvetica', 'bold');
    doc.text(inv.reglement, marginL + 52, cy);
    cy += 8;
  } else {
    cy += 4;
  }

  // Signature + stamp
  cy += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(227, 6, 19);
  doc.text('Signature', pageW - marginR - 35, cy, { align: 'center' });
  cy += 4;
  if (stampData) {
    try {
      doc.addImage(stampData, 'PNG', pageW - marginR - 60, cy, 55, 22);
    } catch {}
  }

  doc.setTextColor(0, 0, 0);
  doc.save(`FACTURE_${inv.number}.pdf`);
  toast('PDF généré', 'success');
}

/**
 * Draw footer on each PDF page with company info and page number
 * @param {object} doc - jsPDF document instance
 * @param {number} pageW - Page width
 * @param {number} pageH - Page height
 * @param {object} w - Workspace object
 */
function drawFooter(doc, pageW, pageH, w) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(122, 122, 122);
  const y = pageH - 18;
  const l1 = `Siège Social: ${w.company_address || ''}`;
  const l2 = `Tel.: ${w.company_tel || ''} - Mobile: ${w.company_mobile || ''} / Matricule Fiscal : ${w.company_matricule || ''} / Email: ${w.company_email || ''}`;
  const l3 = `RIB : ${w.company_rib || ''}    Agence : ${w.company_agence || ''}`;
  doc.text(l1, pageW / 2, y, { align: 'center' });
  doc.text(l2, pageW / 2, y + 3.5, { align: 'center' });
  doc.text(l3, pageW / 2, y + 7, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageW - 18, pageH - 7, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}
