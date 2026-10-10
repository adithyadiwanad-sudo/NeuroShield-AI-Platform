import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';

export const generateSecurityReport = (data, title = 'NeuroShield Security Incident Analysis') => {
  const doc = new jsPDF();

  // Header Banner
  doc.setFillColor(11, 16, 32); // #0B1020
  doc.rect(0, 0, 210, 40, 'F');

  // Title & Subtitle
  doc.setTextColor(0, 229, 168); // #00E5A8
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('NEUROSHIELD IDS', 14, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(title, 14, 28);

  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text(`Generated: ${new Date().toLocaleString()} | Classification: RESTRICTED SECURITY REPORT`, 14, 35);

  // Summary Metrics Section
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 14, 50);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);

  if (data.overall_risk || data.risk_level) {
    const risk = data.overall_risk || data.risk_level || 'Low';
    doc.text(`Overall Threat Risk Rating: ${risk.toUpperCase()}`, 14, 58);
  }

  if (data.total_records !== undefined) {
    doc.text(`Total Records Analyzed: ${data.total_records} | Malicious Flows Flagged: ${data.threats_detected || 0}`, 14, 64);
    if (data.main_attack_category) {
      doc.text(`Dominant Attack Category: ${data.main_attack_category}`, 14, 70);
    }
  }

  if (data.explanation) {
    doc.setFont('helvetica', 'bold');
    doc.text('AI Technical Analysis & Root Cause:', 14, 80);
    doc.setFont('helvetica', 'normal');
    const splitExplanation = doc.splitTextToSize(data.explanation, 180);
    doc.text(splitExplanation, 14, 86);
  }

  let currentY = 105;

  // Recommendations Table
  if (data.recommendations && data.recommendations.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Recommended Incident Mitigation Playbook', 14, currentY);

    const recRows = data.recommendations.map((rec, i) => [`Step ${i + 1}`, rec]);
    autoTable(doc, {
      startY: currentY + 4,
      head: [['Step', 'Action Required']],
      body: recRows,
      theme: 'grid',
      headStyles: { fillStyle: 'F', fillColor: [79, 140, 255] },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 15;
  }

  // Network Intrusion Breakdown Table if present
  if (data.results && data.results.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Network Telemetry Detection Breakdown', 14, currentY);

    const rows = data.results.slice(0, 20).map((r) => [
      `#${r.record_index}`,
      r.attack_type,
      `${r.confidence}%`,
      r.risk_level,
      r.features ? `${r.features.protocol} / ${r.features.service}` : 'Standard'
    ]);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Index', 'Attack Class', 'Confidence', 'Risk Rating', 'Protocol/Service']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [0, 229, 168], textColor: [11, 16, 32] },
      margin: { left: 14, right: 14 }
    });
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`NeuroShield IDS Platform - Confidential Report - Page ${i} of ${pageCount}`, 14, 287);
  }

  doc.save(`NeuroShield_Security_Report_${Date.now()}.pdf`);
};
