import type ExcelJS from 'exceljs';

/**
 * Bulk attendance Excel helpers (Download-Template + parse), matching the kiosk
 * marker flow. Columns (row 1 = header, data from row 2):
 *   1: Student ID | 2: Payment Status (optional: paid / unpaid)
 */

const cellText = (cell: ExcelJS.Cell): string => {
    const v = cell?.value as unknown;
    if (v == null) return '';
    if (typeof v === 'object') {
        const o = v as { text?: unknown; result?: unknown };
        if (o.text != null) return String(o.text);
        if (o.result != null) return String(o.result);
        return '';
    }
    return String(v);
};

export interface BulkAttendanceRow {
    studentId: string;
    payment: 'enrolled' | 'unpaid';
}

export async function parseAttendanceExcel(file: File): Promise<BulkAttendanceRow[]> {
    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const sheet = wb.worksheets[0];
    if (!sheet) throw new Error('The file has no worksheets.');

    const rows: BulkAttendanceRow[] = [];
    sheet.eachRow((row, n) => {
        if (n === 1) return;
        const studentId = cellText(row.getCell(1)).trim();
        if (!studentId) return;
        const status = cellText(row.getCell(2)).trim().toLowerCase();
        rows.push({ studentId, payment: status === 'unpaid' ? 'unpaid' : 'enrolled' });
    });
    if (!rows.length) throw new Error('No student IDs found in the file.');
    return rows;
}

export async function downloadAttendanceTemplate(): Promise<void> {
    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    const sheet = wb.addWorksheet('Attendance');
    sheet.columns = [
        { header: 'Student ID', key: 'id', width: 32 },
        { header: 'Payment Status (paid / unpaid)', key: 'status', width: 30 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.addRow({ id: 'paste-student-uid-here', status: 'paid' });
    sheet.addRow({ id: 'another-student-uid', status: 'unpaid' });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance-template.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
