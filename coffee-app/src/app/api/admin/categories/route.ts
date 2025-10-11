export const runtime = 'node';

import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';

/**
 * POST: إنشاء صنف جديد للمنتجات (مثل: مشروبات ساخنة، معجنات)
 * المسار: /api/admin/categories
 * الحماية: يتطلب دور 'admin'
 */
export async function POST(request: Request) {
    // 1. التحقق من المصادقة والدور (يجب أن يكون 'admin')
    const authResult = await authenticateToken(request as any, 'admin');

    if (authResult instanceof NextResponse) {
        return authResult;
    }

    try {
        const { name } = await request.json();

        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Category name is required and must be a string.' }, { status: 400 });
        }

        // 2. التحقق من وجود الصنف بالفعل
        const existingCategory = await db.category.findUnique({
            where: { name: name.trim() },
        });

        if (existingCategory) {
            return NextResponse.json({ error: 'Category already exists.' }, { status: 409 });
        }

        // 3. إنشاء الصنف في قاعدة البيانات
        const category = await db.category.create({
            data: {
                name: name.trim(),
            },
        });

        return NextResponse.json({ 
            message: 'Category created successfully', 
            category 
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating category:', error);
        return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
    }
}

/**
 * GET: جلب جميع الأصناف
 * المسار: /api/admin/categories
 * الحماية: يتطلب دور 'admin'
 */
export async function GET(request: Request) {
    // 1. التحقق من المصادقة والدور
    const authResult = await authenticateToken(request as any, 'admin');

    if (authResult instanceof NextResponse) {
        return authResult;
    }

    try {
        // 2. جلب جميع الأصناف من قاعدة البيانات
        const categories = await db.category.findMany({
            orderBy: { name: 'asc' }, // ترتيب أبجدي
        });

        // 3. إرجاع الاستجابة
        return NextResponse.json(categories, { status: 200 });

    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
    }
}