/**
 * 5S Denetim raporunu gerçek (vektör) bir PDF olarak üretir.
 *
 * Ekran görüntüsü / window.print() yerine doğrudan çizim yapılır; böylece çıktı
 * sayfa kırılmalarından etkilenmez, metinler seçilebilir kalır ve Türkçe karakterler
 * (ş, ğ, İ, ı ...) için gömülü bir yazı tipi kullanılır.
 *
 * Bu modül ağır olduğu için yalnızca "PDF Al" düğmesine basıldığında yüklenir.
 */
import { jsPDF } from 'jspdf';
import regularFontUrl from '../assets/fonts/DejaVuSans.ttf?url';
import boldFontUrl from '../assets/fonts/DejaVuSans-Bold.ttf?url';

const FONT = 'DejaVu';
const PAGE = { w: 210, h: 297, margin: 14 };
const CONTENT_W = PAGE.w - PAGE.margin * 2;
const TARGET = 85;

const COLORS = {
  ink: [30, 41, 59],
  muted: [100, 116, 139],
  line: [226, 232, 240],
  soft: [241, 245, 249],
  teal: [20, 184, 166],
  tealDark: [15, 118, 110],
  indigo: [99, 102, 241],
  green: [16, 185, 129],
  amber: [245, 158, 11],
  rose: [244, 63, 94],
};

const scoreColor = (score) =>
  score >= TARGET ? COLORS.green : score >= 70 ? COLORS.amber : COLORS.rose;

const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

