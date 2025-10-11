export const runtime = 'node';



import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { exportToGoogleSheet } from '@/lib/googleSheets'; // الدالة المساعدة

/**
 * GET: تصدير تقرير الورديات إلى Google Sheets
 * المسار: /api/admin/reports/export-shifts
 * الحماية: يتطلب دور 'admin'
 * يتطلب: SHEET_ID كـ Query Param
 */
export async function GET(request: Request) {
    const authResult = await authenticateToken(request as any, 'admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }

    try {
        const { searchParams } = new URL(request.url);
        const spreadsheetId = searchParams.get('sheetId');
        
        if (!spreadsheetId) {
            return NextResponse.json({ error: 'Missing spreadsheetId parameter.' }, { status: 400 });
        }

        // جلب بيانات الورديات
        const shiftsData = await db.shift.findMany({
            orderBy: { startTime: 'asc' },
            select: {
                id: true,
                startTime: true,
                endTime: true,
                shiftType: true,
                startingCash: true,
                endingCash: true,
                seller: { select: { name: true } },
            },
        });

        if (shiftsData.length === 0) {
            return NextResponse.json({ message: 'No shift data to export.' }, { status: 200 });
        }

        // تهيئة البيانات للتصدير (تحويل Decimal إلى Number)
        const exportData = shiftsData.map(shift => ({
            'Shift ID': shift.id,
            'Seller Name': shift.seller.name || 'N/A',
            'Type': shift.shiftType,
            'Start Time': shift.startTime,
            'End Time': shift.endTime || 'Active',
            'Starting Cash (SAR)': shift.startingCash.toNumber(),
            'Ending Cash (SAR)': shift.endingCash?.toNumber() || 'N/A',
        }));
        
        const sheetName = `Shifts_Report_${new Date().toISOString().split('T')[0]}`;
        const range = `${sheetName}!A1`;

        // التصدير الفعلي
        const result: { success: boolean; url?: string } = await exportToGoogleSheet(
            spreadsheetId,
            range,
            exportData,
            Object.keys(exportData[0])
        );

        if (result.success) {
            return NextResponse.json({
                message: 'Shifts data successfully exported to Google Sheet.',
                spreadsheetUrl: result.url,
                exportedCount: exportData.length
            }, { status: 200 });
        }

        // إذا فشل التصدير
        return NextResponse.json({ 
            error: 'Failed to export data to Google Sheets. Check server logs for details.' 
        }, { status: 500 });

    } catch (error) {
        console.error('Error in export shifts API:', error);
        return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
    }
}