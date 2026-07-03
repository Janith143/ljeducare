import type ExcelJS from 'exceljs';
import type { Answer, Question } from '@ljeducare/shared';

/**
 * Bulk "add quiz questions via Excel" helpers — ported from hybridLMS
 * utils/quizTemplate.ts. Parser and template live together so the template we
 * hand users always matches the columns the parser reads.
 *
 * Layout (1-based columns), data from row 2:
 *   1: Question | 2–5: Option 1–4 | 6: Correct Option (1-4)
 */

const cellText = (cell: ExcelJS.Cell): string => {
    const v = cell?.value as unknown;
    if (v == null) return '';
    if (typeof v === 'object') {
        const obj = v as { text?: unknown; result?: unknown; richText?: { text: string }[] };
        if (obj.text != null) return String(obj.text);
        if (obj.result != null) return String(obj.result);
        if (Array.isArray(obj.richText)) return obj.richText.map((r) => r.text).join('');
        return '';
    }
    return String(v);
};

/** Parse an uploaded .xlsx into Question objects (throws a user-facing message). */
export async function parseQuestionsFromExcel(file: File): Promise<Question[]> {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error('The file has no worksheets.');

    const questions: Question[] = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // header

        const questionText = cellText(row.getCell(1)).trim();
        if (!questionText) return;

        const correctIndex = parseInt(cellText(row.getCell(6)), 10) || 1;
        const answers: Answer[] = [];
        for (let i = 1; i <= 4; i++) {
            const optText = cellText(row.getCell(i + 1)).trim();
            if (optText) {
                answers.push({ id: crypto.randomUUID(), text: optText, isCorrect: i === correctIndex });
            }
        }
        if (answers.length > 0) {
            questions.push({ id: crypto.randomUUID(), text: questionText, answers });
        }
    });

    if (!questions.length) throw new Error('No valid questions found in the uploaded Excel file.');
    return questions;
}

/** Build and download the blank template with example rows. */
export async function downloadQuizTemplate(filenameHint?: string): Promise<void> {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Quiz Questions');

    sheet.columns = [
        { header: 'Question', key: 'question', width: 40 },
        { header: 'Option 1', key: 'opt1', width: 20 },
        { header: 'Option 2', key: 'opt2', width: 20 },
        { header: 'Option 3', key: 'opt3', width: 20 },
        { header: 'Option 4', key: 'opt4', width: 20 },
        { header: 'Correct Option (1-4)', key: 'correct', width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.addRow({ question: 'What is the capital of France?', opt1: 'London', opt2: 'Berlin', opt3: 'Paris', opt4: 'Madrid', correct: 3 });
    sheet.addRow({ question: 'Which planet is known as the Red Planet?', opt1: 'Earth', opt2: 'Mars', opt3: 'Jupiter', opt4: 'Venus', correct: 2 });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-template${filenameHint ? '-' + filenameHint.replace(/[^\w-]+/g, '_').slice(0, 40) : ''}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
