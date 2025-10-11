export const runtime = 'node';



import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { exportToGoogleSheet } from '@/lib/googleSheets';

/**
 * GET: تصدير تقرير المبيعات إلى Google Sheets
 * المسار: /api/admin/reports/export-sales
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

        // 1. جلب البيانات المراد تصديرها (مثلاً: جميع المبيعات)
        const salesData = await db.sale.findMany({
            orderBy: { saleTime: 'asc' },
            select: {
                id: true,
                saleTime: true,
                subtotal: true,
                vatAmount: true,
                feeAmount: true,
                totalAmount: true,
                paymentMethod: true,
                seller: { select: { name: true } },
            },
        });

        if (salesData.length === 0) {
            return NextResponse.json({ message: 'No sales data to export.' }, { status: 200 });
        }

        // 2. تهيئة البيانات للتصدير
        const exportData = salesData.map(sale => ({
            'Sale ID': sale.id,
            'Sale Time': sale.saleTime,
            'Seller Name': sale.seller.name || 'N/A',
            'Subtotal (SAR)': sale.subtotal.toNumber(),
            'VAT (SAR)': sale.vatAmount.toNumber(),
            'Fees (SAR)': sale.feeAmount.toNumber(),
            'Total Amount (SAR)': sale.totalAmount.toNumber(),
            'Payment Method': sale.paymentMethod,
        }));
        
        const sheetName = `Sales_Report_${new Date().toISOString().split('T')[0]}`;
        const range = `${sheetName}!A1`; // يضيف الرؤوس والبيانات ابتداءً من الخلية A1 في ورقة باسم التقرير

        // 3. التصدير الفعلي
        const result: { success: boolean; url?: string } = await exportToGoogleSheet(
            spreadsheetId,
            range,
            exportData,
            Object.keys(exportData[0]) // استخدام رؤوس الكائن الأول
        );

        if (result.success) {
            return NextResponse.json({
                message: 'Sales data successfully exported to Google Sheet.',
                spreadsheetUrl: result.url,
                exportedCount: exportData.length
            }, { status: 200 });
        } else {
            return NextResponse.json({ error: 'Failed to export data to Google Sheets. Check server logs for details.' }, { status: 500 });
        }

    } catch (error) {
        console.error('Error in export sales API:', error);
        return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
    }
}