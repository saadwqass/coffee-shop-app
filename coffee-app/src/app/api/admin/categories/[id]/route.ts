export const runtime = 'node';

import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

// تعريف الواجهة لبارامترات المسار (مثل ID)
interface Context {
    params: {
        id: string;
    };
}

/**
 * PUT: تحديث صنف موجود
 * المسار: /api/admin/categories/[id]
 * الحماية: يتطلب دور 'admin'
 */
export async function PUT(request: Request, context: Context) {
    // 1. التحقق من المصادقة والدور
    const authResult = await authenticateToken(request as any, 'admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }

    const categoryId = context.params.id;

    try {
        const { name } = await request.json();

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json({ error: 'Category name is required and cannot be empty.' }, { status: 400 });
        }

        // 2. تحديث الصنف في قاعدة البيانات
        const updatedCategory = await db.category.update({
            where: { id: categoryId },
            data: { name: name.trim() },
        });

        return NextResponse.json({
            message: 'Category updated successfully',
            category: updatedCategory
        }, { status: 200 });

    } catch (error: any) {
        // P2025: حدث عند محاولة تحديث صنف غير موجود
        if (error.code === 'P2025') {
            return NextResponse.json({ error: `Category with ID ${categoryId} not found.` }, { status: 404 });
        }
        console.error('Error updating category:', error);
        return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
    }
}

/**
 * DELETE: حذف صنف
 * المسار: /api/admin/categories/[id]
 * الحماية: يتطلب دور 'admin'
 */
export async function DELETE(request: Request, context: Context) {
    // 1. التحقق من المصادقة والدور
    const authResult = await authenticateToken(request as any, 'admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }

    const categoryId = context.params.id;

    try {
        // 2. التحقق مما إذا كان الصنف يحتوي على منتجات مرتبطة
        const productsCount = await db.product.count({
            where: { categoryId: categoryId },
        });

        if (productsCount > 0) {
            return NextResponse.json({ 
                error: 'Cannot delete category because it still contains products. Please move or delete products first.' 
            }, { status: 409 }); // 409 Conflict
        }

        // 3. حذف الصنف
        await db.category.delete({
            where: { id: categoryId },
        });

        return NextResponse.json({
            message: 'Category deleted successfully'
        }, { status: 200 });

    } catch (error: any) {
        // P2025: حدث عند محاولة حذف صنف غير موجود
        if (error.code === 'P2025') {
            return NextResponse.json({ error: `Category with ID ${categoryId} not found.` }, { status: 404 });
        }
        console.error('Error deleting category:', error);
        return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
    }
}