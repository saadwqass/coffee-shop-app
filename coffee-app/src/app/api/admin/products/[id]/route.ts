export const runtime = 'node'; 


import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { authenticateToken } from '@/lib/auth';
import { Prisma } from '@prisma/client'; // ✅ استخدام Prisma الرسمي

interface Context {
    params: {
        id: string; // معرف المنتج الذي سيتم تحديثه/حذفه
    };
}

/**
 * PUT: تحديث منتج موجود
 * المسار: /api/admin/products/[id]
 * الحماية: يتطلب دور 'admin'
 */
export async function PUT(request: Request, context: Context) {
    const authResult = await authenticateToken(request as any, 'admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }

    const productId = context.params.id;

    try {
        const { name, price, imageUrl, categoryId, stock, description, isAvailable } = await request.json();
        
        const updateData: { [key: string]: any } = {};
        
        if (name !== undefined) updateData.name = name.trim();
        if (price !== undefined) updateData.price = new Prisma.Decimal(price); // ✅ تعديل هنا
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl.trim();
        if (categoryId !== undefined) updateData.categoryId = categoryId;
        if (stock !== undefined) updateData.stock = parseInt(stock, 10);
        if (description !== undefined) updateData.description = description;
        if (isAvailable !== undefined) updateData.isAvailable = Boolean(isAvailable);

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No fields provided for update.' }, { status: 400 });
        }

        const updatedProduct = await db.product.update({
            where: { id: productId },
            data: updateData,
        });

        return NextResponse.json({
            message: 'Product updated successfully',
            product: updatedProduct
        }, { status: 200 });

    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: `Product with ID ${productId} not found.` }, { status: 404 });
        }
        console.error('Error updating product:', error);
        return NextResponse.json({ error: 'Internal Server Error while updating product.' }, { status: 500 });
    }
}

/**
 * DELETE: حذف منتج
 * المسار: /api/admin/products/[id]
 * الحماية: يتطلب دور 'admin'
 */
export async function DELETE(request: Request, context: Context) {
    const authResult = await authenticateToken(request as any, 'admin');
    if (authResult instanceof NextResponse) {
        return authResult;
    }

    const productId = context.params.id;

    try {
        await db.product.delete({
            where: { id: productId },
        });

        return NextResponse.json({
            message: 'Product deleted successfully'
        }, { status: 200 });

    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: `Product with ID ${productId} not found.` }, { status: 404 });
        }
        console.error('Error deleting product:', error);
        return NextResponse.json({ error: 'Internal Server Error while deleting product.' }, { status: 500 });
    }
}