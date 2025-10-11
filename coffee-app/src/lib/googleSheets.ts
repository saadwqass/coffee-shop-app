import { google } from 'googleapis';

// واجهة لتحديد شكل البيانات التي سيتم تمريرها (يمكن أن تكون أي تقرير)
interface ExportRow {
    [key: string]: string | number | Date | null | undefined;
}

/**
 * إعداد المصادقة باستخدام حساب خدمة Google
 */
function getGoogleAuth() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return auth;
}

/**
 * تصدير البيانات إلى Google Sheets
 * @param spreadsheetId معرف جدول البيانات
 * @param range نطاق الخلايا (مثال: 'Sheet1!A1')
 * @param data بيانات التقرير
 * @param headers رؤوس الأعمدة (اختياري)
 * @returns كائن النجاح ورابط الجدول
 */
export async function exportToGoogleSheet(
    spreadsheetId: string,
    range: string,
    data: ExportRow[],
    headers?: string[]
): Promise<{ success: boolean; url?: string }> {
    try {
        if (!data || data.length === 0) {
            console.warn('No data provided for Google Sheets export.');
            return { success: false };
        }

        const auth = getGoogleAuth();
        const sheets = google.sheets({ version: 'v4', auth });

        // تحديد الرؤوس إذا لم يتم تمريرها
        const finalHeaders = headers || Object.keys(data[0]);
        const rows: (string | number)[][] = [];

        // إضافة الصفوف: الرؤوس أولاً
        if (finalHeaders.length > 0) {
            rows.push(finalHeaders);
        }

        // إضافة بيانات التقرير
        data.forEach(item => {
            const row = finalHeaders.map(header => {
                const value = item[header];
                if (value instanceof Date) return value.toISOString();
                if (value === null || value === undefined) return '';
                return value;
            });
            rows.push(row);
        });

        // إرسال البيانات إلى Google Sheets
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: rows,
            },
        });

        const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
        return { success: true, url: sheetUrl };

    } catch (error) {
        console.error('GOOGLE SHEETS EXPORT ERROR:', error);
        return { success: false };
    }
}