const fetchBuffer = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Dosya alınamadı: ${url}`);
  return response.arrayBuffer();
};

const loadLogo = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

async function createDocument() {
  const [regular, bold] = await Promise.all([
    fetchBuffer(regularFontUrl),
    fetchBuffer(boldFontUrl),
  ]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  doc.addFileToVFS('DejaVuSans.ttf', toBase64(regular));
  doc.addFont('DejaVuSans.ttf', FONT, 'normal');
  doc.addFileToVFS('DejaVuSans-Bold.ttf', toBase64(bold));
  doc.addFont('DejaVuSans-Bold.ttf', FONT, 'bold');
  doc.setFont(FONT, 'normal');
  return doc;
}

/** Sığmayan metni "…" ile keser. */
const fit = (doc, text, maxWidth) => {
  const value = String(text ?? '');
  if (doc.getTextWidth(value) <= maxWidth) return value;
  let out = value;
  while (out.length > 1 && doc.getTextWidth(`${out}…`) > maxWidth) out = out.slice(0, -1);
  return `${out}…`;
};

const setText = (doc, { size = 9, bold = false, color = COLORS.ink } = {}) => {
  doc.setFont(FONT, bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
};

function drawHeader(doc, { logo, title, subtitle, meta }) {
  doc.setFillColor(...COLORS.tealDark);
  doc.rect(0, 0, PAGE.w, 30, 'F');
  doc.setFillColor(...COLORS.teal);
  doc.rect(0, 30, PAGE.w, 1.4, 'F');

  let textX = PAGE.margin;
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(PAGE.margin, 6, 18, 18, 2, 2, 'F');
    doc.addImage(logo, 'JPEG', PAGE.margin + 1.5, 7.5, 15, 15);
    textX += 23;
  }

  setText(doc, { size: 17, bold: true, color: [255, 255, 255] });
  doc.text(title, textX, 14.5);
  setText(doc, { size: 10, color: [204, 251, 241] });
  doc.text(subtitle, textX, 21);

  setText(doc, { size: 8, color: [204, 251, 241] });
  meta.forEach((line, idx) =>
    doc.text(line, PAGE.w - PAGE.margin, 12 + idx * 4.6, { align: 'right' }),
  );
}

function drawFooter(doc, label) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.2);
    doc.line(PAGE.margin, PAGE.h - 12, PAGE.w - PAGE.margin, PAGE.h - 12);
    setText(doc, { size: 7.5, color: COLORS.muted });
    doc.text(label, PAGE.margin, PAGE.h - 7.5);
    doc.text(`Sayfa ${i} / ${pages}`, PAGE.w - PAGE.margin, PAGE.h - 7.5, { align: 'right' });
  }
}

function drawSectionTitle(doc, y, text, note) {
  doc.setFillColor(...COLORS.teal);
  doc.roundedRect(PAGE.margin, y - 4, 1.6, 6, 0.8, 0.8, 'F');
  setText(doc, { size: 11.5, bold: true });
  doc.text(text, PAGE.margin + 4, y);
  if (note) {
    setText(doc, { size: 8, color: COLORS.muted });
    doc.text(note, PAGE.w - PAGE.margin, y, { align: 'right' });
  }
  return y + 5;
}

function drawKpis(doc, y, items) {
  const gap = 3;
  const width = (CONTENT_W - gap * (items.length - 1)) / items.length;
  items.forEach((item, idx) => {
    const x = PAGE.margin + idx * (width + gap);
    doc.setFillColor(...COLORS.soft);
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, width, 20, 2.5, 2.5, 'FD');
    doc.setFillColor(...(item.color || COLORS.teal));
    doc.roundedRect(x, y, 1.6, 20, 0.8, 0.8, 'F');

    setText(doc, { size: 7.5, color: COLORS.muted });
    doc.text(item.label.toUpperCase(), x + 5, y + 6);
    setText(doc, { size: 15, bold: true, color: item.color || COLORS.ink });
    doc.text(fit(doc, item.value, width - 8), x + 5, y + 14);
    if (item.hint) {
      setText(doc, { size: 7, color: COLORS.muted });
      doc.text(fit(doc, item.hint, width - 8), x + 5, y + 18);
    }
  });
  return y + 20;
}

/** Alan puanlarını yatay çubuk grafikle (hedef çizgisiyle) çizer. */
function drawAreaBars(doc, y, rows) {
  const labelW = 30;
  const valueW = 14;
  const barX = PAGE.margin + labelW;
  const barW = CONTENT_W - labelW - valueW;
  const rowH = 7;
  const chartH = rows.length * rowH;

  // Izgara (0-100, 25'er)
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.15);
  [0, 25, 50, 75, 100].forEach((tick) => {
    const x = barX + (barW * tick) / 100;
    doc.line(x, y - 1, x, y + chartH);
    setText(doc, { size: 6.5, color: COLORS.muted });
    doc.text(`${tick}`, x, y + chartH + 3.5, { align: 'center' });
  });

  rows.forEach((row, idx) => {
    const rowY = y + idx * rowH;
    setText(doc, { size: 8.5, bold: true });
    doc.text(fit(doc, row.name, labelW - 3), PAGE.margin, rowY + 4.4);

    const w = Math.max(0.6, (barW * Math.min(100, row.puan)) / 100);
    doc.setFillColor(...scoreColor(row.puan));
    doc.roundedRect(barX, rowY + 1, w, rowH - 2.6, 1, 1, 'F');

    setText(doc, { size: 8.5, bold: true, color: scoreColor(row.puan) });
    doc.text(`%${row.puan}`, PAGE.w - PAGE.margin, rowY + 4.4, { align: 'right' });
  });

  // Hedef çizgisi
  const targetX = barX + (barW * TARGET) / 100;
  doc.setDrawColor(...COLORS.amber);
  doc.setLineWidth(0.4);
  doc.setLineDash([1.6, 1.2], 0);
  doc.line(targetX, y - 2, targetX, y + chartH);
  doc.setLineDash([], 0);
  setText(doc, { size: 7, bold: true, color: COLORS.amber });
  doc.text(`Hedef %${TARGET}`, targetX, y - 3, { align: 'center' });

  return y + chartH + 7;
}

function drawAreaTable(doc, y, rows, onNewPage) {
  const cols = [
    { key: 'name', label: 'Alan / Tezgah', w: 30, align: 'left' },
    { key: 'seiri', label: '1S Ayıklama', w: 21, align: 'center', pct: true },
    { key: 'seiton', label: '2S Düzen', w: 20, align: 'center', pct: true },
    { key: 'seiso', label: '3S Temizlik', w: 21, align: 'center', pct: true },
    { key: 'seiketsu', label: '4S Standart', w: 21, align: 'center', pct: true },
    { key: 'shitsuke', label: '5S Disiplin', w: 21, align: 'center', pct: true },
    { key: 'puan', label: 'Toplam', w: 18, align: 'center', pct: true, total: true },
    { key: 'auditor', label: 'Denetçi', w: CONTENT_W - 152, align: 'left' },
  ];
  const rowH = 7;

  const drawHead = (headY) => {
    doc.setFillColor(...COLORS.tealDark);
    doc.rect(PAGE.margin, headY, CONTENT_W, 7.5, 'F');
    setText(doc, { size: 7.5, bold: true, color: [255, 255, 255] });
    let x = PAGE.margin;
    cols.forEach((col) => {
      const tx = col.align === 'center' ? x + col.w / 2 : x + 2;
      doc.text(col.label, tx, headY + 5, { align: col.align === 'center' ? 'center' : 'left' });
      x += col.w;
    });
    return headY + 7.5;
  };

  let cursor = drawHead(y);
  rows.forEach((row, idx) => {
    if (cursor + rowH > PAGE.h - 18) {
      cursor = drawHead(onNewPage());
    }
    if (idx % 2 === 0) {
      doc.setFillColor(...COLORS.soft);
      doc.rect(PAGE.margin, cursor, CONTENT_W, rowH, 'F');
    }
    let x = PAGE.margin;
    cols.forEach((col) => {
      const raw = row[col.key];
      setText(doc, {
        size: col.total ? 8.5 : 8,
        bold: col.key === 'name' || col.total,
        color: col.total ? scoreColor(row.puan) : COLORS.ink,
      });
      const text = col.pct ? `%${raw}` : fit(doc, raw || '5S Denetim Ekibi', col.w - 3);
      const tx = col.align === 'center' ? x + col.w / 2 : x + 2;
      doc.text(text, tx, cursor + 4.8, { align: col.align === 'center' ? 'center' : 'left' });
      x += col.w;
    });
    cursor += rowH;
  });

  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.2);
  doc.line(PAGE.margin, cursor, PAGE.w - PAGE.margin, cursor);
  return cursor + 6;
}

/** Tek alanın 12 aylık skorunu çizgi grafikle çizer; veri olmayan aylarda çizgi kesilir. */
function drawTrendChart(doc, y, data) {
  const plotX = PAGE.margin + 9;
  const plotW = CONTENT_W - 12;
  const plotH = 54;
  const xAt = (i) => plotX + (plotW * (i + 0.5)) / data.length;
  const yAt = (v) => y + plotH - (plotH * v) / 100;

  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.15);
  [0, 25, 50, 75, 100].forEach((tick) => {
    doc.line(plotX, yAt(tick), plotX + plotW, yAt(tick));
    setText(doc, { size: 6.5, color: COLORS.muted });
    doc.text(`${tick}`, plotX - 2, yAt(tick) + 1, { align: 'right' });
  });

  // Hedef çizgisi
  doc.setDrawColor(...COLORS.amber);
  doc.setLineWidth(0.4);
  doc.setLineDash([1.6, 1.2], 0);
  doc.line(plotX, yAt(TARGET), plotX + plotW, yAt(TARGET));
  doc.setLineDash([], 0);
  setText(doc, { size: 7, bold: true, color: COLORS.amber });
  doc.text(`Hedef %${TARGET}`, plotX + plotW, yAt(TARGET) - 1.4, { align: 'right' });

  data.forEach((d, i) => {
    setText(doc, { size: 7, color: COLORS.muted });
    doc.text(d.ay.slice(0, 3), xAt(i), y + plotH + 5, { align: 'center' });
  });

  // Çizgi: yalnızca ardışık dolu aylar birbirine bağlanır.
  doc.setDrawColor(...COLORS.indigo);
  doc.setLineWidth(0.9);
  for (let i = 1; i < data.length; i += 1) {
    if (data[i].skor !== null && data[i - 1].skor !== null) {
      doc.line(xAt(i - 1), yAt(data[i - 1].skor), xAt(i), yAt(data[i].skor));
    }
  }
  data.forEach((d, i) => {
    if (d.skor === null) return;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...COLORS.indigo);
    doc.setLineWidth(0.8);
    doc.circle(xAt(i), yAt(d.skor), 1.4, 'FD');
    setText(doc, { size: 7.5, bold: true, color: COLORS.indigo });
    doc.text(`%${d.skor}`, xAt(i), yAt(d.skor) - 3, { align: 'center' });
  });

  return y + plotH + 10;
}

function drawMonthTable(doc, y, data) {
  const colW = CONTENT_W / 12;
  doc.setFillColor(...COLORS.soft);
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.2);
  doc.rect(PAGE.margin, y, CONTENT_W, 6.5, 'F');
  doc.rect(PAGE.margin, y + 6.5, CONTENT_W, 6.5, 'S');
  data.forEach((d, i) => {
    const cx = PAGE.margin + colW * i + colW / 2;
    setText(doc, { size: 7, bold: true, color: COLORS.muted });
    doc.text(d.ay.slice(0, 3), cx, y + 4.4, { align: 'center' });
    if (d.skor === null) {
      setText(doc, { size: 8, color: COLORS.muted });
      doc.text('-', cx, y + 11, { align: 'center' });
    } else {
      setText(doc, { size: 8, bold: true, color: scoreColor(d.skor) });
      doc.text(`%${d.skor}`, cx, y + 11, { align: 'center' });
    }
  });
  return y + 13 + 6;
}

/**
 * @param {object} params
 * @param {string} params.periodLabel  "Ekim 2026" gibi dönem etiketi
 * @param {string} params.periodKey    "2026-10" (dosya adı için)
 * @param {Array}  params.periodData   Alan puanları (name, puan, seiri...shitsuke, auditor)
 * @param {string} params.trendArea    Yıllık grafiği çizilen alan
 * @param {number} params.trendYear    Yıllık grafiğin yılı
 * @param {Array}  params.trendData    12 aylık veri ({ ay, skor })
 * @param {string} params.preparedBy   Raporu alan kullanıcı
 */
export async function exportAuditReportPdf({
  periodLabel,
  periodKey,
  periodData,
  trendArea,
  trendYear,
  trendData,
  preparedBy,
}) {
  const [doc, logo] = await Promise.all([
    createDocument(),
    loadLogo(`${import.meta.env.BASE_URL}parsanlogo.jpeg`),
  ]);

  const reportDate = new Date().toLocaleDateString('tr-TR');
  const header = {
    logo,
    title: '5S Denetim Raporu',
    subtitle: `Dönem: ${periodLabel}`,
    meta: [`Rapor Tarihi: ${reportDate}`, `Hazırlayan: ${preparedBy || '-'}`],
  };

  drawHeader(doc, header);
  let y = 42;

  // --- Özet -------------------------------------------------------------------
  if (periodData.length > 0) {
    const average = Math.round(periodData.reduce((sum, r) => sum + r.puan, 0) / periodData.length);
    const best = periodData[0];
    const worst = periodData[periodData.length - 1];
    const belowTarget = periodData.filter((r) => r.puan < TARGET).length;

    y = drawKpis(doc, y, [
      { label: 'Denetlenen Alan', value: `${periodData.length}`, hint: periodLabel },
      {
        label: 'Ortalama Puan',
        value: `%${average}`,
        color: scoreColor(average),
        hint: `Hedef %${TARGET}`,
      },
      { label: 'En Yüksek', value: `%${best.puan}`, color: scoreColor(best.puan), hint: best.name },
      {
        label: 'En Düşük',
        value: `%${worst.puan}`,
        color: scoreColor(worst.puan),
        hint: worst.name,
      },
      {
        label: 'Hedef Altı Alan',
        value: `${belowTarget}`,
        color: belowTarget ? COLORS.rose : COLORS.green,
        hint: `%${TARGET} altında`,
      },
    ]);
    y += 10;

    y = drawSectionTitle(
      doc,
      y,
      `${periodLabel} — Denetim Alanlarının Puanları`,
      'Toplam 5S skoru (%)',
    );
    y += 5;
    y = drawAreaBars(doc, y, periodData);

    // Tablo bölünmesin: tamamı sığmıyorsa yeni sayfada başlasın.
    const tableHeight = 7.5 + 7 * periodData.length + 12;
    if (y + 6 + tableHeight > PAGE.h - 16) {
      doc.addPage();
      y = PAGE.margin + 6;
    } else {
      y += 6;
    }
    y = drawSectionTitle(doc, y, '5S Kırılımı ve Denetçiler', `${periodData.length} alan`);
    y += 2;
    y = drawAreaTable(doc, y, periodData, () => {
      doc.addPage();
      return PAGE.margin + 4;
    });
  } else {
    y = drawSectionTitle(doc, y, `${periodLabel} — Denetim Alanlarının Puanları`);
    y += 4;
    doc.setFillColor(...COLORS.soft);
    doc.roundedRect(PAGE.margin, y, CONTENT_W, 22, 3, 3, 'F');
    setText(doc, { size: 10, bold: true, color: COLORS.muted });
    doc.text(`${periodLabel} döneminde kayıtlı denetim bulunmuyor.`, PAGE.w / 2, y + 13, {
      align: 'center',
    });
    y += 30;
  }

  // --- Yıllık trend -----------------------------------------------------------
  const trendNeeds = 105;
  if (y + trendNeeds > PAGE.h - 16) {
    doc.addPage();
    y = PAGE.margin + 6;
  } else {
    y += 4;
  }

  y = drawSectionTitle(
    doc,
    y,
    `${trendArea} — ${trendYear} Yılı Aylık 5S Puanları`,
    'Aylık son denetim',
  );
  y += 8;
  const hasTrend = trendData.some((d) => d.skor !== null);
  if (hasTrend) {
    y = drawTrendChart(doc, y, trendData);
    drawMonthTable(doc, y, trendData);
  } else {
    doc.setFillColor(...COLORS.soft);
    doc.roundedRect(PAGE.margin, y - 2, CONTENT_W, 22, 3, 3, 'F');
    setText(doc, { size: 10, bold: true, color: COLORS.muted });
    doc.text(
      `${trendYear} yılında ${trendArea} alanı için kayıtlı denetim bulunmuyor.`,
      PAGE.w / 2,
      y + 10,
      {
        align: 'center',
      },
    );
  }

  // --- İmza alanı -------------------------------------------------------------
  let signY = (hasTrend ? y + 13 + 6 : y + 26) + 4;
  if (signY + 22 > PAGE.h - 14) {
    doc.addPage();
    signY = PAGE.margin + 16;
  }
  [
    ['5S Saha Denetçisi', 'İmza / Tarih'],
    ['Fabrika 5S ve TKY Yöneticisi', 'İmza / Kaşe'],
  ].forEach(([role, hint], idx) => {
    const cx = PAGE.margin + CONTENT_W * (idx === 0 ? 0.25 : 0.75);
    doc.setDrawColor(...COLORS.muted);
    doc.setLineWidth(0.3);
    doc.line(cx - 32, signY + 11, cx + 32, signY + 11);
    setText(doc, { size: 8.5, bold: true });
    doc.text(role, cx, signY + 16, { align: 'center' });
    setText(doc, { size: 7.5, color: COLORS.muted });
    doc.text(hint, cx, signY + 20, { align: 'center' });
  });

  drawFooter(doc, 'PARSAN İşletme Portalı • 5S Denetim Raporu');
  doc.setProperties({
    title: `5S Denetim Raporu — ${periodLabel}`,
    subject: '5S Denetim Dashboard',
    author: 'PARSAN İşletme Portalı',
  });
  doc.save(`5S-Denetim-Raporu-${periodKey}.pdf`);
}
