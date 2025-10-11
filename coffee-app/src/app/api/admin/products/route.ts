export const runtime = 'node';

import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { Prisma } from '@prisma/client'; // ✅ استيراد Prisma الرسمي

/**
 * POST: إنشاء منتج جديد
 * المسار: /api/admin/products
 * الحماية: يتطلب دور 'admin'
 */
export async function POST(request: Request) {
    const authResult = await authenticateToken(request as any, 'admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }

    try {
        const { name, price, imageUrl, categoryId, stock, description } = await request.json();

        if (!name || typeof name !== 'string' || !price || typeof price !== 'number' || !categoryId) {
            return NextResponse.json({ error: 'Name, price, and category ID are required.' }, { status: 400 });
        }

        const existingProduct = await db.product.findUnique({
            where: { name: name.trim() },
        });

        if (existingProduct) {
            return NextResponse.json({ error: 'Product name already exists.' }, { status: 409 });
        }

        const product = await db.product.create({
            data: {
                name: name.trim(),
                price: new Prisma.Decimal(price), // ✅ استخدام Prisma.Decimal بدل Runtime library
                imageUrl: imageUrl || 'https://placehold.co/100x100/A0522D/white?text=Coffee',
                categoryId,
                stock: stock !== undefined ? parseInt(stock, 10) : 0,
                description: description || null,
            },
        });

        return NextResponse.json({
            message: 'Product created successfully',
            product
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating product:', error);
        return NextResponse.json({ error: 'Internal Server Error while creating product.' }, { status: 500 });
    }
}

/**
 * GET: جلب جميع المنتجات
 * المسار: /api/admin/products
 * الحماية: يتطلب دور 'admin'
 */
export async function GET(request: Request) {
    const authResult = await authenticateToken(request as any, 'admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }

    try {
        const products = await db.product.findMany({
            include: {
                category: {
                    select: { name: true }
                }
            },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(products, { status: 200 });

    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: 'Internal Server Error while fetching products.' }, { status: 500 });
    }
}